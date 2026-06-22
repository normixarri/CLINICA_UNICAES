const express = require('express');
const router = express.Router();

const pacienteController = require('../controllers/paciente.controller');
const { requireAuth, requireOperacion } = require('../middlewares/auth.middleware');

router.get('/pacientes', requireAuth, requireOperacion([4, 16, 17]), pacienteController.obtenerPacientes);
router.get('/pacientes/buscar', requireAuth, requireOperacion([4, 16, 17]), pacienteController.buscarPacientes);
router.get('/pacientes/:id_paciente', requireAuth, requireOperacion([4, 16, 17]), pacienteController.obtenerPacientePorId);
router.post('/pacientes', requireAuth, requireOperacion([4]), pacienteController.crearPaciente);
router.put('/pacientes/:id_paciente', requireAuth, requireOperacion([17]), pacienteController.actualizarPaciente);

router.get('/tipos-paciente', pacienteController.obtenerTiposPaciente);
router.get('/facultades', pacienteController.obtenerFacultades);
router.get('/carreras/nuevo-ingreso', pacienteController.obtenerCarrerasNuevoIngreso);
router.get('/carreras', pacienteController.obtenerCarreras);
router.get('/areas', pacienteController.obtenerAreas);
router.post('/areas', requireAuth, requireOperacion([4, 17]), pacienteController.crearArea);
router.get('/proyectos', pacienteController.obtenerProyectos);
router.get('/departamentos', pacienteController.obtenerDepartamentos);
router.get('/municipios', pacienteController.obtenerMunicipios);

router.get('/expediente/info/:id', pacienteController.infoPaciente);

module.exports = router;
