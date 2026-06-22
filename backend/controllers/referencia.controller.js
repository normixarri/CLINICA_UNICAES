const db = require('../config/db');
const { registrarAuditoria, obtenerRegistro } = require('../helpers/auditoria.helper');

exports.crearReferencia = (req, res) => {
  const { id_consulta, lugar_referencia, especialidad } = req.body;
  if (!id_consulta) return res.status(400).json({ mensaje: 'La consulta es obligatoria' });

  db.query(
    `INSERT INTO referencia
      (id_consulta, lugar_referencia, especialidad, fecha_creacion, version)
     VALUES (?, ?, ?, NOW(), 1)`,
    [id_consulta, lugar_referencia || null, especialidad || null],
    async (err, result) => {
      if (err) return res.status(500).json(err);
      await registrarAuditoria({
        req,
        tabla_afectada: 'referencia',
        id_registro: result.insertId,
        accion: 'INSERT',
        usuario_accion: req.usuario?.id_usuario || null,
        datos_nuevos: await obtenerRegistro('referencia', 'id_referencia', result.insertId),
        descripcion: 'Creación de referencia'
      });
      res.status(201).json({ mensaje: 'Referencia creada', id_referencia: result.insertId });
    }
  );
};

exports.referenciasPaciente = (req, res) => {

  const { id } = req.params;

  const query = `
    SELECT 
      ref.fecha_creacion,
      c.diagnostico,
      CONCAT(per.nombre, ' ', per.apellidos) AS doctor,
      ref.lugar_referencia,
      ref.especialidad

    FROM referencia ref
    JOIN consulta c ON ref.id_consulta = c.id_consulta
    JOIN doctor d ON c.id_doctor = d.id_doctor
    JOIN usuario u ON d.id_usuario = u.id_usuario
    JOIN persona per ON u.id_persona = per.id_persona

    WHERE c.id_paciente = ?
  `;

  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.generarReferencia = (req, res) => {
  const { id_consulta } = req.params;
  const { lugar_referencia, especialidad } = req.body;

  //  1. Obtener datos de consulta + paciente
  const query = `
    SELECT 
      p.nombre,
      p.apellidos,
      c.diagnostico
    FROM consulta c
    INNER JOIN paciente p ON c.id_paciente = p.id_paciente
    WHERE c.id_consulta = ?
  `;

  db.query(query, [id_consulta], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(404).json({ mensaje: "Consulta no encontrada" });
    }

    const data = result[0];
    const nombre = `${data.nombre} ${data.apellidos}`;
    const diagnostico = data.diagnostico;

    //  2. Guardar en TABLA (ajustada)
    db.query(
      `INSERT INTO referencia 
       (id_consulta, lugar_referencia, especialidad, fecha_creacion, version)
       VALUES (?, ?, ?, NOW(), 1)`,
      [id_consulta, lugar_referencia, especialidad],
      (err) => {
        if (err) return res.status(500).json(err);

        //  3. Fecha automática
        const fecha = new Date();
        const dia = fecha.getDate();
        const mes = fecha.toLocaleString('es-ES', { month: 'long' });
        const año = fecha.getFullYear();

        //  4. TEXTO DINÁMICO (como tu diseño)
        const texto = `
UNIVERSIDAD CATOLICA DE EL SALVADOR
CLINICA UNIVERSITARIA
REFERENCIA

Por este medio se refiere a: ${nombre}

Con diagnóstico de: ${diagnostico}

Por lo que se refiere para manejo adecuado de dicha patología

Al centro: ${lugar_referencia}

Especialidad: ${especialidad || ''}

Emitida en Santa Ana a los ${dia} días del mes de ${mes} del año ${año}.

Gracias por su atención.

Atentamente Médico
        `;

        res.json({
          texto,
          paciente: nombre,
          diagnostico,
          lugar_referencia,
          especialidad,
          fecha: `${dia} de ${mes} de ${año}`,
          firma: "/public/img/firma_medico.png",
          sello: "/public/img/sello_clinica.png"
        });
      }
    );
  });
};
