const db = require('../config/db');
const { registrarAuditoria, obtenerRegistro } = require('../helpers/auditoria.helper');

const query = (sql, params = []) => db.promise().query(sql, params);
const usuarioAccion = (req) => req.usuario?.id_usuario || null;
const normalizarTexto = (valor) => String(valor || '').trim().replace(/\s+/g, ' ');
const contieneLetras = (valor) => /\p{L}/u.test(valor);

const validarMedicamento = ({ nombre, id_presentacion, id_categoria, stock, estado }) => {
  if (nombre && !contieneLetras(normalizarTexto(nombre))) {
    return 'El nombre del medicamento debe contener letras.';
  }
  if (!nombre || !nombre.trim()) {
    return 'El nombre es obligatorio';
  }

  if (!id_presentacion) {
    return 'La presentación es obligatoria';
  }

  if (!id_categoria) {
    return 'La categoría es obligatoria';
  }

  if (stock === undefined || stock === null || stock === '') {
    return 'El stock es obligatorio';
  }

  if (Number(stock) < 0) {
    return 'El stock no puede ser negativo';
  }

  if (estado === undefined || estado === null || estado === '') {
    return 'El estado es obligatorio';
  }

  return null;
};

exports.obtenerMedicamentos = (req, res) => {
  const { nombre, categoria, presentacion, estado } = req.query;

  let sql = `
    SELECT
      m.id_medicamento,
      m.nombre,
      m.id_presentacion,
      m.id_categoria,
      p.descripcion,
      p.nombre_presentacion AS presentacion,
      c.nombre AS categoria,
      m.stock,
      m.estado
    FROM medicamento m
    LEFT JOIN presentacion p
      ON m.id_presentacion = p.id_presentacion
    LEFT JOIN categoria c
      ON m.id_categoria = c.id_categoria
    WHERE 1 = 1
  `;

  const params = [];

  if (nombre) {
    sql += ` AND m.nombre LIKE ?`;
    params.push(`%${nombre}%`);
  }

  if (categoria) {
    sql += ` AND m.id_categoria = ?`;
    params.push(categoria);
  }

  if (presentacion) {
    sql += ` AND m.id_presentacion = ?`;
    params.push(presentacion);
  }

  if (estado !== undefined && estado !== '') {
    sql += ` AND m.estado = ?`;
    params.push(estado);
  }

  sql += ` ORDER BY m.nombre ASC`;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error al obtener medicamentos:', err);
      return res.status(500).json(err);
    }

    res.json(result);
  });
};

exports.obtenerMedicamentoPorId = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      m.id_medicamento,
      m.nombre,
      m.id_presentacion,
      m.id_categoria,
      p.descripcion,
      p.nombre_presentacion AS presentacion,
      c.nombre AS categoria,
      m.stock,
      m.estado
    FROM medicamento m
    LEFT JOIN presentacion p
      ON m.id_presentacion = p.id_presentacion
    LEFT JOIN categoria c
      ON m.id_categoria = c.id_categoria
    WHERE m.id_medicamento = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al obtener medicamento:', err);
      return res.status(500).json(err);
    }

    if (result.length === 0) {
      return res.status(404).json({
        mensaje: 'Medicamento no encontrado'
      });
    }

    res.json(result[0]);
  });
};

exports.crearMedicamento = async (req, res) => {
  const {
    nombre,
    id_presentacion,
    id_categoria,
    stock,
    estado
  } = req.body;

  const errorValidacion = validarMedicamento({
    nombre,
    id_presentacion,
    id_categoria,
    stock,
    estado
  });

  if (errorValidacion) {
    return res.status(400).json({
      mensaje: errorValidacion
    });
  }

  try {
    const idUsuario = usuarioAccion(req);
    const [result] = await query(
      `
      INSERT INTO medicamento
      (
        nombre,
        id_presentacion,
        id_categoria,
        stock,
        estado,
        fecha_creacion,
        usuario_creacion,
        version
      )
      VALUES (?, ?, ?, ?, ?, NOW(), ?, 1)
      `,
      [
        normalizarTexto(nombre),
        id_presentacion,
        id_categoria,
        Number(stock),
        Number(estado),
        idUsuario
      ]
    );

    const nuevo = await obtenerRegistro('medicamento', 'id_medicamento', result.insertId);

    await registrarAuditoria({
      req,
      tabla_afectada: 'medicamento',
      id_registro: result.insertId,
      accion: 'INSERT',
      usuario_accion: idUsuario,
      datos_nuevos: nuevo,
      descripcion: 'Creación de medicamento'
    });

    return res.json({
      mensaje: 'Medicamento creado correctamente',
      id_medicamento: result.insertId
    });
  } catch (err) {
    console.error('Error al crear medicamento:', err);
    return res.status(500).json(err);
  }
};

