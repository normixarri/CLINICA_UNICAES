const express = require('express');
const router = express.Router();

const consultaController = require('../controllers/consulta.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/expediente/consultas/:id', consultaController.consultasPaciente);
router.get('/consultas/doctores', consultaController.obtenerDoctoresGenerarConsulta);
router.get('/consultas/pacientes', consultaController.obtenerPacientesGenerarConsulta);
router.post('/consultas/generar-nuevo-ingreso', requireAuth, consultaController.generarNuevoIngreso);
router.post('/consultas/generar-general', requireAuth, consultaController.generarConsultaGeneral);

// 🔹 crear consulta normal
router.post('/consultas', requireAuth, consultaController.crearConsulta);

// 🔹 nuevo ingreso (crear)
router.post('/consultas/nuevo-ingreso', requireAuth, consultaController.crearConsultaNuevoIngreso);

// 🔹 obtener consultas
router.get('/consultas', consultaController.obtenerConsultas);

// 🔹 obtener por id
router.get('/consultas/:id', consultaController.obtenerConsultaPorId);

// 🔹 iniciar consulta
router.put('/consultas/iniciar/:id', requireAuth, consultaController.iniciarConsulta);

// 🔹 finalizar consulta
router.put('/consultas/finalizar/:id', requireAuth, consultaController.finalizarConsulta);

// 🔹 nuevo ingreso (actualizar)
router.put('/consultas/nuevo-ingreso/:id', requireAuth, consultaController.nuevoIngreso);

module.exports = router;
