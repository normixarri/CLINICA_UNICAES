const db = require('../config/db');

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
});

(async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS usuario_operacion (
      id_usuario INT NOT NULL,
      id_operacion INT NOT NULL,
      version INT NOT NULL DEFAULT 1,
      fecha_creacion DATETIME NOT NULL,
      fecha_modificacion DATETIME NULL,
      PRIMARY KEY (id_usuario, id_operacion),
      FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
      FOREIGN KEY (id_operacion) REFERENCES operacion(id_operacion)
    )
  `);

  await run(`
    INSERT IGNORE INTO usuario_operacion
    (
      id_usuario,
      id_operacion,
      version,
      fecha_creacion
    )
    SELECT
      ru.id_usuario,
      ro.id_operacion,
      1,
      NOW()
    FROM rol_usuario ru
    JOIN rol_operacion ro
      ON ru.id_rol = ro.id_rol
    JOIN operacion o
      ON ro.id_operacion = o.id_operacion
    WHERE ru.id_rol = 1
      AND o.estado = 1
      AND ro.id_operacion != 8
  `);

  const eliminado = await run(`
    DELETE FROM rol_operacion
    WHERE id_rol = 1
  `);

  console.log('usuario_operacion listo; operaciones admin globales eliminadas:', eliminado.affectedRows);
  db.end();
})().catch((err) => {
  console.error(err);
  db.end();
  process.exit(1);
});