exports.editarMedicamento = async (req, res) => {
  const { id } = req.params;
  const {
    nombre,
    id_presentacion,
    id_categoria,
    stock,
    estado
  } = req.body;

  const errorValidacion = validarMedicamento({
    nombre,
    id_presentacion,
    id_categoria,
    stock,
    estado
  });

  if (errorValidacion) {
    return res.status(400).json({
      mensaje: errorValidacion
    });
  }

  try {
    const idUsuario = usuarioAccion(req);
    const anterior = await obtenerRegistro('medicamento', 'id_medicamento', id);

    if (!anterior) {
      return res.status(404).json({
        mensaje: 'Medicamento no encontrado'
      });
    }

    await query(
      `
      UPDATE medicamento
      SET
        nombre = ?,
        id_presentacion = ?,
        id_categoria = ?,
        stock = ?,
        estado = ?,
        fecha_modificacion = NOW(),
        usuario_modificacion = ?,
        version = COALESCE(version, 0) + 1
      WHERE id_medicamento = ?
      `,
      [
        normalizarTexto(nombre),
        id_presentacion,
        id_categoria,
        Number(stock),
        Number(estado),
        idUsuario,
        id
      ]
    );

    const nuevo = await obtenerRegistro('medicamento', 'id_medicamento', id);

    await registrarAuditoria({
      req,
      tabla_afectada: 'medicamento',
      id_registro: id,
      accion: 'UPDATE',
      usuario_accion: idUsuario,
      datos_anteriores: anterior,
      datos_nuevos: nuevo,
      descripcion: 'Actualización de medicamento'
    });

    return res.json({
      mensaje: 'Medicamento actualizado correctamente'
    });
  } catch (err) {
    console.error('Error al editar medicamento:', err);
    return res.status(500).json(err);
  }
};

exports.obtenerCategorias = (req, res) => {
  db.query(
    `
    SELECT
      id_categoria,
      codigo,
      nombre,
      estado
    FROM categoria
    WHERE estado = 1
    ORDER BY nombre ASC
    `,
    (err, result) => {
      if (err) {
        console.error('Error al obtener categorías:', err);
        return res.status(500).json(err);
      }

      res.json(result);
    }
  );
};

exports.crearCategoria = (req, res) => {
  const { nombre } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({
      mensaje: 'El nombre es obligatorio'
    });
  }

  db.query(
    `SELECT COUNT(*) AS total FROM categoria`,
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json(err);
      }

      const numero = result[0].total + 1;
      const codigo = 'CAT-' + numero.toString().padStart(3, '0');

      db.query(
        `
        INSERT INTO categoria
        (
          codigo,
          nombre,
          estado,
          version,
          fecha_creacion
        )
        VALUES (?, ?, 1, 1, NOW())
        `,
        [codigo, nombre.trim()],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json(err);
          }

          res.json({
            mensaje: 'Categoría creada correctamente'
          });
        }
      );
    }
  );
};

exports.obtenerPresentaciones = (req, res) => {
  db.query(
    `
    SELECT
      id_presentacion,
      descripcion,
      nombre_presentacion
    FROM presentacion
    ORDER BY nombre_presentacion ASC
    `,
    (err, result) => {
      if (err) {
        console.error('Error al obtener presentaciones:', err);
        return res.status(500).json(err);
      }

      res.json(result);
    }
  );
};

exports.crearCategoria = async (req, res) => {
  const { nombre } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({
      mensaje: 'El nombre es obligatorio'
    });
  }

  if (!contieneLetras(normalizarTexto(nombre))) {
    return res.status(400).json({
      mensaje: 'La categoría debe contener letras.'
    });
  }

  try {
    const idUsuario = usuarioAccion(req);
    const [existente] = await query(
      `SELECT id_categoria FROM categoria WHERE LOWER(nombre) = LOWER(?) LIMIT 1`,
      [normalizarTexto(nombre)]
    );

    if (existente.length > 0) {
      return res.status(400).json({
        mensaje: 'Ya existe una categoría con ese nombre'
      });
    }

    const [conteo] = await query(`SELECT COUNT(*) AS total FROM categoria`);
    const numero = conteo[0].total + 1;
    const codigo = 'CAT-' + numero.toString().padStart(3, '0');

    const [result] = await query(
      `
      INSERT INTO categoria
      (
        codigo,
        nombre,
        estado,
        version,
        fecha_creacion,
        usuario_creacion
      )
      VALUES (?, ?, 1, 1, NOW(), ?)
      `,
      [codigo, normalizarTexto(nombre), idUsuario]
    );

    const categoria = await obtenerRegistro('categoria', 'id_categoria', result.insertId);

    await registrarAuditoria({
      req,
      tabla_afectada: 'categoria',
      id_registro: result.insertId,
      accion: 'INSERT',
      usuario_accion: idUsuario,
      datos_nuevos: categoria,
      descripcion: 'Creación de categoría de medicamento'
    });

    return res.json({
      mensaje: 'Categoría creada correctamente',
      id_categoria: result.insertId,
      categoria
    });
  } catch (err) {
    console.error('Error al crear categoría:', err);
    return res.status(500).json(err);
  }
};

