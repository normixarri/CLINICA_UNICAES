import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import ValidationWarning, { validationStyles } from '../components/ValidationWarning';

const API_URL = 'http://localhost:3001/api';
const contieneLetras = (valor) => /\p{L}/u.test(String(valor || '').trim());

function Areas() {
  const navigate = useNavigate();
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [mensaje, setMensaje] = useState('');
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarAreas();
  }, []);

  const cargarAreas = async () => {
    try {
      setCargando(true);
      const res = await axios.get(`${API_URL}/areas`);
      setAreas(res.data || []);
    } catch (error) {
      console.error('Error cargando areas:', error);
      setMensaje(error.response?.data?.mensaje || 'No se pudieron cargar las areas.');
    } finally {
      setCargando(false);
    }
  };

  const crearArea = async (event) => {
    event.preventDefault();
    setMensaje('');
    setErrores({});

    const nuevosErrores = {};
    if (!form.nombre.trim()) {
      nuevosErrores.nombre = 'Debe ingresar el nombre del área.';
    } else if (!contieneLetras(form.nombre)) {
      nuevosErrores.nombre = 'El nombre del área debe contener letras.';
    }

    if (!form.descripcion.trim()) {
      nuevosErrores.descripcion = 'Debe ingresar la descripción.';
    } else if (!contieneLetras(form.descripcion)) {
      nuevosErrores.descripcion = 'La descripción del área debe contener letras.';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    try {
      setGuardando(true);
      await axios.post(`${API_URL}/areas`, {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null
      });
      setForm({ nombre: '', descripcion: '' });
      setMensaje('Area creada correctamente.');
      await cargarAreas();
    } catch (error) {
      console.error('Error creando area:', error);
      if (error.response?.data?.errors) {
        setErrores(error.response.data.errors);
        return;
      }
      const mensajeBackend = error.response?.data?.mensaje;
      const status = error.response?.status;
      setMensaje(mensajeBackend || (status === 404
        ? 'La ruta para crear areas no esta disponible. Reinicie el backend.'
        : 'No se pudo crear el area.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Areas</h2>
          <p style={styles.subtitle}>Catalogo de areas para pacientes docentes, administrativos y servicios generales.</p>
        </div>
        <button type="button" style={styles.secondaryButton} onClick={() => navigate('/pacientes')}>
          Volver
        </button>
      </div>

      {mensaje && <div style={styles.alert}>{mensaje}</div>}

      <section style={styles.card}>
        <h3 style={styles.cardTitle}>Crear area</h3>
        <form style={styles.form} onSubmit={crearArea}>
          <Field label="Nombre">
            <input
              aria-required
              style={{ ...styles.input, ...(errores.nombre ? validationStyles.inputError : {}) }}
              value={form.nombre}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, nombre: event.target.value }));
                setErrores((prev) => ({ ...prev, nombre: '' }));
              }}
              placeholder="Ej. Administracion"
            />
            <ValidationWarning message={errores.nombre} />
          </Field>
          <Field label="Descripcion">
            <input
              aria-required
              style={{ ...styles.input, ...(errores.descripcion ? validationStyles.inputError : {}) }}
              value={form.descripcion}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, descripcion: event.target.value }));
                setErrores((prev) => ({ ...prev, descripcion: '' }));
              }}
              placeholder="Descripcion del area"
            />
            <ValidationWarning message={errores.descripcion} />
          </Field>
          <button type="submit" style={styles.primaryButton} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Crear area'}
          </button>
        </form>
      </section>

      <section style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.cardTitle}>Listado de areas</h3>
          <span style={styles.counter}>{areas.length} registro(s)</span>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Codigo</th>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Descripcion</th>
                <th style={styles.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td style={styles.empty} colSpan="4">Cargando areas...</td></tr>
              ) : areas.length === 0 ? (
                <tr><td style={styles.empty} colSpan="4">No hay areas registradas</td></tr>
              ) : (
                areas.map((area) => (
                  <tr key={area.id_area}>
                    <td style={styles.td}>{area.codigo || '-'}</td>
                    <td style={styles.td}>{area.nombre || '-'}</td>
                    <td style={styles.td}>{area.descripcion || '-'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        ...(area.estado === 'Activa' ? styles.badgeActiva : styles.badgeInactiva)
                      }}>
                        {area.estado || 'Inactiva'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' },
  title: { margin: 0, color: '#1f2933', fontSize: '26px', fontWeight: '700', borderLeft: '5px solid #880C09', paddingLeft: '14px' },
  subtitle: { margin: '8px 0 0 19px', color: '#5b6472', fontSize: '15px' },
  card: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginBottom: '20px', boxShadow: '0 6px 18px rgba(15,23,42,.05)' },
  cardTitle: { margin: 0, color: '#111827', fontSize: '18px', fontWeight: '700' },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'end', marginTop: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '7px' },
  label: { color: '#344054', fontSize: '13px', fontWeight: '700' },
  input: { height: '40px', border: '1px solid #d0d5dd', borderRadius: '6px', padding: '8px 11px', fontSize: '14px', outlineColor: '#880C09' },
  primaryButton: { backgroundColor: '#880C09', color: '#fff', border: '1px solid #880C09', borderRadius: '6px', padding: '10px 18px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  secondaryButton: { backgroundColor: '#fff', color: '#880C09', border: '1px solid #880C09', borderRadius: '6px', padding: '9px 16px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  alert: { backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: '6px', padding: '10px 12px', marginBottom: '14px', fontWeight: '700' },
  tableCard: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 6px 18px rgba(15,23,42,.05)' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '18px 20px', borderBottom: '1px solid #edf2f7' },
  counter: { color: '#880C09', backgroundColor: '#fff1f1', borderRadius: '999px', padding: '5px 12px', fontSize: '13px', fontWeight: '700' },
  tableWrap: { maxHeight: 'min(430px, 55vh)', overflowY: 'auto', overflowX: 'auto' },
  table: { width: '100%', minWidth: '760px', borderCollapse: 'collapse' },
  th: { position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#f8fafc', color: '#344054', textAlign: 'left', padding: '14px 16px', borderBottom: '1px solid #d9e0e8', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' },
  td: { padding: '14px 16px', borderBottom: '1px solid #edf2f7', color: '#101828', fontSize: '14px' },
  badge: { display: 'inline-flex', alignItems: 'center', borderRadius: '999px', padding: '5px 10px', fontSize: '12px', fontWeight: '800' },
  badgeActiva: { backgroundColor: '#ecfdf3', color: '#067647', border: '1px solid #abefc6' },
  badgeInactiva: { backgroundColor: '#fff1f1', color: '#880C09', border: '1px solid #f3c4c4' },
  empty: { padding: '28px 16px', color: '#667085', textAlign: 'center', fontSize: '15px', borderBottom: '1px solid #edf2f7' }
};

export default Areas;
