const db = require('../config/db');
const { registrarAuditoria, obtenerRegistro } = require('../helpers/auditoria.helper');
const { validarCorreo, validarDui, validarFechaNoFutura, validarJv, validarTelefono } = require('../helpers/validaciones.helper');
const { enviarActivacionUsuario } = require('./auth.controller');
const { asegurarTablaTokenPassword, crearTokenPassword, invalidarTokensActivacion } = require('../helpers/tokenPassword.helper');

const ADMIN_ROL = 1;
const DOCTOR_ROL = 2;
const ENFERMERA_ROL = 3;
const ROLES_VALIDOS = [ADMIN_ROL, DOCTOR_ROL, ENFERMERA_ROL];
const OPERACIONES_DOCTOR = [9, 11, 13];
const OPERACIONES_ENFERMERA = [4, 7, 11, 13, 16];
const USUARIO_INACTIVO = 0;
const USUARIO_ACTIVO = 1;
const USUARIO_PENDIENTE = 2;

const query = (sql, params = []) => db.promise().query(sql, params);
const usuarioAccion = (req) => req.usuario?.id_usuario || null;
const DEBUG_CREAR_USUARIO = String(process.env.DEBUG_USUARIO_CREACION || '').toLowerCase() === 'true';

const logCrearUsuario = (etapa, detalles = {}) => {
  if (DEBUG_CREAR_USUARIO) {
    console.log(`[crearUsuario] ${etapa}`, detalles);
  }
};

const mimeImagen = (buffer) => {
  if (!buffer || buffer.length < 4) return 'application/octet-stream';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return 'application/octet-stream';
};

const parseArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
  }

  return [value];
};

const normalizarIds = (value) => {
  return [...new Set(
    parseArray(value)
      .map(item => Number(item))
      .filter(item => Number.isInteger(item) && item > 0 && item !== 8 && item !== 15)
  )];
};

const obtenerRolesPayload = (body) => {
  const roles = normalizarIds(body.roles);

  if (roles.length > 0) {
    return roles.filter(idRol => ROLES_VALIDOS.includes(idRol));
  }

  const rolLegacy = Number(body.rol);
  return ROLES_VALIDOS.includes(rolLegacy) ? [rolLegacy] : [];
};

const obtenerOperacionesPayload = (body) => normalizarIds(body.operaciones);

const mensajeCamposDuplicados = (campos) => {
  const unicos = [...new Set(campos)];
  if (unicos.length === 1) {
    const mensajes = {
      DUI: 'El DUI ingresado ya se encuentra registrado.',
      'correo electronico': 'El correo electronico ingresado ya se encuentra registrado.',
      'numero de telefono': 'El numero de telefono ingresado ya se encuentra registrado.',
      usuario: 'Este usuario ya se encuentra registrado.',
      JVPM: 'El numero de JVPM ya se encuentra registrado.',
      JVPE: 'El numero de JVPE ya se encuentra registrado.'
    };
    return mensajes[unicos[0]] || `${unicos[0]} ya se encuentra registrado.`;
  }

  return `Los siguientes datos ya se encuentran registrados: ${unicos.join(', ')}.`;
};

