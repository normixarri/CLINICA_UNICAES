const express = require('express');
const router = express.Router();
const realizarConsultaController = require('../controllers/realizarConsulta.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/realizar-consultas/mis-consultas/:id_doctor', requireAuth, realizarConsultaController.misConsultas);
router.get('/realizar-consultas/:id_consulta', requireAuth, realizarConsultaController.obtenerConsulta);
router.put('/realizar-consultas/:id_consulta/iniciar', requireAuth, realizarConsultaController.iniciarConsulta);
router.put('/realizar-consultas/:id_consulta/guardar', requireAuth, realizarConsultaController.guardarConsulta);
router.put('/realizar-consultas/:id_consulta/nuevo-ingreso', requireAuth, realizarConsultaController.guardarNuevoIngreso);
router.put('/realizar-consultas/:id_consulta/finalizar', requireAuth, realizarConsultaController.finalizarConsulta);

module.exports = router;
