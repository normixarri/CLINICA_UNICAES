const express = require('express');
const router = express.Router();

const medicamentoController = require('../controllers/medicamento.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/medicamentos', medicamentoController.obtenerMedicamentos);
router.get('/medicamentos/:id', medicamentoController.obtenerMedicamentoPorId);
router.post('/medicamentos', requireAuth, medicamentoController.crearMedicamento);
router.put('/medicamentos/:id', requireAuth, medicamentoController.editarMedicamento);


router.post('/categorias', requireAuth, medicamentoController.crearCategoria);

router.get('/categorias', medicamentoController.obtenerCategorias);
router.get('/presentaciones', medicamentoController.obtenerPresentaciones);
router.post('/presentaciones', requireAuth, medicamentoController.crearPresentacion);
router.post('/medicamentos/receta', requireAuth, medicamentoController.agregarMedicamento);

module.exports = router;
