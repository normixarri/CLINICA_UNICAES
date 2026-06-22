const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const usuarioController = require('../controllers/usuario.controller');
const { requireAuth, requireOperacion } = require('../middlewares/auth.middleware');



router.get('/usuarios', usuarioController.obtenerUsuarios);
router.post(
  '/usuarios',
  requireAuth,
  upload.fields([
    { name: 'firma', maxCount: 1 },
    { name: 'sello', maxCount: 1 }
  ]),
  usuarioController.crearUsuario
);
router.put('/usuarios/:id', requireAuth, upload.single('firma'), usuarioController.editarUsuario);
router.post(
  '/usuarios/:id/reenviar-activacion',
  requireAuth,
  requireOperacion([3]),
  usuarioController.reenviarActivacionUsuario
);

router.post('/usuarios/firma/:id', requireAuth, upload.single('firma'), usuarioController.subirFirma);
router.get('/usuarios/firma/:id', usuarioController.obtenerFirma);
router.post('/usuarios/sello-doctor/:id', requireAuth, upload.single('sello'), usuarioController.subirSelloDoctor);
router.get('/usuarios/sello-doctor/:id', usuarioController.obtenerSelloDoctor);

router.get('/usuarios/:id', usuarioController.obtenerUsuarioPorId);

module.exports = router;
