const db = require('../config/db');

const nombreOperacion = (alias = 'id_operacion') => `
  CASE
    WHEN ${alias} = 7 THEN 'Generar consulta'
    WHEN ${alias} = 9 THEN 'Realizar consulta'
    WHEN ${alias} = 16 THEN 'Ver pacientes'
    WHEN ${alias} = 17 THEN 'Editar pacientes'
    ELSE nombre
  END
`;

exports.obtenerOperaciones = (req, res) => {
  db.query(
    `
    SELECT
      id_operacion,
      codigo,
      ${nombreOperacion()} AS nombre,
      descripcion,
      estado,
      version,
      fecha_creacion,
      fecha_modificacion
    FROM operacion
    WHERE estado = 1
      AND id_operacion NOT IN (8, 15)
    ORDER BY id_operacion
    `,
    (err, result) => {
      if (err) return res.status(500).json(err);
      return res.json(result);
    }
  );
};

exports.obtenerOperacionesUsuario = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      permisos.id_operacion,
      CASE
        WHEN permisos.id_operacion = 7 THEN 'Generar consulta'
        WHEN permisos.id_operacion = 9 THEN 'Realizar consulta'
        WHEN permisos.id_operacion = 16 THEN 'Ver pacientes'
        WHEN permisos.id_operacion = 17 THEN 'Editar pacientes'
        ELSE permisos.nombre
      END AS nombre
    FROM (
      SELECT o.id_operacion, o.nombre
      FROM rol_usuario ru
      JOIN rol_operacion ro
        ON ru.id_rol = ro.id_rol
      JOIN operacion o
        ON ro.id_operacion = o.id_operacion
      WHERE ru.id_usuario = ?
        AND ru.id_rol <> 1
        AND o.estado = 1
        AND o.id_operacion NOT IN (8, 15)

      UNION

      SELECT o.id_operacion, o.nombre
      FROM usuario_operacion uo
      JOIN operacion o
        ON uo.id_operacion = o.id_operacion
      WHERE uo.id_usuario = ?
        AND o.estado = 1
        AND o.id_operacion NOT IN (8, 15)
    ) permisos
    ORDER BY permisos.id_operacion
  `;

  db.query(sql, [id, id], (err, result) => {
    if (err) return res.status(500).json(err);
    return res.json(result);
  });
};
