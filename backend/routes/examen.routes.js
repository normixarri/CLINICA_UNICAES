const express = require('express');
const router = express.Router();

const examenController = require('../controllers/examen.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/examen-fisico/pacientes', requireAuth, examenController.obtenerPacientesExamenFisico);
router.post('/examen-fisico', requireAuth, examenController.registrarExamenFisicoCompleto);

//  buscar pacientes
router.get('/examen/pacientes', examenController.buscarPacientes);

//  registrar examen
router.post('/examen', requireAuth, examenController.registrarExamen);
router.get('/expediente/examen/:id', examenController.examenFisicoPaciente);
module.exports = router;
