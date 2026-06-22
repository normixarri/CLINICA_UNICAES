const db = require('../config/db');
const { registrarAuditoria } = require('../helpers/auditoria.helper');
const { validarCorreo, validarDui, validarFechaNoFutura, validarTelefono } = require('../helpers/validaciones.helper');
const {
  obtenerDepartamentos,
  obtenerMunicipios,
  existeDepartamento,
  existeMunicipioEnDepartamento
} = require('../data/territorioElSalvador');

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

const limpiarCatalogo = (valor) => String(valor || '').trim().replace(/\s+/g, ' ');
const contieneLetras = (valor) => /\p{L}/u.test(valor);
const limpiarTexto = (valor) => {
  const texto = String(valor || '').trim().replace(/\s+/g, ' ');
  return texto || null;
};
const errorCampo = (campo, mensaje) => {
  const error = new Error(mensaje);
  error.errors = { [campo]: mensaje };
  return error;
};
const validarCampoConLetras = (valor, campo, mensaje, obligatorio = false, mensajeObligatorio = '') => {
  const texto = limpiarTexto(valor);
  if (!texto) {
    if (obligatorio) throw errorCampo(campo, mensajeObligatorio);
    return;
  }
  if (!contieneLetras(texto)) throw errorCampo(campo, mensaje);
};

const usuarioAccion = (req) => req.usuario?.id_usuario || null;

const obtenerSnapshotPaciente = async (idPaciente) => {
  const rows = await query(
    `
    SELECT
      p.*,
      per.nombre,
      per.apellidos,
      per.sexo,
      per.correo_electronico,
      per.telefono,
      per.dui,
      per.fecha_nacimiento,
      ce.nombre AS contacto_nombre,
      ce.parentesco AS contacto_parentesco,
      ce.telefono AS contacto_telefono,
      pp.id_proyecto
    FROM paciente p
    JOIN persona per
      ON p.id_persona = per.id_persona
    LEFT JOIN contacto_emergencia ce
      ON p.id_paciente = ce.id_paciente
    LEFT JOIN paciente_proyecto pp
      ON p.id_paciente = pp.id_paciente
    WHERE p.id_paciente = ?
    LIMIT 1
    `,
    [idPaciente]
  );

  return rows[0] || null;
};

const toIntOrNull = (valor) => {
  const limpio = limpiar(valor);
  if (limpio === null) return null;
  const numero = Number(limpio);
  return Number.isNaN(numero) ? null : numero;
};

const normalizarTexto = (valor) => {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
};

const esTipo = (tipoNombre, esperado) => normalizarTexto(tipoNombre) === normalizarTexto(esperado);

const obtenerTipoPorId = async (idTipoPaciente) => {
  const rows = await query('SELECT id_tipo, nombre FROM tipo_paciente WHERE id_tipo = ?', [idTipoPaciente]);
  return rows[0] || null;
};

const obtenerProyectoPorId = async (idProyecto) => {
  const rows = await query('SELECT id_proyecto, nombre FROM proyecto WHERE id_proyecto = ?', [idProyecto]);
  return rows[0] || null;
};

const esProyeccionSocial = (proyecto) => normalizarTexto(proyecto?.nombre).includes('proyeccion social');
const esLamar = (proyecto) => normalizarTexto(proyecto?.nombre).includes('lamar');

const obtenerDepartamentoPorMunicipio = (municipioValor) => {
  const municipioNormalizado = normalizarTexto(municipioValor);
  if (!municipioNormalizado) return null;

  const departamento = obtenerDepartamentos().find((item) => {
    return (item.municipios || []).some((municipio) => normalizarTexto(municipio.nombre) === municipioNormalizado);
  });

  return departamento?.nombre || null;
};

