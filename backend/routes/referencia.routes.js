const express = require('express');
const router = express.Router();
const referenciaController = require('../controllers/referencia.controller');

router.post('/referencias', referenciaController.crearReferencia);
// Ruta legacy explicita para no interceptar otros POST como /api/constancias.
router.post('/referencias/generar/:id_consulta', referenciaController.generarReferencia);
router.get('/expediente/referencias/:id', referenciaController.referenciasPaciente);

module.exports = router;
