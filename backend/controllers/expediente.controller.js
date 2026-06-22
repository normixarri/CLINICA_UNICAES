const db = require('../config/db');

const responderError = (res, error, mensaje) => {
  console.error(mensaje, error);
  res.status(500).json({ mensaje });
};

const nombreDoctorSql = "CONCAT(COALESCE(pd.nombre, ''), ' ', COALESCE(pd.apellidos, ''))";

exports.obtenerCatalogos = (req, res) => {
  const catalogos = {
    tipos: 'SELECT id_tipo, nombre FROM tipo_paciente ORDER BY nombre',
    facultades: 'SELECT id_facultad, nombre FROM facultad ORDER BY nombre',
    carreras: 'SELECT id_carrera, id_facultad, nombre FROM carrera ORDER BY nombre',
    areas: 'SELECT id_area, nombre FROM area ORDER BY nombre'
  };

  const resultado = {};
  const entradas = Object.entries(catalogos);
  let pendientes = entradas.length;

  entradas.forEach(([clave, sql]) => {
    db.query(sql, (error, rows) => {
      if (error) return responderError(res, error, 'Error al cargar catálogos de expediente');

      resultado[clave] = rows;
      pendientes -= 1;

      if (pendientes === 0) {
        res.json(resultado);
      }
    });
  });
};

exports.buscarExpedientes = (req, res) => {
  const {
    expediente,
    nombre,
    apellido,
    dui,
    carnet,
    tipo_paciente,
    id_tipo_paciente,
    facultad,
    id_facultad,
    carrera,
    id_carrera,
    area,
    id_area
  } = req.query;

  const filtros = [];
  const valores = [];

  const agregarLike = (campo, valor) => {
    if (valor) {
      filtros.push(`${campo} LIKE ?`);
      valores.push(`%${valor}%`);
    }
  };

  agregarLike('p.correlativo', expediente);
  agregarLike('per.nombre', nombre);
  agregarLike('per.apellidos', apellido);
  agregarLike('per.dui', dui);
  agregarLike('p.carnet', carnet);

  if (tipo_paciente || id_tipo_paciente) {
    filtros.push('p.id_tipo_paciente = ?');
    valores.push(tipo_paciente || id_tipo_paciente);
  }

  if (facultad || id_facultad) {
    filtros.push('f.id_facultad = ?');
    valores.push(facultad || id_facultad);
  }

  if (carrera || id_carrera) {
    filtros.push('p.id_carrera = ?');
    valores.push(carrera || id_carrera);
  }

  if (area || id_area) {
    filtros.push('p.id_area = ?');
    valores.push(area || id_area);
  }

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  const sql = `
    SELECT
      p.id_paciente,
      p.correlativo AS expediente,
      per.nombre,
      per.apellidos,
      CONCAT(per.nombre, ' ', per.apellidos) AS nombre_completo,
      per.dui,
      p.carnet,
      tp.nombre AS tipo_paciente,
      f.nombre AS facultad,
      ca.nombre AS carrera,
      a.nombre AS area,
      p.id_tipo_paciente,
      f.id_facultad,
      p.id_carrera,
      p.id_area
    FROM paciente p
    INNER JOIN persona per ON p.id_persona = per.id_persona
    LEFT JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
    LEFT JOIN carrera ca ON p.id_carrera = ca.id_carrera
    LEFT JOIN facultad f ON ca.id_facultad = f.id_facultad
    LEFT JOIN area a ON p.id_area = a.id_area
    ${where}
    ORDER BY p.correlativo ASC
  `;

  db.query(sql, valores, (error, rows) => {
    if (error) return responderError(res, error, 'Error al buscar expedientes');
    res.json(rows);
  });
};

