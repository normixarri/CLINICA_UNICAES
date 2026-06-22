import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import FormActions from '../components/FormActions';
import ValidationWarning, { validationStyles } from '../components/ValidationWarning';

const contieneLetras = (valor) => /\p{L}/u.test(String(valor || '').trim());

function EditarMedicamento() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);
  const [form, setForm] = useState(null);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [medRes, catRes, preRes] = await Promise.all([
          axios.get(`http://localhost:3001/api/medicamentos/${id}`),
          axios.get('http://localhost:3001/api/categorias'),
          axios.get('http://localhost:3001/api/presentaciones')
        ]);

        setForm({
          nombre: medRes.data.nombre || '',
          id_presentacion: medRes.data.id_presentacion || '',
          id_categoria: medRes.data.id_categoria || '',
          stock: medRes.data.stock ?? '',
          estado: medRes.data.estado ?? 1
        });
        setCategorias(catRes.data);
        setPresentaciones(preRes.data);
      } catch (error) {
        console.error(error);
        alert('Error al cargar medicamento');
      }
    };

    cargarDatos();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setErrores((prev) => ({ ...prev, [name]: '' }));
    setForm({
      ...form,
      [name]: value
    });
  };

  const validar = () => {
    const nuevosErrores = {};

    if (!form.nombre.trim()) {
      nuevosErrores.nombre = 'Debe ingresar el nombre del medicamento.';
    } else if (!contieneLetras(form.nombre)) {
      nuevosErrores.nombre = 'El nombre del medicamento debe contener letras.';
    }

    if (!form.id_presentacion) {
      nuevosErrores.id_presentacion = 'Debe seleccionar una presentacion.';
    }

    if (!form.id_categoria) {
      nuevosErrores.id_categoria = 'Debe seleccionar una categoria.';
    }

    if (form.stock === '') {
      nuevosErrores.stock = 'Debe ingresar el stock.';
    } else if (Number(form.stock) < 0) {
      nuevosErrores.stock = 'El stock no puede ser negativo.';
    }

    if (form.estado === '') {
      nuevosErrores.estado = 'Debe seleccionar el estado.';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;

    try {
      await axios.put(`http://localhost:3001/api/medicamentos/${id}`, {
        nombre: form.nombre,
        id_presentacion: form.id_presentacion,
        id_categoria: form.id_categoria,
        stock: Number(form.stock),
        estado: Number(form.estado)
      });

      alert('Medicamento actualizado correctamente');
      navigate('/medicamentos');
    } catch (error) {
      console.error(error);
      const mensaje = error.response?.data?.mensaje || 'Error al guardar medicamento';
      if (mensaje === 'El nombre del medicamento debe contener letras.') {
        setErrores((prev) => ({ ...prev, nombre: mensaje }));
        return;
      }
      alert(mensaje);
    }
  };

  if (!form) {
    return (
      <Layout>
        <div style={styles.page}>Cargando medicamento...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.title}>Editar medicamento</h2>
            <p style={styles.subtitle}>Actualización de datos del inventario</p>
          </div>

          <FormActions
            primaryLabel="Guardar cambios"
            onPrimary={guardar}
            onSecondary={() => navigate('/medicamentos')}
          />
        </div>

        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Datos del medicamento</h3>

          <div style={styles.grid}>
            <Field label="Nombre">
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                aria-required
                style={{ ...styles.input, ...(errores.nombre ? validationStyles.inputError : {}) }}
              />
              <ValidationWarning message={errores.nombre} />
            </Field>

            <Field label="Presentación">
              <select
                name="id_presentacion"
                value={form.id_presentacion}
                onChange={handleChange}
                aria-required
                style={{ ...styles.input, ...(errores.id_presentacion ? validationStyles.inputError : {}) }}
              >
                <option value="">Seleccione presentación</option>
                {presentaciones.map((p) => (
                  <option key={p.id_presentacion} value={p.id_presentacion}>
                    {p.nombre_presentacion}
                  </option>
                ))}
              </select>
              <ValidationWarning message={errores.id_presentacion} />
            </Field>

            <Field label="Categoría">
              <select
                name="id_categoria"
                value={form.id_categoria}
                onChange={handleChange}
                aria-required
                style={{ ...styles.input, ...(errores.id_categoria ? validationStyles.inputError : {}) }}
              >
                <option value="">Seleccione categoría</option>
                {categorias.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <ValidationWarning message={errores.id_categoria} />
            </Field>

            <Field label="Stock">
              <input
                type="number"
                min="0"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                aria-required
                style={{ ...styles.input, ...(errores.stock ? validationStyles.inputError : {}) }}
              />
              <ValidationWarning message={errores.stock} />
            </Field>

            <Field label="Estado">
              <select
                name="estado"
                value={form.estado}
                onChange={handleChange}
                aria-required
                style={{ ...styles.input, ...(errores.estado ? validationStyles.inputError : {}) }}
              >
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </select>
              <ValidationWarning message={errores.estado} />
            </Field>
          </div>
        </section>
      </div>
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
  actions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e2e5e8',
    borderRadius: '8px',
    padding: '18px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    color: '#222',
    fontSize: '17px',
    fontWeight: '700'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '14px 18px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '14px'
  },
  label: {
    fontWeight: '600',
    color: '#343a40'
  },
  input: {
    border: '1px solid #ced4da',
    borderRadius: '6px',
    padding: '9px 11px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff'
  },
  btnPrincipal: {
    backgroundColor: '#880C09',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700'
  },
  btnSecundario: {
    border: '1px solid #880C09',
    color: '#880C09',
    backgroundColor: '#fff',
    padding: '9px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  }
};

export default EditarMedicamento;