const generarCorrelativo = async (nombre, apellidos) => {
  const year = new Date().getFullYear();
  const inicialNombre = String(nombre || 'P').trim().charAt(0).toUpperCase() || 'P';
  const inicialApellido = String(apellidos || 'X').trim().charAt(0).toUpperCase() || 'X';
  const rows = await query(
    `SELECT COALESCE(MAX(secuencia), 0) + 1 AS siguiente
     FROM paciente
     WHERE YEAR(fecha_creacion) = YEAR(NOW())`
  );
  const secuencia = rows[0].siguiente || 1;
  const correlativo = `${year}-${inicialNombre}${inicialApellido}-${String(secuencia).padStart(4, '0')}`;
  return { correlativo, secuencia };
};

const obtenerCorrelativoPaciente = async (body) => {
  const modo = String(body.tipo_generacion_expediente || 'automatico').toLowerCase();
  if (modo !== 'manual') return generarCorrelativo(body.nombre, body.apellidos);

  const correlativoManual = limpiar(body.expediente_manual || body.correlativo || body.expediente);
  if (!correlativoManual) throw new Error('Debe ingresar el numero de expediente manual.');

  const existentes = await query('SELECT id_paciente FROM paciente WHERE correlativo = ? LIMIT 1', [correlativoManual]);
  if (existentes.length) throw new Error('Este numero de expediente ya esta registrado.');

  return { correlativo: correlativoManual, secuencia: null };
};

const mensajeCamposDuplicados = (campos) => {
  const unicos = [...new Set(campos)];
  if (unicos.length === 1) {
    const mensajes = {
      DUI: 'El DUI ingresado ya se encuentra registrado.',
      'correo electronico': 'El correo electronico ingresado ya se encuentra registrado.',
      'numero de telefono': 'El numero de telefono ingresado ya se encuentra registrado.'
    };
    return mensajes[unicos[0]] || `${unicos[0]} ya se encuentra registrado.`;
  }

  return `Los siguientes datos ya se encuentran registrados: ${unicos.join(', ')}.`;
};

const validarDuplicadosPaciente = async ({ dui, correo, telefono, idPacienteExcluir = null }) => {
  const filtroPaciente = idPacienteExcluir ? 'AND pac.id_paciente <> ?' : '';
  const paramsExcluir = idPacienteExcluir ? [idPacienteExcluir] : [];
  const duplicados = [];

  if (dui) {
    const rows = await query(
      `SELECT per.id_persona
       FROM persona per
       LEFT JOIN paciente pac ON per.id_persona = pac.id_persona
       WHERE per.dui = ? ${filtroPaciente}
       LIMIT 1`,
      [dui, ...paramsExcluir]
    );
    if (rows.length) duplicados.push('DUI');
  }

  if (correo) {
    const rows = await query(
      `SELECT per.id_persona
       FROM persona per
       LEFT JOIN paciente pac ON per.id_persona = pac.id_persona
       WHERE per.correo_electronico = ? ${filtroPaciente}
       LIMIT 1`,
      [correo, ...paramsExcluir]
    );
    if (rows.length) duplicados.push('correo electronico');
  }

  if (telefono) {
    const rows = await query(
      `SELECT per.id_persona
       FROM persona per
       LEFT JOIN paciente pac ON per.id_persona = pac.id_persona
       WHERE REPLACE(per.telefono, '-', '') = REPLACE(?, '-', '') ${filtroPaciente}
       LIMIT 1`,
      [telefono, ...paramsExcluir]
    );
    if (rows.length) duplicados.push('numero de telefono');
  }

  if (duplicados.length > 0) {
    throw new Error(mensajeCamposDuplicados(duplicados));
  }
};
const mensajeDuplicadoSql = (err) => {
  if (err?.code !== 'ER_DUP_ENTRY') return null;
  const detalle = String(err.sqlMessage || err.message || '').toLowerCase();

  if (detalle.includes('dui')) return 'El DUI ingresado ya se encuentra registrado.';
  if (detalle.includes('correo')) return 'El correo electronico ingresado ya se encuentra registrado.';
  if (detalle.includes('telefono')) return 'El numero de telefono ingresado ya se encuentra registrado.';
  if (detalle.includes('correlativo')) return 'Este numero de expediente ya esta registrado.';
  if (detalle.includes('carnet')) return 'Este carnet ya esta registrado.';

  return 'Ya existe un registro con los mismos datos.';
};

