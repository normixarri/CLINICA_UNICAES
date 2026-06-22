const API = "http://localhost:3001/api";

export const obtenerCensoInstitucional = async () => {
  const res = await fetch(`${API}/censo/institucional`);
  return await res.json();
};

export const obtenerCensoNuevoIngreso = async () => {
  const res = await fetch(`${API}/censo/nuevo-ingreso`);
  return await res.json();
};