const validarDuplicadosUsuario = async ({ dui, correo, telefono, correlativo, jvpm, jvpe, idUsuarioExcluir = null }) => {
  const filtroUsuario = idUsuarioExcluir ? 'AND u.id_usuario <> ?' : '';
  const paramsExcluir = idUsuarioExcluir ? [idUsuarioExcluir] : [];
  const duplicados = [];
  const errors = {};

  if (dui) {
    const [rows] = await query(
      `SELECT p.id_persona
       FROM persona p
       LEFT JOIN usuario u ON p.id_persona = u.id_persona
       WHERE p.dui = ? ${filtroUsuario}
       LIMIT 1`,
      [dui, ...paramsExcluir]
    );
    if (rows.length) {
      duplicados.push('DUI');
      errors.dui = 'Este DUI ya esta registrado.';
    }
  }

  if (correo) {
    const [rows] = await query(
      `SELECT p.id_persona
       FROM persona p
       LEFT JOIN usuario u ON p.id_persona = u.id_persona
       WHERE p.correo_electronico = ? ${filtroUsuario}
       LIMIT 1`,
      [correo, ...paramsExcluir]
    );
    if (rows.length) {
      duplicados.push('correo electronico');
      errors.correo = 'Este correo electronico ya esta registrado.';
      errors.correo_electronico = errors.correo;
    }
  }

  if (telefono) {
    const [rows] = await query(
      `SELECT p.id_persona
       FROM persona p
       LEFT JOIN usuario u ON p.id_persona = u.id_persona
       WHERE REPLACE(p.telefono, '-', '') = REPLACE(?, '-', '') ${filtroUsuario}
       LIMIT 1`,
      [telefono, ...paramsExcluir]
    );
    if (rows.length) {
      duplicados.push('numero de telefono');
      errors.telefono = 'Este telefono ya esta registrado.';
    }
  }

  if (correlativo) {
    const [rows] = await query(
      `SELECT id_usuario
       FROM usuario
       WHERE correlativo = ? ${idUsuarioExcluir ? 'AND id_usuario <> ?' : ''}
       LIMIT 1`,
      idUsuarioExcluir ? [correlativo, idUsuarioExcluir] : [correlativo]
    );
    if (rows.length) {
      duplicados.push('usuario');
      errors.usuario = 'Este usuario ya esta registrado.';
      errors.correlativo = errors.usuario;
    }
  }

  if (jvpm) {
    const [rows] = await query(
      `SELECT d.id_doctor
       FROM doctor d
       WHERE d.jvpm = ? ${idUsuarioExcluir ? 'AND d.id_usuario <> ?' : ''}
       LIMIT 1`,
      idUsuarioExcluir ? [jvpm, idUsuarioExcluir] : [jvpm]
    );
    if (rows.length) {
      duplicados.push('JVPM');
      errors.jvpm = 'Este JVPM ya esta registrado.';
    }
  }

  if (jvpe) {
    const [rows] = await query(
      `SELECT e.id_enfermera
       FROM enfermera e
       WHERE e.jvpe = ? ${idUsuarioExcluir ? 'AND e.id_usuario <> ?' : ''}
       LIMIT 1`,
      idUsuarioExcluir ? [jvpe, idUsuarioExcluir] : [jvpe]
    );
    if (rows.length) {
      duplicados.push('JVPE');
      errors.jvpe = 'Este JVPE ya esta registrado.';
    }
  }

  if (duplicados.length > 0) {
    const error = new Error(mensajeCamposDuplicados(duplicados));
    error.status = 400;
    error.errors = errors;
    throw error;
  }
};
const mensajeDuplicadoSql = (err) => {
  if (err?.code !== 'ER_DUP_ENTRY') return null;
  const detalle = String(err.sqlMessage || err.message || '').toLowerCase();

  if (detalle.includes('dui')) return 'El DUI ingresado ya se encuentra registrado.';
  if (detalle.includes('correo')) return 'El correo electronico ingresado ya se encuentra registrado.';
  if (detalle.includes('telefono')) return 'El numero de telefono ingresado ya se encuentra registrado.';
  if (detalle.includes('jvpm')) return 'El numero de JVPM ya se encuentra registrado.';
  if (detalle.includes('jvpe')) return 'El numero de JVPE ya se encuentra registrado.';

  return 'Ya existe un registro con los mismos datos.';
};

const esErrorCliente = (err) => {
  const mensaje = String(err?.message || '');
  return mensaje.includes('obligatorio') ||
    mensaje.includes('registrado') ||
    mensaje.includes('pertenece a otra persona') ||
    mensaje.includes('valido') ||
    mensaje.includes('valido') ||
    mensaje.includes('JVPM') ||
    mensaje.includes('JVPE') ||
    mensaje.includes('especialidad');
};

const crearErrorValidacion = (errors) => {
  const error = new Error('Hay errores de validacion.');
  error.status = 400;
  error.errors = errors;
  return error;
};

const validarCreacionUsuario = ({ nombre, apellidos, sexo, dui, telefono, correo, fecha_nacimiento, roles, jvpm, jvpe, id_especialidad, tieneFirma, tieneSello }) => {
  const errors = {};

  if (!String(nombre || '').trim()) errors.nombre = 'Debe ingresar el nombre.';
  if (!String(apellidos || '').trim()) errors.apellidos = 'Debe ingresar los apellidos.';
  if (!String(sexo || '').trim()) errors.sexo = 'Debe seleccionar el sexo.';
  if (!String(fecha_nacimiento || '').trim()) errors.fecha_nacimiento = 'Debe ingresar la fecha de nacimiento.';
  else {
    try { validarFechaNoFutura(fecha_nacimiento); } catch { errors.fecha_nacimiento = 'No se permiten fechas futuras.'; }
  }

  if (!String(correo || '').trim()) {
    errors.correo = 'Debe ingresar el correo electronico.';
  } else {
    try { validarCorreo(correo); } catch { errors.correo = 'Debe ingresar un correo electronico valido.'; }
  }

  if (!String(telefono || '').trim()) {
    errors.telefono = 'Debe ingresar el telefono.';
  } else {
    try { validarTelefono(telefono, 'telefonico'); } catch { errors.telefono = 'Debe ingresar un telefono valido.'; }
  }

  if (!String(dui || '').trim()) {
    errors.dui = 'Debe ingresar el DUI.';
  } else {
    try { validarDui(dui); } catch { errors.dui = 'Debe ingresar un DUI valido.'; }
  }

  if (roles.includes(DOCTOR_ROL)) {
    try { validarJv(jvpm, 'JVPM', true); } catch { errors.jvpm = 'Debe ingresar JVPM si el usuario es doctor.'; }
    if (!id_especialidad) errors.id_especialidad = 'Debe seleccionar la especialidad del doctor.';
    if (!tieneFirma) errors.firma = 'Debe subir firma si el usuario es doctor.';
    if (!tieneSello) errors.sello = 'Debe subir sello si el usuario es doctor.';
  }

  if (roles.includes(ENFERMERA_ROL)) {
    try { validarJv(jvpe, 'JVPE', true); } catch { errors.jvpe = 'Debe ingresar JVPE si el usuario es enfermera.'; }
  }

  if (Object.keys(errors).length > 0) throw crearErrorValidacion(errors);
};