const prepararDatosPaciente = async (body) => {
  const idTipoPaciente = toIntOrNull(body.id_tipo_paciente);
  if (!idTipoPaciente) throw new Error('Debe seleccionar el tipo de paciente');

  const tipo = await obtenerTipoPorId(idTipoPaciente);
  if (!tipo) throw new Error('Tipo de paciente no encontrado');

  const estudiante = esTipo(tipo.nombre, 'Estudiante');
  const docente = esTipo(tipo.nombre, 'Docente');
  const administrativo = esTipo(tipo.nombre, 'Administrativo');
  const servicios = esTipo(tipo.nombre, 'Servicios Generales');
  const externo = esTipo(tipo.nombre, 'Externo');

  const idProyectoSolicitado = toIntOrNull(body.id_proyecto);
  let idProyecto = null;

  if (idProyectoSolicitado) {
    const proyecto = await obtenerProyectoPorId(idProyectoSolicitado);
    if (!proyecto) throw new Error('Proyecto no encontrado');

    if (servicios) {
      throw new Error('Servicios Generales no puede tener proyecto');
    }

    if (esProyeccionSocial(proyecto) && !externo) {
      throw new Error('Proyección Social solo estaá disponible para pacientes externos');
    }

    if (esLamar(proyecto) && !(estudiante || docente || administrativo || externo)) {
      throw new Error('LAMAR no estaá disponible para este tipo de paciente');
    }

    idProyecto = idProyectoSolicitado;
  }

  const departamentoNacimiento = limpiar(body.departamento_nacimiento) || obtenerDepartamentoPorMunicipio(body.municipio_nacimiento);
  const departamentoResidencia = limpiar(body.departamento_residencia || body.departamento);

  return {
    id_tipo_paciente: idTipoPaciente,
    tipo_nombre: tipo.nombre,
    id_carrera: estudiante ? toIntOrNull(body.id_carrera) : null,
    id_area: (docente || administrativo || servicios) ? toIntOrNull(body.id_area) : null,
    id_proyecto: idProyecto,
    carnet: estudiante ? limpiar(body.carnet) : null,
    nombre_padre: estudiante ? limpiar(body.nombre_padre) : null,
    nombre_madre: estudiante ? limpiar(body.nombre_madre) : null,
    nombre_empleado_referencia: null,
    sector: limpiar(body.sector),
    departamento_nacimiento: departamentoNacimiento,
    municipio_nacimiento: limpiar(body.municipio_nacimiento),
    municipio_residencia: limpiar(body.municipio_residencia),
    departamento: departamentoResidencia,
    direccion: limpiar(body.direccion)
  };
};

