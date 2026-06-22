import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ValidationWarning, { validationStyles } from '../components/ValidationWarning';

const API_URL = 'http://localhost:3001/api/especialidades';
const contieneLetras = (valor) => /\p{L}/u.test(valor);
const normalizarNombre = (valor) => String(valor || '')
  .trim()
  .replace(/\s+/g, ' ')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

function Especialidades() {
  const [especialidades, setEspecialidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});
  const [form, setForm] = useState({
    nombre: '',
    descripcion: ''
  });

  useEffect(() => {
    cargarEspecialidades();
  }, []);

  const cargarEspecialidades = async () => {
    try {
      setCargando(true);
      setError('');

      const response = await fetch(API_URL);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.mensaje || data.error || 'Error al cargar especialidades');
      }

      setEspecialidades(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = () => {
    setForm({
      nombre: '',
      descripcion: ''
    });
    setErrores({});
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setMostrarModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value
    });
    setErrores((prev) => {
      const siguientes = { ...prev };
      delete siguientes[name];
      return siguientes;
    });
  };

  const guardarEspecialidad = async (e) => {
    e.preventDefault();
    const nuevosErrores = {};

    try {
      const nombre = form.nombre.trim().replace(/\s+/g, ' ');
      const descripcion = form.descripcion.trim().replace(/\s+/g, ' ');

      if (!nombre) {
        nuevosErrores.nombre = 'Debe ingresar el nombre de la especialidad.';
      } else if (!contieneLetras(nombre)) {
        nuevosErrores.nombre = 'El nombre de la especialidad debe contener letras.';
      } else if (nombre.length < 3) {
        nuevosErrores.nombre = 'El nombre de la especialidad debe tener al menos 3 caracteres.';
      } else if (especialidades.some((item) => normalizarNombre(item.nombre) === normalizarNombre(nombre))) {
        nuevosErrores.nombre = 'Esta especialidad ya está registrada.';
      }

      if (!descripcion) {
        nuevosErrores.descripcion = 'Debe ingresar una descripción.';
      } else if (!contieneLetras(descripcion)) {
        nuevosErrores.descripcion = 'La descripción debe contener letras.';
      } else if (descripcion.length < 5) {
        nuevosErrores.descripcion = 'La descripción debe tener al menos 5 caracteres.';
      }

      if (Object.keys(nuevosErrores).length > 0) {
        setErrores(nuevosErrores);
        return;
      }

      setGuardando(true);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nombre, descripcion })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrores(data.errors);
          return;
        }
        throw new Error(data.mensaje || data.error || 'Error al crear especialidad');
      }

      setMostrarModal(false);
      setForm({
        nombre: '',
        descripcion: ''
      });
      await cargarEspecialidades();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const renderContenidoTabla = () => {
    if (cargando) {
      return (
        <tr>
          <td colSpan="5" style={styles.emptyCell}>
            Cargando especialidades...
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan="5" style={styles.emptyCell}>
            <div style={styles.errorBox}>
              <span>{error}</span>
              <button style={styles.btnSecundario} onClick={cargarEspecialidades}>
                Reintentar
              </button>
            </div>
          </td>
        </tr>
      );
    }

    if (especialidades.length === 0) {
      return (
        <tr>
          <td colSpan="5" style={styles.emptyCell}>
            No hay especialidades registradas
          </td>
        </tr>
      );
    }

    return especialidades.map((esp) => (
      <tr key={esp.id_especialidad} style={styles.tr}>
        <td style={styles.td}>{esp.codigo || '-'}</td>
        <td style={styles.tdStrong}>{esp.nombre || '-'}</td>
        <td style={styles.td}>{esp.descripcion || '-'}</td>
        <td style={styles.td}>
          <span style={{
            ...styles.badge,
            ...(Number(esp.cantidad_doctores) > 0 ? styles.badgeActiva : styles.badgeInactiva)
          }}>
            {Number(esp.cantidad_doctores) > 0 ? 'Activa' : 'Inactiva'}
          </span>
        </td>
        <td style={styles.td}>{esp.cantidad_doctores || 0}</td>
      </tr>
    ));
  };

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.title}>Especialidades</h2>
            <p style={styles.subtitle}>Administración de especialidades mémedicas</p>
          </div>

          <button style={styles.btnPrincipal} onClick={abrirModal}>
            Crear nueva especialidad
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.tableHeader}>
            <h3 style={styles.cardTitle}>Listado de especialidades</h3>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Código</th>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>Descripción</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Cantidad de doctores</th>
                </tr>
              </thead>
              <tbody>
                {renderContenidoTabla()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {mostrarModal && (
        <div style={styles.overlay}>
          <form style={styles.modal} onSubmit={guardarEspecialidad}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Crear especialidad</h3>
              <button type="button" style={styles.btnCerrar} onClick={cerrarModal}>
                x
              </button>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nombre</label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                aria-required
                style={{ ...styles.input, ...(errores.nombre ? validationStyles.inputError : {}) }}
                placeholder="Ej. Pediatria"
              />
              <ValidationWarning message={errores.nombre} />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Descripcion</label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                aria-required
                style={{ ...styles.textarea, ...(errores.descripcion ? validationStyles.inputError : {}) }}
                placeholder="Detalle breve de la especialidad"
              />
              <ValidationWarning message={errores.descripcion} />
            </div>

            <div style={styles.modalActions}>
              <button type="button" style={styles.btnCancelar} onClick={cerrarModal}>
                Cancelar
              </button>
              <button type="submit" style={styles.btnGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
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

  btnPrincipal: {
    backgroundColor: '#880C09',
    color: '#fff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },

  card: {
    backgroundColor: '#fff',
    border: '1px solid #e2e5e8',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden'
  },

  tableHeader: {
    padding: '16px 18px',
    borderBottom: '1px solid #eceff1',
    backgroundColor: '#fff'
  },

  cardTitle: {
    margin: 0,
    color: '#333',
    fontSize: '16px',
    fontWeight: '600'
  },

  tableWrap: {
    maxHeight: 'min(430px, 55vh)',
    overflowY: 'auto',
    overflowX: 'auto'
  },

  table: {
    width: '100%',
    minWidth: '760px',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },

  th: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    textAlign: 'left',
    padding: '13px 16px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e1e5e8',
    color: '#4b5563',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase'
  },

  tr: {
    backgroundColor: '#fff'
  },

  td: {
    padding: '14px 16px',
    borderBottom: '1px solid #f0f1f2',
    color: '#2f3437',
    verticalAlign: 'middle'
  },

  tdStrong: {
    padding: '14px 16px',
    borderBottom: '1px solid #f0f1f2',
    color: '#1f2326',
    fontWeight: '600',
    verticalAlign: 'middle'
  },

  badge: {
    display: 'inline-block',
    padding: '5px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700'
  },

  badgeActiva: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },

  badgeInactiva: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },

  emptyCell: {
    padding: '28px 16px',
    textAlign: 'center',
    color: '#666',
    borderBottom: '1px solid #f0f1f2'
  },

  errorBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },

  btnSecundario: {
    border: '1px solid #880C09',
    backgroundColor: '#fff',
    color: '#880C09',
    borderRadius: '5px',
    padding: '7px 12px',
    cursor: 'pointer',
    fontWeight: '600'
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    zIndex: 1000
  },

  modal: {
    width: '100%',
    maxWidth: '520px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 18px 45px rgba(0, 0, 0, 0.22)',
    padding: '22px'
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '18px'
  },

  modalTitle: {
    margin: 0,
    color: '#1a1a1a',
    fontSize: '20px',
    fontWeight: '700'
  },

  btnCerrar: {
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: '#f1f3f4',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#333',
    fontWeight: '700'
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    marginBottom: '15px'
  },

  label: {
    fontWeight: '600',
    color: '#343a40',
    fontSize: '14px'
  },

  input: {
    border: '1px solid #ced4da',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    outline: 'none'
  },

  textarea: {
    border: '1px solid #ced4da',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    minHeight: '96px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit'
  },

  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px'
  },

  btnCancelar: {
    border: '1px solid #ced4da',
    backgroundColor: '#fff',
    color: '#333',
    borderRadius: '6px',
    padding: '9px 16px',
    cursor: 'pointer',
    fontWeight: '600'
  },

  btnGuardar: {
    border: 'none',
    backgroundColor: '#880C09',
    color: '#fff',
    borderRadius: '6px',
    padding: '9px 18px',
    cursor: 'pointer',
    fontWeight: '700'
  }
};

export default Especialidades;
