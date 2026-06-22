const express = require('express');
const router = express.Router();

const recetaController = require('../controllers/receta.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.post('/recetas', requireAuth, recetaController.crearReceta);
router.post('/recetas/guardar-completa', requireAuth, recetaController.guardarRecetaCompleta);
router.post('/recetas/medicamentos', requireAuth, recetaController.agregarMedicamentoReceta);
router.post('/agregar', recetaController.agregarMedicamento);
router.get('/expediente/recetas/:id', recetaController.recetasPaciente);
router.get('/:id_consulta', recetaController.obtenerReceta);

module.exports = router;