const validarPaciente = (body, datosPaciente) => {
  validarCampoConLetras(body.nombre, 'nombre', 'El nombre debe contener letras.', true, 'Debe ingresar el nombre del paciente.');
  validarCampoConLetras(body.apellidos, 'apellidos', 'Los apellidos deben contener letras.', true, 'Debe ingresar los apellidos.');
  validarCampoConLetras(body.direccion, 'direccion', 'La dirección debe contener letras.');
  validarCampoConLetras(body.nombre_padre, 'nombre_padre', 'El nombre del padre debe contener letras.');
  validarCampoConLetras(body.nombre_madre, 'nombre_madre', 'El nombre de la madre debe contener letras.');
  validarCampoConLetras(body.contacto_nombre, 'contacto_nombre', 'El nombre del contacto de emergencia debe contener letras.');
  validarCampoConLetras(body.contacto_parentesco, 'contacto_parentesco', 'El parentesco debe contener letras.');
  if (!limpiar(body.dui)) throw new Error('El DUI es obligatorio');
  if (!limpiar(body.sexo)) throw new Error('El sexo es obligatorio');
  if (!limpiar(body.telefono)) throw new Error('El telefono es obligatorio');
  if (!limpiar(body.fecha_nacimiento)) throw new Error('La fecha de nacimiento es obligatoria');
  if (!limpiar(body.id_tipo_paciente)) throw new Error('Debe seleccionar el tipo de paciente');
  validarFechaNoFutura(body.fecha_nacimiento);
  validarDui(body.dui, true);
  validarCorreo(body.correo_electronico || body.correo);
  validarTelefono(body.telefono, 'telefónico', true);
  validarTelefono(body.contacto_telefono, 'telefónico de emergencia');

  const departamentoNacimiento = limpiar(body.departamento_nacimiento) || obtenerDepartamentoPorMunicipio(body.municipio_nacimiento);
  const departamentoResidencia = limpiar(body.departamento_residencia || body.departamento);

  if (departamentoNacimiento && !existeDepartamento(departamentoNacimiento)) {
    throw new Error('Debe seleccionar un departamento de nacimiento valido.');
  }

  if (departamentoResidencia && !existeDepartamento(departamentoResidencia)) {
    throw new Error('Debe seleccionar un departamento de residencia valido.');
  }

  if (limpiar(body.municipio_nacimiento) && !departamentoNacimiento) {
    throw new Error('Debe seleccionar el departamento de nacimiento antes del municipio de nacimiento.');
  }

  if (limpiar(body.municipio_residencia) && !departamentoResidencia) {
    throw new Error('Debe seleccionar el departamento de residencia antes del municipio de residencia.');
  }

  if (limpiar(body.municipio_nacimiento) && !existeMunicipioEnDepartamento(departamentoNacimiento, body.municipio_nacimiento)) {
    throw new Error('Debe seleccionar un municipio de nacimiento valido para el departamento de nacimiento.');
  }

  if (limpiar(body.municipio_residencia) && !existeMunicipioEnDepartamento(departamentoResidencia, body.municipio_residencia)) {
    throw new Error('Debe seleccionar un municipio de residencia valido para el departamento de residencia.');
  }

  if (esTipo(datosPaciente.tipo_nombre, 'Estudiante')) {
    if (!datosPaciente.carnet) throw new Error('El carnet es obligatorio para estudiantes');
    if (!datosPaciente.id_carrera) throw new Error('La carrera es obligatoria para estudiantes');
  }

  if (
    (esTipo(datosPaciente.tipo_nombre, 'Docente') ||
      esTipo(datosPaciente.tipo_nombre, 'Administrativo') ||
      esTipo(datosPaciente.tipo_nombre, 'Servicios Generales')) &&
    !datosPaciente.id_area
  ) {
    throw new Error('El área es obligatoria para este tipo de paciente');
  }
};

const guardarContacto = async (idPaciente, body, idUsuario = null) => {
  await query('DELETE FROM contacto_emergencia WHERE id_paciente = ?', [idPaciente]);

  if (!limpiar(body.contacto_nombre) && !limpiar(body.contacto_parentesco) && !limpiar(body.contacto_telefono)) {
    return;
  }

  await query(
    `INSERT INTO contacto_emergencia
      (id_paciente, nombre, parentesco, telefono, version, fecha_creacion, usuario_creacion)
     VALUES (?, ?, ?, ?, 1, NOW(), ?)`,
    [
      idPaciente,
      limpiar(body.contacto_nombre),
      limpiar(body.contacto_parentesco),
      limpiar(body.contacto_telefono),
      idUsuario
    ]
  );
};

