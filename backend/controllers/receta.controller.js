const db = require('../config/db');
const { registrarAuditoria, obtenerRegistro } = require('../helpers/auditoria.helper');

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const limpiar = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  return valor;
};

const numeroPositivo = (valor, campo, { entero = false, permiteCero = false } = {}) => {
  const numero = Number(valor);
  const valido = Number.isFinite(numero)
    && (permiteCero ? numero >= 0 : numero > 0)
    && (!entero || Number.isInteger(numero));

  if (!valido) {
    const error = new Error(`${campo} debe ser un numero ${permiteCero ? 'igual o mayor que cero' : 'mayor que cero'}.`);
    error.status = 400;
    throw error;
  }

  return numero;
};

const construirIndicacion = (med) => {
  const cantidadPorToma = med.cantidad_por_toma ?? med.dosis;
  const dosis = [cantidadPorToma, unidadPresentacion(med, cantidadPorToma)].filter(Boolean).join(' ');
  const intervalo = [med.intervalo, med.unidad_intervalo].filter(Boolean).join(' ');
  const duracion = [med.duracion, med.unidad_duracion].filter(Boolean).join(' ');
  const indicada = [med.cantidad_indicada, unidadPresentacion(med, med.cantidad_indicada)].filter(Boolean).join(' ');
  const entregada = [med.cantidad_entregada, unidadPresentacion(med, med.cantidad_entregada)].filter(Boolean).join(' ');
  const faltante = Number(med.cantidad_indicada || 0) - Number(med.cantidad_entregada || 0);

  const partes = [
    dosis ? `Tomar ${dosis}` : null,
    med.frecuencia || intervalo ? `${med.frecuencia || 'cada'} ${intervalo}`.trim() : null,
    duracion ? `por ${duracion}.` : null,
    indicada ? `Cantidad indicada: ${indicada}.` : null,
    entregada ? `Cantidad entregada: ${entregada}.` : null,
    faltante > 0 ? `Paciente debe completar ${faltante} ${unidadPresentacion(med, faltante)} por cuenta propia.` : null
  ].filter(Boolean);

  return partes.join(' ');
};

const unidadPresentacion = (med, cantidad = 1) => {
  const unidad = String(med.presentacion || med.unidad_dosis || med.unidad_entrega || 'unidad').trim().toLowerCase();
  if (!unidad || Number(cantidad) === 1 || unidad.endsWith('s')) return unidad;
  return `${unidad}s`;
};

exports.crearReceta = async (req, res) => {
  try {
    const { id_consulta, indicaciones } = req.body;
    if (!id_consulta) return res.status(400).json({ mensaje: 'La consulta es obligatoria' });

    const existente = await query('SELECT id_receta FROM receta WHERE id_consulta = ? LIMIT 1', [id_consulta]);
    if (existente.length > 0) {
      const anterior = await obtenerRegistro('receta', 'id_receta', existente[0].id_receta);
      await query(
        'UPDATE receta SET indicaciones = ?, fecha_modificacion = NOW() WHERE id_receta = ?',
        [limpiar(indicaciones), existente[0].id_receta]
      );
      await registrarAuditoria({
        req,
        tabla_afectada: 'receta',
        id_registro: existente[0].id_receta,
        accion: 'UPDATE',
        usuario_accion: req.usuario?.id_usuario || null,
        datos_anteriores: anterior,
        datos_nuevos: await obtenerRegistro('receta', 'id_receta', existente[0].id_receta),
        descripcion: 'Actualizacion de receta'
      });
      return res.json({ mensaje: 'Receta actualizada', id_receta: existente[0].id_receta });
    }

    const result = await query(
      `INSERT INTO receta (id_consulta, indicaciones, fecha_creacion, usuario_creacion, version)
       VALUES (?, ?, NOW(), ?, 1)`,
      [id_consulta, limpiar(indicaciones), req.usuario?.id_usuario || null]
    );
    await registrarAuditoria({
      req,
      tabla_afectada: 'receta',
      id_registro: result.insertId,
      accion: 'INSERT',
      usuario_accion: req.usuario?.id_usuario || null,
      datos_nuevos: await obtenerRegistro('receta', 'id_receta', result.insertId),
      descripcion: 'Creacion de receta'
    });
    res.status(201).json({ mensaje: 'Receta creada', id_receta: result.insertId });
  } catch (err) {
    console.error('Error al crear receta:', err);
    res.status(500).json({ mensaje: 'Error al crear receta' });
  }
};

