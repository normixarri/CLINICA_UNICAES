const db = require('../config/db');
const { generarToken } = require('../middlewares/auth.middleware');
const { enviarCorreo } = require('../helpers/email.helper');
const {
  compararPassword,
  generarCodigo,
  hashPassword,
  necesitaRehash,
  validarPassword
} = require('../helpers/password.helper');
const {
  crearTokenPassword,
  obtenerTokenPassword,
  validarTokenPassword
} = require('../helpers/tokenPassword.helper');

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.login = async (req, res) => {
  try {
    const { usuario, password } = req.body;

    const result = await query(
      `
      SELECT
        u.id_usuario,
        u.correlativo,
        u.id_persona,
        u.password,
        u.estado,
        p.nombre,
        p.apellidos,
        TRIM(CONCAT_WS(' ', p.nombre, p.apellidos)) AS nombre_completo,
        p.correo_electronico,
        d.id_doctor,
        e.id_enfermera
      FROM usuario u
      LEFT JOIN persona p ON u.id_persona = p.id_persona
      LEFT JOIN doctor d ON u.id_usuario = d.id_usuario
      LEFT JOIN enfermera e ON u.id_usuario = e.id_usuario
      WHERE u.correlativo = ?
      LIMIT 1
      `,
      [usuario]
    );

    if (result.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const user = result[0];

    if (Number(user.estado) === 0) {
      return res.status(403).json({
        mensaje: 'Su usuario se encuentra inactivo. Comuníquese con el administrador.'
      });
    }

    if (Number(user.estado) === 2 || !user.password) {
      return res.status(403).json({
        mensaje: 'Debe activar su cuenta creando su contraseña desde el enlace enviado a su correo.'
      });
    }

    if (Number(user.estado) !== 1) {
      return res.status(403).json({ mensaje: 'No es posible iniciar sesión con el estado actual de la cuenta.' });
    }

    const passwordValida = await compararPassword(password, user.password);

    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    if (necesitaRehash(user.password)) {
      const nuevoHash = await hashPassword(password);
      await query(
        `UPDATE usuario SET password = ?, fecha_modificacion = NOW() WHERE id_usuario = ?`,
        [nuevoHash, user.id_usuario]
      );
    }

    const roles = await query(
      `
      SELECT r.id_rol, r.nombre
      FROM rol_usuario ru
      JOIN rol r ON ru.id_rol = r.id_rol
      WHERE ru.id_usuario = ?
      ORDER BY r.id_rol
      `,
      [user.id_usuario]
    );

    const operaciones = await query(
      `
      SELECT DISTINCT permisos.id_operacion
      FROM (
        SELECT ro.id_operacion
        FROM rol_usuario ru
        JOIN rol_operacion ro ON ru.id_rol = ro.id_rol
        JOIN operacion o ON ro.id_operacion = o.id_operacion
        WHERE ru.id_usuario = ?
          AND ru.id_rol <> 1
          AND o.estado = 1
          AND o.id_operacion NOT IN (8, 15)

        UNION

        SELECT uo.id_operacion
        FROM usuario_operacion uo
        JOIN operacion o ON uo.id_operacion = o.id_operacion
        WHERE uo.id_usuario = ?
          AND o.estado = 1
          AND o.id_operacion NOT IN (8, 15)
      ) permisos
      ORDER BY permisos.id_operacion
      `,
      [user.id_usuario, user.id_usuario]
    );

    const usuarioSesion = {
      id_usuario: user.id_usuario,
      correlativo: user.correlativo,
      id_persona: user.id_persona,
      nombre: user.nombre,
      apellidos: user.apellidos,
      nombre_completo: user.nombre_completo,
      correo_electronico: user.correo_electronico,
      estado: user.estado,
      roles: roles.map(rol => rol.id_rol),
      roles_detalle: roles,
      rol: roles.map(rol => rol.nombre).join(', '),
      operaciones: operaciones.map(op => op.id_operacion),
      id_doctor: user.id_doctor || null,
      id_enfermera: user.id_enfermera || null
    };

    const token = generarToken(usuarioSesion);

    return res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: usuarioSesion
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
};

exports.primerAcceso = async (req, res) => {
  try {
    const { token, password, confirmacion } = req.body;
    validarPassword(password, confirmacion);

    const tokenValido = await validarTokenPassword({
      token,
      tipos: ['CREACION_USUARIO', 'ACTIVACION_USUARIO'],
      estadoUsuario: 2,
      marcarUsado: true
    });

    if (!tokenValido) {
      return res.status(400).json({ mensaje: 'El enlace no es válido o ya expiró.' });
    }

    const passwordHash = await hashPassword(password);
    await query(
      `UPDATE usuario
       SET password = ?,
           estado = 1,
           fecha_modificacion = NOW(),
           version = COALESCE(version, 0) + 1
       WHERE id_usuario = ?`,
      [passwordHash, tokenValido.id_usuario]
    );

    const usuarios = await query(
      `SELECT correlativo FROM usuario WHERE id_usuario = ? LIMIT 1`,
      [tokenValido.id_usuario]
    );

    return res.json({
      mensaje: 'Contraseña creada correctamente.',
      usuario: usuarios[0]?.correlativo || ''
    });
  } catch (err) {
    return responderErrorPassword(res, err);
  }
};

exports.verificarTokenActivacion = async (req, res) => {
  try {
    const { token } = req.params;
    const tokenValido = await obtenerTokenPassword({
      token,
      tipos: ['CREACION_USUARIO', 'ACTIVACION_USUARIO'],
      estadoUsuario: 2
    });

    if (!tokenValido) {
      return res.status(400).json({ mensaje: 'El enlace no es válido o ya expiró.' });
    }

    return res.json({
      usuario: tokenValido.correlativo,
      nombre: `${tokenValido.nombre || ''} ${tokenValido.apellidos || ''}`.trim(),
      correo: tokenValido.correo_electronico
    });
  } catch (err) {
    console.error('Error al verificar token de activación:', err);
    return res.status(500).json({ mensaje: 'Error al verificar enlace de activación' });
  }
};

exports.recuperarPassword = async (req, res) => {
  try {
    const { correo } = req.body;
    if (!REGEX_CORREO.test(String(correo || '').trim())) {
      return res.status(400).json({ mensaje: 'Escriba un correo electrónico válido.' });
    }

    const usuarios = await query(
      `
      SELECT u.id_usuario, u.correlativo, p.nombre, p.apellidos, p.correo_electronico
      FROM usuario u
      INNER JOIN persona p ON u.id_persona = p.id_persona
      WHERE p.correo_electronico = ?
        AND u.estado = 1
        AND u.password IS NOT NULL
      LIMIT 1
      `,
      [correo]
    );

    if (!usuarios.length) {
      return res.json({ mensaje: 'Si el correo existe, se enviará un código de recuperación.' });
    }

    const usuario = usuarios[0];
    const codigo = await crearTokenPassword({
      idUsuario: usuario.id_usuario,
      tipo: 'RECUPERACION_PASSWORD',
      minutos: 15,
      usarCodigo: true
    });

    await enviarCorreo({
      to: usuario.correo_electronico,
      subject: 'Código de recuperación de contraseña',
      text: `Hola ${usuario.nombre}. Su código de recuperación es ${codigo}. Expira en 15 minutos.`,
      html: `<p>Hola ${usuario.nombre}.</p><p>Su código de recuperación es <strong>${codigo}</strong>.</p><p>Expira en 15 minutos.</p>`,
      datosPrueba: { tipo: 'RECUPERACION_PASSWORD', codigo }
    });

    return res.json({
      mensaje: 'Si el correo existe, se enviará un código de recuperación.'
    });
  } catch (err) {
    console.error('Error al recuperar contraseña:', err);
    return res.status(500).json({ mensaje: 'Error al solicitar recuperación de contraseña' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { correo, codigo, password, confirmacion } = req.body;
    validarPassword(password, confirmacion);

    const usuarios = await query(
      `
      SELECT u.id_usuario
      FROM usuario u
      INNER JOIN persona p ON u.id_persona = p.id_persona
      WHERE p.correo_electronico = ?
        AND u.estado = 1
        AND u.password IS NOT NULL
      LIMIT 1
      `,
      [correo]
    );

    if (!usuarios.length) {
      return res.status(400).json({ mensaje: 'Código inválido o expirado.' });
    }

    const tokenValido = await validarTokenPassword({
      token: codigo,
      tipo: 'RECUPERACION_PASSWORD',
      idUsuario: usuarios[0].id_usuario,
      marcarUsado: true
    });

    if (!tokenValido) {
      return res.status(400).json({ mensaje: 'Código inválido o expirado.' });
    }

    const passwordHash = await hashPassword(password);
    await query(
      `UPDATE usuario
       SET password = ?,
           fecha_modificacion = NOW(),
           version = COALESCE(version, 0) + 1
       WHERE id_usuario = ?`,
      [passwordHash, usuarios[0].id_usuario]
    );

    return res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    return responderErrorPassword(res, err);
  }
};

exports.enviarActivacionUsuario = async ({ idUsuario, correo, nombre, correlativo, tokenPlano = null, tipo = 'CREACION_USUARIO' }) => {
  const tokenActivacion = tokenPlano || await crearTokenPassword({
    idUsuario,
    tipo,
    minutos: 60,
    usarCodigo: false
  });

  const enlace = `${FRONTEND_URL}/establecer-password/${tokenActivacion}`;

  const resultadoCorreo = await enviarCorreo({
    to: correo,
    subject: 'Activación de cuenta - Clínica Universitaria',
    text: `Hola ${nombre}. Bienvenido/a al sistema clínico. Su usuario es: ${correlativo}. Cree su contraseña aquí: ${enlace}. Este enlace expira en 60 minutos. Cuando inicie sesión utilice ese usuario y la contraseña que registre. No pierda ni olvide esta información.`,
    html: `
      <p>Hola ${nombre}.</p>
      <p>Bienvenido/a al sistema clínico.</p>
      <p><strong>Su usuario es:</strong> ${correlativo}</p>
      <p>Para crear su contraseña ingrese al siguiente enlace:</p>
      <p><a href="${enlace}">${enlace}</a></p>
      <p>Este enlace expira en 60 minutos.</p>
      <p>Cuando inicie sesión utilice ese usuario y la contraseña que registre. No pierda ni olvide esta información.</p>
    `,
    datosPrueba: {
      tipo,
      enlace,
      token: tokenActivacion
    }
  });

  return { enlace, resultadoCorreo };
};

function responderErrorPassword(res, err) {
  if (
    err.message.includes('contraseña') ||
    err.message.includes('confirmación') ||
    err.message.includes('coincidir')
  ) {
    return res.status(400).json({ mensaje: err.message });
  }

  console.error('Error de contraseña:', err);
  return res.status(500).json({ mensaje: 'Error al procesar contraseña' });
}
