const db = require('../config/db');

///  CENSO INSTITUCIONAL
exports.censoInstitucional = (req, res) => {
  console.log("ENTRANDO A CENSO INSTITUCIONAL ");

  const {
    fechaInicio,
    fechaFin,
    expediente,
    nombre,
    apellido,
    tipo_paciente,
    proyecto,
    sexo,
    region,
    documentos,
    facultad,
    carrera,
    area
  } = req.query;

  let query = `
  SELECT 
    c.fecha_creacion AS fecha,
    p.correlativo AS expediente,
    per.nombre AS nombres,
    per.apellidos,
    CONCAT(per.nombre, ' ', per.apellidos) AS nombre,
    c.diagnostico,
    per.sexo,
    TIMESTAMPDIFF(YEAR, per.fecha_nacimiento, CURDATE()) AS edad,
    p.id_tipo_paciente,
    tp.nombre AS tipo_paciente,
    f.id_facultad,
    f.nombre AS facultad,
    ca.id_carrera,
    ca.nombre AS carrera,
    a.id_area,
    a.nombre AS area,
    CASE
      WHEN LOWER(TRIM(p.sector)) = 'rural' THEN 'Rural'
      WHEN LOWER(TRIM(p.sector)) = 'urbano' THEN 'Urbano'
      ELSE '-'
    END AS region,
    c.tipo_consulta,
    CASE
      WHEN COALESCE(py.tiene_proyeccion, 0) = 1 AND COALESCE(py.tiene_lamar, 0) = 1 THEN 'PY / LAMAR'
      WHEN COALESCE(py.tiene_proyeccion, 0) = 1 THEN 'PY'
      WHEN COALESCE(py.tiene_lamar, 0) = 1 THEN 'LAMAR'
      ELSE '-'
    END AS proyecto,

    CONCAT(
      CASE WHEN con.id_constancia IS NOT NULL THEN 'C ' ELSE '' END,
      CASE WHEN ref.id_referencia IS NOT NULL THEN 'R ' ELSE '' END,
      CASE WHEN i.id_incapacidad IS NOT NULL THEN 'I' ELSE '' END
    ) AS documentos

  FROM consulta c
  LEFT JOIN paciente p ON c.id_paciente = p.id_paciente
  LEFT JOIN persona per ON p.id_persona = per.id_persona
  LEFT JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
  LEFT JOIN carrera ca ON p.id_carrera = ca.id_carrera
  LEFT JOIN facultad f ON ca.id_facultad = f.id_facultad
  LEFT JOIN area a ON p.id_area = a.id_area
  LEFT JOIN (
    SELECT
      pp.id_paciente,
      MAX(CASE WHEN LOWER(pr.nombre) LIKE '%proyecci%' THEN 1 ELSE 0 END) AS tiene_proyeccion,
      MAX(CASE WHEN LOWER(pr.nombre) LIKE '%lamar%' THEN 1 ELSE 0 END) AS tiene_lamar
    FROM paciente_proyecto pp
    INNER JOIN proyecto pr ON pp.id_proyecto = pr.id_proyecto
    GROUP BY pp.id_paciente
  ) py ON p.id_paciente = py.id_paciente

  LEFT JOIN constancia con ON c.id_consulta = con.id_consulta
  LEFT JOIN referencia ref ON c.id_consulta = ref.id_consulta
  LEFT JOIN incapacidad i ON c.id_consulta = i.id_consulta
`;
  let condiciones = [];
  let params = [];

  if (fechaInicio && fechaFin) {
    condiciones.push(`DATE(c.fecha_creacion) BETWEEN ? AND ?`);
    params.push(fechaInicio, fechaFin);
  }

  if (expediente) {
    condiciones.push(`p.correlativo LIKE ?`);
    params.push(`%${expediente}%`);
  }

  if (nombre) {
    condiciones.push(`per.nombre LIKE ?`);
    params.push(`%${nombre}%`);
  }

  if (apellido) {
    condiciones.push(`per.apellidos LIKE ?`);
    params.push(`%${apellido}%`);
  }

  if (tipo_paciente) {
    condiciones.push(`p.id_tipo_paciente = ?`);
    params.push(tipo_paciente);
  }

  if (facultad) {
    condiciones.push(`f.id_facultad = ?`);
    params.push(facultad);
  }

  if (carrera) {
    condiciones.push(`ca.id_carrera = ?`);
    params.push(carrera);
  }

  if (area) {
    condiciones.push(`a.id_area = ?`);
    params.push(area);
  }

  if (sexo) {
    condiciones.push(`per.sexo = ?`);
    params.push(sexo);
  }

  if (region) {
    condiciones.push(`LOWER(TRIM(p.sector)) = LOWER(?)`);
    params.push(region);
  }

  if (proyecto === 'PY') {
    condiciones.push(`COALESCE(py.tiene_proyeccion, 0) = 1`);
  }

  if (proyecto === 'LAMAR') {
    condiciones.push(`COALESCE(py.tiene_lamar, 0) = 1`);
  }

  if (proyecto === 'SIN') {
    condiciones.push(`COALESCE(py.tiene_proyeccion, 0) = 0 AND COALESCE(py.tiene_lamar, 0) = 0`);
  }

  if (documentos === 'C') condiciones.push(`con.id_constancia IS NOT NULL`);
  if (documentos === 'R') condiciones.push(`ref.id_referencia IS NOT NULL`);
  if (documentos === 'I') condiciones.push(`i.id_incapacidad IS NOT NULL`);
  if (documentos === 'SIN') {
    condiciones.push(`con.id_constancia IS NULL AND ref.id_referencia IS NULL AND i.id_incapacidad IS NULL`);
  }

  if (condiciones.length > 0) {
    query += ` WHERE ${condiciones.join(' AND ')}`;
  }

  query += ` ORDER BY c.fecha_creacion DESC`;

  db.query(query, params, (err, result) => {
    if (err) {
      console.error("Error en censo institucional:", err);
      return res.status(500).json(err);
    }
    res.json(result);
  });
};