exports.guardarRecetaCompleta = async (req, res) => {
  try {
    const { id_consulta, indicaciones, medicamentos = [] } = req.body;
    const idUsuario = req.usuario?.id_usuario || null;

    if (!id_consulta) return res.status(400).json({ mensaje: 'La consulta es obligatoria.' });
    if (!Array.isArray(medicamentos) || medicamentos.length === 0) {
      return res.status(400).json({ mensaje: 'Debe agregar al menos un medicamento a la receta.' });
    }

    const idsRepetidos = new Set();
    const medsValidados = medicamentos.map((med) => {
      if (!med.id_medicamento) {
        const error = new Error('Seleccione un medicamento valido.');
        error.status = 400;
        throw error;
      }

      const idMedicamento = Number(med.id_medicamento);
      if (idsRepetidos.has(idMedicamento)) {
        const error = new Error('No puede agregar el mismo medicamento dos veces en la misma receta.');
        error.status = 400;
        throw error;
      }
      idsRepetidos.add(idMedicamento);

      const validado = {
        id_medicamento: idMedicamento,
        cantidad_por_toma: numeroPositivo(med.cantidad_por_toma ?? med.dosis, 'La cantidad por toma'),
        frecuencia: limpiar(med.frecuencia) || 'cada',
        intervalo: numeroPositivo(med.intervalo, 'El intervalo', { entero: true }),
        unidad_intervalo: limpiar(med.unidad_intervalo) || 'horas',
        duracion: numeroPositivo(med.duracion, 'La duracion', { entero: true }),
        unidad_duracion: limpiar(med.unidad_duracion) || 'dias',
        cantidad_indicada: numeroPositivo(med.cantidad_indicada, 'La cantidad indicada', { entero: true }),
        cantidad_entregada: numeroPositivo(med.cantidad_entregada, 'La cantidad entregada', { entero: true, permiteCero: true })
      };
      return validado;
    });

    await query('START TRANSACTION');

    const recetaExistente = await query(
      'SELECT id_receta FROM receta WHERE id_consulta = ? LIMIT 1 FOR UPDATE',
      [id_consulta]
    );

    let idReceta;
    let accionReceta = 'INSERT';
    let recetaAnterior = null;

    if (recetaExistente.length > 0) {
      idReceta = recetaExistente[0].id_receta;
      accionReceta = 'UPDATE';
      recetaAnterior = await obtenerRegistro('receta', 'id_receta', idReceta);
      await query(
        `UPDATE receta
         SET indicaciones = ?, fecha_modificacion = NOW(), usuario_modificacion = ?, version = COALESCE(version, 1) + 1
         WHERE id_receta = ?`,
        [limpiar(indicaciones), idUsuario, idReceta]
      );
    } else {
      const result = await query(
        `INSERT INTO receta (id_consulta, indicaciones, fecha_creacion, usuario_creacion, version)
         VALUES (?, ?, NOW(), ?, 1)`,
        [id_consulta, limpiar(indicaciones), idUsuario]
      );
      idReceta = result.insertId;
    }

    const medicamentosAnteriores = await query(
      `SELECT id_medicamento, COALESCE(cantidad_entregada, dosis, 0) AS cantidad_entregada
       FROM receta_medicamento
       WHERE id_receta = ?
       FOR UPDATE`,
      [idReceta]
    );

    for (const anterior of medicamentosAnteriores) {
      const cantidadRestaurar = Number(anterior.cantidad_entregada || 0);
      if (cantidadRestaurar > 0) {
        await query(
          `UPDATE medicamento
           SET stock = COALESCE(stock, 0) + ?,
               fecha_modificacion = NOW(),
               usuario_modificacion = ?,
               version = COALESCE(version, 0) + 1
           WHERE id_medicamento = ?`,
          [cantidadRestaurar, idUsuario, anterior.id_medicamento]
        );
      }
    }

    await query('DELETE FROM receta_medicamento WHERE id_receta = ?', [idReceta]);

    const auditoriasStock = [];

    for (const med of medsValidados) {
      const medicamentoRows = await query(
        `SELECT m.id_medicamento, m.nombre, m.stock, pr.nombre_presentacion AS presentacion
         FROM medicamento m
         LEFT JOIN presentacion pr ON m.id_presentacion = pr.id_presentacion
         WHERE m.id_medicamento = ?
         FOR UPDATE`,
        [med.id_medicamento]
      );

      if (medicamentoRows.length === 0) {
        const error = new Error('Medicamento no encontrado.');
        error.status = 404;
        throw error;
      }

      const medicamento = medicamentoRows[0];
      med.presentacion = medicamento.presentacion || 'unidad';
      med.dosis = med.cantidad_por_toma;
      med.unidad_dosis = unidadPresentacion(med, med.cantidad_por_toma);
      med.unidad_entrega = unidadPresentacion(med, med.cantidad_entregada);
      med.observacion = null;
      med.indicacion_generada = construirIndicacion(med);
      med.frecuencia = med.indicacion_generada;
      const stockAnterior = Number(medicamento.stock || 0);

      if (med.cantidad_entregada > stockAnterior) {
        const error = new Error(`No hay suficiente stock para entregar esa cantidad de ${medicamento.nombre}.`);
        error.status = 400;
        throw error;
      }

      await query(
        `INSERT INTO receta_medicamento
          (id_receta, id_medicamento, dosis, cantidad_por_toma, frecuencia, duracion, cantidad_indicada,
           cantidad_entregada, unidad_entrega, unidad_dosis, intervalo, unidad_intervalo,
           unidad_duracion, indicacion_generada, observacion, fecha_creacion, usuario_creacion, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1)`,
        [
          idReceta,
          med.id_medicamento,
          med.dosis,
          med.cantidad_por_toma,
          med.frecuencia,
          med.duracion,
          med.cantidad_indicada,
          med.cantidad_entregada,
          med.unidad_entrega,
          med.unidad_dosis,
          med.intervalo,
          med.unidad_intervalo,
          med.unidad_duracion,
          med.indicacion_generada,
          med.observacion,
          idUsuario
        ]
      );

      const stockNuevo = stockAnterior - med.cantidad_entregada;
      await query(
        `UPDATE medicamento
         SET stock = ?,
             fecha_modificacion = NOW(),
             usuario_modificacion = ?,
             version = COALESCE(version, 0) + 1
         WHERE id_medicamento = ?`,
        [stockNuevo, idUsuario, med.id_medicamento]
      );

      auditoriasStock.push({
        medicamento,
        stockAnterior,
        stockNuevo,
        cantidadDescontada: med.cantidad_entregada
      });
    }

    await registrarAuditoria({
      req,
      tabla_afectada: 'receta',
      id_registro: idReceta,
      accion: accionReceta,
      usuario_accion: idUsuario,
      datos_anteriores: recetaAnterior,
      datos_nuevos: await obtenerRegistro('receta', 'id_receta', idReceta),
      descripcion: accionReceta === 'INSERT' ? 'Creacion de receta completa' : 'Actualizacion de receta completa'
    });

    for (const med of medsValidados) {
      await registrarAuditoria({
        req,
        tabla_afectada: 'receta_medicamento',
        id_registro: idReceta,
        accion: 'INSERT',
        usuario_accion: idUsuario,
        datos_nuevos: { id_receta: idReceta, ...med },
        descripcion: 'Medicamento agregado en receta completa'
      });
    }

    for (const audit of auditoriasStock) {
      if (audit.cantidadDescontada > 0) {
        await registrarAuditoria({
          req,
          tabla_afectada: 'medicamento',
          id_registro: audit.medicamento.id_medicamento,
          accion: 'UPDATE',
          usuario_accion: idUsuario,
          datos_anteriores: {
            id_medicamento: audit.medicamento.id_medicamento,
            nombre: audit.medicamento.nombre,
            stock: audit.stockAnterior
          },
          datos_nuevos: {
            id_medicamento: audit.medicamento.id_medicamento,
            nombre: audit.medicamento.nombre,
            stock: audit.stockNuevo,
            cantidad_descontada: audit.cantidadDescontada
          },
          descripcion: `Descuento de inventario por receta. Cantidad entregada: ${audit.cantidadDescontada}`
        });
      }
    }

    await query('COMMIT');
    res.status(201).json({ mensaje: 'Receta guardada correctamente.', id_receta: idReceta });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Error al guardar receta completa:', err);
    res.status(err.status || 500).json({ mensaje: err.message || 'Error al guardar receta completa.' });
  }
};

