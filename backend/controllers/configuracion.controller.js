const db = require('../config/db');

const NOMBRE_SELLO = 'sello_clinico';
const usuarioAccion = (req) => req.usuario?.id_usuario || null;

///  SUBIR SELLO
exports.subirSello = (req, res) => {

  if (!req.file) {
    return res.status(400).json({
      mensaje: 'No se envió ninguna imagen'
    });
  }

  const imagen = req.file.buffer;
  const tipo = req.file.mimetype || 'image/png';
  const idUsuario = usuarioAccion(req);

  db.query(
    `
    SELECT id_configuracion
    FROM configuracion_sistema
    WHERE nombre IN (?, 'sello')
    ORDER BY nombre = ? DESC
    LIMIT 1
    `,
    [NOMBRE_SELLO, NOMBRE_SELLO],
    (err, rows) => {
      if (err) {
        console.error("Error al buscar sello:", err);
        return res.status(500).json(err);
      }

      if (rows.length > 0) {
        return db.query(
          `
          UPDATE configuracion_sistema
          SET
            nombre = ?,
            valor = ?,
            tipo = ?,
            descripcion = 'Sello clinico institucional',
            fecha_modificacion = NOW(),
            usuario_modificacion = ?,
            version = COALESCE(version, 0) + 1
          WHERE id_configuracion = ?
          `,
          [NOMBRE_SELLO, imagen, tipo, idUsuario, rows[0].id_configuracion],
          (errUpdate) => {
            if (errUpdate) {
              console.error("Error al guardar sello:", errUpdate);
              return res.status(500).json(errUpdate);
            }

            return res.json({
              mensaje: 'Sello actualizado correctamente'
            });
          }
        );
      }

      return db.query(
        `
        INSERT INTO configuracion_sistema
        (
          nombre,
          valor,
          tipo,
          descripcion,
          version,
          fecha_creacion,
          usuario_creacion
        )
        VALUES (?, ?, ?, 'Sello clinico institucional', 1, NOW(), ?)
        `,
        [NOMBRE_SELLO, imagen, tipo, idUsuario],
        (errInsert) => {
          if (errInsert) {
            console.error("Error al crear sello:", errInsert);
            return res.status(500).json(errInsert);
          }

          return res.json({
            mensaje: 'Sello guardado correctamente'
          });
        }
      );
    }
  );
};


///  OBTENER SELLO
exports.obtenerSello = (req, res) => {

  const query = `
    SELECT valor, tipo
    FROM configuracion_sistema 
    WHERE nombre IN (?, 'sello')
    ORDER BY nombre = ? DESC
    LIMIT 1
  `;

  db.query(query, [NOMBRE_SELLO, NOMBRE_SELLO], (err, result) => {

    if (err) {
      console.error("Error al obtener sello:", err);
      return res.status(500).json(err);
    }

    if (!result.length || !result[0].valor) {
      return res.status(404).send('Sin sello');
    }

    const tipo = result[0].tipo && String(result[0].tipo).startsWith('image/')
      ? result[0].tipo
      : 'image/png';

    res.set('Content-Type', tipo);
    res.send(result[0].valor);
  });
};
