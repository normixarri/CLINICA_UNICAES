import React from 'react';
import {
  FaChartBar,
  FaUser,
  FaPills,
  FaClipboardList,
  FaFolder,
  FaUsers,
  FaStamp,
  FaStethoscope,
  FaPrint
} from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { OPS, esDoctorActual, getUsuarioActual, tieneOperacion } from '../utils/permisos';

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = getUsuarioActual();
  const nombreUsuario = (
    usuario?.nombre_completo ||
    [usuario?.nombre, usuario?.apellidos].filter(Boolean).join(' ')
  ).trim();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const items = [
    { label: 'Censo', path: '/', icon: <FaChartBar />, operaciones: [OPS.VER_CENSO], exact: true },
    { label: 'Usuarios', path: '/usuarios', icon: <FaUser />, operaciones: [OPS.VER_USUARIOS] },
    { label: 'Medicamentos', path: '/medicamentos', icon: <FaPills />, operaciones: [OPS.VER_MEDICAMENTOS] },
    { label: 'Generar consulta', path: '/consultas/generar', icon: <FaClipboardList />, operaciones: [OPS.GENERAR_CONSULTA] },
    { label: 'Realizar consulta', path: '/realizar-consultas', icon: <FaStethoscope />, operaciones: [OPS.REALIZAR_CONSULTA], requiereDoctor: true },
    { label: 'Impresión', path: '/impresion', icon: <FaPrint />, operaciones: [OPS.IMPRIMIR_DOCUMENTOS] },
    { label: 'Expedientes', path: '/expedientes', icon: <FaFolder />, operaciones: [OPS.VER_EXPEDIENTE] },
    { label: 'Pacientes', path: '/pacientes', icon: <FaUsers />, operaciones: [OPS.VER_PACIENTES, OPS.REGISTRAR_PACIENTE, OPS.EDITAR_PACIENTES] },
    { label: 'Sello Clínico', path: '/sello', icon: <FaStamp />, operaciones: [OPS.EDITAR_SELLO_CLINICO] }
  ];

  const cerrarSesion = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <img src="/logo.png" alt="logo" style={styles.logo} />
        <div>
          <h2 style={styles.title}>Universidad Catolica de El Salvador</h2>
          <p style={styles.subtitle}>Clínica Universitaria</p>
        </div>
        <div style={styles.userInfo}>
          {usuario ? `Usuario: ${nombreUsuario || 'Usuario no identificado'}` : 'Usuario no identificado'}
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.sidebar}>
          {items
            .filter((item) => tieneOperacion(item.operaciones) && (!item.requiereDoctor || esDoctorActual()))
            .map((item) => {
              const active = item.exact ? location.pathname === item.path : isActive(item.path);
              return (
                <div
                  key={item.path}
                  style={active ? styles.active : styles.item}
                  onClick={() => navigate(item.path)}
                >
                  {item.icon} <span>{item.label}</span>
                </div>
              );
            })}

          {usuario && (
            <button style={styles.logout} onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          )}
        </div>

        <div style={styles.content}>
          {children}

          <div style={styles.footer}>
            Universidad Catolica de El Salvador - Santa Ana
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    backgroundColor: '#EDBD3F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
    padding: '10px',
    position: 'relative'
  },
  logo: {
    width: '60px'
  },
  title: {
    margin: 0,
    fontWeight: 'bold'
  },
  subtitle: {
    margin: 0,
    textAlign: 'center'
  },
  userInfo: {
    position: 'absolute',
    right: '18px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#1a1a1a',
    fontSize: '13px',
    fontWeight: '700',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    border: '1px solid rgba(136, 12, 9, 0.18)',
    borderRadius: '6px',
    padding: '7px 10px',
    maxWidth: '260px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  body: {
    display: 'flex',
    flex: 1
  },
  sidebar: {
    width: '220px',
    backgroundColor: '#880C09',
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#fff',
    padding: '10px',
    cursor: 'pointer',
    borderRadius: '5px'
  },
  active: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#EDBD3F',
    padding: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    backgroundColor: '#6e0907',
    borderRadius: '5px'
  },
  logout: {
    backgroundColor: '#fff',
    color: '#880C09',
    border: 'none',
    padding: '10px',
    cursor: 'pointer',
    fontWeight: '700',
    borderRadius: '5px'
  },
  content: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0
  },
  footer: {
    marginTop: 'auto',
    textAlign: 'center',
    padding: '10px',
    fontSize: '14px',
    color: '#555'
  }
};

export default Layout;
