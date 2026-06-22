export const REGEX_TELEFONO_SV = /^[267]\d{7}$/;
export const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REGEX_DUI = /^\d{8}-\d{1}$/;
export const REGEX_JV = /^\d{3,10}$/;

const tieneValor = (valor) => String(valor ?? '').trim() !== '';

export const soloDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');

export const obtenerFechaHoyInput = () => {
  const hoy = new Date();
  const local = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const esFechaFutura = (valor) => {
  if (!tieneValor(valor)) return false;
  const fechaTexto = String(valor).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) return false;
  return fechaTexto > obtenerFechaHoyInput();
};

export const validarFechaNoFutura = (valor) => {
  return esFechaFutura(valor) ? 'No se permiten fechas futuras.' : '';
};

export const formatearTelefonoSv = (valor) => {
  const digitos = soloDigitos(valor).slice(0, 8);
  if (!digitos) return '';
  if (digitos.length <= 4) return `${digitos}${digitos.length === 4 ? '-' : ''}`;
  return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
};

export const formatearDui = (valor) => {
  const digitos = soloDigitos(valor).slice(0, 9);
  if (!digitos) return '';
  if (digitos.length <= 8) return digitos;
  return `${digitos.slice(0, 8)}-${digitos.slice(8)}`;
};

export const validarTelefono = (valor, label = 'teléfono', requerido = false) => {
  if (!tieneValor(valor)) {
    return requerido ? `Ingrese un número de ${label} válido de 8 dígitos.` : '';
  }

  return REGEX_TELEFONO_SV.test(soloDigitos(valor))
    ? ''
    : `Ingrese un número de ${label} válido de 8 dígitos.`;
};

export const validarCorreo = (valor, requerido = false) => {
  if (!tieneValor(valor)) {
    return requerido ? 'Ingrese un correo electrónico válido.' : '';
  }

  return REGEX_CORREO.test(String(valor).trim())
    ? ''
    : 'Ingrese un correo electrónico válido.';
};

export const validarDui = (valor, requerido = false) => {
  if (!tieneValor(valor)) {
    return requerido ? 'Ingrese un DUI válido con formato 00000000-0.' : '';
  }

  return REGEX_DUI.test(String(valor).trim())
    ? ''
    : 'Ingrese un DUI válido con formato 00000000-0.';
};

export const validarJv = (valor, label, requerido = false) => {
  if (!tieneValor(valor)) {
    return requerido ? `El ${label} debe contener solo números.` : '';
  }

  return REGEX_JV.test(String(valor).trim())
    ? ''
    : `El ${label} debe contener solo números y una longitud válida.`;
};

export const primerError = (...mensajes) => mensajes.find(Boolean) || '';