exports.crearPresentacion = async (req, res) => {
  const { nombre_presentacion, descripcion } = req.body;

  if (!nombre_presentacion || !nombre_presentacion.trim()) {
    return res.status(400).json({
      mensaje: 'El nombre de la presentación es obligatorio'
    });
  }

  if (!contieneLetras(normalizarTexto(nombre_presentacion))) {
    return res.status(400).json({
      mensaje: 'La presentación debe contener letras.'
    });
  }

  if (descripcion && !contieneLetras(normalizarTexto(descripcion))) {
    return res.status(400).json({
      mensaje: 'La descripción de la presentación debe contener letras.'
    });
  }

  try {
    const idUsuario = usuarioAccion(req);
    const [existente] = await query(
      `SELECT id_presentacion FROM presentacion WHERE LOWER(nombre_presentacion) = LOWER(?) LIMIT 1`,
      [normalizarTexto(nombre_presentacion)]
    );

    if (existente.length > 0) {
      return res.status(400).json({
        mensaje: 'Ya existe una presentación con ese nombre'
      });
    }

    const [result] = await query(
      `
      INSERT INTO presentacion
      (
        descripcion,
        nombre_presentacion,
        version,
        fecha_creacion,
        usuario_creacion
      )
      VALUES (?, ?, 1, NOW(), ?)
      `,
      [
        descripcion || null,
        normalizarTexto(nombre_presentacion),
        idUsuario
      ]
    );

    const presentacion = await obtenerRegistro('presentacion', 'id_presentacion', result.insertId);

    await registrarAuditoria({
      req,
      tabla_afectada: 'presentacion',
      id_registro: result.insertId,
      accion: 'INSERT',
      usuario_accion: idUsuario,
      datos_nuevos: presentacion,
      descripcion: 'Creación de presentación de medicamento'
    });

    return res.json({
      mensaje: 'Presentación creada correctamente',
      id_presentacion: result.insertId,
      presentacion
    });
  } catch (err) {
    console.error('Error al crear presentación:', err);
    return res.status(500).json(err);
  }
};

exports.agregarMedicamento = (req, res) => {
  const {
    id_consulta,
    id_medicamento,
    dosis,
    frecuencia,
    duracion
  } = req.body;

  db.query(
    'SELECT * FROM receta WHERE id_consulta = ?',
    [id_consulta],
    (err, receta) => {
      if (err) return res.status(500).json(err);

      const insertarMedicamento = (id_receta) => {
        db.query(
          `
          INSERT INTO receta_medicamento
          (
            id_receta,
            id_medicamento,
            dosis,
            frecuencia,
            duracion,
            fecha_creacion
          )
          VALUES (?, ?, ?, ?, ?, NOW())
          `,
          [id_receta, id_medicamento, dosis, frecuencia, duracion],
          (err) => {
            if (err) return res.status(500).json(err);

            db.query(
              `
              UPDATE medicamento
              SET stock = stock - 1
              WHERE id_medicamento = ?
                AND stock > 0
              `,
              [id_medicamento],
              (err) => {
                if (err) return res.status(500).json(err);

                db.query(
                  'SELECT stock FROM medicamento WHERE id_medicamento = ?',
                  [id_medicamento],
                  (err, result) => {
                    if (err) return res.status(500).json(err);

                    const stock = result[0].stock;
                    let mensaje = 'Medicamento agregado';

                    if (stock <= 20) {
                      mensaje = 'Stock bajo. Reabastecer medicamento';
                    }

                    res.json({ mensaje, stock });
                  }
                );
              }
            );
          }
        );
      };

      if (!receta.length) {
        db.query(
          'INSERT INTO receta (id_consulta, fecha_creacion) VALUES (?, NOW())',
          [id_consulta],
          (err, result) => {
            if (err) return res.status(500).json(err);
            insertarMedicamento(result.insertId);
          }
        );
      } else {
        insertarMedicamento(receta[0].id_receta);
      }
    }
  );
};