exports.obtenerInformacionGeneral = (req, res) => {
  const { id_paciente } = req.params;
  const sql = `
    SELECT
      p.id_paciente,
      p.correlativo AS expediente,
      p.carnet,
      p.sector,
      p.municipio_nacimiento,
      p.direccion,
      p.departamento,
      p.municipio_residencia,
      p.nombre_padre,
      p.nombre_madre,
      p.nombre_empleado_referencia,
      per.nombre,
      per.apellidos,
      CONCAT(per.nombre, ' ', per.apellidos) AS nombre_completo,
      per.sexo,
      per.dui,
      per.correo_electronico,
      per.telefono,
      per.fecha_nacimiento,
      tp.nombre AS tipo_paciente,
      f.nombre AS facultad,
      ca.nombre AS carrera,
      a.nombre AS area
    FROM paciente p
    INNER JOIN persona per ON p.id_persona = per.id_persona
    LEFT JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
    LEFT JOIN carrera ca ON p.id_carrera = ca.id_carrera
    LEFT JOIN facultad f ON ca.id_facultad = f.id_facultad
    LEFT JOIN area a ON p.id_area = a.id_area
    WHERE p.id_paciente = ?
    LIMIT 1
  `;

  db.query(sql, [id_paciente], (error, rows) => {
    if (error) return responderError(res, error, 'Error al cargar información general');
    if (rows.length === 0) return res.status(404).json({ mensaje: 'Expediente no encontrado' });
    res.json(rows[0]);
  });
};

exports.obtenerRecetas = (req, res) => {
  const { id_paciente } = req.params;
  const sql = `
    SELECT
      r.id_receta,
      r.fecha_creacion AS fecha,
      r.indicaciones,
      c.id_consulta,
      c.diagnostico,
      TRIM(${nombreDoctorSql}) AS medico,
      GROUP_CONCAT(
        CONCAT(
          m.nombre,
          IF(rm.indicacion_generada IS NOT NULL AND rm.indicacion_generada <> '', CONCAT(' - ', rm.indicacion_generada), IF(rm.frecuencia IS NOT NULL AND rm.frecuencia <> '', CONCAT(' - ', rm.frecuencia), IF(rm.dosis IS NOT NULL, CONCAT(' - dosis: ', rm.dosis), ''))),
          IF(rm.cantidad_indicada IS NOT NULL, CONCAT(' - indicada: ', rm.cantidad_indicada, IFNULL(CONCAT(' ', rm.unidad_entrega), '')), ''),
          IF(rm.cantidad_entregada IS NOT NULL, CONCAT(' - entregada: ', rm.cantidad_entregada, IFNULL(CONCAT(' ', rm.unidad_entrega), '')), '')
        )
        SEPARATOR ' / '
      ) AS medicamentos
    FROM receta r
    INNER JOIN consulta c ON r.id_consulta = c.id_consulta
    LEFT JOIN receta_medicamento rm ON r.id_receta = rm.id_receta
    LEFT JOIN medicamento m ON rm.id_medicamento = m.id_medicamento
    LEFT JOIN doctor d ON c.id_doctor = d.id_doctor
    LEFT JOIN usuario ud ON d.id_usuario = ud.id_usuario
    LEFT JOIN persona pd ON ud.id_persona = pd.id_persona
    WHERE c.id_paciente = ?
    GROUP BY r.id_receta, r.fecha_creacion, r.indicaciones, c.id_consulta, c.diagnostico, medico
    ORDER BY r.fecha_creacion DESC
  `;

  db.query(sql, [id_paciente], (error, rows) => {
    if (error) return responderError(res, error, 'Error al cargar recetas');
    res.json(rows);
  });
};

exports.obtenerReferencias = (req, res) => {
  const { id_paciente } = req.params;
  const sql = `
    SELECT
      ref.id_referencia,
      ref.fecha_creacion AS fecha,
      ref.lugar_referencia,
      ref.especialidad,
      c.diagnostico,
      TRIM(${nombreDoctorSql}) AS doctor
    FROM referencia ref
    INNER JOIN consulta c ON ref.id_consulta = c.id_consulta
    LEFT JOIN doctor d ON c.id_doctor = d.id_doctor
    LEFT JOIN usuario ud ON d.id_usuario = ud.id_usuario
    LEFT JOIN persona pd ON ud.id_persona = pd.id_persona
    WHERE c.id_paciente = ?
    ORDER BY ref.fecha_creacion DESC
  `;

  db.query(sql, [id_paciente], (error, rows) => {
    if (error) return responderError(res, error, 'Error al cargar referencias');
    res.json(rows);
  });
};

