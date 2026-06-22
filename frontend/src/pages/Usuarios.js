import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { OPS, tieneOperacion } from '../utils/permisos';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [rolFiltro, setRolFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [reenviandoId, setReenviandoId] = useState(null);
  const puedeCrear = tieneOperacion([OPS.CREAR_USUARIOS]);
  const puedeEditar = tieneOperacion([OPS.EDITAR_USUARIOS]);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/usuarios');
      setUsuarios(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return usuarios.filter((u) => {
      const roles = Array.isArray(u.id_roles) ? u.id_roles : [];
      const coincideBusqueda = !texto || [
        u.usuario,
        u.nombre,
        u.apellidos,
        u.correo
      ].some(valor => String(valor || '').toLowerCase().includes(texto));

      const coincideRol =
        !rolFiltro ||
        (rolFiltro === 'sin_rol' && roles.length === 0) ||
        (rolFiltro === 'admin' && roles.includes(1)) ||
        (rolFiltro === 'doctor' && roles.includes(2)) ||
        (rolFiltro === 'enfermera' && roles.includes(3));

      const coincideEstado =
        estadoFiltro === '' ||
        Number(u.estado) === Number(estadoFiltro);

      return coincideBusqueda && coincideRol && coincideEstado;
    });
  }, [usuarios, busqueda, rolFiltro, estadoFiltro]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setRolFiltro('');
    setEstadoFiltro('');
  };

  const reenviarActivacion = async (usuario) => {
    const confirmar = window.confirm(
      `Se invalidará el enlace anterior y se generará uno nuevo para ${usuario.correo}. ¿Desea continuar?`
    );
    if (!confirmar) return;

    try {
      setReenviandoId(usuario.id_usuario);
      const res = await axios.post(
        `http://localhost:3001/api/usuarios/${usuario.id_usuario}/reenviar-activacion`
      );
      alert(res.data?.mensaje || 'Se generó un nuevo enlace de activación.');
      await cargarUsuarios();
    } catch (error) {
      console.error(error);
      const mensaje = !error.response
        ? 'No hay conexión con el backend. Verifique que el servidor esté ejecutándose en el puerto 3001.'
        : error.response?.data?.mensaje || 'No se pudo reenviar el enlace de activación.';
      alert(mensaje);
    } finally {
      setReenviandoId(null);
    }
  };

  const estiloRol = (idRol) => {
    if (idRol === 1) return styles.badgeAdmin;
    if (idRol === 2) return styles.badgeDoctor;
    if (idRol === 3) return styles.badgeEnfermera;
    return styles.badgeSinRol;
  };

  const nombreRol = (idRol) => {
    if (idRol === 1) return 'Administrador';
    if (idRol === 2) return 'Doctor';
    if (idRol === 3) return 'Enfermera';
    return 'Sin rol';
  };

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.title}>Gestión de Usuarios</h2>
            <p style={styles.subtitle}>Búsqueda y administración de usuarios del sistema</p>
          </div>

          {puedeCrear && (
            <button
              style={styles.btn}
              onClick={() => window.location.href = '/usuarios/crear'}
            >
              + Agregar Usuario
            </button>
          )}
        </div>

        <div style={styles.filtros}>
          <input
            placeholder="Buscar por nombre, apellido, correo o usuario"
            style={styles.input}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <select
            style={styles.select}
            value={rolFiltro}
            onChange={(e) => setRolFiltro(e.target.value)}
          >
            <option value="">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="doctor">Doctor</option>
            <option value="enfermera">Enfermera</option>
            <option value="sin_rol">Sin rol</option>
          </select>

          <select
            style={styles.select}
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
            <option value="2">Pendiente de activación</option>
          </select>

          <button style={styles.btnSecundario} onClick={limpiarFiltros}>
            Limpiar
          </button>

          {(puedeCrear || puedeEditar) && (
            <button
              style={styles.btnSmall}
              onClick={() => window.location.href = '/especialidades'}
            >
              Crear especialidad
            </button>
          )}
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Usuario</th>
                <th style={styles.th}>Nombres</th>
                <th style={styles.th}>Apellidos</th>
                <th style={styles.th}>Rol</th>
                <th style={styles.th}>Correo</th>
                <th style={styles.th}>Especialidad</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" style={styles.emptyCell}>
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => {
                  const roles = Array.isArray(u.id_roles) ? u.id_roles : [];

                  return (
                    <tr key={u.id_usuario} style={styles.tr}>
                      <td style={styles.td}>{u.usuario}</td>
                      <td style={styles.td}>{u.nombre}</td>
                      <td style={styles.td}>{u.apellidos}</td>
                      <td style={styles.td}>
                        <div style={styles.badgeGroup}>
                          {roles.length > 0 ? roles.map(idRol => (
                            <span
                              key={idRol}
                              style={{ ...styles.badgeRol, ...estiloRol(idRol) }}
                            >
                              {nombreRol(idRol)}
                            </span>
                          )) : (
                            <span style={{ ...styles.badgeRol, ...styles.badgeSinRol }}>
                              Sin rol
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>{u.correo || '-'}</td>
                      <td style={styles.td}>
                        {u.especialidad ? (
                          <span style={styles.badgeEspecialidad}>
                            {u.especialidad}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          ...(Number(u.estado) === 1
                            ? styles.badgeActivo
                            : Number(u.estado) === 2
                              ? styles.badgePendiente
                              : styles.badgeInactivo)
                        }}>
                          {Number(u.estado) === 1
                            ? 'Activo'
                            : Number(u.estado) === 2
                              ? 'Pendiente de activación'
                              : 'Inactivo'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {puedeEditar ? (
                          <div style={styles.acciones}>
                            <button
                              style={styles.btnEditar}
                              onClick={() => window.location.href = `/usuarios/editar/${u.id_usuario}`}
                            >
                              Editar
                            </button>
                            {Number(u.estado) === 2 && (
                              <button
                                style={{
                                  ...styles.btnReenviar,
                                  ...(reenviandoId === u.id_usuario ? styles.btnDisabled : {})
                                }}
                                disabled={reenviandoId === u.id_usuario}
                                onClick={() => reenviarActivacion(u)}
                              >
                                {reenviandoId === u.id_usuario ? 'Enviando...' : 'Reenviar activación'}
                              </button>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  page: {
    padding: '20px',
    flex: 1
  },

  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },

  title: {
    margin: 0,
    color: '#1a1a1a',
    fontSize: '24px',
    fontWeight: '600',
    borderLeft: '4px solid #880C09',
    paddingLeft: '15px'
  },

  subtitle: {
    margin: '8px 0 0 19px',
    color: '#666',
    fontSize: '14px'
  },

  filtros: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    alignItems: 'center',
    flexWrap: 'wrap',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
  },

  input: {
    padding: '9px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '300px',
    outline: 'none'
  },

  select: {
    padding: '9px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    outline: 'none'
  },

  btnSmall: {
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    padding: '9px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    marginLeft: 'auto'
  },

  btn: {
    backgroundColor: '#880C09',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },

  btnSecundario: {
    border: '1px solid #880C09',
    color: '#880C09',
    backgroundColor: '#fff',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },

  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    maxHeight: 'min(430px, 55vh)',
    overflowY: 'auto',
    overflowX: 'auto',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    minWidth: '1050px'
  },

  th: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    textAlign: 'left',
    padding: '13px 15px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    fontSize: '12px',
    fontWeight: '700',
    color: '#495057',
    textTransform: 'uppercase'
  },

  td: {
    padding: '13px 15px',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '14px',
    color: '#212529',
    verticalAlign: 'middle'
  },

  tr: {
    backgroundColor: '#fff'
  },

  emptyCell: {
    padding: '28px 15px',
    textAlign: 'center',
    color: '#666',
    borderBottom: '1px solid #f0f0f0'
  },

  badgeGroup: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },

  badgeRol: {
    display: 'inline-block',
    padding: '4px 9px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700'
  },

  badgeAdmin: {
    backgroundColor: '#cce5ff',
    color: '#004085'
  },

  badgeDoctor: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },

  badgeEnfermera: {
    backgroundColor: '#fff3cd',
    color: '#856404'
  },

  badgeSinRol: {
    backgroundColor: '#e9ecef',
    color: '#495057'
  },

  badgeEspecialidad: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: '#e7e7e7',
    color: '#333'
  },

  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700'
  },

  badgeActivo: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },

  badgeInactivo: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },

  badgePendiente: {
    backgroundColor: '#fff3cd',
    color: '#856404'
  },

  btnEditar: {
    padding: '7px 13px',
    border: '1px solid #880C09',
    backgroundColor: 'transparent',
    color: '#880C09',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600'
  },

  acciones: {
    display: 'flex',
    gap: '7px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },

  btnReenviar: {
    padding: '7px 11px',
    border: '1px solid #856404',
    backgroundColor: '#fff8df',
    color: '#856404',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700'
  },

  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  }
};

export default Usuarios;
