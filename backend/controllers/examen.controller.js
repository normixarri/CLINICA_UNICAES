const db = require('../config/db');

const controller = require('../controllers/consulta.controller');

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const limpiar = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  return valor;
};

const validarDecimal = (valor, campo) => {
  if (valor === undefined || valor === null || valor === '') return;
  if (!/^\d+(\.\d+)?$/.test(String(valor))) {
    throw new Error(`${campo} debe contener solo numeros y decimales validos.`);
  }
};

const validarEntero = (valor, campo) => {
  if (valor === undefined || valor === null || valor === '') return;
  if (!/^\d+$/.test(String(valor))) {
    throw new Error(`${campo} debe contener solo numeros enteros.`);
  }
};

const validarUnidad = (valor, permitidas, campo) => {
  if (valor === undefined || valor === null || valor === '') return;
  if (!permitidas.includes(String(valor))) {
    throw new Error(`${campo} no es valida.`);
  }
};

const unidadPeso = (valor) => ['kg', 'lb'].includes(String(valor || '')) ? String(valor) : 'kg';
const unidadTalla = (valor) => ['m', 'cm'].includes(String(valor || '')) ? String(valor) : 'm';

const obtenerConsultaAutorizada = async (idConsulta, idPaciente, idUsuario) => {
  const rows = await query(
    `SELECT c.id_consulta, c.id_paciente, c.id_doctor
     FROM consulta c
     INNER JOIN doctor d ON c.id_doctor = d.id_doctor
     INNER JOIN usuario u ON d.id_usuario = u.id_usuario
     WHERE c.id_consulta = ?
       AND c.id_paciente = ?
       AND d.id_usuario = ?
       AND u.estado = 1
     LIMIT 1`,
    [idConsulta, idPaciente, idUsuario]
  );

  return rows[0] || null;
};