const insertarRolesUsuario = async (idUsuario, roles) => {
  for (const idRol of roles) {
    await query(
      `
      INSERT IGNORE INTO rol_usuario
      (
        id_usuario,
        id_rol,
        fecha_creacion,
        version
      )
      VALUES (?, ?, NOW(), 1)
      `,
      [idUsuario, idRol]
    );
  }
};

const guardarOperacionesRol = async (idRol, operaciones, reemplazar = false) => {
  if (!Array.isArray(operaciones)) return;

  if (reemplazar) {
    await query(
      `DELETE FROM rol_operacion WHERE id_rol = ?`,
      [idRol]
    );
  }

  for (const idOperacion of operaciones) {
    await query(
      `
      INSERT IGNORE INTO rol_operacion
      (
        id_rol,
        id_operacion,
        version,
        fecha_creacion
      )
      VALUES (?, ?, 1, NOW())
      `,
      [idRol, idOperacion]
    );
  }
};

const guardarOperacionesAdministrador = async (idUsuario, operaciones) => {
  await query(
    `DELETE FROM usuario_operacion WHERE id_usuario = ?`,
    [idUsuario]
  );

  for (const idOperacion of operaciones) {
    await query(
      `
      INSERT IGNORE INTO usuario_operacion
      (
        id_usuario,
        id_operacion,
        version,
        fecha_creacion
      )
      VALUES (?, ?, 1, NOW())
      `,
      [idUsuario, idOperacion]
    );
  }
};

const guardarOperacionesObligatorias = async (roles) => {
  if (roles.includes(DOCTOR_ROL)) {
    await guardarOperacionesRol(DOCTOR_ROL, OPERACIONES_DOCTOR);
  }

  if (roles.includes(ENFERMERA_ROL)) {
    await guardarOperacionesRol(ENFERMERA_ROL, OPERACIONES_ENFERMERA);
  }
};

const guardarDoctor = async (idUsuario, jvpm, idEspecialidad, firmaBuffer = null, selloBuffer = null) => {
  const [doctores] = await query(
    `SELECT id_doctor FROM doctor WHERE id_usuario = ?`,
    [idUsuario]
  );

  let idDoctor;

  if (doctores.length > 0) {
    idDoctor = doctores[0].id_doctor;

    if (jvpm !== undefined) {
      await query(
        `
        UPDATE doctor
        SET
          jvpm = ?,
          fecha_modificacion = NOW()
        WHERE id_usuario = ?
        `,
        [jvpm || null, idUsuario]
      );
    }
  } else {
    if (!jvpm) {
      throw new Error('Debe ingresar JVPM para el doctor');
    }

    if (!idEspecialidad) {
      throw new Error('Debe seleccionar una especialidad para el doctor');
    }

    const [resultDoctor] = await query(
      `
      INSERT INTO doctor
      (
        id_usuario,
        jvpm,
        firma,
        sello,
        fecha_creacion,
        version
      )
      VALUES (?, ?, ?, ?, NOW(), 1)
      `,
      [idUsuario, jvpm, firmaBuffer, selloBuffer]
    );

    idDoctor = resultDoctor.insertId;
  }

  if (idEspecialidad) {
    await query(
      `DELETE FROM especialidad_doctor WHERE id_doctor = ?`,
      [idDoctor]
    );

    await query(
      `
      INSERT INTO especialidad_doctor
      (
        id_especialidad,
        id_doctor,
        version,
        fecha_creacion
      )
      VALUES (?, ?, 1, NOW())
      `,
      [idEspecialidad, idDoctor]
    );
  }

  if (firmaBuffer) {
    await query(
      `
      UPDATE doctor
      SET
        firma = ?,
        fecha_modificacion = NOW()
      WHERE id_usuario = ?
      `,
      [firmaBuffer, idUsuario]
    );
  }

  if (selloBuffer) {
    await query(
      `
      UPDATE doctor
      SET
        sello = ?,
        fecha_modificacion = NOW()
      WHERE id_usuario = ?
      `,
      [selloBuffer, idUsuario]
    );
  }

  return idDoctor;
};

const guardarEnfermera = async (idUsuario, jvpe) => {
  const [enfermeras] = await query(
    `SELECT id_enfermera FROM enfermera WHERE id_usuario = ?`,
    [idUsuario]
  );

  if (enfermeras.length > 0) {
    if (jvpe !== undefined) {
      await query(
        `
        UPDATE enfermera
        SET
          jvpe = ?,
          fecha_modificacion = NOW()
        WHERE id_usuario = ?
        `,
        [jvpe || null, idUsuario]
      );
    }

    return enfermeras[0].id_enfermera;
  }

  if (!jvpe) {
    throw new Error('Debe ingresar JVPE para enfermería');
  }

  const [resultEnfermera] = await query(
    `
    INSERT INTO enfermera
    (
      id_usuario,
      jvpe,
      fecha_creacion,
      version
    )
    VALUES (?, ?, NOW(), 1)
    `,
    [idUsuario, jvpe]
  );

  return resultEnfermera.insertId;
};

