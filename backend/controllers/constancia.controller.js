const db = require('../config/db');
const { registrarAuditoria, obtenerRegistro } = require('../helpers/auditoria.helper');

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

exports.crearConstancia = async (req, res) => {
  try {
    const { id_consulta } = req.body;
    if (!id_consulta) return res.status(400).json({ mensaje: 'La consulta es obligatoria' });

    const consultas = await query(
      `SELECT tipo_consulta, id_paciente FROM consulta WHERE id_consulta = ? LIMIT 1`,
      [id_consulta]
    );

    if (!consultas.length) return res.status(404).json({ mensaje: 'Consulta no encontrada' });

    const esNuevoIngreso = String(consultas[0].tipo_consulta || '').toLowerCase().includes('nuevo ingreso');

    const nombreTipo = esNuevoIngreso ? 'Constancia de enfermeria nuevo ingreso' : 'Constancia medica general';
    const tipoConstancia = await obtenerOCrearTipoConstancia(nombreTipo);

    const existente = await query(
      `SELECT id_constancia
       FROM constancia
       WHERE id_consulta = ? AND id_tipo_constancia = ?
       ORDER BY id_constancia DESC
       LIMIT 1`,
      [id_consulta, tipoConstancia.id_tipo_constancia]
    );

    if (existente.length > 0) {
      const anterior = await obtenerRegistro('constancia', 'id_constancia', existente[0].id_constancia);
      await query(
        `UPDATE constancia
         SET fecha_emision = CURDATE(),
             fecha_modificacion = NOW(),
             version = COALESCE(version, 1) + 1
         WHERE id_constancia = ?`,
        [existente[0].id_constancia]
      );

      await registrarAuditoria({
        req,
        tabla_afectada: 'constancia',
        id_registro: existente[0].id_constancia,
        accion: 'UPDATE',
        usuario_accion: req.usuario?.id_usuario || null,
        datos_anteriores: anterior,
        datos_nuevos: await obtenerRegistro('constancia', 'id_constancia', existente[0].id_constancia),
        descripcion: 'Actualización de constancia'
      });

      return res.json({
        mensaje: 'Constancia actualizada',
        id_constancia: existente[0].id_constancia,
        id_tipo_constancia: tipoConstancia.id_tipo_constancia
      });
    }

    const result = await query(
      `INSERT INTO constancia
        (id_consulta, id_tipo_constancia, fecha_emision, fecha_creacion, version)
       VALUES (?, ?, CURDATE(), NOW(), 1)`,
      [id_consulta, tipoConstancia.id_tipo_constancia]
    );

    await registrarAuditoria({
      req,
      tabla_afectada: 'constancia',
      id_registro: result.insertId,
      accion: 'INSERT',
      usuario_accion: req.usuario?.id_usuario || null,
      datos_nuevos: await obtenerRegistro('constancia', 'id_constancia', result.insertId),
      descripcion: 'Creación de constancia'
    });

    return res.status(201).json({
      mensaje: 'Constancia creada',
      id_constancia: result.insertId,
      id_tipo_constancia: tipoConstancia.id_tipo_constancia
    });
  } catch (err) {
    console.error('Error al crear constancia:', err);
    return res.status(500).json({ mensaje: 'Error al crear constancia' });
  }
};

async function obtenerOCrearTipoConstancia(nombre) {
  const existentes = await query(
    `SELECT id_tipo_constancia, nombre
     FROM tipo_constancia
     WHERE LOWER(nombre) = LOWER(?)
     LIMIT 1`,
    [nombre]
  );

  if (existentes.length > 0) return existentes[0];

  const result = await query(
    `INSERT INTO tipo_constancia
      (nombre, descripcion, fecha_creacion, version)
     VALUES (?, ?, NOW(), 1)`,
    [nombre, nombre]
  );

  return { id_tipo_constancia: result.insertId, nombre };
}