exports.agregarMedicamentoReceta = async (req, res) => {
  try {
    const { id_receta, id_medicamento, dosis, medida, frecuencia, duracion, unidad_tiempo } = req.body;
    if (!id_receta || !id_medicamento) return res.status(400).json({ mensaje: 'Receta y medicamento son obligatorios' });

    const dosisNumero = Number(dosis);
    const duracionNumero = Number(duracion);

    if (!Number.isInteger(dosisNumero) || dosisNumero <= 0) {
      return res.status(400).json({ mensaje: 'Ingrese una dosis valida en numeros.' });
    }

    if (!Number.isInteger(duracionNumero) || duracionNumero <= 0) {
      return res.status(400).json({ mensaje: 'Ingrese una duracion valida en numeros.' });
    }

    const indicacion = [
      medida ? `${dosisNumero} ${medida}` : `${dosisNumero}`,
      frecuencia ? `cada ${frecuencia}` : null,
      `por ${duracionNumero} ${unidad_tiempo || 'dias'}`
    ].filter(Boolean).join(' ');

    await query('START TRANSACTION');

    const medicamentoRows = await query(
      'SELECT id_medicamento, nombre, stock FROM medicamento WHERE id_medicamento = ? FOR UPDATE',
      [id_medicamento]
    );

    if (medicamentoRows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Medicamento no encontrado.' });
    }

    const medicamento = medicamentoRows[0];
    const stockAnterior = Number(medicamento.stock || 0);
    const recetaExistente = await query(
      'SELECT dosis FROM receta_medicamento WHERE id_receta = ? AND id_medicamento = ? FOR UPDATE',
      [id_receta, id_medicamento]
    );
    const dosisAnterior = recetaExistente.length > 0 ? Number(recetaExistente[0].dosis || 0) : 0;
    const cantidadADescontar = dosisNumero - dosisAnterior;

    if (cantidadADescontar > 0 && stockAnterior < cantidadADescontar) {
      await query('ROLLBACK');
      return res.status(400).json({ mensaje: 'No existe suficiente inventario disponible para este medicamento.' });
    }

    await query(
      `INSERT INTO receta_medicamento
        (id_receta, id_medicamento, dosis, frecuencia, duracion, fecha_creacion, usuario_creacion, version)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, 1)
       ON DUPLICATE KEY UPDATE
         dosis = VALUES(dosis),
         frecuencia = VALUES(frecuencia),
         duracion = VALUES(duracion),
         fecha_modificacion = NOW(),
         usuario_modificacion = VALUES(usuario_creacion),
         version = COALESCE(version, 1) + 1`,
      [id_receta, id_medicamento, dosisNumero, limpiar(indicacion), duracionNumero, req.usuario?.id_usuario || null]
    );

    const stockNuevo = stockAnterior - cantidadADescontar;

    if (cantidadADescontar !== 0) {
      await query(
        `UPDATE medicamento
         SET stock = ?,
             fecha_modificacion = NOW(),
             usuario_modificacion = ?,
             version = COALESCE(version, 0) + 1
         WHERE id_medicamento = ?`,
        [stockNuevo, req.usuario?.id_usuario || null, id_medicamento]
      );
    }

    await registrarAuditoria({
      req,
      tabla_afectada: 'receta_medicamento',
      id_registro: id_receta,
      accion: recetaExistente.length > 0 ? 'UPDATE' : 'INSERT',
      usuario_accion: req.usuario?.id_usuario || null,
      datos_nuevos: { id_receta, id_medicamento, dosis: dosisNumero, frecuencia: indicacion, duracion: duracionNumero },
      descripcion: 'Medicamento agregado o actualizado en receta'
    });

    if (cantidadADescontar !== 0) {
      await registrarAuditoria({
        req,
        tabla_afectada: 'medicamento',
        id_registro: id_medicamento,
        accion: 'UPDATE',
        usuario_accion: req.usuario?.id_usuario || null,
        datos_anteriores: {
          id_medicamento,
          nombre: medicamento.nombre,
          stock: stockAnterior
        },
        datos_nuevos: {
          id_medicamento,
          nombre: medicamento.nombre,
          stock: stockNuevo,
          cantidad_descontada: cantidadADescontar
        },
        descripcion: `Descuento de inventario por receta. Cantidad descontada: ${cantidadADescontar}`
      });
    }

    await query('COMMIT');
    res.status(201).json({ mensaje: 'Medicamento agregado a la receta', stock: stockNuevo });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    console.error('Error al agregar medicamento a receta:', err);
    res.status(500).json({ mensaje: 'Error al guardar el medicamento en la receta' });
  }
};