const guardarProyecto = async (idPaciente, idProyecto, idUsuario = null) => {
  await query('DELETE FROM paciente_proyecto WHERE id_paciente = ?', [idPaciente]);

  if (!idProyecto) return;

  await query(
    `INSERT INTO paciente_proyecto
      (id_paciente, id_proyecto, version, fecha_creacion, usuario_creacion)
     VALUES (?, ?, 1, NOW(), ?)`,
    [idPaciente, idProyecto, idUsuario]
  );
};

exports.obtenerPacientes = async (req, res) => {
  try {
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
    const rows = await query(
      `
      SELECT
        p.id_paciente,
        p.correlativo AS expediente,
        p.carnet,
        p.id_tipo_paciente,
        p.id_carrera,
        p.id_area,
        per.nombre,
        per.apellidos,
        CONCAT(per.nombre, ' ', per.apellidos) AS nombre_completo,
        per.dui,
        per.telefono,
        per.correo_electronico,
        tp.nombre AS tipo_paciente,
        f.id_facultad,
        f.nombre AS facultad,
        ca.nombre AS carrera,
        a.nombre AS area
      FROM paciente p
      INNER JOIN persona per ON p.id_persona = per.id_persona
      LEFT JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
      LEFT JOIN carrera ca ON p.id_carrera = ca.id_carrera
      LEFT JOIN facultad f ON ca.id_facultad = f.id_facultad
      LEFT JOIN area a ON p.id_area = a.id_area
      ${where}
      ORDER BY p.correlativo ASC
      `,
      valores
    );

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener pacientes:', err);
    res.status(500).json({ mensaje: 'Error al obtener pacientes' });
  }
};