const obtenerRolesUsuario = async (idUsuario) => {
  const [roles] = await query(
    `
    SELECT
      ru.id_rol,
      r.nombre
    FROM rol_usuario ru
    JOIN rol r
      ON ru.id_rol = r.id_rol
    WHERE ru.id_usuario = ?
    ORDER BY ru.id_rol
    `,
    [idUsuario]
  );

  return roles;
};

const crearUsuario = async (req, res) => {
  const {
    nombre,
    apellidos,
    sexo,
    dui,
    telefono,
    correo,
    fecha_nacimiento,
    estado,
    jvpm,
    jvpe,
    id_especialidad,
    correlativo: correlativoSolicitado
  } = req.body;

  const roles = obtenerRolesPayload(req.body);
  const operaciones = obtenerOperacionesPayload(req.body);
  const activarAlCrear = Number(estado) === USUARIO_ACTIVO;
  const idUsuarioAuditoria = usuarioAccion(req);
  const firmaBuffer = req.files?.firma?.[0]?.buffer || null;
  const selloBuffer = req.files?.sello?.[0]?.buffer || null;
  let etapa = 'validacion de entrada';

  try {
    console.log('📡 PETICIÓN RECIBIDA: POST /api/usuarios');
    logCrearUsuario(etapa, { roles, tieneFirma: Boolean(firmaBuffer), tieneSello: Boolean(selloBuffer) });
    validarCreacionUsuario({
      nombre,
      apellidos,
      sexo,
      dui,
      telefono,
      correo,
      fecha_nacimiento,
      roles,
      jvpm,
      jvpe,
      id_especialidad,
      tieneFirma: Boolean(firmaBuffer),
      tieneSello: Boolean(selloBuffer)
    });

    etapa = 'validacion de duplicados';
    await validarDuplicadosUsuario({ dui, correo, telefono, correlativo: correlativoSolicitado, jvpm, jvpe });

    etapa = 'preparacion de token_password';
    await asegurarTablaTokenPassword();

    etapa = 'inicio de transaccion';
    await query(`START TRANSACTION`);

    etapa = 'insercion de persona';
    const [resultPersona] = await query(
      `
      INSERT INTO persona
      (
        nombre,
        apellidos,
        sexo,
        dui,
        telefono,
        correo_electronico,
        fecha_nacimiento,
        fecha_creacion,
        usuario_creacion,
        version
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1)
      `,
      [
        nombre,
        apellidos,
        sexo,
        dui,
        telefono,
        correo,
        fecha_nacimiento,
        idUsuarioAuditoria
      ]
    );

    const idPersona = resultPersona.insertId;
    const year = new Date().getFullYear();
    const inicialNombre = (nombre || 'U').charAt(0).toUpperCase();
    const inicialApellido = (apellidos || 'S').charAt(0).toUpperCase();
    const iniciales = inicialNombre + inicialApellido;

    etapa = 'generacion de correlativo';
    const [resultTotal] = await query(
      `
      SELECT COALESCE(MAX(secuencia), 0) + 1 AS siguiente
      FROM usuario
      WHERE YEAR(fecha_creacion) = ?
      FOR UPDATE
      `,
      [year]
    );

    const numero = Number(resultTotal[0].siguiente);
    const secuencia = numero.toString().padStart(4, '0');
    const correlativoGenerado = `${year}-${iniciales}-${secuencia}`;
    const [usuarioExistente] = await query(
      `SELECT id_usuario FROM usuario WHERE correlativo = ? LIMIT 1`,
      [correlativoGenerado]
    );

    if (usuarioExistente.length) {
      throw crearErrorValidacion({ usuario: 'Este usuario ya esta registrado.' });
    }

    etapa = 'insercion de usuario';
    const [resultUsuario] = await query(
      `
      INSERT INTO usuario
      (
        correlativo,
        secuencia,
        id_persona,
        estado,
        fecha_creacion,
        usuario_creacion,
        version
      )
      VALUES (?, ?, ?, ?, NOW(), ?, 1)
      `,
      [
        correlativoGenerado,
        numero,
        idPersona,
        activarAlCrear ? USUARIO_PENDIENTE : USUARIO_INACTIVO,
        idUsuarioAuditoria
      ]
    );

    const idUsuario = resultUsuario.insertId;
    console.log(`Usuario creado con id_usuario: ${idUsuario}`);

    etapa = 'asignacion de roles y operaciones';
    await insertarRolesUsuario(idUsuario, roles);
    await guardarOperacionesObligatorias(roles);

    if (roles.includes(ADMIN_ROL)) {
      await guardarOperacionesAdministrador(idUsuario, operaciones);
    }

    if (roles.includes(DOCTOR_ROL)) {
      etapa = 'creacion de perfil doctor';
      await guardarDoctor(idUsuario, jvpm, id_especialidad, firmaBuffer, selloBuffer);
    }

    if (roles.includes(ENFERMERA_ROL)) {
      etapa = 'creacion de perfil enfermera';
      await guardarEnfermera(idUsuario, jvpe);
    }

    let tokenActivacion = null;
    if (activarAlCrear) {
      etapa = 'creacion de token de activacion';
      tokenActivacion = await crearTokenPassword({
        idUsuario,
        tipo: 'CREACION_USUARIO',
        minutos: 60,
        usarCodigo: false
      });
      console.log(`Token de activación generado para id_usuario: ${idUsuario}`);
    }

    etapa = 'confirmacion de transaccion';
    await query(`COMMIT`);

    let activacion = null;
    if (activarAlCrear) {
      try {
        console.log(`Enviando correo de activación a: ${correo}`);
        activacion = await enviarActivacionUsuario({
          idUsuario,
          correo,
          nombre: `${nombre} ${apellidos}`.trim(),
          correlativo: correlativoGenerado,
          tokenPlano: tokenActivacion
        });
      } catch (correoError) {
        console.error('No se pudo generar/enviar enlace de activación');
        console.error(correoError);
      }
    }

    await registrarAuditoria({
      req,
      tabla_afectada: 'usuario',
      id_registro: idUsuario,
      accion: 'INSERT',
      usuario_accion: idUsuarioAuditoria,
      datos_nuevos: {
        usuario: await obtenerRegistro('usuario', 'id_usuario', idUsuario),
        persona: await obtenerRegistro('persona', 'id_persona', idPersona)
      },
      descripcion: 'Creación de usuario'
    });

    return res.json({
      mensaje: activarAlCrear ? 'Usuario creado correctamente' : 'Usuario creado inactivo correctamente',
      id_usuario: idUsuario,
      usuario: correlativoGenerado,
      estado: activarAlCrear ? USUARIO_PENDIENTE : USUARIO_INACTIVO,
      correo_activacion_enviado: Boolean(activacion && !activacion.resultadoCorreo?.simulado)
    });
  } catch (err) {
    await query(`ROLLBACK`);
    console.error(`[crearUsuario] Error en etapa: ${etapa}`, {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage,
      stack: err.stack
    });
    const mensajeDuplicado = mensajeDuplicadoSql(err);

    if (err.errors) {
      return res.status(err.status || 400).json({
        mensaje: 'Revise los campos marcados.',
        message: 'Hay errores de validacion.',
        errors: err.errors
      });
    }

    if (mensajeDuplicado) {
      return res.status(400).json({ mensaje: mensajeDuplicado, errors: { general: mensajeDuplicado } });
    }
    if (esErrorCliente(err)) {
      return res.status(400).json({ mensaje: err.message, errors: { general: err.message } });
    }

    return res.status(500).json({ mensaje: 'No se pudo procesar el usuario. Revise los datos ingresados.' });
  }
};

