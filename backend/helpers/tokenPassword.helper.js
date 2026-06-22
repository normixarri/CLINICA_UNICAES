const db = require('../config/db');
const { generarCodigo, generarTokenPlano, hashToken } = require('./password.helper');

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);

let tablaLista = false;

const asegurarTablaTokenPassword = async () => {
  if (tablaLista) return;

  await query(`
    CREATE TABLE IF NOT EXISTS token_password (
      id_token INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario INT NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      tipo ENUM('CREACION_USUARIO', 'ACTIVACION_USUARIO', 'RECUPERACION_PASSWORD') NOT NULL,
      fecha_expiracion DATETIME NOT NULL,
      usado BOOLEAN DEFAULT FALSE,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
    )
  `);

  await query(`
    ALTER TABLE token_password
    MODIFY tipo ENUM('CREACION_USUARIO', 'ACTIVACION_USUARIO', 'RECUPERACION_PASSWORD') NOT NULL
  `);

  await query(`
    UPDATE usuario
    SET estado = 2
    WHERE estado = 1 AND password IS NULL
  `);

  tablaLista = true;
};

const invalidarTokensActivacion = async (idUsuario) => {
  await asegurarTablaTokenPassword();
  await query(
    `UPDATE token_password
     SET usado = TRUE
     WHERE id_usuario = ?
       AND tipo IN ('CREACION_USUARIO', 'ACTIVACION_USUARIO')
       AND usado = FALSE`,
    [idUsuario]
  );
};

const crearTokenPassword = async ({ idUsuario, tipo, minutos = 15, usarCodigo = false }) => {
  await asegurarTablaTokenPassword();

  const tokenPlano = usarCodigo ? generarCodigo() : generarTokenPlano();
  const tokenHash = hashToken(tokenPlano);

  await query(
    `UPDATE token_password
     SET usado = TRUE
     WHERE id_usuario = ? AND tipo = ? AND usado = FALSE`,
    [idUsuario, tipo]
  );

  await query(
    `INSERT INTO token_password
      (id_usuario, token_hash, tipo, fecha_expiracion, usado, fecha_creacion)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), FALSE, NOW())`,
    [idUsuario, tokenHash, tipo, minutos]
  );

  return tokenPlano;
};

const validarTokenPassword = async ({ token, tipo, tipos = null, idUsuario = null, estadoUsuario = null, marcarUsado = true }) => {
  await asegurarTablaTokenPassword();

  const tiposValidos = Array.isArray(tipos) && tipos.length ? tipos : [tipo];
  const placeholdersTipos = tiposValidos.map(() => '?').join(', ');
  const params = [hashToken(token), ...tiposValidos];
  const filtroUsuario = idUsuario ? 'AND id_usuario = ?' : '';
  if (idUsuario) params.push(idUsuario);
  const filtroEstado = estadoUsuario === null ? '' : 'AND EXISTS (SELECT 1 FROM usuario u WHERE u.id_usuario = token_password.id_usuario AND u.estado = ?)';
  if (estadoUsuario !== null) params.push(estadoUsuario);

  const tokens = await query(
    `SELECT id_token, id_usuario
     FROM token_password
     WHERE token_hash = ?
       AND tipo IN (${placeholdersTipos})
       ${filtroUsuario}
       ${filtroEstado}
       AND usado = FALSE
       AND fecha_expiracion > NOW()
     ORDER BY id_token DESC
     LIMIT 1`,
    params
  );

  if (!tokens.length) return null;

  if (marcarUsado) {
    await query(
      `UPDATE token_password SET usado = TRUE WHERE id_token = ?`,
      [tokens[0].id_token]
    );
  }

  return tokens[0];
};

const obtenerTokenPassword = async ({ token, tipo, tipos = null, estadoUsuario = null }) => {
  await asegurarTablaTokenPassword();

  const tiposValidos = Array.isArray(tipos) && tipos.length ? tipos : [tipo];
  const placeholdersTipos = tiposValidos.map(() => '?').join(', ');
  const filtroEstado = estadoUsuario === null ? '' : 'AND u.estado = ?';
  const tokens = await query(
    `SELECT
       tp.id_token,
       tp.id_usuario,
       tp.fecha_expiracion,
       u.correlativo,
       p.nombre,
       p.apellidos,
       p.correo_electronico
     FROM token_password tp
     INNER JOIN usuario u ON tp.id_usuario = u.id_usuario
     INNER JOIN persona p ON u.id_persona = p.id_persona
     WHERE tp.token_hash = ?
       AND tp.tipo IN (${placeholdersTipos})
       ${filtroEstado}
       AND tp.usado = FALSE
       AND tp.fecha_expiracion > NOW()
     ORDER BY tp.id_token DESC
     LIMIT 1`,
    [hashToken(token), ...tiposValidos, ...(estadoUsuario === null ? [] : [estadoUsuario])]
  );

  return tokens[0] || null;
};

module.exports = {
  asegurarTablaTokenPassword,
  crearTokenPassword,
  invalidarTokensActivacion,
  obtenerTokenPassword,
  validarTokenPassword
};