exports.obtenerPacientePorId = async (req, res) => {
  try {
    const { id_paciente } = req.params;
    const rows = await query(
      `
      SELECT
        p.id_paciente,
        p.id_persona,
        p.correlativo AS expediente,
        p.secuencia,
        p.fecha_creacion,
        p.id_tipo_paciente,
        p.id_carrera,
        p.id_area,
        p.sector,
        p.departamento_nacimiento,
        p.municipio_nacimiento,
        p.direccion,
        p.departamento,
        p.municipio_residencia,
        p.nombre_padre,
        p.nombre_madre,
        p.nombre_empleado_referencia,
        p.carnet,
        per.nombre,
        per.apellidos,
        per.sexo,
        per.correo_electronico,
        per.telefono,
        per.dui,
        per.fecha_nacimiento,
        tp.nombre AS tipo_paciente,
        f.id_facultad,
        f.nombre AS facultad,
        ca.nombre AS carrera,
        a.nombre AS area,
        ce.nombre AS contacto_nombre,
        ce.parentesco AS contacto_parentesco,
        ce.telefono AS contacto_telefono,
        pp.id_proyecto,
        pr.nombre AS proyecto
      FROM paciente p
      INNER JOIN persona per ON p.id_persona = per.id_persona
      LEFT JOIN tipo_paciente tp ON p.id_tipo_paciente = tp.id_tipo
      LEFT JOIN carrera ca ON p.id_carrera = ca.id_carrera
      LEFT JOIN facultad f ON ca.id_facultad = f.id_facultad
      LEFT JOIN area a ON p.id_area = a.id_area
      LEFT JOIN contacto_emergencia ce ON p.id_paciente = ce.id_paciente
      LEFT JOIN paciente_proyecto pp ON p.id_paciente = pp.id_paciente
      LEFT JOIN proyecto pr ON pp.id_proyecto = pr.id_proyecto
      WHERE p.id_paciente = ?
      LIMIT 1
      `,
      [id_paciente]
    );

    if (rows.length === 0) return res.status(404).json({ mensaje: 'Paciente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener paciente:', err);
    res.status(500).json({ mensaje: 'Error al obtener paciente' });
  }
};

exports.crearPaciente = async (req, res) => {
  try {
    const datosPaciente = await prepararDatosPaciente(req.body);
    validarPaciente(req.body, datosPaciente);
    await validarDuplicadosPaciente({
      dui: limpiar(req.body.dui),
      correo: limpiar(req.body.correo_electronico || req.body.correo),
      telefono: limpiar(req.body.telefono)
    });
    const idUsuario = usuarioAccion(req);

    await query('START TRANSACTION');

    const personaResult = await query(
      `INSERT INTO persona
        (nombre, apellidos, sexo, dui, correo_electronico, telefono, fecha_nacimiento, fecha_creacion, usuario_creacion, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1)`,
      [
        limpiar(req.body.nombre),
        limpiar(req.body.apellidos),
        limpiar(req.body.sexo),
        limpiar(req.body.dui),
        limpiar(req.body.correo_electronico || req.body.correo),
        limpiar(req.body.telefono),
        limpiar(req.body.fecha_nacimiento),
        idUsuario
      ]
    );

    const { correlativo, secuencia } = await obtenerCorrelativoPaciente(req.body);

    const pacienteResult = await query(
      `INSERT INTO paciente
        (id_persona, correlativo, secuencia, id_tipo_paciente, id_carrera, id_area,
         sector, departamento_nacimiento, municipio_nacimiento, direccion, departamento, municipio_residencia,
         nombre_padre, nombre_madre, nombre_empleado_referencia, carnet, fecha_creacion, usuario_creacion, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1)`,
      [
        personaResult.insertId,
        correlativo,
        secuencia,
        datosPaciente.id_tipo_paciente,
        datosPaciente.id_carrera,
        datosPaciente.id_area,
        datosPaciente.sector,
        datosPaciente.departamento_nacimiento,
        datosPaciente.municipio_nacimiento,
        datosPaciente.direccion,
        datosPaciente.departamento,
        datosPaciente.municipio_residencia,
        datosPaciente.nombre_padre,
        datosPaciente.nombre_madre,
        datosPaciente.nombre_empleado_referencia,
        datosPaciente.carnet,
        idUsuario
      ]
    );

    await guardarContacto(pacienteResult.insertId, req.body, idUsuario);
    await guardarProyecto(pacienteResult.insertId, datosPaciente.id_proyecto, idUsuario);
    const nuevo = await obtenerSnapshotPaciente(pacienteResult.insertId);

    await registrarAuditoria({
      req,
      tabla_afectada: 'paciente',
      id_registro: pacienteResult.insertId,
      accion: 'INSERT',
      usuario_accion: idUsuario,
      datos_nuevos: nuevo,
      descripcion: 'Creación de paciente'
    });

    await query('COMMIT');
    res.status(201).json({
      mensaje: 'Paciente registrado correctamente',
      id_paciente: pacienteResult.insertId,
      correlativo
    });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    const mensajeDuplicado = mensajeDuplicadoSql(err);
    const status = mensajeDuplicado || !err.code ? 400 : 500;
    console.error('Error al crear paciente:', err);
    res.status(status).json({
      mensaje: mensajeDuplicado || err.message || 'Error al crear paciente',
      ...(err.errors ? { errors: err.errors } : {})
    });
  }
};

exports.actualizarPaciente = async (req, res) => {
  try {
    const { id_paciente } = req.params;
    const existente = await query('SELECT id_persona FROM paciente WHERE id_paciente = ?', [id_paciente]);
    if (existente.length === 0) return res.status(404).json({ mensaje: 'Paciente no encontrado' });
    const anterior = await obtenerSnapshotPaciente(id_paciente);
    const idUsuario = usuarioAccion(req);

    const datosPaciente = await prepararDatosPaciente(req.body);
    validarPaciente(req.body, datosPaciente);
    await validarDuplicadosPaciente({
      dui: limpiar(req.body.dui),
      correo: limpiar(req.body.correo_electronico || req.body.correo),
      telefono: limpiar(req.body.telefono),
      idPacienteExcluir: Number(id_paciente)
    });

    await query('START TRANSACTION');

    await query(
      `UPDATE persona
       SET nombre = ?,
           apellidos = ?,
           sexo = ?,
           dui = ?,
           correo_electronico = ?,
           telefono = ?,
           fecha_nacimiento = ?,
           fecha_modificacion = NOW(),
           usuario_modificacion = ?,
           version = COALESCE(version, 0) + 1
       WHERE id_persona = ?`,
      [
        limpiar(req.body.nombre),
        limpiar(req.body.apellidos),
        limpiar(req.body.sexo),
        limpiar(req.body.dui),
        limpiar(req.body.correo_electronico || req.body.correo),
        limpiar(req.body.telefono),
        limpiar(req.body.fecha_nacimiento),
        idUsuario,
        existente[0].id_persona
      ]
    );

    await query(
      `UPDATE paciente
       SET id_tipo_paciente = ?,
           id_carrera = ?,
           id_area = ?,
           sector = ?,
           departamento_nacimiento = ?,
           municipio_nacimiento = ?,
           direccion = ?,
           departamento = ?,
           municipio_residencia = ?,
           nombre_padre = ?,
           nombre_madre = ?,
           nombre_empleado_referencia = ?,
           carnet = ?,
           fecha_modificacion = NOW(),
           usuario_modificacion = ?,
           version = COALESCE(version, 0) + 1
       WHERE id_paciente = ?`,
      [
        datosPaciente.id_tipo_paciente,
        datosPaciente.id_carrera,
        datosPaciente.id_area,
        datosPaciente.sector,
        datosPaciente.departamento_nacimiento,
        datosPaciente.municipio_nacimiento,
        datosPaciente.direccion,
        datosPaciente.departamento,
        datosPaciente.municipio_residencia,
        datosPaciente.nombre_padre,
        datosPaciente.nombre_madre,
        datosPaciente.nombre_empleado_referencia,
        datosPaciente.carnet,
        idUsuario,
        id_paciente
      ]
    );

    await guardarContacto(id_paciente, req.body, idUsuario);
    await guardarProyecto(id_paciente, datosPaciente.id_proyecto, idUsuario);
    const nuevo = await obtenerSnapshotPaciente(id_paciente);

    await registrarAuditoria({
      req,
      tabla_afectada: 'paciente',
      id_registro: id_paciente,
      accion: 'UPDATE',
      usuario_accion: idUsuario,
      datos_anteriores: anterior,
      datos_nuevos: nuevo,
      descripcion: 'Actualización de paciente'
    });

    await query('COMMIT');
    res.json({ mensaje: 'Paciente actualizado correctamente' });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    const mensajeDuplicado = mensajeDuplicadoSql(err);
    const status = mensajeDuplicado || !err.code ? 400 : 500;
    console.error('Error al actualizar paciente:', err);
    res.status(status).json({
      mensaje: mensajeDuplicado || err.message || 'Error al actualizar paciente',
      ...(err.errors ? { errors: err.errors } : {})
    });
  }
};

exports.buscarPacientes = exports.obtenerPacientes;

exports.infoPaciente = async (req, res) => {
  req.params.id_paciente = req.params.id;
  return exports.obtenerPacientePorId(req, res);
};

exports.obtenerTiposPaciente = async (req, res) => {
  try {
    const rows = await query('SELECT id_tipo, nombre FROM tipo_paciente ORDER BY nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener tipos de paciente' });
  }
};