const editarUsuario = async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    apellidos,
    sexo,
    dui,
    telefono,
    correo,
    fecha_nacimiento,
    estado,
    id_especialidad,
    jvpm,
    jvpe,
    correlativo
  } = req.body;

  const rolesPayload = obtenerRolesPayload(req.body);
  const operaciones = obtenerOperacionesPayload(req.body);
  const idUsuarioAuditoria = usuarioAccion(req);

  if (estado === undefined) {
    return res.status(400).json({
      mensaje: 'El estado es obligatorio'
    });
  }

  try {
    if (!nombre) throw new Error('El nombre es obligatorio');
    if (!apellidos) throw new Error('Los apellidos son obligatorios');
    validarFechaNoFutura(fecha_nacimiento);
    validarDui(dui);
    validarTelefono(telefono, 'telefónico');
    validarCorreo(correo);
    await validarDuplicadosUsuario({ dui, correo, telefono, correlativo, jvpm, jvpe, idUsuarioExcluir: Number(id) });
    await asegurarTablaTokenPassword();

    await query(`START TRANSACTION`);

    const [usuarios] = await query(
      `
      SELECT id_persona, estado, password, correlativo
      FROM usuario
      WHERE id_usuario = ?
      `,
      [id]
    );

    if (usuarios.length === 0) {
      await query(`ROLLBACK`);
      return res.status(404).json({
        mensaje: 'Usuario no encontrado'
      });
    }

    const idPersona = usuarios[0].id_persona;
    const estadoAnterior = Number(usuarios[0].estado);
    const estadoSolicitado = Number(estado);
    const debeActivarse = estadoSolicitado === USUARIO_ACTIVO &&
      (estadoAnterior === USUARIO_INACTIVO || estadoAnterior === USUARIO_PENDIENTE || !usuarios[0].password);
    const estadoNuevo = estadoSolicitado === USUARIO_INACTIVO
      ? USUARIO_INACTIVO
      : debeActivarse || estadoAnterior === USUARIO_PENDIENTE
        ? USUARIO_PENDIENTE
        : USUARIO_ACTIVO;
    const usuarioAnterior = await obtenerRegistro('usuario', 'id_usuario', id);
    const personaAnterior = await obtenerRegistro('persona', 'id_persona', idPersona);
    const rolesActuales = await obtenerRolesUsuario(id);
    const idsRolesActuales = rolesActuales.map(rol => rol.id_rol);
    const puedeAsignarRol = idsRolesActuales.length === 0;

    if (!puedeAsignarRol && rolesPayload.length > 0) {
      const actual = [...idsRolesActuales].sort().join(',');
      const solicitado = [...rolesPayload].sort().join(',');

      if (actual !== solicitado) {
        await query(`ROLLBACK`);
        return res.status(400).json({
          mensaje: 'El rol no puede modificarse cuando el usuario ya tiene rol asignado'
        });
      }
    }

    await query(
      `
      UPDATE persona
      SET
        nombre = ?,
        apellidos = ?,
        sexo = ?,
        dui = ?,
        telefono = ?,
        correo_electronico = ?,
        fecha_nacimiento = ?,
        fecha_modificacion = NOW(),
        usuario_modificacion = ?,
        version = COALESCE(version, 0) + 1
      WHERE id_persona = ?
      `,
      [
        nombre,
        apellidos,
        sexo,
        dui,
        telefono,
        correo,
        fecha_nacimiento,
        idUsuarioAuditoria,
        idPersona
      ]
    );

    await query(
      `
      UPDATE usuario
      SET
        estado = ?,
        fecha_modificacion = NOW(),
        usuario_modificacion = ?,
        version = COALESCE(version, 0) + 1
      WHERE id_usuario = ?
      `,
      [estadoNuevo, idUsuarioAuditoria, id]
    );

    let tokenActivacion = null;
    if (estadoNuevo === USUARIO_INACTIVO) {
      await invalidarTokensActivacion(id);
    } else if (debeActivarse) {
      tokenActivacion = await crearTokenPassword({
        idUsuario: id,
        tipo: 'ACTIVACION_USUARIO',
        minutos: 60,
        usarCodigo: false
      });
    }

    const rolesParaAplicar = puedeAsignarRol && rolesPayload.length > 0
      ? rolesPayload
      : idsRolesActuales;

    if (rolesParaAplicar.includes(DOCTOR_ROL)) validarJv(jvpm, 'JVPM', true);
    if (rolesParaAplicar.includes(ENFERMERA_ROL)) validarJv(jvpe, 'JVPE', true);

    if (puedeAsignarRol && rolesPayload.length > 0) {
      await insertarRolesUsuario(id, rolesPayload);
      await guardarOperacionesObligatorias(rolesPayload);
    }

    if (rolesParaAplicar.includes(ADMIN_ROL) && req.body.operaciones !== undefined) {
      await guardarOperacionesAdministrador(id, operaciones);
    }

    if (rolesParaAplicar.includes(DOCTOR_ROL)) {
      await guardarDoctor(id, jvpm, id_especialidad, req.file ? req.file.buffer : null);
    }

    if (rolesParaAplicar.includes(ENFERMERA_ROL)) {
      await guardarEnfermera(id, jvpe);
    }

    await query(`COMMIT`);

    await registrarAuditoria({
      req,
      tabla_afectada: 'usuario',
      id_registro: id,
      accion: 'UPDATE',
      usuario_accion: idUsuarioAuditoria,
      datos_anteriores: {
        usuario: usuarioAnterior,
        persona: personaAnterior
      },
      datos_nuevos: {
        usuario: await obtenerRegistro('usuario', 'id_usuario', id),
        persona: await obtenerRegistro('persona', 'id_persona', idPersona)
      },
      descripcion: 'Actualización de usuario'
    });

    let correoActivacionEnviado = false;
    if (tokenActivacion) {
      try {
        const activacion = await enviarActivacionUsuario({
          idUsuario: id,
          correo,
          nombre: `${nombre} ${apellidos}`.trim(),
          correlativo: usuarios[0].correlativo,
          tokenPlano: tokenActivacion,
          tipo: 'ACTIVACION_USUARIO'
        });
        correoActivacionEnviado = Boolean(activacion && !activacion.resultadoCorreo?.simulado);
      } catch (correoError) {
        console.error('No se pudo generar/enviar enlace de activación');
        console.error(correoError);
      }
    }

    return res.json({
      mensaje: tokenActivacion
        ? 'Usuario pendiente de activación. Se generó un enlace para crear su contraseña.'
        : 'Usuario actualizado correctamente',
      estado: estadoNuevo,
      correo_activacion_enviado: correoActivacionEnviado
    });
  } catch (err) {
    await query(`ROLLBACK`);
    console.error('Error al actualizar usuario:', err);
    const mensajeDuplicado = mensajeDuplicadoSql(err);

    if (mensajeDuplicado) {
      return res.status(400).json({ mensaje: mensajeDuplicado });
    }
    if (esErrorCliente(err)) {
      return res.status(400).json({ mensaje: err.message });
    }

    return res.status(500).json({ mensaje: 'No se pudo procesar el usuario. Revise los datos ingresados.' });
  }
};