exports.constanciasPaciente = (req, res) => {

  const { id } = req.params;

  const query = `
    SELECT 
      con.fecha_creacion,
      CONCAT(perPac.nombre, ' ', perPac.apellidos) AS paciente,
      c.diagnostico,
      CONCAT(perDoc.nombre, ' ', perDoc.apellidos) AS doctor,
      d.jvpm

    FROM constancia con
    JOIN consulta c ON con.id_consulta = c.id_consulta

    JOIN paciente p ON c.id_paciente = p.id_paciente
    JOIN persona perPac ON p.id_persona = perPac.id_persona

    JOIN doctor d ON c.id_doctor = d.id_doctor
    JOIN usuario u ON d.id_usuario = u.id_usuario
    JOIN persona perDoc ON u.id_persona = perDoc.id_persona

    WHERE c.id_paciente = ?
  `;

  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};


exports.generarConstancia = (req, res) => {
  const { id_consulta, id_tipo_constancia } = req.body;

  const query = `
    SELECT 
      p.nombre,
      p.apellidos,
      c.diagnostico,
      c.tratamiento,
      p.id_paciente
    FROM consulta c
    INNER JOIN paciente p ON c.id_paciente = p.id_paciente
    WHERE c.id_consulta = ?
  `;

  db.query(query, [id_consulta], (err, result) => {
    if (err) return res.status(500).json(err);

    const data = result[0];
    const nombre = `${data.nombre} ${data.apellidos}`;

    const fecha = new Date();
    const dia = fecha.getDate();
    const mes = fecha.toLocaleString('es-ES', { month: 'long' });
    const año = fecha.getFullYear();

    // 🔥 GUARDAR EN BD
    db.query(
      `INSERT INTO constancia 
       (id_consulta, id_tipo_constancia, fecha_emision, fecha_creacion, version)
       VALUES (?, ?, CURDATE(), NOW(), 1)`,
      [id_consulta, id_tipo_constancia]
    );

    // ============================
    //  CONSTANCIA MÉDICA (ID = 1)
    // ============================
    if (id_tipo_constancia == 1) {
      const texto = `
CONSTANCIA MÉDICA

Hace constar que ${nombre}

Ha pasado consulta este día con mi persona,
Diagnosticándose: ${data.diagnostico}

Emitida en Santa Ana a los ${dia} días del mes de ${mes} de ${año}.
      `;

      return res.json({
        tipo: "medica",
        texto,
        firma: "/public/img/firma_medico.png",
        sello: "/public/img/sello_clinica.png"
      });
    }

    // =====================================
    //  CONSTANCIA NUEVO INGRESO (ID = 2)
    // =====================================
    if (id_tipo_constancia == 2) {
      db.query(
        `SELECT * FROM nuevo_ingreso 
         WHERE id_consulta = ? OR (id_consulta IS NULL AND id_paciente = ?)
         ORDER BY CASE WHEN id_consulta = ? THEN 0 ELSE 1 END, id_nuevo_ingreso DESC LIMIT 1`,
        [id_consulta, data.id_paciente, id_consulta],
        (err, ingreso) => {
          if (err) return res.status(500).json(err);

          const i = ingreso[0];

          const texto = `
CONSTANCIA DE ENFERMERÍA

Paciente: ${nombre}

Diagnóstico: ${data.diagnostico}
Tratamiento: ${data.tratamiento}

DT: ${i.dt ? "Sí" : "No"} (${i.dt_dosis || 0} dosis)
Hepatitis B: ${i.hepatitis_b ? "Sí" : "No"} (${i.hepatitis_b_dosis || 0} dosis)

Enfermedades crónicas: ${i.enfermedades_cronicas ? "Sí" : "No"}
Problemas auditivos: ${i.problemas_auditivos ? "Sí" : "No"}
Problemas visuales: ${i.problemas_visuales ? "Sí" : "No"}

Emitida en Santa Ana a los ${dia} días del mes de ${mes} de ${año}.
          `;

          res.json({
            tipo: "nuevo_ingreso",
            texto,
            firma: "/public/img/firma_medico.png",
            sello: "/public/img/sello_clinica.png"
          });
        }
      );
    }
  });
};