exports.obtenerFacultades = async (req, res) => {
  try {
    const rows = await query('SELECT id_facultad, nombre FROM facultad ORDER BY nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener facultades' });
  }
};

exports.obtenerCarreras = async (req, res) => {
  try {
    const rows = await query('SELECT id_carrera, id_facultad, nombre FROM carrera ORDER BY nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener carreras' });
  }
};

exports.obtenerCarrerasNuevoIngreso = async (req, res) => {
  try {
    const rows = await query(
      `SELECT ca.id_carrera, ca.id_facultad, ca.nombre
       FROM carrera ca
       INNER JOIN facultad f ON ca.id_facultad = f.id_facultad
       WHERE LOWER(f.nombre) LIKE '%ciencias%'
         AND LOWER(f.nombre) LIKE '%salud%'
         AND (ca.estado = 1 OR ca.estado IS NULL)
       ORDER BY ca.nombre`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener carreras de nuevo ingreso:', err);
    res.status(500).json({ mensaje: 'Error al obtener carreras de nuevo ingreso' });
  }
};

exports.obtenerAreas = async (req, res) => {
  try {
    const rows = await query(
      `SELECT
        a.id_area,
        a.codigo,
        a.nombre,
        a.descripcion,
        CASE WHEN COUNT(p.id_paciente) > 0 THEN 'Activa' ELSE 'Inactiva' END AS estado,
        COUNT(p.id_paciente) AS cantidad_pacientes
       FROM area a
       LEFT JOIN paciente p ON a.id_area = p.id_area
       GROUP BY a.id_area, a.codigo, a.nombre, a.descripcion
       ORDER BY a.nombre`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener áreas' });
  }
};

exports.crearArea = async (req, res) => {
  try {
    const nombre = limpiarCatalogo(req.body.nombre);
    const descripcion = limpiarCatalogo(req.body.descripcion);
    const idUsuario = usuarioAccion(req);

    if (!nombre) {
      return res.status(400).json({
        mensaje: 'Debe ingresar el nombre del área.',
        errors: { nombre: 'Debe ingresar el nombre del área.' }
      });
    }
    if (!contieneLetras(nombre)) {
      return res.status(400).json({
        mensaje: 'El nombre del área debe contener letras.',
        errors: { nombre: 'El nombre del área debe contener letras.' }
      });
    }
    if (!descripcion) {
      return res.status(400).json({
        mensaje: 'Debe ingresar la descripción.',
        errors: { descripcion: 'Debe ingresar la descripción.' }
      });
    }
    if (!contieneLetras(descripcion)) {
      return res.status(400).json({
        mensaje: 'La descripción del área debe contener letras.',
        errors: { descripcion: 'La descripción del área debe contener letras.' }
      });
    }

    const repetida = await query('SELECT id_area FROM area WHERE LOWER(nombre) = LOWER(?) LIMIT 1', [nombre]);
    if (repetida.length) return res.status(400).json({ mensaje: 'Esta area ya esta registrada.' });

    const iniciales = nombre
      .split(/\s+/)
      .map((parte) => parte.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 4) || 'AREA';

    const rows = await query('SELECT COUNT(*) + 1 AS siguiente FROM area WHERE codigo LIKE ?', [`${iniciales}%`]);
    const codigo = `${iniciales}${String(rows[0]?.siguiente || 1).padStart(2, '0')}`;

    const result = await query(
      `INSERT INTO area (codigo, nombre, descripcion, estado, version, fecha_creacion, usuario_creacion)
       VALUES (?, ?, ?, 0, 1, NOW(), ?)`,
      [codigo, nombre, descripcion, idUsuario]
    );

    res.status(201).json({ mensaje: 'Área creada correctamente.', id_area: result.insertId, codigo });
  } catch (err) {
    console.error('Error al crear área:', err);
    res.status(500).json({ mensaje: 'Error al crear área' });
  }
};

exports.obtenerProyectos = async (req, res) => {
  try {
    const rows = await query('SELECT id_proyecto, nombre, descripcion FROM proyecto WHERE estado = 1 OR estado IS NULL ORDER BY nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ mensaje: 'Error al obtener proyectos' });
  }
};

exports.obtenerDepartamentos = async (req, res) => {
  res.json(obtenerDepartamentos());
};

exports.obtenerMunicipios = async (req, res) => {
  const { departamento } = req.query;
  res.json(obtenerMunicipios(departamento));
};