exports.obtenerIncapacidades = (req, res) => {
  const { id_paciente } = req.params;
  const sql = `
    SELECT
      i.id_incapacidad,
      i.fecha_creacion AS fecha,
      i.diagnostico,
      i.dias_incapacidad,
      d.jvpm,
      TRIM(${nombreDoctorSql}) AS doctor
    FROM incapacidad i
    INNER JOIN consulta c ON i.id_consulta = c.id_consulta
    LEFT JOIN doctor d ON c.id_doctor = d.id_doctor
    LEFT JOIN usuario ud ON d.id_usuario = ud.id_usuario
    LEFT JOIN persona pd ON ud.id_persona = pd.id_persona
    WHERE c.id_paciente = ?
    ORDER BY i.fecha_creacion DESC
  `;

  db.query(sql, [id_paciente], (error, rows) => {
    if (error) return responderError(res, error, 'Error al cargar incapacidades');
    res.json(rows);
  });
};

exports.obtenerConsultas = (req, res) => {
  const { id_paciente } = req.params;
  const sql = `
    SELECT
      c.id_consulta,
      c.fecha_creacion AS fecha,
      c.tipo_consulta,
      c.estado,
      c.diagnostico,
      c.tratamiento,
      TRIM(${nombreDoctorSql}) AS doctor
    FROM consulta c
    LEFT JOIN doctor d ON c.id_doctor = d.id_doctor
    LEFT JOIN usuario ud ON d.id_usuario = ud.id_usuario
    LEFT JOIN persona pd ON ud.id_persona = pd.id_persona
    WHERE c.id_paciente = ?
    ORDER BY c.fecha_creacion DESC
  `;

  db.query(sql, [id_paciente], (error, rows) => {
    if (error) return responderError(res, error, 'Error al cargar consultas');
    res.json(rows);
  });
};

exports.obtenerConstancias = (req, res) => {
  const { id_paciente } = req.params;
  const sql = `
    SELECT
      co.id_constancia,
      co.fecha_emision,
      co.fecha_creacion,
      tc.nombre AS tipo_constancia,
      c.diagnostico,
      d.jvpm,
      TRIM(${nombreDoctorSql}) AS doctor
    FROM constancia co
    INNER JOIN consulta c ON co.id_consulta = c.id_consulta
    LEFT JOIN tipo_constancia tc ON co.id_tipo_constancia = tc.id_tipo_constancia
    LEFT JOIN doctor d ON c.id_doctor = d.id_doctor
    LEFT JOIN usuario ud ON d.id_usuario = ud.id_usuario
    LEFT JOIN persona pd ON ud.id_persona = pd.id_persona
    WHERE c.id_paciente = ?
    ORDER BY COALESCE(co.fecha_emision, co.fecha_creacion) DESC
  `;

  db.query(sql, [id_paciente], (error, rows) => {
    if (error) return responderError(res, error, 'Error al cargar constancias');
    res.json(rows);
  });
};

exports.obtenerExamenFisico = (req, res) => {
  const { id_paciente } = req.params;
  const sql = `
    SELECT
      id_examen_fisico,
      id_consulta,
      fecha_creacion AS fecha,
      peso,
      unidad_peso,
      talla,
      unidad_talla,
      temperatura,
      pulso,
      frecuencia_cardiaca,
      presion_sistolica,
      presion_diastolica,
      antecedentes,
      examen_fisico
    FROM examen_fisico
    WHERE id_paciente = ?
    ORDER BY fecha_creacion DESC
  `;

  db.query(sql, [id_paciente], (error, rows) => {
    if (error) return responderError(res, error, 'Error al cargar examen físico');
    res.json(rows);
  });
};
