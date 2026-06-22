const express = require('express');
const router = express.Router();

const impresionController = require('../controllers/impresion.controller');

router.get('/impresiones', impresionController.listarImpresiones);
router.post('/impresiones', impresionController.crearImpresion);
router.put('/impresiones/:id/impreso', impresionController.marcarImpreso);

module.exports = router;
