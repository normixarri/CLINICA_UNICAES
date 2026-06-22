const express = require('express');
const router = express.Router();

const operacionController = require('../controllers/operacion.controller');

router.get('/operaciones', operacionController.obtenerOperaciones);
router.get('/operaciones/:id', operacionController.obtenerOperacionesUsuario);

module.exports = router;