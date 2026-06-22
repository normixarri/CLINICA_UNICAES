const express = require('express');
const router = express.Router();
const expedienteController = require('../controllers/expediente.controller');

router.get('/expedientes/catalogos', expedienteController.obtenerCatalogos);
router.get('/expedientes/buscar', expedienteController.buscarExpedientes);
router.get('/expedientes/:id_paciente/general', expedienteController.obtenerInformacionGeneral);
router.get('/expedientes/:id_paciente/recetas', expedienteController.obtenerRecetas);
router.get('/expedientes/:id_paciente/referencias', expedienteController.obtenerReferencias);
router.get('/expedientes/:id_paciente/incapacidades', expedienteController.obtenerIncapacidades);
router.get('/expedientes/:id_paciente/consultas', expedienteController.obtenerConsultas);
router.get('/expedientes/:id_paciente/constancias', expedienteController.obtenerConstancias);
router.get('/expedientes/:id_paciente/examen-fisico', expedienteController.obtenerExamenFisico);

module.exports = router;
