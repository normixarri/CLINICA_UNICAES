const express = require('express');
const router = express.Router();

const upload = require('../config/multer');
const configController = require('../controllers/configuracion.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.post('/configuracion/sello', requireAuth, upload.single('sello'), configController.subirSello);
router.get('/configuracion/sello', configController.obtenerSello);

module.exports = router;
