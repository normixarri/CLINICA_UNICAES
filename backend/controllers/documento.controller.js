const db = require('../config/db');
const { registrarAuditoria } = require('../helpers/auditoria.helper');

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);

const baseDocumentoCampos = `
    c.id_consulta,
    c.tipo_consulta,
    c.diagnostico,
    c.tratamiento,
    c.fecha_creacion AS fecha_consulta,
    p.id_paciente,
    p.correlativo AS expediente,
    pp.nombre AS paciente_nombre,
    pp.apellidos AS paciente_apellidos,
    CONCAT(pp.nombre, ' ', pp.apellidos) AS paciente,
    pp.fecha_nacimiento,
    TIMESTAMPDIFF(YEAR, pp.fecha_nacimiento, CURDATE()) AS edad,
    tp.nombre AS tipo_paciente,
    d.id_doctor,
    d.id_usuario AS id_usuario_doctor,
    d.jvpm,
    CONCAT(dp.nombre, ' ', dp.apellidos) AS doctor
`;

const urls = (base) => ({
  firma_url: base.id_usuario_doctor ? `/api/usuarios/firma/${base.id_usuario_doctor}` : null,
  sello_url: '/api/configuracion/sello',
  sello_doctor_url: base.id_usuario_doctor ? `/api/usuarios/sello-doctor/${base.id_usuario_doctor}` : null,
  logo_url: '/logo.png'
});

const responderDocumento = (res, base, extra = {}) => {
  return res.json({
    ...base,
    fecha: new Date().toISOString(),
    ...extra,
    ...urls(base)
  });
};

const auditarImpresionHistorica = async (req, tabla, id, descripcion) => {
  try {
    await registrarAuditoria({
      req,
      tabla_afectada: tabla,
      id_registro: id,
      accion: 'UPDATE',
      usuario_accion: req.usuario?.id_usuario || null,
      datos_anteriores: null,
      datos_nuevos: null,
      descripcion
    });
  } catch (err) {
    console.error('Error registrando auditoria de impresion:', err);
  }
};

exports.obtenerRecetaPrint = async (req, res) => {
  try {
    const { id_receta } = req.params;
    const recetas = await query(
      `
      SELECT r.id_receta, r.indicaciones, ${baseDocumentoCampos}
      FROM receta r
      INNER JOIN consulta c ON r.id_consulta = c.id_consulta
      INNER JOIN paciente p ON c.id_paciente = p.id_paciente
      INNER JOIN persona pp ON p.id_persona = pp.id_persona
      LEFT JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
      LEFT JOIN doctor d ON c.id_doctor = d.id_doctor
      LEFT JOIN usuario du ON d.id_usuario = du.id_usuario
      LEFT JOIN persona dp ON du.id_persona = dp.id_persona
      WHERE r.id_receta = ?
      LIMIT 1
      `,
      [id_receta]
    );

    if (!recetas.length) return res.status(404).json({ mensaje: 'Receta no encontrada' });

    const medicamentos = await query(
      `
      SELECT
        m.nombre,
        pr.nombre_presentacion AS presentacion,
        pr.descripcion,
        cat.nombre AS categoria,
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
        rm.observacion
      FROM receta_medicamento rm
      INNER JOIN medicamento m ON rm.id_medicamento = m.id_medicamento
      LEFT JOIN presentacion pr ON m.id_presentacion = pr.id_presentacion
      LEFT JOIN categoria cat ON m.id_categoria = cat.id_categoria
      WHERE rm.id_receta = ?
      ORDER BY m.nombre
      `,
      [id_receta]
    );

    await auditarImpresionHistorica(req, 'receta', id_receta, 'Se imprimio receta historica desde expediente');
    return responderDocumento(res, recetas[0], { medicamentos });
  } catch (err) {
    console.error('Error al obtener receta para impresión:', err);
    return res.status(500).json({ mensaje: 'Error al obtener receta para impresión' });
  }
};

