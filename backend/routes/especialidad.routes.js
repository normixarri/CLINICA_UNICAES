const express = require('express');
const router = express.Router();
const especialidadController = require('../controllers/especialidad.controller');

console.log('🟢 Configurando rutas de especialidad...');

// Ruta de prueba
router.get('/especialidades/test', (req, res) => {
  console.log('🔥 RUTA TEST EJECUTADA');
  res.json({ mensaje: 'Ruta test funciona', timestamp: new Date() });
});

// Rutas principales
router.get('/especialidades', especialidadController.obtenerEspecialidades);
router.post('/especialidades', especialidadController.crearEspecialidad);

console.log('🟢 Rutas de especialidad configuradas');
module.exports = router;