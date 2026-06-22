const db = require('../config/db');
const { registrarAuditoria, obtenerRegistro } = require('../helpers/auditoria.helper');

exports.crearIncapacidad = (req, res) => {
  const { id_consulta, diagnostico, dias_incapacidad } = req.body;
  if (!id_consulta) return res.status(400).json({ mensaje: 'La consulta es obligatoria' });

  db.query(
    `INSERT INTO incapacidad
      (id_consulta, diagnostico, dias_incapacidad, fecha_creacion, version)
     VALUES (?, ?, ?, NOW(), 1)`,
    [id_consulta, diagnostico || null, dias_incapacidad || null],
    async (err, result) => {
      if (err) return res.status(500).json(err);
      await registrarAuditoria({
        req,
        tabla_afectada: 'incapacidad',
        id_registro: result.insertId,
        accion: 'INSERT',
        usuario_accion: req.usuario?.id_usuario || null,
        datos_nuevos: await obtenerRegistro('incapacidad', 'id_incapacidad', result.insertId),
        descripcion: 'Creación de incapacidad'
      });
      res.status(201).json({ mensaje: 'Incapacidad creada', id_incapacidad: result.insertId });
    }
  );
};

exports.incapacidadesPaciente = (req, res) => {

  const { id } = req.params;

  const query = `
    SELECT 
      i.fecha_creacion,
      c.diagnostico,
      CONCAT(per.nombre, ' ', per.apellidos) AS doctor,
      d.jvpm,
      i.dias_incapacidad

    FROM incapacidad i
    JOIN consulta c ON i.id_consulta = c.id_consulta
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

exports.generarIncapacidad = (req, res) => {
  const { id_consulta } = req.params;
  const { dias } = req.body;

  //  1. Obtener datos de la consulta + paciente
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

    const paciente = result[0];
    const nombreCompleto = `${paciente.nombre} ${paciente.apellidos}`;
    const diagnostico = paciente.diagnostico;

    //  2. Guardar en tu tabla (IMPORTANTE: tu estructura)
    db.query(
      `INSERT INTO incapacidad 
       (id_consulta, diagnostico, dias_incapacidad, fecha_creacion, version)
       VALUES (?, ?, ?, NOW(), 1)`,
      [id_consulta, diagnostico, dias],
      (err) => {
        if (err) return res.status(500).json(err);

        //  3. Generar fechas automáticas
        const fecha = new Date();

        const dia = fecha.getDate();
        const mes = fecha.toLocaleString('es-ES', { month: 'long' });
        const año = fecha.getFullYear();

        //  4.TEXTO DINÁMICO 
        const texto = `
UNIVERSIDAD CATOLICA DE EL SALVADOR
CLINICA UNIVERSITARIA
INCAPACIDAD MÉDICA

El infrascrito Médico: Dr. __________________________
Inscrito en la J.V.P.M. con número __________

Hace constar que ${nombreCompleto}
Ha pasado consulta este día con mi persona, realizándole examen físico completo,
Diagnosticándose: ${diagnostico}

Motivo por el cual se extiende la presente incapacidad por ${dias} días,
a partir de esta fecha.

Y para los usos que el interesado estime convenientes, se extiende la presente
en la ciudad de Santa Ana a los ${dia} días del mes de ${mes} de ${año}.
        `;

        res.json({
          texto,
          dias,
          paciente: nombreCompleto,
          diagnostico,
          fecha: `${dia} de ${mes} de ${año}`,
          firma: "/public/img/firma_medico.png",
          sello: "/public/img/sello_clinica.png"
        });
      }
    );
  });
};