exports.obtenerIncapacidadPrint = async (req, res) => {
  try {
    const { id_incapacidad } = req.params;
    const rows = await query(
      `
      SELECT i.id_incapacidad, i.diagnostico AS diagnostico_documento, i.dias_incapacidad, ${baseDocumentoCampos}
      FROM incapacidad i
      INNER JOIN consulta c ON i.id_consulta = c.id_consulta
      INNER JOIN paciente p ON c.id_paciente = p.id_paciente
      INNER JOIN persona pp ON p.id_persona = pp.id_persona
      LEFT JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
      LEFT JOIN doctor d ON c.id_doctor = d.id_doctor
      LEFT JOIN usuario du ON d.id_usuario = du.id_usuario
      LEFT JOIN persona dp ON du.id_persona = dp.id_persona
      WHERE i.id_incapacidad = ?
      LIMIT 1
      `,
      [id_incapacidad]
    );

    if (!rows.length) return res.status(404).json({ mensaje: 'Incapacidad no encontrada' });
    await auditarImpresionHistorica(req, 'incapacidad', id_incapacidad, 'Se imprimio incapacidad historica desde expediente');
    return responderDocumento(res, rows[0]);
  } catch (err) {
    console.error('Error al obtener incapacidad para impresión:', err);
    return res.status(500).json({ mensaje: 'Error al obtener incapacidad para impresión' });
  }
};

exports.obtenerReferenciaPrint = async (req, res) => {
  try {
    const { id_referencia } = req.params;
    const rows = await query(
      `
      SELECT ref.id_referencia, ref.lugar_referencia, ref.especialidad AS especialidad_referencia, ${baseDocumentoCampos}
      FROM referencia ref
      INNER JOIN consulta c ON ref.id_consulta = c.id_consulta
      INNER JOIN paciente p ON c.id_paciente = p.id_paciente
      INNER JOIN persona pp ON p.id_persona = pp.id_persona
      LEFT JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
      LEFT JOIN doctor d ON c.id_doctor = d.id_doctor
      LEFT JOIN usuario du ON d.id_usuario = du.id_usuario
      LEFT JOIN persona dp ON du.id_persona = dp.id_persona
      WHERE ref.id_referencia = ?
      LIMIT 1
      `,
      [id_referencia]
    );

    if (!rows.length) return res.status(404).json({ mensaje: 'Referencia no encontrada' });
    await auditarImpresionHistorica(req, 'referencia', id_referencia, 'Se imprimio referencia historica desde expediente');
    return responderDocumento(res, rows[0]);
  } catch (err) {
    console.error('Error al obtener referencia para impresión:', err);
    return res.status(500).json({ mensaje: 'Error al obtener referencia para impresión' });
  }
};

exports.obtenerConstanciaPrint = async (req, res) => {
  try {
    const { id_constancia } = req.params;
    const rows = await query(
      `
      SELECT co.id_constancia, co.id_tipo_constancia, tc.nombre AS tipo_constancia, ${baseDocumentoCampos}
      FROM constancia co
      LEFT JOIN tipo_constancia tc ON co.id_tipo_constancia = tc.id_tipo_constancia
      INNER JOIN consulta c ON co.id_consulta = c.id_consulta
      INNER JOIN paciente p ON c.id_paciente = p.id_paciente
      INNER JOIN persona pp ON p.id_persona = pp.id_persona
      LEFT JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
      LEFT JOIN doctor d ON c.id_doctor = d.id_doctor
      LEFT JOIN usuario du ON d.id_usuario = du.id_usuario
      LEFT JOIN persona dp ON du.id_persona = dp.id_persona
      WHERE co.id_constancia = ?
      LIMIT 1
      `,
      [id_constancia]
    );

    if (!rows.length) return res.status(404).json({ mensaje: 'Constancia no encontrada' });

    const base = rows[0];
    const esNuevoIngreso = String(base.tipo_consulta || '').toLowerCase().includes('nuevo ingreso');
    let nuevo_ingreso = null;

    if (esNuevoIngreso) {
      const ingresos = await query(
        `SELECT * FROM nuevo_ingreso
         WHERE id_consulta = ? OR (id_consulta IS NULL AND id_paciente = ?)
         ORDER BY CASE WHEN id_consulta = ? THEN 0 ELSE 1 END, id_nuevo_ingreso DESC
         LIMIT 1`,
        [base.id_consulta, base.id_paciente, base.id_consulta]
      );
      nuevo_ingreso = ingresos[0] || null;
    }

    await auditarImpresionHistorica(req, 'constancia', id_constancia, 'Se imprimio constancia historica desde expediente');
    return responderDocumento(res, base, {
      formato_constancia: esNuevoIngreso ? 'nuevo_ingreso' : 'general',
      nuevo_ingreso
    });
  } catch (err) {
    console.error('Error al obtener constancia para impresión:', err);
    return res.status(500).json({ mensaje: 'Error al obtener constancia para impresión' });
  }
};