exports.recetasPaciente = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      r.fecha_creacion,
      CONCAT(per.nombre, ' ', per.apellidos) AS doctor,
      GROUP_CONCAT(m.nombre SEPARATOR ', ') AS medicamentos
    FROM receta r
    JOIN consulta c ON r.id_consulta = c.id_consulta
    JOIN doctor d ON c.id_doctor = d.id_doctor
    JOIN usuario u ON d.id_usuario = u.id_usuario
    JOIN persona per ON u.id_persona = per.id_persona
    JOIN receta_medicamento rm ON r.id_receta = rm.id_receta
    JOIN medicamento m ON rm.id_medicamento = m.id_medicamento
    WHERE c.id_paciente = ?
    GROUP BY r.id_receta
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.agregarMedicamento = (req, res) => {
  const { id_consulta, id_medicamento, dosis, frecuencia, duracion } = req.body;

  db.query('SELECT * FROM receta WHERE id_consulta = ?', [id_consulta], (err, receta) => {
    if (err) return res.status(500).json(err);

    const insertarMedicamento = (id_receta) => {
      db.query(
        `INSERT INTO receta_medicamento
          (id_receta, id_medicamento, dosis, frecuencia, duracion, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [id_receta, id_medicamento, dosis, frecuencia, duracion],
        (insertErr) => {
          if (insertErr) return res.status(500).json(insertErr);

          db.query('SELECT stock FROM medicamento WHERE id_medicamento = ?', [id_medicamento], (stockErr, result) => {
            if (stockErr) return res.status(500).json(stockErr);

            const stock = result[0]?.stock || 0;
            const mensaje = stock <= 20
              ? 'Stock bajo (20 o menos). Reabastecer medicamento'
              : 'Medicamento agregado correctamente';
            res.json({ mensaje, stock });
          });
        }
      );
    };

    if (receta.length === 0) {
      db.query('INSERT INTO receta (id_consulta, fecha_creacion) VALUES (?, NOW())', [id_consulta], (createErr, result) => {
        if (createErr) return res.status(500).json(createErr);
        insertarMedicamento(result.insertId);
      });
    } else {
      insertarMedicamento(receta[0].id_receta);
    }
  });
};

exports.obtenerReceta = (req, res) => {
  const { id_consulta } = req.params;

  const sql = `
    SELECT
      m.nombre,
      p.nombre_presentacion,
      rm.dosis,
      rm.frecuencia,
      rm.duracion
    FROM receta r
    INNER JOIN receta_medicamento rm ON r.id_receta = rm.id_receta
    INNER JOIN medicamento m ON rm.id_medicamento = m.id_medicamento
    INNER JOIN presentacion p ON m.id_presentacion = p.id_presentacion
    WHERE r.id_consulta = ?
  `;

  db.query(sql, [id_consulta], (err, result) => {
    if (err) return res.status(500).json(err);

    const recetaFormateada = result.map((m) => {
      return `${m.nombre}, ${m.frecuencia || `${m.dosis} ${m.nombre_presentacion} por ${m.duracion} dias`}`;
    });

    res.json(recetaFormateada);
  });
};
