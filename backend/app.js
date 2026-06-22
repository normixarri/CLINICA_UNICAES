const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log(`[correo] MAIL_MODE=${String(process.env.MAIL_MODE || 'test').toLowerCase()}`);

const db = require('./config/db');
const { asegurarTablaTokenPassword } = require('./helpers/tokenPassword.helper');

asegurarTablaTokenPassword().catch((err) => {
  console.error('No se pudo inicializar la lógica de activación de usuarios:', err);
});

// Diagnóstico EXPLOSIVO
db.query('SELECT @@datadir as data_directory, @@port as port, DATABASE() as db, NOW() as server_time', (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('🔍 INFORMACIÓN DEL SERVIDOR MYSQL AL QUE NODE SE CONECTA:');
    console.log(result[0]);
  }
});

db.query('SELECT * FROM especialidad', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`📊 Node.js ve ${rows.length} especialidades en la tabla`);
    if (rows.length === 0) {
      console.log('⚠️ La tabla está vacía en ESTA conexión');
      console.log('💡 Posiblemente Node.js está conectado a otra instalación de MySQL');
    }
  }
});


const express = require('express');
const cors = require('cors');

const app = express();
const { optionalAuth } = require('./middlewares/auth.middleware');

// MIDDLEWARES GLOBALES (SIEMPRE AL INICIO)
app.use(cors());
app.use(express.json());
app.use(optionalAuth);

// MIDDLEWARE DE LOGGING (ANTES DE LAS RUTAS)
app.use((req, res, next) => {
  console.log('📡 PETICIÓN RECIBIDA:', req.method, req.url);
  next();
});

// IMPORTAR RUTAS
const pacienteRoutes = require('./routes/paciente.routes');
const authRoutes = require('./routes/auth.routes');
const censoRoutes = require('./routes/censo.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const operacionRoutes = require('./routes/operacion.routes');
const medicamentoRoutes = require('./routes/medicamento.routes');
const configuracionRoutes = require('./routes/configuracion.routes');
const consultaRoutes = require('./routes/consulta.routes');
const examenRoutes = require('./routes/examen.routes');
const impresionRoutes = require('./routes/impresion.routes');
const recetaRoutes = require('./routes/receta.routes');
const incapacidadRoutes = require('./routes/incapacidad.routes');
const constanciaRoutes = require('./routes/constancia.routes');
const referenciaRoutes = require('./routes/referencia.routes');
const especialidadRoutes = require('./routes/especialidad.routes');
const expedienteRoutes = require('./routes/expediente.routes');
const realizarConsultaRoutes = require('./routes/realizarConsulta.routes');
const documentoRoutes = require('./routes/documento.routes');

// VERIFICAR QUE LAS RUTAS SE IMPORTARON BIEN
console.log(' Especialidad routes:', especialidadRoutes ? 'Cargada' : 'No cargada');

// MONTAR RUTAS
app.use('/api', pacienteRoutes);
app.use('/api', authRoutes);
app.use('/api', censoRoutes);
app.use('/api', especialidadRoutes);
app.use('/api', usuarioRoutes);
app.use('/api', operacionRoutes);
app.use('/api', medicamentoRoutes);
app.use('/api', configuracionRoutes);
app.use('/api', consultaRoutes);
app.use('/api', examenRoutes);
app.use('/api', impresionRoutes);
app.use('/api', recetaRoutes);
app.use('/api', incapacidadRoutes);
app.use('/api', constanciaRoutes);
app.use('/api', referenciaRoutes);
app.use('/api', expedienteRoutes);
app.use('/api', realizarConsultaRoutes);
app.use('/api', documentoRoutes);
 // ← ESTA LÍNEA ES CRÍTICA

// RUTA DE PRUEBA
app.get('/test', (req, res) => {
  res.json({ mensaje: 'Servidor funcionando' });
});

// INICIAR SERVIDOR
app.listen(3001, () => {
  console.log(' Servidor en puerto 3001');
  console.log('Rutas disponibles:');
  console.log('   - GET /api/especialidades');
  console.log('   - GET /api/especialidades/test');
});
