const express = require('express');
const router = express.Router();

const incapacidadController = require('../controllers/incapacidad.controller');

router.post('/incapacidades', incapacidadController.crearIncapacidad);

// Ruta legacy explicita para no interceptar otros POST como /api/constancias.
router.post('/incapacidades/generar/:id_consulta', incapacidadController.generarIncapacidad);
router.get('/expediente/incapacidades/:id', incapacidadController.incapacidadesPaciente);

module.exports = router;
