const express = require('express');
const router = express.Router();
const documentoController = require('../controllers/documento.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/documentos/receta/:id_receta', requireAuth, documentoController.obtenerRecetaPrint);
router.get('/documentos/incapacidad/:id_incapacidad', requireAuth, documentoController.obtenerIncapacidadPrint);
router.get('/documentos/constancia/:id_constancia', requireAuth, documentoController.obtenerConstanciaPrint);
router.get('/documentos/referencia/:id_referencia', requireAuth, documentoController.obtenerReferenciaPrint);

module.exports = router;