///  CENSO NUEVO INGRESO
exports.censoNuevoIngreso = (req, res) => {

  const { fechaInicio, fechaFin, expediente, nombre, carrera } = req.query;

  let query = `
  SELECT 
    ni.id_nuevo_ingreso,
    ni.fecha_creacion AS fecha,
    p.correlativo AS expediente,
    CONCAT(per.nombre, ' ', per.apellidos) AS nombre,
    ca.nombre AS carrera
  FROM nuevo_ingreso ni
  LEFT JOIN paciente p ON ni.id_paciente = p.id_paciente
  LEFT JOIN persona per ON p.id_persona = per.id_persona
  LEFT JOIN carrera ca ON p.id_carrera = ca.id_carrera
`;

  let condiciones = [];
  let params = [];

  if (fechaInicio && fechaFin) {
    condiciones.push(`DATE(ni.fecha_creacion) BETWEEN ? AND ?`);
    params.push(fechaInicio, fechaFin);
  }

  if (expediente) {
    condiciones.push(`p.correlativo LIKE ?`);
    params.push(`%${expediente}%`);
  }

  if (nombre) {
    condiciones.push(`CONCAT(per.nombre, ' ', per.apellidos) LIKE ?`);
    params.push(`%${nombre}%`);
  }

  if (carrera) {
    condiciones.push(`ca.nombre LIKE ?`);
    params.push(`%${carrera}%`);
  }

  if (condiciones.length > 0) {
    query += ` WHERE ${condiciones.join(' AND ')}`;
  }

  query += ` ORDER BY ni.fecha_creacion DESC`;

  db.query(query, params, (err, result) => {
    if (err) {
      console.error("Error en censo nuevo ingreso:", err);
      return res.status(500).json(err);
    }
    res.json(result);
  });
};
