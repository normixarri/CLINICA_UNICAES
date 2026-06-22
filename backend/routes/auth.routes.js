const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');

router.post('/login', authController.login);
router.get('/establecer-password/:token', authController.verificarTokenActivacion);
router.post('/primer-acceso', authController.primerAcceso);
router.post('/establecer-password', authController.primerAcceso);
router.post('/recuperar-password', authController.recuperarPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
