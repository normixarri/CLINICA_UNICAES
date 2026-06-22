const { execFile } = require('child_process');
const os = require('os');
const db = require('../config/db');

const query = (sql, params = []) => db.promise().query(sql, params);

const CAMPOS_SENSIBLES = new Set([
  'password',
  'nuevapassword',
  'confirmacion',
  'token',
  'token_hash',
  'codigo',
  'codigo_hash',
  'pass',
  'smtp_pass'
]);

const serializar = (valor) => {
  if (valor === undefined || valor === null) return null;
  return JSON.stringify(sanitizarDatos(valor));
};

const obtenerIpCliente = (req) => {
  if (!req) return null;

  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(',')[0]?.trim();

  return normalizarIp(
    ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    req.ip ||
    null
  );
};

const normalizarIp = (ip) => {
  if (!ip) return null;
  const limpia = String(ip).trim();
  if (limpia.startsWith('::ffff:')) return limpia.replace('::ffff:', '');
  if (limpia === '::1') return '127.0.0.1';
  return limpia;
};

const obtenerMacCliente = async (ip) => {
  /*
   * La MAC puede no estar disponible en entornos web, especialmente si el usuario
   * esta fuera de la red local, detras de NAT, proxy o usando navegador moderno.
   * Se intenta obtener por ARP desde el backend y, si no se encuentra, se guarda NULL.
   * Si se prueba desde localhost, se guarda la MAC local del equipo donde corre Node,
   * porque 127.0.0.1 no aparece en la tabla ARP.
   */
  if (!ip) return null;

  if (ip === '127.0.0.1' || ip === 'localhost') {
    return obtenerMacLocal();
  }

  try {
    const salida = await ejecutarArp(ip);
    const match = buscarMacEnArp(salida, ip);
    return match ? match[0].replace(/-/g, ':').toUpperCase() : null;
  } catch (error) {
    console.warn(`No se pudo obtener MAC para IP ${ip}:`, error.message);
    return null;
  }
};

const obtenerMacLocal = () => {
  const interfaces = os.networkInterfaces();

  for (const adaptadores of Object.values(interfaces)) {
    for (const adaptador of adaptadores || []) {
      if (
        adaptador &&
        !adaptador.internal &&
        adaptador.mac &&
        adaptador.mac !== '00:00:00:00:00:00'
      ) {
        return adaptador.mac.toUpperCase();
      }
    }
  }

  return null;
};

const buscarMacEnArp = (salida, ip) => {
  const lineas = String(salida || '').split(/\r?\n/);
  const lineaIp = lineas.find((linea) => linea.includes(ip));
  const texto = lineaIp || salida;
  return String(texto || '').match(/([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i);
};

const ejecutarArp = (ip) => {
  return new Promise((resolve, reject) => {
    execFile('arp', ['-a', ip], { windowsHide: true, timeout: 2500 }, (error, stdout, stderr) => {
      if (error) return reject(error);
      if (stderr) console.warn('ARP stderr:', stderr);
      return resolve(stdout || '');
    });
  });
};

const sanitizarDatos = (valor) => {
  if (Array.isArray(valor)) return valor.map(sanitizarDatos);
  if (!valor || typeof valor !== 'object') return valor;

  return Object.entries(valor).reduce((acc, [key, item]) => {
    const keyNormalizada = String(key).toLowerCase();
    acc[key] = CAMPOS_SENSIBLES.has(keyNormalizada)
      ? '[OCULTO]'
      : sanitizarDatos(item);
    return acc;
  }, {});
};

const registrarAuditoria = async ({
  req = null,
  tabla_afectada,
  id_registro = null,
  accion,
  usuario_accion = null,
  datos_anteriores = null,
  datos_nuevos = null,
  descripcion = null
}) => {
  try {
    const direccion_ip = obtenerIpCliente(req);
    const direccion_mac = await obtenerMacCliente(direccion_ip);

    await query(
      `
      INSERT INTO auditoria_sistema
      (
        tabla_afectada,
        id_registro,
        accion,
        usuario_accion,
        direccion_ip,
        direccion_mac,
        fecha_accion,
        datos_anteriores,
        datos_nuevos,
        descripcion
      )
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
      `,
      [
        tabla_afectada,
        id_registro,
        accion,
        usuario_accion,
        direccion_ip,
        direccion_mac,
        serializar(datos_anteriores),
        serializar(datos_nuevos),
        descripcion
      ]
    );
  } catch (error) {
    console.error('Error registrando auditoria:', error);
  }
};

const obtenerRegistro = async (tabla, campoId, id) => {
  const [rows] = await query(`SELECT * FROM ${tabla} WHERE ${campoId} = ? LIMIT 1`, [id]);
  return sanitizarDatos(rows[0] || null);
};

module.exports = {
  registrarAuditoria,
  obtenerIpCliente,
  obtenerMacCliente,
  obtenerRegistro,
  sanitizarDatos
};
