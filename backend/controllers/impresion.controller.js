const db = require('../config/db');

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

exports.listarImpresiones = async (req, res) => {
  try {
    const { paciente, tipo_documento, doctor, fecha, estado } = req.query;
    const condiciones = [];
    const params = [];

    if (paciente) {
      condiciones.push(`CONCAT(pp.nombre, ' ', pp.apellidos) LIKE ?`);
      params.push(`%${paciente}%`);
    }

    if (tipo_documento) {
      condiciones.push('i.tipo_documento = ?');
      params.push(tipo_documento);
    }

    if (doctor) {
      condiciones.push(`CONCAT(pd.nombre, ' ', pd.apellidos) LIKE ?`);
      params.push(`%${doctor}%`);
    }

    if (fecha) {
      condiciones.push('DATE(i.fecha_creacion) = ?');
      params.push(fecha);
    }

    if (estado) {
      condiciones.push('i.estado = ?');
      params.push(estado);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
    const rows = await query(
      `
      SELECT
        i.id_impresion,
        i.id_documento,
        i.tipo_documento,
        i.estado,
        i.fecha_creacion,
        i.fecha_impresion,
        i.impreso_por,
        CONCAT(pp.nombre, ' ', pp.apellidos) AS paciente,
        CONCAT(pd.nombre, ' ', pd.apellidos) AS doctor,
        uimp.correlativo AS usuario_impresion
      FROM impresion i
      LEFT JOIN paciente p ON i.id_paciente = p.id_paciente
      LEFT JOIN persona pp ON p.id_persona = pp.id_persona
      LEFT JOIN doctor d ON i.id_doctor = d.id_doctor
      LEFT JOIN usuario ud ON d.id_usuario = ud.id_usuario
      LEFT JOIN persona pd ON ud.id_persona = pd.id_persona
      LEFT JOIN usuario uimp ON i.impreso_por = uimp.id_usuario
      ${where}
      ORDER BY
        CASE WHEN i.estado = 'sin imprimir' THEN 0 ELSE 1 END,
        i.fecha_creacion DESC
      `,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('Error al listar impresiones:', err);
    res.status(500).json({ mensaje: 'Error al listar impresiones' });
  }
};

exports.crearImpresion = async (req, res) => {
  try {
    const { id_documento, tipo_documento, id_paciente, id_doctor } = req.body;
    if (!id_documento || !tipo_documento || !id_paciente || !id_doctor) {
      return res.status(400).json({ mensaje: 'Documento, tipo, paciente y doctor son obligatorios' });
    }

    const existente = await query(
      `SELECT id_impresion
       FROM impresion
       WHERE id_documento = ? AND tipo_documento = ?
       LIMIT 1`,
      [id_documento, tipo_documento]
    );

    if (existente.length > 0) {
      return res.json({ mensaje: 'El documento ya está en la cola de impresión', id_impresion: existente[0].id_impresion });
    }

    const result = await query(
      `INSERT INTO impresion
        (id_documento, tipo_documento, id_paciente, id_doctor, estado, fecha_creacion, version)
       VALUES (?, ?, ?, ?, 'sin imprimir', NOW(), 1)`,
      [id_documento, tipo_documento, id_paciente, id_doctor]
    );

    res.status(201).json({ mensaje: 'Documento enviado a impresión', id_impresion: result.insertId });
  } catch (err) {
    console.error('Error al crear impresión:', err);
    res.status(500).json({ mensaje: 'Error al enviar a impresión' });
  }
};

exports.marcarImpreso = async (req, res) => {
  try {
    const { id } = req.params;
    const { impreso_por } = req.body;

    await query(
      `UPDATE impresion
       SET estado = 'impreso',
           fecha_impresion = NOW(),
           impreso_por = ?
       WHERE id_impresion = ?`,
      [impreso_por || null, id]
    );

    res.json({ mensaje: 'Documento marcado como impreso' });
  } catch (err) {
    console.error('Error al marcar impreso:', err);
    res.status(500).json({ mensaje: 'Error al marcar como impreso' });
  }
};
