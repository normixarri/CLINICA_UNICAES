export const OPS = {
  VER_USUARIOS: 1,
  CREAR_USUARIOS: 2,
  EDITAR_USUARIOS: 3,
  REGISTRAR_PACIENTE: 4,
  VER_EXPEDIENTE: 5,
  VER_CENSO: 6,
  GENERAR_CONSULTA: 7,
  REALIZAR_CONSULTA: 9,
  CREAR_MEDICAMENTO: 10,
  VER_MEDICAMENTOS: 11,
  EDITAR_MEDICAMENTOS: 12,
  IMPRIMIR_DOCUMENTOS: 13,
  EDITAR_SELLO_CLINICO: 14,
  VER_PACIENTES: 16,
  EDITAR_PACIENTES: 17
};

export const getUsuarioActual = () => {
  try {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
};

export const getOperacionesUsuario = () => {
  const usuario = getUsuarioActual();
  return Array.isArray(usuario?.operaciones) ? usuario.operaciones.map(Number) : [];
};

export const tieneOperacion = (operacionesRequeridas = []) => {
  const operaciones = getOperacionesUsuario();
  return operacionesRequeridas.some((id) => operaciones.includes(Number(id)));
};

export const esDoctorActual = () => {
  const usuario = getUsuarioActual();
  return Boolean(usuario?.id_doctor);
};

export const rutasPermitidas = [
  { path: '/', operaciones: [OPS.VER_CENSO] },
  { path: '/usuarios', operaciones: [OPS.VER_USUARIOS] },
  { path: '/pacientes', operaciones: [OPS.VER_PACIENTES, OPS.REGISTRAR_PACIENTE, OPS.EDITAR_PACIENTES] },
  { path: '/expedientes', operaciones: [OPS.VER_EXPEDIENTE] },
  { path: '/consultas/generar', operaciones: [OPS.GENERAR_CONSULTA] },
  { path: '/realizar-consultas', operaciones: [OPS.REALIZAR_CONSULTA] },
  { path: '/medicamentos', operaciones: [OPS.VER_MEDICAMENTOS] },
  { path: '/impresion', operaciones: [OPS.IMPRIMIR_DOCUMENTOS] },
  { path: '/sello', operaciones: [OPS.EDITAR_SELLO_CLINICO] }
];

export const primeraRutaPermitida = () => {
  const ruta = rutasPermitidas.find((item) => tieneOperacion(item.operaciones));
  return ruta?.path || '/acceso-denegado';
};

export const normalizarOperacionesSeleccionadas = (operaciones) => {
  return [...new Set((operaciones || []).map(Number))]
    .filter((id) => Number.isInteger(id) && id > 0 && id !== 8 && id !== 15)
    .sort((a, b) => a - b);
};
