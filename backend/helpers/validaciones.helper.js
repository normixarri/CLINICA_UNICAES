const REGEX_TELEFONO_SV = /^[267]\d{7}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_DUI = /^\d{8}-\d{1}$/;
const REGEX_JV = /^\d{3,10}$/;

const tieneValor = (valor) => String(valor ?? '').trim() !== '';

const soloDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');

const obtenerFechaHoy = () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
};

const esFechaFutura = (valor) => {
  if (!tieneValor(valor)) return false;
  const fechaTexto = String(valor).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) return false;
  const fecha = new Date(`${fechaTexto}T00:00:00`);
  return fecha > obtenerFechaHoy();
};

const validarFechaNoFutura = (valor) => {
  if (esFechaFutura(valor)) {
    throw new Error('No se permiten fechas futuras.');
  }
};

const formatearTelefonoSv = (valor) => {
  const digitos = soloDigitos(valor).slice(0, 8);
  if (!digitos) return null;
  if (digitos.length <= 4) return digitos;
  return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
};

const validarTelefono = (valor, label = 'telefónico', requerido = false) => {
  if (!tieneValor(valor)) {
    if (requerido) throw new Error(`Ingrese un número ${label} válido de 8 dígitos.`);
    return;
  }

  if (!REGEX_TELEFONO_SV.test(soloDigitos(valor))) {
    throw new Error(`Ingrese un número ${label} válido de 8 dígitos.`);
  }
};

const validarCorreo = (valor, requerido = false) => {
  if (!tieneValor(valor)) {
    if (requerido) throw new Error('Ingrese un correo electrónico válido.');
    return;
  }

  if (!REGEX_CORREO.test(String(valor).trim())) {
    throw new Error('Ingrese un correo electrónico válido.');
  }
};

const validarDui = (valor, requerido = false) => {
  if (!tieneValor(valor)) {
    if (requerido) throw new Error('Ingrese un DUI válido con formato 00000000-0.');
    return;
  }

  if (!REGEX_DUI.test(String(valor).trim())) {
    throw new Error('Ingrese un DUI válido con formato 00000000-0.');
  }
};

const validarJv = (valor, label, requerido = false) => {
  if (!tieneValor(valor)) {
    if (requerido) throw new Error(`El ${label} debe contener solo números.`);
    return;
  }

  if (!REGEX_JV.test(String(valor).trim())) {
    throw new Error(`El ${label} debe contener solo números y una longitud válida.`);
  }
};

module.exports = {
  formatearTelefonoSv,
  validarFechaNoFutura,
  validarTelefono,
  validarCorreo,
  validarDui,
  validarJv
};
