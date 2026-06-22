const db = require('../config/db');

const normalizarTexto = (valor) => String(valor || '').trim().replace(/\s+/g, ' ');
const contieneLetras = (valor) => /\p{L}/u.test(valor);

const obtenerEspecialidades = (req, res) => {
  const sql = `
    SELECT
      e.id_especialidad,
      e.codigo,
      e.nombre,
      e.descripcion,
      CASE
        WHEN COUNT(DISTINCT u.id_usuario) > 0 THEN 'Activa'
        ELSE 'Inactiva'
      END AS estado,
      COUNT(DISTINCT u.id_usuario) AS cantidad_doctores
    FROM especialidad e
    LEFT JOIN especialidad_doctor ed
      ON e.id_especialidad = ed.id_especialidad
    LEFT JOIN doctor d
      ON ed.id_doctor = d.id_doctor
    LEFT JOIN usuario u
      ON d.id_usuario = u.id_usuario
      AND u.estado = 1
    GROUP BY
      e.id_especialidad,
      e.codigo,
      e.nombre,
      e.descripcion
    ORDER BY e.nombre ASC
  `;

  db.query(sql, (error, resultados) => {
    if (error) {
      console.error('Error al obtener especialidades:', error);
      return res.status(500).json({
        error: 'Error de base de datos',
        detalle: error.message
      });
    }

    return res.json(resultados);
  });
};

const responderValidacion = (res, campo, mensaje) => res.status(400).json({
  mensaje,
  errors: { [campo]: mensaje }
});

const crearEspecialidad = (req, res) => {
  const nombre = normalizarTexto(req.body.nombre);
  const descripcion = normalizarTexto(req.body.descripcion);

  if (!nombre) {
    return responderValidacion(res, 'nombre', 'Debe ingresar el nombre de la especialidad.');
  }

  if (!contieneLetras(nombre)) {
    return responderValidacion(res, 'nombre', 'El nombre de la especialidad debe contener letras.');
  }

  if (nombre.length < 3) {
    return responderValidacion(res, 'nombre', 'El nombre de la especialidad debe tener al menos 3 caracteres.');
  }

  if (!descripcion) {
    return responderValidacion(res, 'descripcion', 'Debe ingresar una descripción.');
  }

  if (!contieneLetras(descripcion)) {
    return responderValidacion(res, 'descripcion', 'La descripción debe contener letras.');
  }

  if (descripcion.length < 5) {
    return responderValidacion(res, 'descripcion', 'La descripción debe tener al menos 5 caracteres.');
  }

  db.query(
    `SELECT id_especialidad
     FROM especialidad
     WHERE LOWER(TRIM(nombre)) = LOWER(?)
     LIMIT 1`,
    [nombre],
    (errorDuplicado, duplicados) => {
      if (errorDuplicado) {
        console.error('Error al validar especialidad duplicada:', errorDuplicado);
        return res.status(500).json({ mensaje: 'No se pudo validar la especialidad.' });
      }

      if (duplicados.length > 0) {
        return responderValidacion(res, 'nombre', 'Esta especialidad ya está registrada.');
      }

      db.query(
        'SELECT COALESCE(MAX(id_especialidad), 0) + 1 AS siguiente FROM especialidad',
        (errorCodigo, resultadoCodigo) => {
          if (errorCodigo) {
            console.error('Error al generar código de especialidad:', errorCodigo);
            return res.status(500).json({ mensaje: 'No se pudo generar el código de especialidad.' });
          }

          const siguiente = resultadoCodigo[0].siguiente;
          const codigo = `ESP-${String(siguiente).padStart(4, '0')}`;
          const sql = `
            INSERT INTO especialidad
              (codigo, nombre, descripcion, estado, version, fecha_creacion)
            VALUES (?, ?, ?, 1, 1, NOW())
          `;

          db.query(sql, [codigo, nombre, descripcion], (error, result) => {
            if (error) {
              if (error.code === 'ER_DUP_ENTRY') {
                return responderValidacion(res, 'nombre', 'Esta especialidad ya está registrada.');
              }
              console.error('Error al crear especialidad:', error);
              return res.status(500).json({ mensaje: 'No se pudo crear la especialidad.' });
            }

            return res.json({
              mensaje: 'Especialidad creada correctamente',
              id_especialidad: result.insertId,
              codigo
            });
          });
        }
      );
    }
  );
};

module.exports = {
  obtenerEspecialidades,
  crearEspecialidad
};
