import React from 'react';
import { Navigate } from 'react-router-dom';
import { esDoctorActual, getUsuarioActual, tieneOperacion } from '../utils/permisos';

function ProtectedRoute({ operaciones = [], requiereDoctor = false, children }) {
  const usuario = getUsuarioActual();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (operaciones.length > 0 && !tieneOperacion(operaciones)) {
    return <Navigate to="/acceso-denegado" replace />;
  }

  if (requiereDoctor && !esDoctorActual()) {
    return <Navigate to="/acceso-denegado" replace />;
  }

  return children;
}

export default ProtectedRoute;
