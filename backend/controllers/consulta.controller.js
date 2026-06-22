const db = require('../config/db');
const { registrarAuditoria, obtenerRegistro } = require('../helpers/auditoria.helper');
const { formatearTelefonoSv, validarFechaNoFutura, validarTelefono } = require('../helpers/validaciones.helper');

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

const limpiarFecha = (valor) => {
  const limpio = limpiar(valor);
  if (limpio === null) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(limpio)) ? limpio : null;
};

const limpiarEntero = (valor) => {
  const limpio = limpiar(valor);
  if (limpio === null) return null;
  const numero = Number(limpio);
  return Number.isInteger(numero) ? numero : null;
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

const validarMedidas = ({ peso, unidad_peso, talla, unidad_talla, presion_sistolica, presion_diastolica }) => {
  validarDecimal(peso, 'Peso');
  validarUnidad(unidad_peso, ['kg', 'lb'], 'La unidad de peso');
  validarDecimal(talla, 'Talla');
  validarUnidad(unidad_talla, ['m', 'cm'], 'La unidad de talla');
  validarEntero(presion_sistolica, 'Presion sistolica');
  validarEntero(presion_diastolica, 'Presion diastolica');
};

const validarNuevoIngreso = (nuevoIngreso = {}) => {
  const errors = {};

  if (nuevoIngreso.dt) {
    if (!limpiarFecha(nuevoIngreso.dt_fecha_dosis)) errors.dt_fecha_dosis = 'Debe ingresar la fecha de dosis DT.';
    else {
      try { validarFechaNoFutura(nuevoIngreso.dt_fecha_dosis); } catch { errors.dt_fecha_dosis = 'No se permiten fechas futuras.'; }
    }
    if (!limpiarEntero(nuevoIngreso.dt_dosis)) errors.dt_dosis = 'Debe ingresar el numero de dosis DT.';
  }

  if (nuevoIngreso.hepatitis_b) {
    if (!limpiarFecha(nuevoIngreso.hepatitis_b_fecha_dosis)) errors.hepatitis_b_fecha_dosis = 'Debe ingresar la fecha de dosis Hepatitis B.';
    else {
      try { validarFechaNoFutura(nuevoIngreso.hepatitis_b_fecha_dosis); } catch { errors.hepatitis_b_fecha_dosis = 'No se permiten fechas futuras.'; }
    }
    if (!limpiarEntero(nuevoIngreso.hepatitis_b_dosis)) errors.hepatitis_b_dosis = 'Debe ingresar el numero de dosis Hepatitis B.';
  }

  if (nuevoIngreso.enfermedades_cronicas && !limpiar(nuevoIngreso.detalle_enfermedades)) {
    errors.detalle_enfermedades = 'Debe ingresar el detalle de enfermedades cronicas.';
  }
  if (nuevoIngreso.problemas_auditivos && !limpiar(nuevoIngreso.detalle_auditivos)) {
    errors.detalle_auditivos = 'Debe ingresar el detalle de problemas auditivos.';
  }
  if (nuevoIngreso.problemas_visuales && !limpiar(nuevoIngreso.detalle_visuales)) {
    errors.detalle_visuales = 'Debe ingresar el detalle de problemas visuales.';
  }

  if (Object.keys(errors).length > 0) throw crearErrorValidacion(errors);
};

const crearErrorValidacion = (errors) => {
  const error = new Error('Hay errores de validacion.');
  error.status = 400;
  error.errors = errors;
  return error;
};

const validarDuplicadosPacienteNuevo = async ({ dui, correo, telefono }) => {
  const errors = {};

  if (dui) {
    const rows = await query('SELECT id_persona FROM persona WHERE dui = ? LIMIT 1', [dui]);
    if (rows.length) errors.dui = 'Este DUI ya esta registrado.';
  }

  if (correo) {
    const rows = await query('SELECT id_persona FROM persona WHERE correo_electronico = ? LIMIT 1', [correo]);
    if (rows.length) errors.correo_electronico = 'Este correo electronico ya esta registrado.';
  }

  if (telefono) {
    const rows = await query(
      `SELECT id_persona FROM persona
       WHERE REPLACE(telefono, '-', '') = REPLACE(?, '-', '')
       LIMIT 1`,
      [telefono]
    );
    if (rows.length) errors.telefono = 'Este telefono ya esta registrado.';
  }

  if (Object.keys(errors).length > 0) throw crearErrorValidacion(errors);
};

const unidadPeso = (valor) => ['kg', 'lb'].includes(String(valor || '')) ? String(valor) : 'kg';
const unidadTalla = (valor) => ['m', 'cm'].includes(String(valor || '')) ? String(valor) : 'm';

const usuarioAccion = (req) => req.usuario?.id_usuario || null;

const validarDoctorRegistrado = async (idDoctor) => {
  const rows = await query(
    `SELECT d.id_doctor
     FROM doctor d
     INNER JOIN usuario u ON d.id_usuario = u.id_usuario
     WHERE d.id_doctor = ? AND u.estado = 1
     LIMIT 1`,
    [idDoctor]
  );

  if (rows.length === 0) {
    const error = new Error('La consulta solo puede asignarse a un doctor registrado.');
    error.status = 400;
    throw error;
  }
};

const obtenerDoctorPorUsuario = async (idUsuario) => {
  const rows = await query(
    `SELECT id_doctor FROM doctor WHERE id_usuario = ? LIMIT 1`,
    [idUsuario]
  );

  return rows[0]?.id_doctor || null;
};

const validarConsultaPerteneceADoctor = async (idConsulta, idDoctor) => {
  const rows = await query(
    `SELECT id_consulta FROM consulta WHERE id_consulta = ? AND id_doctor = ? LIMIT 1`,
    [idConsulta, idDoctor]
  );

  return rows.length > 0;
};

const validarCarreraNuevoIngreso = async (idCarrera) => {
  const rows = await query(
    `SELECT ca.id_carrera
     FROM carrera ca
     INNER JOIN facultad f ON ca.id_facultad = f.id_facultad
     WHERE ca.id_carrera = ?
       AND LOWER(f.nombre) LIKE '%ciencias%'
       AND LOWER(f.nombre) LIKE '%salud%'
     LIMIT 1`,
    [idCarrera]
  );

  if (rows.length === 0) {
    const error = new Error('Para consultas de nuevo ingreso unicamente se permiten carreras de la Facultad de Ciencias de la Salud.');
    error.status = 400;
    throw error;
  }
};

const generarCorrelativoPaciente = async (nombre, apellidos) => {
  const year = new Date().getFullYear();
  const inicialNombre = String(nombre || 'P').trim().charAt(0).toUpperCase() || 'P';
  const inicialApellido = String(apellidos || 'X').trim().charAt(0).toUpperCase() || 'X';
  const rows = await query(
    `SELECT COALESCE(MAX(secuencia), 0) + 1 AS siguiente
     FROM paciente
     WHERE YEAR(fecha_creacion) = YEAR(NOW())`
  );
  const secuencia = rows[0].siguiente || 1;
  return {
    secuencia,
    correlativo: `${year}-${inicialNombre}${inicialApellido}-${String(secuencia).padStart(4, '0')}`
  };
};

const crearRecepcionYConsulta = async ({ idPaciente, idDoctor, tipoConsulta, idUsuario }) => {
  await validarDoctorRegistrado(idDoctor);

  const recepcion = await query(
    `INSERT INTO recepcion
      (id_usuario, id_paciente, fecha_ingreso, version, usuario_creacion)
     VALUES (?, ?, CURDATE(), 1, ?)`,
    [idUsuario, idPaciente, idUsuario]
  );

  const consulta = await query(
    `INSERT INTO consulta
      (id_recepcion, id_paciente, id_doctor, tipo_consulta, estado, fecha_creacion, usuario_creacion, version)
     VALUES (?, ?, ?, ?, 'pendiente', NOW(), ?, 1)`,
    [recepcion.insertId, idPaciente, idDoctor, tipoConsulta, idUsuario]
  );

  return { id_recepcion: recepcion.insertId, id_consulta: consulta.insertId };
};

exports.obtenerDoctoresGenerarConsulta = async (req, res) => {
  try {
    const { nombre, apellido, especialidad } = req.query;
    const condiciones = ['u.estado = 1'];
    const params = [];

    if (nombre) {
      condiciones.push('per.nombre LIKE ?');
      params.push(`%${nombre}%`);
    }

    if (apellido) {
      condiciones.push('per.apellidos LIKE ?');
      params.push(`%${apellido}%`);
    }

    if (especialidad) {
      condiciones.push('e.nombre LIKE ?');
      params.push(`%${especialidad}%`);
    }

    const rows = await query(
      `
      SELECT
        d.id_doctor,
        per.nombre,
        per.apellidos,
        CONCAT(per.nombre, ' ', per.apellidos) AS doctor,
        COALESCE(GROUP_CONCAT(DISTINCT e.nombre ORDER BY e.nombre SEPARATOR ', '), '-') AS especialidad,
        COUNT(DISTINCT CASE
          WHEN DATE(c.fecha_creacion) = CURDATE()
            AND LOWER(c.estado) IN ('realizada', 'finalizada', 'finalizado')
          THEN c.id_consulta
        END) AS consultas_realizadas_hoy,
        COUNT(DISTINCT CASE
          WHEN DATE(c.fecha_creacion) = CURDATE()
            AND LOWER(c.estado) = 'pendiente'
          THEN c.id_consulta
        END) AS consultas_pendientes_hoy
      FROM doctor d
      INNER JOIN usuario u ON d.id_usuario = u.id_usuario
      INNER JOIN persona per ON u.id_persona = per.id_persona
      LEFT JOIN especialidad_doctor ed ON d.id_doctor = ed.id_doctor
      LEFT JOIN especialidad e ON ed.id_especialidad = e.id_especialidad
      LEFT JOIN consulta c ON d.id_doctor = c.id_doctor
      WHERE ${condiciones.join(' AND ')}
      GROUP BY d.id_doctor, per.nombre, per.apellidos
      ORDER BY per.apellidos, per.nombre
      `,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener doctores:', err);
    res.status(500).json({ mensaje: 'Error al obtener doctores' });
  }
};

exports.obtenerPacientesGenerarConsulta = async (req, res) => {
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
    console.error('Error al obtener pacientes:', err);
    res.status(500).json({ mensaje: 'Error al obtener pacientes' });
  }
};

exports.generarNuevoIngreso = async (req, res) => {
  try {
    const {
      paciente = {},
      nuevo_ingreso = {},
      id_doctor,
      peso,
      unidad_peso,
      talla,
      unidad_talla,
      presion_sistolica,
      presion_diastolica
    } = req.body;
    const idUsuario = usuarioAccion(req);
    if (!id_doctor) return res.status(400).json({ mensaje: 'Debe seleccionar un doctor' });
    if (!paciente.nombre || !paciente.apellidos) return res.status(400).json({ mensaje: 'Debe ingresar nombre y apellidos del paciente' });
    if (!paciente.fecha_nacimiento) return res.status(400).json({ mensaje: 'Debe ingresar la fecha de nacimiento' });
    validarFechaNoFutura(paciente.fecha_nacimiento);
    if (!paciente.id_carrera) return res.status(400).json({ mensaje: 'Debe seleccionar la carrera' });
    if (!limpiar(paciente.telefono)) {
      return res.status(400).json({
        mensaje: 'Debe ingresar el telefono.',
        errors: { telefono: 'Debe ingresar el telefono.' }
      });
    }
    validarTelefono(paciente.telefono, 'telefonico', true);
    validarTelefono(paciente.contacto_telefono, 'telefónico de emergencia', false);
    validarMedidas({ peso, unidad_peso, talla, unidad_talla, presion_sistolica, presion_diastolica });
    validarNuevoIngreso(nuevo_ingreso);
    await validarCarreraNuevoIngreso(paciente.id_carrera);
    const telefonoPaciente = formatearTelefonoSv(paciente.telefono);
    const telefonoEmergencia = formatearTelefonoSv(paciente.contacto_telefono);
    await validarDuplicadosPacienteNuevo({
      dui: limpiar(paciente.dui),
      correo: limpiar(paciente.correo_electronico),
      telefono: telefonoPaciente
    });

    await query('START TRANSACTION');

    const persona = await query(
      `INSERT INTO persona
        (nombre, apellidos, sexo, dui, correo_electronico, telefono, fecha_nacimiento, fecha_creacion, usuario_creacion, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1)`,
      [
        limpiar(paciente.nombre),
        limpiar(paciente.apellidos),
        limpiar(paciente.sexo),
        limpiar(paciente.dui),
        limpiar(paciente.correo_electronico),
        telefonoPaciente,
        limpiar(paciente.fecha_nacimiento),
        idUsuario
      ]
    );

    const { correlativo, secuencia } = await generarCorrelativoPaciente(paciente.nombre, paciente.apellidos);

    const pacienteResult = await query(
      `INSERT INTO paciente
        (id_persona, correlativo, secuencia, id_tipo_paciente, id_carrera, id_area,
         sector, municipio_nacimiento, direccion, departamento, municipio_residencia,
         nombre_padre, nombre_madre, nombre_empleado_referencia, carnet, fecha_creacion, usuario_creacion, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NOW(), ?, 1)`,
      [
        persona.insertId,
        correlativo,
        secuencia,
        limpiar(paciente.id_tipo_paciente) || 1,
        limpiar(paciente.id_carrera),
        limpiar(paciente.id_area),
        limpiar(paciente.sector),
        limpiar(paciente.municipio_nacimiento),
        limpiar(paciente.direccion),
        limpiar(paciente.departamento),
        limpiar(paciente.municipio_residencia),
        limpiar(paciente.nombre_padre),
        limpiar(paciente.nombre_madre),
        limpiar(paciente.carnet),
        idUsuario
      ]
    );

    if (paciente.contacto_nombre || paciente.contacto_parentesco || paciente.contacto_telefono) {
      await query(
        `INSERT INTO contacto_emergencia
          (id_paciente, nombre, parentesco, telefono, version, fecha_creacion, usuario_creacion)
         VALUES (?, ?, ?, ?, 1, NOW(), ?)`,
        [pacienteResult.insertId, limpiar(paciente.contacto_nombre), limpiar(paciente.contacto_parentesco), telefonoEmergencia, idUsuario]
      );
    }

    const consulta = await crearRecepcionYConsulta({
      idPaciente: pacienteResult.insertId,
      idDoctor: id_doctor,
      tipoConsulta: 'Nuevo ingreso',
      idUsuario
    });

    if (peso || talla || presion_sistolica || presion_diastolica) {
      await query(
        `INSERT INTO examen_fisico
          (id_paciente, id_consulta, peso, unidad_peso, talla, unidad_talla, temperatura, pulso, frecuencia_cardiaca,
           presion_sistolica, presion_diastolica, antecedentes, examen_fisico, fecha_creacion, usuario_creacion, version)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, NULL, NULL, NOW(), ?, 1)`,
        [
          pacienteResult.insertId,
          consulta.id_consulta,
          limpiar(peso),
          peso ? unidadPeso(unidad_peso) : null,
          limpiar(talla),
          talla ? unidadTalla(unidad_talla) : null,
          limpiar(presion_sistolica),
          limpiar(presion_diastolica),
          idUsuario
        ]
      );
    }

    await query(
      `INSERT INTO nuevo_ingreso
        (id_paciente, id_consulta, dt, dt_fecha_dosis, dt_dosis, hepatitis_b, hepatitis_b_fecha_dosis, hepatitis_b_dosis,
         otras_vacunas, enfermedades_cronicas, detalle_enfermedades, problemas_auditivos, detalle_auditivos,
         problemas_visuales, detalle_visuales, fecha_creacion, usuario_creacion, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, 1)
       ON DUPLICATE KEY UPDATE
         id_paciente = VALUES(id_paciente),
         dt = VALUES(dt),
         dt_fecha_dosis = VALUES(dt_fecha_dosis),
         dt_dosis = VALUES(dt_dosis),
         hepatitis_b = VALUES(hepatitis_b),
         hepatitis_b_fecha_dosis = VALUES(hepatitis_b_fecha_dosis),
         hepatitis_b_dosis = VALUES(hepatitis_b_dosis),
         otras_vacunas = VALUES(otras_vacunas),
         enfermedades_cronicas = VALUES(enfermedades_cronicas),
         detalle_enfermedades = VALUES(detalle_enfermedades),
         problemas_auditivos = VALUES(problemas_auditivos),
         detalle_auditivos = VALUES(detalle_auditivos),
         problemas_visuales = VALUES(problemas_visuales),
         detalle_visuales = VALUES(detalle_visuales),
         fecha_modificacion = CURDATE(),
         usuario_modificacion = ?,
         version = COALESCE(version, 1) + 1`,
      [
        pacienteResult.insertId,
        consulta.id_consulta,
        nuevo_ingreso.dt ? 1 : 0,
        limpiarFecha(nuevo_ingreso.dt_fecha_dosis),
        limpiarEntero(nuevo_ingreso.dt_dosis),
        nuevo_ingreso.hepatitis_b ? 1 : 0,
        limpiarFecha(nuevo_ingreso.hepatitis_b_fecha_dosis),
        limpiarEntero(nuevo_ingreso.hepatitis_b_dosis),
        limpiar(nuevo_ingreso.otras_vacunas),
        nuevo_ingreso.enfermedades_cronicas ? 1 : 0,
        limpiar(nuevo_ingreso.detalle_enfermedades),
        nuevo_ingreso.problemas_auditivos ? 1 : 0,
        limpiar(nuevo_ingreso.detalle_auditivos),
        nuevo_ingreso.problemas_visuales ? 1 : 0,
        limpiar(nuevo_ingreso.detalle_visuales),
        idUsuario,
        idUsuario
      ]
    );

    await registrarAuditoria({
      req,
      tabla_afectada: 'consulta',
      id_registro: consulta.id_consulta,
      accion: 'INSERT',
      usuario_accion: idUsuario,
      datos_nuevos: await obtenerRegistro('consulta', 'id_consulta', consulta.id_consulta),
      descripcion: 'Generación de consulta de nuevo ingreso'
    });

    await query('COMMIT');
    res.status(201).json({
      mensaje: 'Consulta de nuevo ingreso generada correctamente',
      id_paciente: pacienteResult.insertId,
      correlativo,
      ...consulta
    });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Error al generar nuevo ingreso:', err);
    res.status(err.status || (err.code ? 500 : 400)).json({
      errors: err.errors || undefined,
      mensaje: err.status || !err.code
        ? err.message || 'Error al generar nuevo ingreso'
        : 'No se pudo generar la consulta. Revise que la base de datos tenga la estructura actualizada.'
    });
  }
};

exports.generarConsultaGeneral = async (req, res) => {
  try {
    const {
      id_paciente,
      id_doctor,
      tipo_consulta,
      peso,
      unidad_peso,
      talla,
      unidad_talla,
      presion_sistolica,
      presion_diastolica
    } = req.body;
    const idUsuario = usuarioAccion(req);

    if (!id_paciente) return res.status(400).json({ mensaje: 'Debe seleccionar un paciente' });
    if (!id_doctor) return res.status(400).json({ mensaje: 'Debe seleccionar un doctor' });
    if (!tipo_consulta) return res.status(400).json({ mensaje: 'Debe seleccionar el tipo de consulta' });
    validarMedidas({ peso, unidad_peso, talla, unidad_talla, presion_sistolica, presion_diastolica });

    await query('START TRANSACTION');
    const consulta = await crearRecepcionYConsulta({
      idPaciente: id_paciente,
      idDoctor: id_doctor,
      tipoConsulta: tipo_consulta,
      idUsuario
    });

    if (peso || talla || presion_sistolica || presion_diastolica) {
      await query(
        `INSERT INTO examen_fisico
          (id_paciente, id_consulta, peso, unidad_peso, talla, unidad_talla, temperatura, pulso, frecuencia_cardiaca,
           presion_sistolica, presion_diastolica, antecedentes, examen_fisico, fecha_creacion, usuario_creacion, version)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, NULL, NULL, NOW(), ?, 1)`,
        [
          id_paciente,
          consulta.id_consulta,
          limpiar(peso),
          peso ? unidadPeso(unidad_peso) : null,
          limpiar(talla),
          talla ? unidadTalla(unidad_talla) : null,
          limpiar(presion_sistolica),
          limpiar(presion_diastolica),
          idUsuario
        ]
      );
    }

    await registrarAuditoria({
      req,
      tabla_afectada: 'consulta',
      id_registro: consulta.id_consulta,
      accion: 'INSERT',
      usuario_accion: idUsuario,
      datos_nuevos: await obtenerRegistro('consulta', 'id_consulta', consulta.id_consulta),
      descripcion: 'Generación de consulta general'
    });

    await query('COMMIT');
    res.status(201).json({ mensaje: 'Consulta generada correctamente', ...consulta });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Error al generar consulta general:', err);
    res.status(500).json({ mensaje: err.message || 'Error al generar consulta general' });
  }
};

exports.consultasPaciente = (req, res) => {

  const { id } = req.params;

  const query = `
    SELECT 
      c.fecha_creacion,
      c.diagnostico,
      CONCAT(per.nombre, ' ', per.apellidos) AS doctor,
      c.tipo_consulta

    FROM consulta c
    JOIN doctor d ON c.id_doctor = d.id_doctor
    JOIN usuario u ON d.id_usuario = u.id_usuario
    JOIN persona per ON u.id_persona = per.id_persona

    WHERE c.id_paciente = ?
    ORDER BY c.fecha_creacion DESC
  `;

  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

///  CONSULTA NORMAL
exports.crearConsulta = (req, res) => {

  const {
    id_paciente,
    id_doctor,
    tipo_consulta,
    peso,
    talla,
    sistolica,
    diastolica
  } = req.body;

  db.query('SELECT id_doctor FROM doctor WHERE id_doctor = ? LIMIT 1', [id_doctor], (doctorErr, doctores) => {
    if (doctorErr) return res.status(500).json(doctorErr);
    if (!doctores || doctores.length === 0) {
      return res.status(400).json({ mensaje: 'La consulta solo puede asignarse a un doctor registrado.' });
    }

  // 1. CREAR CONSULTA
  db.query(
    `INSERT INTO consulta 
    (id_paciente, id_doctor, tipo_consulta, estado, fecha_creacion, version)
    VALUES (?, ?, ?, 'Pendiente', NOW(), 1)`,

    [id_paciente, id_doctor, tipo_consulta],

    (err, result) => {

      if (err) return res.status(500).json(err);

      const id_consulta = result.insertId;

      // 2. CREAR EXAMEN FISICO (valores básicos)
      db.query(
        `INSERT INTO examen_fisico 
        (id_paciente, peso, talla, presion_sistolica, presion_diastolica, fecha_creacion, version)
        VALUES (?, ?, ?, ?, ?, NOW(), 1)`,

        [id_paciente, peso || null, talla || null, sistolica || null, diastolica || null]
      );

      res.json({
        mensaje: 'Consulta creada correctamente',
        id_consulta
      });
    }
  );
  });
};


///  CONSULTA NUEVO INGRESO
exports.crearConsultaNuevoIngreso = (req, res) => {

  const {
    nombre,
    apellidos,
    sexo,
    fecha_nacimiento,
    telefono,
    id_carrera,
    contacto_nombre,
    contacto_parentesco,
    contacto_telefono,
    id_doctor
  } = req.body;

  db.query('SELECT id_doctor FROM doctor WHERE id_doctor = ? LIMIT 1', [id_doctor], (doctorErr, doctores) => {
    if (doctorErr) return res.status(500).json(doctorErr);
    if (!doctores || doctores.length === 0) {
      return res.status(400).json({ mensaje: 'La consulta solo puede asignarse a un doctor registrado.' });
    }
    try {
      validarFechaNoFutura(fecha_nacimiento);
    } catch (error) {
      return res.status(400).json({ mensaje: error.message, errors: { fecha_nacimiento: error.message } });
    }

  // 1. CREAR PERSONA
  db.query(
    `INSERT INTO persona 
    (nombre, apellidos, sexo, telefono, fecha_nacimiento, fecha_creacion, version)
    VALUES (?, ?, ?, ?, ?, NOW(), 1)`,

    [nombre, apellidos, sexo, telefono, fecha_nacimiento],

    (err, resultPersona) => {

      if (err) return res.status(500).json(err);

      const id_persona = resultPersona.insertId;

      // 2. CREAR PACIENTE (rápido)
      db.query(
        `INSERT INTO paciente 
        (id_persona, correlativo, secuencia, id_tipo_paciente, id_carrera, sector, direccion, departamento, municipio_residencia, version)
        VALUES (?, 'TEMP', 0, 1, ?, 'N/A', 'N/A', 'N/A', 'N/A', 1)`,

        [id_persona, id_carrera],

        (err2, resultPaciente) => {

          if (err2) return res.status(500).json(err2);

          const id_paciente = resultPaciente.insertId;

          // 3. CONTACTO EMERGENCIA
          db.query(
            `INSERT INTO contacto_emergencia 
            (id_paciente, nombre, parentesco, telefono, version, fecha_creacion)
            VALUES (?, ?, ?, ?, 1, NOW())`,

            [id_paciente, contacto_nombre, contacto_parentesco, contacto_telefono]
          );

          // 4. CONSULTA
          db.query(
            `INSERT INTO consulta 
            (id_paciente, id_doctor, tipo_consulta, estado, fecha_creacion, version)
            VALUES (?, ?, 'Nuevo Ingreso', 'Pendiente', NOW(), 1)`,

            [id_paciente, id_doctor],

            (err3, resultConsulta) => {

              if (err3) return res.status(500).json(err3);

              // 5. NUEVO INGRESO (todo NULL)
              db.query(
                `INSERT INTO nuevo_ingreso 
                (id_paciente, id_consulta, fecha_creacion, version)
                VALUES (?, ?, CURDATE(), 1)`,

                [id_paciente, resultConsulta.insertId]
              );

              res.json({
                mensaje: 'Consulta de nuevo ingreso creada'
              });
            }
          );
        }
      );
    }
  );
  });
};


/// OBTENER CONSULTAS
exports.obtenerConsultas = (req, res) => {
  const query = `
    SELECT 
      c.id_consulta,
      p.nombre,
      p.apellidos,
      c.tipo_consulta,
      c.tipo_paciente,
      c.proyecto,
      c.estado
    FROM consulta c
    INNER JOIN paciente p ON c.id_paciente = p.id_paciente
  `;

  db.query(query, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

/// OBTENER UNA CONSULTA
exports.obtenerConsultaPorId = (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT c.*, p.nombre, p.apellidos
    FROM consulta c
    INNER JOIN paciente p ON c.id_paciente = p.id_paciente
    WHERE c.id_consulta = ?
  `;

  db.query(query, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0]);
  });
};

/// INICIAR CONSULTA
exports.iniciarConsulta = async (req, res) => {
  const { id } = req.params;
  const idUsuario = usuarioAccion(req);

  try {
    const idDoctor = await obtenerDoctorPorUsuario(idUsuario);
    if (!idDoctor) return res.status(403).json({ mensaje: 'Solo un doctor registrado puede realizar consultas.' });
    const pertenece = await validarConsultaPerteneceADoctor(id, idDoctor);
    if (!pertenece) return res.status(404).json({ mensaje: 'Consulta no encontrada para este doctor' });

    const anterior = await obtenerRegistro('consulta', 'id_consulta', id);
    if (!anterior) return res.status(404).json({ mensaje: 'Consulta no encontrada' });

    await query(
      `UPDATE consulta
       SET estado = 'EN_PROCESO',
           fecha_modificacion = NOW(),
           usuario_modificacion = ?,
           version = COALESCE(version, 0) + 1
       WHERE id_consulta = ?`,
      [idUsuario, id]
    );

    const nuevo = await obtenerRegistro('consulta', 'id_consulta', id);
    await registrarAuditoria({
      req,
      tabla_afectada: 'consulta',
      id_registro: id,
      accion: 'UPDATE',
      usuario_accion: idUsuario,
      datos_anteriores: anterior,
      datos_nuevos: nuevo,
      descripcion: 'Inicio de consulta'
    });

    return res.json({ mensaje: 'Consulta iniciada' });
  } catch (err) {
    console.error('Error al iniciar consulta:', err);
    return res.status(500).json(err);
  }
};

/// FINALIZAR CONSULTA NORMAL
exports.finalizarConsulta = async (req, res) => {
  const { id } = req.params;
  const { diagnostico, tratamiento } = req.body;
  const idUsuario = usuarioAccion(req);

  try {
    const idDoctor = await obtenerDoctorPorUsuario(idUsuario);
    if (!idDoctor) return res.status(403).json({ mensaje: 'Solo un doctor registrado puede realizar consultas.' });
    const pertenece = await validarConsultaPerteneceADoctor(id, idDoctor);
    if (!pertenece) return res.status(404).json({ mensaje: 'Consulta no encontrada para este doctor' });

    const anterior = await obtenerRegistro('consulta', 'id_consulta', id);
    if (!anterior) return res.status(404).json({ mensaje: 'Consulta no encontrada' });

    await query(
      `UPDATE consulta
       SET diagnostico = ?,
           tratamiento = ?,
           estado = 'FINALIZADO',
           fecha_modificacion = NOW(),
           usuario_modificacion = ?,
           version = COALESCE(version, 0) + 1
       WHERE id_consulta = ?`,
      [diagnostico, tratamiento, idUsuario, id]
    );

    const nuevo = await obtenerRegistro('consulta', 'id_consulta', id);
    await registrarAuditoria({
      req,
      tabla_afectada: 'consulta',
      id_registro: id,
      accion: 'UPDATE',
      usuario_accion: idUsuario,
      datos_anteriores: anterior,
      datos_nuevos: nuevo,
      descripcion: 'Finalización de consulta'
    });

    return res.json({ mensaje: 'Consulta finalizada' });
  } catch (err) {
    console.error('Error al finalizar consulta:', err);
    return res.status(500).json(err);
  }
};

/// NUEVO INGRESO
exports.nuevoIngreso = (req, res) => {
  const { id } = req.params;

  const {
    diagnostico,
    tratamiento,
    id_paciente,

    dt,
    dt_dosis,
    hepatitis_b,
    hepatitis_b_dosis,
    otras_vacunas,
    enfermedades_cronicas,
    detalle_enfermedades,
    problemas_auditivos,
    detalle_auditivos,
    problemas_visuales,
    detalle_visuales
  } = req.body;

  // 🔹 1. ACTUALIZAR CONSULTA
  db.query(
    `UPDATE consulta 
     SET diagnostico=?, tratamiento=?, estado='FINALIZADO'
     WHERE id_consulta=?`,
    [diagnostico, tratamiento, id],
    (err) => {
      if (err) return res.status(500).json(err);

      // 🔹 2. INSERTAR EN NUEVO INGRESO (AQUÍ ESTÁ LA CLAVE 🔥)
      db.query(
        `INSERT INTO nuevo_ingreso (
          id_paciente,
          id_consulta,
          dt,
          dt_dosis,
          hepatitis_b,
          hepatitis_b_dosis,
          otras_vacunas,
          enfermedades_cronicas,
          detalle_enfermedades,
          problemas_auditivos,
          detalle_auditivos,
          problemas_visuales,
          detalle_visuales,
          fecha_creacion,
          version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 1)
        ON DUPLICATE KEY UPDATE
          id_paciente = VALUES(id_paciente),
          dt = VALUES(dt),
          dt_dosis = VALUES(dt_dosis),
          hepatitis_b = VALUES(hepatitis_b),
          hepatitis_b_dosis = VALUES(hepatitis_b_dosis),
          otras_vacunas = VALUES(otras_vacunas),
          enfermedades_cronicas = VALUES(enfermedades_cronicas),
          detalle_enfermedades = VALUES(detalle_enfermedades),
          problemas_auditivos = VALUES(problemas_auditivos),
          detalle_auditivos = VALUES(detalle_auditivos),
          problemas_visuales = VALUES(problemas_visuales),
          detalle_visuales = VALUES(detalle_visuales),
          fecha_modificacion = CURDATE(),
          version = COALESCE(version, 1) + 1`,
        [
          id_paciente,
          id,
          dt,
          dt_dosis,
          hepatitis_b,
          hepatitis_b_dosis,
          otras_vacunas,
          enfermedades_cronicas,
          detalle_enfermedades,
          problemas_auditivos,
          detalle_auditivos,
          problemas_visuales,
          detalle_visuales
        ],
        (err) => {
          if (err) return res.status(500).json(err);

          res.json({ mensaje: 'Nuevo ingreso guardado correctamente' });
        }
      );
    }
  );
};
