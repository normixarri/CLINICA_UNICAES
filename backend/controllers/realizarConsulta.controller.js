const db = require('../config/db');
const { registrarAuditoria, obtenerRegistro } = require('../helpers/auditoria.helper');
const { validarFechaNoFutura } = require('../helpers/validaciones.helper');

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const limpiar = (valor) => {
  if (valor === undefined || valor === null) return null;
  if (typeof valor === 'string') {
    const limpio = valor.trim();
    return limpio === '' ? null : limpio;
  }
  return valor;
};

const limpiarEntero = (valor) => {
  const limpio = limpiar(valor);
  if (limpio === null) return null;
  const numero = Number(limpio);
  return Number.isInteger(numero) ? numero : null;
};

const limpiarFecha = (valor) => {
  const limpio = limpiar(valor);
  if (limpio === null) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(limpio)) ? limpio : null;
};

const validarNuevoIngreso = (nuevoIngreso = {}) => {
  const errores = [];

  if (nuevoIngreso.dt) {
    if (!limpiarFecha(nuevoIngreso.dt_fecha_dosis)) errores.push('Debe ingresar una fecha valida para dosis DT.');
    else {
      try { validarFechaNoFutura(nuevoIngreso.dt_fecha_dosis); } catch { errores.push('No se permiten fechas futuras.'); }
    }
    if (limpiarEntero(nuevoIngreso.dt_dosis) === null) errores.push('Debe ingresar el numero de dosis DT.');
  }

  if (nuevoIngreso.hepatitis_b) {
    if (!limpiarFecha(nuevoIngreso.hepatitis_b_fecha_dosis)) errores.push('Debe ingresar una fecha valida para dosis Hepatitis B.');
    else {
      try { validarFechaNoFutura(nuevoIngreso.hepatitis_b_fecha_dosis); } catch { errores.push('No se permiten fechas futuras.'); }
    }
    if (limpiarEntero(nuevoIngreso.hepatitis_b_dosis) === null) errores.push('Debe ingresar el numero de dosis Hepatitis B.');
  }

  [
    ['enfermedades_cronicas', 'detalle_enfermedades', 'Debe ingresar el detalle de enfermedades cronicas.'],
    ['problemas_auditivos', 'detalle_auditivos', 'Debe ingresar el detalle de problemas auditivos.'],
    ['problemas_visuales', 'detalle_visuales', 'Debe ingresar el detalle de problemas visuales.']
  ].forEach(([bandera, detalle, mensaje]) => {
    if (nuevoIngreso[bandera] && !limpiar(nuevoIngreso[detalle])) errores.push(mensaje);
  });

  if (errores.length > 0) {
    const error = new Error(errores.join(' '));
    error.status = 400;
    throw error;
  }
};

const guardarDatosNuevoIngresoPaciente = async (idPaciente, idConsulta, nuevoIngreso) => {
  if (!nuevoIngreso) throw new Error('Debe enviar los datos de nuevo ingreso');

  await query(
    `INSERT INTO nuevo_ingreso
      (id_paciente, id_consulta, dt, dt_fecha_dosis, dt_dosis, hepatitis_b, hepatitis_b_fecha_dosis, hepatitis_b_dosis, otras_vacunas,
       enfermedades_cronicas, detalle_enfermedades, problemas_auditivos, detalle_auditivos,
       problemas_visuales, detalle_visuales, fecha_creacion, fecha_modificacion, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), CURDATE(), 1)
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
       version = COALESCE(version, 1) + 1`,
    [
      idPaciente,
      idConsulta,
      nuevoIngreso.dt ? 1 : 0,
      limpiarFecha(nuevoIngreso.dt_fecha_dosis),
      limpiarEntero(nuevoIngreso.dt_dosis),
      nuevoIngreso.hepatitis_b ? 1 : 0,
      limpiarFecha(nuevoIngreso.hepatitis_b_fecha_dosis),
      limpiarEntero(nuevoIngreso.hepatitis_b_dosis),
      limpiar(nuevoIngreso.otras_vacunas),
      nuevoIngreso.enfermedades_cronicas ? 1 : 0,
      limpiar(nuevoIngreso.detalle_enfermedades),
      nuevoIngreso.problemas_auditivos ? 1 : 0,
      limpiar(nuevoIngreso.detalle_auditivos),
      nuevoIngreso.problemas_visuales ? 1 : 0,
      limpiar(nuevoIngreso.detalle_visuales)
    ]
  );
};

const obtenerDoctorAutenticado = async (req) => {
  const idUsuario = req.usuario?.id_usuario;
  if (!idUsuario) {
    const error = new Error('Debe iniciar sesion para realizar consultas.');
    error.status = 401;
    throw error;
  }

  const rows = await query(
    `SELECT d.id_doctor
     FROM doctor d
     INNER JOIN usuario u ON d.id_usuario = u.id_usuario
     WHERE d.id_usuario = ? AND u.estado = 1
     LIMIT 1`,
    [idUsuario]
  );

  if (rows.length === 0) {
    const error = new Error('Solo un doctor registrado puede realizar consultas.');
    error.status = 403;
    throw error;
  }

  return rows[0].id_doctor;
};

