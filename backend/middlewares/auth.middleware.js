const crypto = require('crypto');

const SECRET = process.env.AUTH_SECRET;

if (!SECRET) {
  throw new Error('AUTH_SECRET no está configurado en backend/.env');
}

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const firmar = (data) => {
  return crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64url');
};

const generarToken = (usuario) => {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64url({
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    operaciones: usuario.operaciones || [],
    roles: usuario.roles || [],
    iat: Math.floor(Date.now() / 1000)
  });
  const signature = firmar(`${header}.${payload}`);

  return `${header}.${payload}.${signature}`;
};

const verificarToken = (token) => {
  const partes = String(token || '').split('.');

  if (partes.length !== 3) {
    throw new Error('Token inválido');
  }

  const [header, payload, signature] = partes;
  const esperado = firmar(`${header}.${payload}`);

  if (signature !== esperado) {
    throw new Error('Firma de token inválida');
  }

  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
};

const obtenerToken = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7);
};

const optionalAuth = (req, res, next) => {
  try {
    const token = obtenerToken(req);
    if (token) {
      req.usuario = verificarToken(token);
    }
    next();
  } catch {
    next();
  }
};

const requireAuth = (req, res, next) => {
  try {
    const token = obtenerToken(req);

    if (!token) {
      return res.status(401).json({ mensaje: 'Token requerido' });
    }

    req.usuario = verificarToken(token);
    return next();
  } catch (err) {
    return res.status(401).json({ mensaje: err.message || 'Token inválido' });
  }
};

const requireOperacion = (operacionesPermitidas = []) => {
  const requeridas = operacionesPermitidas.map(Number);

  return (req, res, next) => {
    const operacionesUsuario = Array.isArray(req.usuario?.operaciones)
      ? req.usuario.operaciones.map(Number)
      : [];

    const permitido = requeridas.length === 0 ||
      requeridas.some((idOperacion) => operacionesUsuario.includes(idOperacion));

    if (!permitido) {
      return res.status(403).json({ mensaje: 'No tiene permiso para realizar esta acción.' });
    }

    return next();
  };
};

module.exports = {
  generarToken,
  verificarToken,
  optionalAuth,
  requireAuth,
  requireOperacion
};
