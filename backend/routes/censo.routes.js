const express = require('express');
const router = express.Router();

const censoController = require('../controllers/censo.controller');

router.get('/censo/institucional', censoController.censoInstitucional);
router.get('/censo/nuevo-ingreso', censoController.censoNuevoIngreso);

module.exports = router;