const obtenerConsultaDelDoctor = async (idConsulta, idDoctor) => {
  const rows = await query(
    `SELECT id_consulta, id_paciente, id_doctor
     FROM consulta
     WHERE id_consulta = ? AND id_doctor = ?
     LIMIT 1`,
    [idConsulta, idDoctor]
  );

  return rows[0] || null;
};

const responderError = (res, err, mensajeFallback) => {
  res.status(err.status || 500).json({ mensaje: err.message || mensajeFallback });
};

exports.misConsultas = async (req, res) => {
  try {
    const idDoctor = await obtenerDoctorAutenticado(req);
    const rows = await query(
      `
      SELECT
        c.id_consulta,
        c.id_paciente,
        c.id_doctor,
        c.tipo_consulta,
        LOWER(c.estado) AS estado,
        p.correlativo AS expediente,
        CONCAT(per.nombre, ' ', per.apellidos) AS paciente,
        tp.nombre AS tipo_paciente,
        CASE
          WHEN COALESCE(py.tiene_proyeccion, 0) = 1 THEN 'PY'
          WHEN COALESCE(py.tiene_lamar, 0) = 1 THEN 'LAMAR'
          ELSE '-'
        END AS proyecto
      FROM consulta c
      INNER JOIN doctor d ON c.id_doctor = d.id_doctor
      INNER JOIN paciente p ON c.id_paciente = p.id_paciente
      INNER JOIN persona per ON p.id_persona = per.id_persona
      LEFT JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
      LEFT JOIN (
        SELECT
          pp.id_paciente,
          MAX(CASE WHEN LOWER(pr.nombre) LIKE '%proyecci%' THEN 1 ELSE 0 END) AS tiene_proyeccion,
          MAX(CASE WHEN LOWER(pr.nombre) LIKE '%lamar%' THEN 1 ELSE 0 END) AS tiene_lamar
        FROM paciente_proyecto pp
        INNER JOIN proyecto pr ON pp.id_proyecto = pr.id_proyecto
        GROUP BY pp.id_paciente
      ) py ON p.id_paciente = py.id_paciente
      WHERE d.id_doctor = ?
        AND LOWER(c.estado) IN ('pendiente', 'en proceso', 'finalizada', 'finalizado')
      ORDER BY FIELD(LOWER(c.estado), 'en proceso', 'pendiente', 'finalizada', 'finalizado'), c.fecha_creacion DESC
      `,
      [idDoctor]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener mis consultas:', err);
    responderError(res, err, 'Error al obtener mis consultas');
  }
};

exports.obtenerConsulta = async (req, res) => {
  try {
    const { id_consulta } = req.params;
    const idDoctor = await obtenerDoctorAutenticado(req);
    const rows = await query(
      `
      SELECT
        c.*,
        p.correlativo AS expediente,
        p.id_paciente,
        CONCAT(per.nombre, ' ', per.apellidos) AS paciente,
        per.fecha_nacimiento,
        TIMESTAMPDIFF(YEAR, per.fecha_nacimiento, CURDATE()) AS edad,
        tp.nombre AS tipo_paciente,
        d.jvpm,
        CONCAT(pd.nombre, ' ', pd.apellidos) AS doctor
      FROM consulta c
      INNER JOIN paciente p ON c.id_paciente = p.id_paciente
      INNER JOIN persona per ON p.id_persona = per.id_persona
      LEFT JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
      LEFT JOIN doctor d ON c.id_doctor = d.id_doctor
      LEFT JOIN usuario ud ON d.id_usuario = ud.id_usuario
      LEFT JOIN persona pd ON ud.id_persona = pd.id_persona
      WHERE c.id_consulta = ? AND c.id_doctor = ?
      LIMIT 1
      `,
      [id_consulta, idDoctor]
    );

    if (rows.length === 0) return res.status(404).json({ mensaje: 'Consulta no encontrada para este doctor' });
    const consulta = rows[0];

    const [recetas, medicamentosReceta, incapacidades, constancias, referencias, ingresos, medidas] = await Promise.all([
      query('SELECT id_receta, indicaciones FROM receta WHERE id_consulta = ? ORDER BY id_receta DESC LIMIT 1', [id_consulta]),
      query(
        `
        SELECT
          rm.id_receta,
          rm.id_medicamento,
          rm.dosis,
          rm.cantidad_por_toma,
          rm.frecuencia,
          rm.duracion,
          rm.cantidad_indicada,
          rm.cantidad_entregada,
          rm.unidad_entrega,
          rm.unidad_dosis,
          rm.intervalo,
          rm.unidad_intervalo,
          rm.unidad_duracion,
          rm.indicacion_generada,
          rm.observacion,
          m.nombre,
          m.stock,
          pr.nombre_presentacion AS presentacion,
          pr.descripcion,
          cat.nombre AS categoria
        FROM receta r
        INNER JOIN receta_medicamento rm ON r.id_receta = rm.id_receta
        INNER JOIN medicamento m ON rm.id_medicamento = m.id_medicamento
        LEFT JOIN presentacion pr ON m.id_presentacion = pr.id_presentacion
        LEFT JOIN categoria cat ON m.id_categoria = cat.id_categoria
        WHERE r.id_consulta = ?
        ORDER BY rm.fecha_creacion ASC, m.nombre ASC
        `,
        [id_consulta]
      ),
      query('SELECT id_incapacidad, diagnostico, dias_incapacidad FROM incapacidad WHERE id_consulta = ? ORDER BY id_incapacidad DESC LIMIT 1', [id_consulta]),
      query('SELECT id_constancia, id_tipo_constancia FROM constancia WHERE id_consulta = ? ORDER BY id_constancia DESC LIMIT 1', [id_consulta]),
      query('SELECT id_referencia, lugar_referencia, especialidad FROM referencia WHERE id_consulta = ? ORDER BY id_referencia DESC LIMIT 1', [id_consulta]),
      query(
        `SELECT
           id_nuevo_ingreso,
           id_paciente,
           id_consulta,
           dt,
           DATE_FORMAT(dt_fecha_dosis, '%Y-%m-%d') AS dt_fecha_dosis,
           dt_dosis,
           hepatitis_b,
           DATE_FORMAT(hepatitis_b_fecha_dosis, '%Y-%m-%d') AS hepatitis_b_fecha_dosis,
           hepatitis_b_dosis,
           otras_vacunas,
           enfermedades_cronicas,
           detalle_enfermedades,
           problemas_auditivos,
           detalle_auditivos,
           problemas_visuales,
           detalle_visuales,
           fecha_creacion,
           fecha_modificacion,
           version,
           CASE
             WHEN fecha_modificacion IS NOT NULL
               OR dt IS NOT NULL
               OR dt_fecha_dosis IS NOT NULL
               OR dt_dosis IS NOT NULL
               OR hepatitis_b IS NOT NULL
               OR hepatitis_b_fecha_dosis IS NOT NULL
               OR hepatitis_b_dosis IS NOT NULL
               OR otras_vacunas IS NOT NULL
               OR enfermedades_cronicas IS NOT NULL
               OR detalle_enfermedades IS NOT NULL
               OR problemas_auditivos IS NOT NULL
               OR detalle_auditivos IS NOT NULL
               OR problemas_visuales IS NOT NULL
               OR detalle_visuales IS NOT NULL
             THEN 1
             ELSE 0
           END AS tiene_datos_enfermeria
         FROM nuevo_ingreso
         WHERE id_consulta = ? OR (id_consulta IS NULL AND id_paciente = ?)
         ORDER BY CASE WHEN id_consulta = ? THEN 0 ELSE 1 END, id_nuevo_ingreso DESC
         LIMIT 1`,
        [id_consulta, consulta.id_paciente, id_consulta]
      ),
      query(
        `SELECT id_examen_fisico, peso, unidad_peso, talla, unidad_talla, presion_sistolica, presion_diastolica
         FROM examen_fisico
         WHERE id_consulta = ?
         ORDER BY id_examen_fisico DESC
         LIMIT 1`,
        [id_consulta]
      )
    ]);

    res.json({
      ...consulta,
      receta: recetas[0] || null,
      medicamentos_receta: medicamentosReceta,
      incapacidad: incapacidades[0] || null,
      constancia: constancias[0] || null,
      referencia: referencias[0] || null,
      nuevo_ingreso: ingresos[0] || null,
      medidas_antropometricas: medidas[0] || null
    });
  } catch (err) {
    console.error('Error al obtener consulta:', err);
    responderError(res, err, 'Error al obtener consulta');
  }
};

exports.iniciarConsulta = async (req, res) => {
  try {
    const { id_consulta } = req.params;
    const idDoctor = await obtenerDoctorAutenticado(req);
    const consultaAsignada = await obtenerConsultaDelDoctor(id_consulta, idDoctor);
    if (!consultaAsignada) return res.status(404).json({ mensaje: 'Consulta no encontrada para este doctor' });
    const anterior = await obtenerRegistro('consulta', 'id_consulta', id_consulta);
    await query(
      `UPDATE consulta
       SET estado = 'en proceso', fecha_modificacion = NOW()
       WHERE id_consulta = ? AND id_doctor = ?`,
      [id_consulta, idDoctor]
    );
    await registrarAuditoria({
      req,
      tabla_afectada: 'consulta',
      id_registro: id_consulta,
      accion: 'UPDATE',
      usuario_accion: req.usuario?.id_usuario || null,
      datos_anteriores: anterior,
      datos_nuevos: await obtenerRegistro('consulta', 'id_consulta', id_consulta),
      descripcion: 'Inicio de atención de consulta'
    });
    res.json({ mensaje: 'Consulta iniciada' });
  } catch (err) {
    console.error('Error al iniciar consulta:', err);
    responderError(res, err, 'Error al iniciar consulta');
  }
};

exports.finalizarConsulta = async (req, res) => {
  try {
    const { id_consulta } = req.params;
    const { diagnostico, tratamiento } = req.body;

    const idDoctor = await obtenerDoctorAutenticado(req);
    const consultaAsignada = await obtenerConsultaDelDoctor(id_consulta, idDoctor);
    if (!consultaAsignada) return res.status(404).json({ mensaje: 'Consulta no encontrada para este doctor' });
    const anterior = await obtenerRegistro('consulta', 'id_consulta', id_consulta);

    await query('START TRANSACTION');

    await query(
      `UPDATE consulta
       SET diagnostico = ?,
           tratamiento = ?,
           estado = 'finalizada',
           fecha_modificacion = NOW()
       WHERE id_consulta = ? AND id_doctor = ?`,
      [limpiar(diagnostico), limpiar(tratamiento), id_consulta, idDoctor]
    );

    await query('COMMIT');
    await registrarAuditoria({
      req,
      tabla_afectada: 'consulta',
      id_registro: id_consulta,
      accion: 'UPDATE',
      usuario_accion: req.usuario?.id_usuario || null,
      datos_anteriores: anterior,
      datos_nuevos: await obtenerRegistro('consulta', 'id_consulta', id_consulta),
      descripcion: 'Finalización de atención de consulta'
    });
    res.json({ mensaje: 'Consulta finalizada' });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Error al finalizar consulta:', err);
    responderError(res, err, 'Error al finalizar consulta');
  }
};

exports.guardarConsulta = async (req, res) => {
  try {
    const { id_consulta } = req.params;
    const { diagnostico, tratamiento } = req.body;

    const idDoctor = await obtenerDoctorAutenticado(req);
    const consultaAsignada = await obtenerConsultaDelDoctor(id_consulta, idDoctor);
    if (!consultaAsignada) return res.status(404).json({ mensaje: 'Consulta no encontrada para este doctor' });
    const anterior = await obtenerRegistro('consulta', 'id_consulta', id_consulta);

    await query('START TRANSACTION');

    await query(
      `UPDATE consulta
       SET diagnostico = ?,
           tratamiento = ?,
           fecha_modificacion = NOW()
       WHERE id_consulta = ? AND id_doctor = ?`,
      [limpiar(diagnostico), limpiar(tratamiento), id_consulta, idDoctor]
    );

    await query('COMMIT');
    await registrarAuditoria({
      req,
      tabla_afectada: 'consulta',
      id_registro: id_consulta,
      accion: 'UPDATE',
      usuario_accion: req.usuario?.id_usuario || null,
      datos_anteriores: anterior,
      datos_nuevos: await obtenerRegistro('consulta', 'id_consulta', id_consulta),
      descripcion: 'Guardado parcial de atención de consulta'
    });
    res.json({ mensaje: 'Consulta guardada correctamente' });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Error al guardar consulta:', err);
    responderError(res, err, 'Error al guardar consulta');
  }
};

exports.guardarNuevoIngreso = async (req, res) => {
  try {
    const { id_consulta } = req.params;
    const nuevoIngreso = req.body?.nuevo_ingreso || req.body;

    const idDoctor = await obtenerDoctorAutenticado(req);
    const consultaAsignada = await obtenerConsultaDelDoctor(id_consulta, idDoctor);
    if (!consultaAsignada) return res.status(404).json({ mensaje: 'Consulta no encontrada para este doctor' });

    validarNuevoIngreso(nuevoIngreso);
    await guardarDatosNuevoIngresoPaciente(consultaAsignada.id_paciente, id_consulta, nuevoIngreso);

    await registrarAuditoria({
      req,
      tabla_afectada: 'nuevo_ingreso',
      id_registro: consultaAsignada.id_paciente,
      accion: 'UPDATE',
      usuario_accion: req.usuario?.id_usuario || null,
      descripcion: 'Guardado de datos de nuevo ingreso'
    });

    res.json({ mensaje: 'Datos de nuevo ingreso guardados correctamente.' });
  } catch (err) {
    console.error('Error al guardar datos de nuevo ingreso:', err);
    responderError(res, err, 'No se pudieron guardar los datos de nuevo ingreso');
  }
};