const obtenerUsuarioPorId = async (req, res) => {
  const { id } = req.params;

  try {
    const [usuarios] = await query(
      `
      SELECT 
        u.id_usuario,
        u.correlativo,
        CASE
          WHEN u.estado = 0 THEN 0
          WHEN u.estado = 1 AND u.password IS NOT NULL THEN 1
          ELSE 2
        END AS estado,

        p.nombre,
        p.apellidos,
        p.sexo,
        p.dui,
        p.telefono,
        p.correo_electronico,
        p.fecha_nacimiento,

        d.id_doctor,
        d.jvpm,
        enf.id_enfermera,
        enf.jvpe,

        ed.id_especialidad,
        e.nombre AS especialidad
      FROM usuario u
      JOIN persona p 
        ON u.id_persona = p.id_persona
      LEFT JOIN doctor d
        ON u.id_usuario = d.id_usuario
      LEFT JOIN especialidad_doctor ed
        ON d.id_doctor = ed.id_doctor
      LEFT JOIN especialidad e
        ON ed.id_especialidad = e.id_especialidad
      LEFT JOIN enfermera enf
        ON u.id_usuario = enf.id_usuario
      WHERE u.id_usuario = ?
      `,
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado'
      });
    }

    const usuario = usuarios[0];
    const roles = await obtenerRolesUsuario(id);
    const idRoles = roles.map(rol => rol.id_rol);

    const [operaciones] = await query(
      `
      SELECT DISTINCT operaciones_usuario.id_operacion
      FROM (
        SELECT ro.id_operacion
        FROM rol_usuario ru
        JOIN rol_operacion ro
          ON ru.id_rol = ro.id_rol
        JOIN operacion o
          ON ro.id_operacion = o.id_operacion
        WHERE ru.id_usuario = ?
          AND ru.id_rol <> ?
          AND o.estado = 1
          AND ro.id_operacion NOT IN (8, 15)

        UNION

        SELECT uo.id_operacion
        FROM usuario_operacion uo
        JOIN operacion o
          ON uo.id_operacion = o.id_operacion
        WHERE uo.id_usuario = ?
          AND o.estado = 1
          AND uo.id_operacion NOT IN (8, 15)
      ) operaciones_usuario
      ORDER BY operaciones_usuario.id_operacion
      `,
      [id, ADMIN_ROL, id]
    );

    const [operacionesAdmin] = await query(
      `
      SELECT uo.id_operacion
      FROM usuario_operacion uo
      JOIN operacion o
        ON uo.id_operacion = o.id_operacion
      WHERE uo.id_usuario = ?
        AND o.estado = 1
        AND uo.id_operacion NOT IN (8, 15)
      ORDER BY uo.id_operacion
      `,
      [id]
    );

    usuario.roles = idRoles;
    usuario.id_roles = idRoles;
    usuario.rol = roles.map(rol => rol.nombre).join(', ');
    usuario.id_rol = idRoles.length === 1 ? idRoles[0] : null;
    usuario.operaciones = operaciones.map(op => op.id_operacion);
    usuario.operaciones_admin = idRoles.includes(ADMIN_ROL)
      ? operacionesAdmin.map(op => op.id_operacion)
      : [];

    return res.json(usuario);
  } catch (err) {
    console.error('Error al obtener usuario:', err);
    return res.status(500).json(err);
  }
};

const reenviarActivacionUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    await asegurarTablaTokenPassword();

    const [usuarios] = await query(
      `SELECT
         u.id_usuario,
         u.correlativo,
         u.estado,
         u.password,
         p.nombre,
         p.apellidos,
         p.correo_electronico
       FROM usuario u
       INNER JOIN persona p ON p.id_persona = u.id_persona
       WHERE u.id_usuario = ?
       LIMIT 1`,
      [id]
    );

    if (!usuarios.length) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }

    const usuario = usuarios[0];
    if (Number(usuario.estado) === USUARIO_INACTIVO) {
      return res.status(400).json({
        mensaje: 'El usuario está inactivo. Debe activarlo desde la edición antes de enviar un enlace.'
      });
    }

    if (Number(usuario.estado) === USUARIO_ACTIVO && usuario.password) {
      return res.status(400).json({ mensaje: 'El usuario ya se encuentra activo.' });
    }

    await query('START TRANSACTION');
    await invalidarTokensActivacion(id);
    const tokenActivacion = await crearTokenPassword({
      idUsuario: id,
      tipo: 'ACTIVACION_USUARIO',
      minutos: 60,
      usarCodigo: false
    });
    await query('COMMIT');

    console.log(`Token de activación regenerado para id_usuario: ${id}`);
    console.log(`Reenviando correo de activación a: ${usuario.correo_electronico}`);

    try {
      await enviarActivacionUsuario({
        idUsuario: id,
        correo: usuario.correo_electronico,
        nombre: `${usuario.nombre} ${usuario.apellidos}`.trim(),
        correlativo: usuario.correlativo,
        tokenPlano: tokenActivacion,
        tipo: 'ACTIVACION_USUARIO'
      });
    } catch (correoError) {
      console.error('No se pudo generar/enviar enlace de activación');
      console.error(correoError);
      return res.status(502).json({
        mensaje: 'Se generó un enlace nuevo, pero no fue posible enviarlo. Intente reenviarlo nuevamente.'
      });
    }

    return res.json({
      mensaje: 'Se generó y envió un nuevo enlace de activación.',
      estado: USUARIO_PENDIENTE
    });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Error al reenviar activación de usuario:', err);
    return res.status(500).json({ mensaje: 'No se pudo reenviar el enlace de activación.' });
  }
};