exports.obtenerPacientesExamenFisico = async (req, res) => {
  try {
    const { expediente, nombre, apellido, tipo_paciente } = req.query;
    const condiciones = [];
    const params = [];

    if (expediente) {
      condiciones.push('p.correlativo LIKE ?');
      params.push(`%${expediente}%`);
    }

    if (nombre) {
      condiciones.push('per.nombre LIKE ?');
      params.push(`%${nombre}%`);
    }

    if (apellido) {
      condiciones.push('per.apellidos LIKE ?');
      params.push(`%${apellido}%`);
    }

    if (tipo_paciente) {
      condiciones.push('p.id_tipo_paciente = ?');
      params.push(tipo_paciente);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const rows = await query(
      `
      SELECT
        p.id_paciente,
        p.correlativo AS expediente,
        per.nombre,
        per.apellidos,
        CONCAT(per.nombre, ' ', per.apellidos) AS paciente,
        tp.nombre AS tipo_paciente,
        p.id_tipo_paciente
      FROM paciente p
      INNER JOIN persona per ON p.id_persona = per.id_persona
      LEFT JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
      ${where}
      ORDER BY p.correlativo ASC
      `,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener pacientes para examen físico:', err);
    res.status(500).json({ mensaje: 'Error al obtener pacientes' });
  }
};

exports.registrarExamenFisicoCompleto = async (req, res) => {
  try {
    const {
      id_paciente,
      id_consulta,
      peso,
      unidad_peso,
      talla,
      unidad_talla,
      temperatura,
      pulso,
      frecuencia_cardiaca,
      presion_sistolica,
      presion_diastolica,
      cx,
      antecedentes,
      examen_fisico,
      diagnostico,
      tratamiento
    } = req.body;

    if (!id_paciente) return res.status(400).json({ mensaje: 'Debe identificar el paciente de la consulta' });
    if (!id_consulta) return res.status(400).json({ mensaje: 'El examen fisico debe generarse desde una consulta medica.' });
    const consultaAutorizada = await obtenerConsultaAutorizada(id_consulta, id_paciente, req.usuario?.id_usuario);
    if (!consultaAutorizada) return res.status(403).json({ mensaje: 'Solo el doctor asignado a la consulta puede registrar el examen fisico.' });
    validarDecimal(peso, 'Peso');
    validarUnidad(unidad_peso, ['kg', 'lb'], 'La unidad de peso');
    validarDecimal(talla, 'Talla');
    validarUnidad(unidad_talla, ['m', 'cm'], 'La unidad de talla');
    validarDecimal(temperatura, 'Temperatura');
    validarEntero(pulso, 'Pulso');
    validarEntero(frecuencia_cardiaca, 'Frecuencia cardiaca');
    validarEntero(presion_sistolica, 'Presion sistolica');
    validarEntero(presion_diastolica, 'Presion diastolica');

    await query('START TRANSACTION');

    let idConsulta = id_consulta || null;

    if (idConsulta) {
      await query(
        `UPDATE consulta
         SET diagnostico = COALESCE(?, diagnostico),
             tratamiento = COALESCE(?, tratamiento),
             fecha_modificacion = NOW()
         WHERE id_consulta = ?`,
        [limpiar(diagnostico), limpiar(tratamiento), idConsulta]
      );
    } else {
      const consulta = await query(
        `INSERT INTO consulta
          (id_recepcion, id_paciente, id_doctor, tipo_consulta, estado, diagnostico, tratamiento, fecha_creacion, version)
         VALUES (NULL, ?, NULL, 'Examen Físico', 'Finalizada', 'Examen físico', ?, ?, NOW(), 1)`,
        [id_paciente, limpiar(diagnostico), limpiar(tratamiento)]
      );
      idConsulta = consulta.insertId;
    }

    const antecedentesTexto = [
      cx ? `CX: ${cx}` : null,
      antecedentes ? `P.E y antecedentes: ${antecedentes}` : null
    ].filter(Boolean).join('\n') || null;

    let examen;
    const existentes = idConsulta
      ? await query('SELECT id_examen_fisico FROM examen_fisico WHERE id_consulta = ? ORDER BY id_examen_fisico DESC LIMIT 1', [idConsulta])
      : [];

    if (existentes.length > 0) {
      await query(
        `UPDATE examen_fisico
         SET peso = ?,
             unidad_peso = ?,
             talla = ?,
             unidad_talla = ?,
             temperatura = ?,
             pulso = ?,
             frecuencia_cardiaca = ?,
             presion_sistolica = ?,
             presion_diastolica = ?,
             antecedentes = ?,
             examen_fisico = ?,
             fecha_modificacion = NOW(),
             version = COALESCE(version, 0) + 1
         WHERE id_examen_fisico = ?`,
        [
          limpiar(peso),
          peso ? unidadPeso(unidad_peso) : null,
          limpiar(talla),
          talla ? unidadTalla(unidad_talla) : null,
          limpiar(temperatura),
          limpiar(pulso),
          limpiar(frecuencia_cardiaca),
          limpiar(presion_sistolica),
          limpiar(presion_diastolica),
          antecedentesTexto,
          limpiar(examen_fisico),
          existentes[0].id_examen_fisico
        ]
      );
      examen = { insertId: existentes[0].id_examen_fisico };
    } else {
      examen = await query(
        `INSERT INTO examen_fisico
          (id_paciente, id_consulta, peso, unidad_peso, talla, unidad_talla, temperatura, pulso, frecuencia_cardiaca,
           presion_sistolica, presion_diastolica, antecedentes, examen_fisico, fecha_creacion, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)`,
        [
          id_paciente,
          idConsulta,
          limpiar(peso),
          peso ? unidadPeso(unidad_peso) : null,
          limpiar(talla),
          talla ? unidadTalla(unidad_talla) : null,
          limpiar(temperatura),
          limpiar(pulso),
          limpiar(frecuencia_cardiaca),
          limpiar(presion_sistolica),
          limpiar(presion_diastolica),
          antecedentesTexto,
          limpiar(examen_fisico)
        ]
      );
    }

    await query('COMMIT');
    res.status(201).json({
      mensaje: 'Examen físico registrado correctamente',
      id_consulta: idConsulta,
      id_examen_fisico: examen.insertId
    });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Error al registrar examen físico:', err);
    res.status(500).json({ mensaje: err.message || 'Error al registrar examen físico' });
  }
};

exports.examenFisicoPaciente = (req, res) => {

  const { id } = req.params;

  const query = `
    SELECT 
      ef.fecha_creacion,
      CONCAT(per.nombre, ' ', per.apellidos) AS doctor,
      ef.peso,
      ef.unidad_peso,
      ef.talla,
      ef.unidad_talla,
      ef.temperatura,
      ef.pulso,
      ef.frecuencia_cardiaca,
      ef.presion_sistolica,
      ef.presion_diastolica

    FROM examen_fisico ef
    JOIN paciente p ON ef.id_paciente = p.id_paciente
    JOIN consulta c ON c.id_paciente = p.id_paciente
    JOIN doctor d ON c.id_doctor = d.id_doctor
    JOIN usuario u ON d.id_usuario = u.id_usuario
    JOIN persona per ON u.id_persona = per.id_persona

    WHERE p.id_paciente = ?
  `;

  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

///  BUSCAR PACIENTES (para la tabla izquierda)
exports.buscarPacientes = (req, res) => {

  const { nombre } = req.query;

  let query = `
    SELECT 
      p.id_paciente,
      per.nombre,
      per.apellidos,
      tp.nombre AS tipo_paciente
    FROM paciente p
    JOIN persona per ON p.id_persona = per.id_persona
    JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
  `;

  let params = [];

  if (nombre) {
    query += ` WHERE per.nombre LIKE ? OR per.apellidos LIKE ?`;
    params.push(`%${nombre}%`, `%${nombre}%`);
  }

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};


///  REGISTRAR EXAMEN FISICO
exports.registrarExamen = (req, res) => {
  return res.status(410).json({ mensaje: 'El examen fisico debe generarse desde una consulta medica.' });

  const {
    id_paciente,
    id_consulta,

    peso,
    unidad_peso,
    talla,
    unidad_talla,
    temperatura,
    pulso,
    frecuencia_cardiaca,
    sistolica,
    diastolica,

    cx,
    antecedentes,
    examen,
    diagnostico,
    tratamiento
  } = req.body;

  //  1. GUARDAR EXAMEN FISICO
  db.query(
    `INSERT INTO examen_fisico 
    (id_paciente, peso, unidad_peso, talla, unidad_talla, temperatura, pulso, frecuencia_cardiaca,
     presion_sistolica, presion_diastolica, fecha_creacion, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)`,

    [
      id_paciente,
      peso,
      peso ? unidadPeso(unidad_peso) : null,
      talla,
      talla ? unidadTalla(unidad_talla) : null,
      temperatura,
      pulso,
      frecuencia_cardiaca,
      sistolica,
      diastolica
    ],

    (err) => {

      if (err) return res.status(500).json(err);

      //  2. ACTUALIZAR CONSULTA
      db.query(
        `UPDATE consulta 
         SET diagnostico = ?, tratamiento = ?, estado = 'Finalizada'
         WHERE id_consulta = ?`,

        [diagnostico, tratamiento, id_consulta],

        (err2) => {

          if (err2) return res.status(500).json(err2);

          res.json({
            mensaje: 'Examen físico registrado correctamente'
          });
        }
      );
    }
  );
};
