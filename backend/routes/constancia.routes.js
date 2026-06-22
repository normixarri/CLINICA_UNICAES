const express = require('express');
const router = express.Router();
const constanciaController = require('../controllers/constancia.controller');

router.post('/constancias', constanciaController.crearConstancia);
router.post('/', constanciaController.generarConstancia);
router.get('/expediente/constancias/:id', constanciaController.constanciasPaciente);

module.exports = router;