const subirFirma = async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({
      mensaje: 'No se envió ninguna imagen'
    });
  }

  try {
    const [result] = await query(
      `UPDATE doctor
       SET firma = ?,
           fecha_modificacion = NOW(),
           usuario_modificacion = ?,
           version = COALESCE(version, 0) + 1
       WHERE id_usuario = ?`,
      [req.file.buffer, usuarioAccion(req), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'El usuario no tiene registro de doctor'
      });
    }

    await registrarAuditoria({
      req,
      tabla_afectada: 'doctor',
      id_registro: id,
      accion: 'UPDATE',
      usuario_accion: usuarioAccion(req),
      descripcion: 'Se actualizó la firma del doctor'
    });

    return res.json({
      mensaje: 'Firma guardada correctamente'
    });
  } catch (err) {
    console.error('Error al guardar firma:', err);
    return res.status(500).json(err);
  }
};

const subirSelloDoctor = async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({
      mensaje: 'No se envió ninguna imagen'
    });
  }

  try {
    const [result] = await query(
      `UPDATE doctor
       SET sello = ?,
           fecha_modificacion = NOW(),
           usuario_modificacion = ?,
           version = COALESCE(version, 0) + 1
       WHERE id_usuario = ?`,
      [req.file.buffer, usuarioAccion(req), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        mensaje: 'El usuario no tiene registro de doctor'
      });
    }

    await registrarAuditoria({
      req,
      tabla_afectada: 'doctor',
      id_registro: id,
      accion: 'UPDATE',
      usuario_accion: usuarioAccion(req),
      descripcion: 'Se actualizó el sello personal del doctor'
    });

    return res.json({
      mensaje: 'Sello del doctor guardado correctamente'
    });
  } catch (err) {
    console.error('Error al guardar sello del doctor:', err);
    return res.status(500).json(err);
  }
};

const obtenerFirma = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await query(
      `SELECT firma FROM doctor WHERE id_usuario = ?`,
      [id]
    );

    if (!result.length || !result[0].firma) {
      return res.status(404).send('Sin firma');
    }

    res.set('Content-Type', mimeImagen(result[0].firma));
    return res.send(result[0].firma);
  } catch (err) {
    console.error('Error al obtener firma:', err);
    return res.status(500).json(err);
  }
};

const obtenerSelloDoctor = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await query(
      `SELECT sello FROM doctor WHERE id_usuario = ?`,
      [id]
    );

    if (!result.length || !result[0].sello) {
      return res.status(404).send('Sin sello');
    }

    res.set('Content-Type', mimeImagen(result[0].sello));
    return res.send(result[0].sello);
  } catch (err) {
    console.error('Error al obtener sello del doctor:', err);
    return res.status(500).json(err);
  }
};

const obtenerUsuarios = async (req, res) => {
  const queryUsuarios = `
    SELECT 
      u.id_usuario,
      u.correlativo AS usuario,
      CASE
        WHEN u.estado = 0 THEN 0
        WHEN u.estado = 1 AND u.password IS NOT NULL THEN 1
        ELSE 2
      END AS estado,

      MAX(p.nombre) AS nombre,
      MAX(p.apellidos) AS apellidos,
      MAX(p.correo_electronico) AS correo,

      GROUP_CONCAT(DISTINCT r.id_rol ORDER BY r.id_rol SEPARATOR ',') AS id_roles,
      GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.id_rol SEPARATOR ', ') AS rol,

      GROUP_CONCAT(DISTINCT e.nombre SEPARATOR ', ') AS especialidad
    FROM usuario u
    LEFT JOIN persona p
      ON u.id_persona = p.id_persona
    LEFT JOIN rol_usuario ru
      ON u.id_usuario = ru.id_usuario
    LEFT JOIN rol r
      ON ru.id_rol = r.id_rol
    LEFT JOIN doctor d
      ON u.id_usuario = d.id_usuario
    LEFT JOIN especialidad_doctor ed
      ON d.id_doctor = ed.id_doctor
    LEFT JOIN especialidad e
      ON ed.id_especialidad = e.id_especialidad
    GROUP BY u.id_usuario
    ORDER BY u.id_usuario DESC
  `;

  try {
    const [result] = await query(queryUsuarios);

    const usuarios = result.map(usuario => ({
      ...usuario,
      id_roles: usuario.id_roles
        ? usuario.id_roles.split(',').map(idRol => Number(idRol))
        : []
    }));

    return res.json(usuarios);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    return res.status(500).json(err);
  }
};

const obtenerEspecialidades = async (req, res) => {
  try {
    const [result] = await query(
      `
      SELECT
        id_especialidad,
        nombre
      FROM especialidad
      ORDER BY nombre ASC
      `
    );

    return res.json(result);
  } catch (err) {
    console.error('Error al obtener especialidades:', err);
    return res.status(500).json(err);
  }
};

module.exports = {
  crearUsuario,
  editarUsuario,
  reenviarActivacionUsuario,
  obtenerUsuarioPorId,
  subirFirma,
  subirSelloDoctor,
  obtenerFirma,
  obtenerSelloDoctor,
  obtenerUsuarios,
  obtenerEspecialidades
};
