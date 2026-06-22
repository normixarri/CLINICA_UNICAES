import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { OPS, tieneOperacion } from '../utils/permisos';
import { formatearDui } from '../utils/validaciones';

const API_URL = 'http://localhost:3001/api';

function Pacientes() {
  const navigate = useNavigate();
  const puedeCrear = tieneOperacion([OPS.REGISTRAR_PACIENTE]);
  const puedeEditar = tieneOperacion([OPS.EDITAR_PACIENTES]);
  const [pacientes, setPacientes] = useState([]);
  const [catalogos, setCatalogos] = useState({ tipos: [], facultades: [], carreras: [], areas: [] });
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({
    expediente: '',
    nombre: '',
    apellido: '',
    dui: '',
    carnet: '',
    tipo_paciente: '',
    facultad: '',
    carrera: '',
    area: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [pacientesRes, tiposRes, facultadesRes, carrerasRes, areasRes] = await Promise.all([
        axios.get(`${API_URL}/pacientes`),
        axios.get(`${API_URL}/tipos-paciente`),
        axios.get(`${API_URL}/facultades`),
        axios.get(`${API_URL}/carreras`),
        axios.get(`${API_URL}/areas`)
      ]);

      setPacientes(pacientesRes.data || []);
      setCatalogos({
        tipos: tiposRes.data || [],
        facultades: facultadesRes.data || [],
        carreras: carrerasRes.data || [],
        areas: areasRes.data || []
      });
    } catch (error) {
      console.error('Error cargando pacientes:', error);
    } finally {
      setCargando(false);
    }
  };

  const normalizar = (valor) => String(valor || '').toLowerCase().trim();

  const carrerasFiltradas = useMemo(() => {
    if (!filtros.facultad) return catalogos.carreras;
    return catalogos.carreras.filter((carrera) => String(carrera.id_facultad || '') === filtros.facultad);
  }, [catalogos.carreras, filtros.facultad]);

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter((paciente) => {
      const texto =
        normalizar(paciente.expediente).includes(normalizar(filtros.expediente)) &&
        normalizar(paciente.nombre).includes(normalizar(filtros.nombre)) &&
        normalizar(paciente.apellidos).includes(normalizar(filtros.apellido)) &&
        normalizar(paciente.dui).includes(normalizar(filtros.dui)) &&
        normalizar(paciente.carnet).includes(normalizar(filtros.carnet));

      const tipo = !filtros.tipo_paciente || String(paciente.id_tipo_paciente || '') === filtros.tipo_paciente;
      const facultad = !filtros.facultad || String(paciente.id_facultad || '') === filtros.facultad;
      const carrera = !filtros.carrera || String(paciente.id_carrera || '') === filtros.carrera;
      const area = !filtros.area || String(paciente.id_area || '') === filtros.area;

      return texto && tipo && facultad && carrera && area;
    });
  }, [pacientes, filtros]);

  const actualizarFiltro = (campo, valor) => {
    const valorFinal = campo === 'dui' ? formatearDui(valor) : valor;
    setFiltros((prev) => ({
      ...prev,
      [campo]: valorFinal,
      ...(campo === 'facultad' ? { carrera: '' } : {})
    }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      expediente: '',
      nombre: '',
      apellido: '',
      dui: '',
      carnet: '',
      tipo_paciente: '',
      facultad: '',
      carrera: '',
      area: ''
    });
  };

  const contextoPaciente = (paciente) => {
    const academico = [paciente.facultad, paciente.carrera].filter(Boolean).join(' / ');
    return academico || paciente.area || '-';
  };

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Pacientes</h2>
          <p style={styles.subtitle}>Administración de datos personales y administrativos del paciente.</p>
        </div>
        <div style={styles.headerActions}>
          <button type="button" style={styles.secondaryButton} onClick={() => navigate('/areas')}>
            Registrar área
          </button>
          {puedeCrear && (
            <button type="button" style={styles.primaryButton} onClick={() => navigate('/pacientes/crear')}>
              + Crear paciente
            </button>
          )}
        </div>
      </div>

      <div style={styles.filterCard}>
        <div style={styles.filtersGrid}>
          <Input label="Expediente" value={filtros.expediente} onChange={(value) => actualizarFiltro('expediente', value)} />
          <Input label="Nombre" value={filtros.nombre} onChange={(value) => actualizarFiltro('nombre', value)} />
          <Input label="Apellido" value={filtros.apellido} onChange={(value) => actualizarFiltro('apellido', value)} />
          <Input label="DUI" value={filtros.dui} onChange={(value) => actualizarFiltro('dui', value)} />
          <Input label="Carnet" value={filtros.carnet} onChange={(value) => actualizarFiltro('carnet', value)} />
          <Select label="Tipo de paciente" value={filtros.tipo_paciente} onChange={(value) => actualizarFiltro('tipo_paciente', value)} options={catalogos.tipos} valueKey="id_tipo" labelKey="nombre" />
          <Select label="Facultad" value={filtros.facultad} onChange={(value) => actualizarFiltro('facultad', value)} options={catalogos.facultades} valueKey="id_facultad" labelKey="nombre" />
          <Select label="Carrera" value={filtros.carrera} onChange={(value) => actualizarFiltro('carrera', value)} options={carrerasFiltradas} valueKey="id_carrera" labelKey="nombre" />
          <Select label="Área" value={filtros.area} onChange={(value) => actualizarFiltro('area', value)} options={catalogos.areas} valueKey="id_area" labelKey="nombre" />
        </div>
        <div style={styles.filterActions}>
          <button type="button" style={styles.secondaryButton} onClick={limpiarFiltros}>Limpiar filtros</button>
        </div>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.cardTitle}>Listado de pacientes</h3>
          <span style={styles.counter}>{pacientesFiltrados.length} registro(s)</span>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Expediente</th>
                <th style={styles.th}>Nombre completo</th>
                <th style={styles.th}>DUI</th>
                <th style={styles.th}>Carnet</th>
                <th style={styles.th}>Tipo de paciente</th>
                <th style={styles.th}>Facultad / Carrera / Área</th>
                <th style={styles.th}>Teléfono</th>
                <th style={{ ...styles.th, ...styles.actionTh }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td style={styles.empty} colSpan="8">Cargando pacientes...</td></tr>
              ) : pacientesFiltrados.length === 0 ? (
                <tr><td style={styles.empty} colSpan="8">No se encontraron pacientes</td></tr>
              ) : (
                pacientesFiltrados.map((paciente) => (
                  <tr key={paciente.id_paciente}>
                    <td style={{ ...styles.td, ...styles.expediente }}>{paciente.expediente || '-'}</td>
                    <td style={styles.td}>{paciente.nombre_completo || '-'}</td>
                    <td style={styles.td}>{paciente.dui || '-'}</td>
                    <td style={styles.td}>{paciente.carnet || '-'}</td>
                    <td style={styles.td}>{paciente.tipo_paciente || '-'}</td>
                    <td style={styles.td}>{contextoPaciente(paciente)}</td>
                    <td style={styles.td}>{paciente.telefono || '-'}</td>
                    <td style={{ ...styles.td, ...styles.actionTd }}>
                      {puedeEditar ? (
                        <button
                          type="button"
                          style={styles.smallButton}
                          onClick={() => navigate(`/pacientes/editar/${paciente.id_paciente}`)}
                        >
                          Editar paciente
                        </button>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </Layout>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input style={styles.input} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options, valueKey, labelKey }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <select style={styles.input} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option[valueKey]} value={option[valueKey]}>{option[labelKey]}</option>
        ))}
      </select>
    </label>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' },
  headerActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  title: { margin: 0, color: '#1f2933', fontSize: '26px', fontWeight: '700', borderLeft: '5px solid #880C09', paddingLeft: '14px' },
  subtitle: { margin: '8px 0 0 19px', color: '#5b6472', fontSize: '15px' },
  filterCard: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.05)', marginBottom: '20px' },
  filtersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '7px' },
  label: { color: '#344054', fontSize: '13px', fontWeight: '700' },
  input: { height: '40px', border: '1px solid #d0d5dd', borderRadius: '6px', padding: '8px 11px', fontSize: '14px', color: '#111827', backgroundColor: '#fff', outlineColor: '#880C09' },
  filterActions: { display: 'flex', justifyContent: 'flex-end', marginTop: '16px' },
  primaryButton: { backgroundColor: '#880C09', color: '#fff', border: '1px solid #880C09', borderRadius: '6px', padding: '10px 18px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  secondaryButton: { backgroundColor: '#fff', color: '#880C09', border: '1px solid #880C09', borderRadius: '6px', padding: '8px 14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  tableCard: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.05)' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '18px 20px', borderBottom: '1px solid #edf2f7' },
  cardTitle: { margin: 0, color: '#111827', fontSize: '18px', fontWeight: '700' },
  counter: { color: '#880C09', backgroundColor: '#fff1f1', borderRadius: '999px', padding: '5px 12px', fontSize: '13px', fontWeight: '700' },
  tableWrap: { maxHeight: 'min(430px, 55vh)', overflowY: 'auto', overflowX: 'auto' },
  table: { width: '100%', minWidth: '1100px', borderCollapse: 'collapse' },
  th: { position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#f8fafc', color: '#344054', textAlign: 'left', padding: '14px 16px', borderBottom: '1px solid #d9e0e8', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' },
  td: { padding: '14px 16px', borderBottom: '1px solid #edf2f7', color: '#101828', fontSize: '14px', verticalAlign: 'middle' },
  expediente: { color: '#880C09', fontWeight: '800', fontFamily: 'Consolas, monospace' },
  actionTh: { width: '160px', textAlign: 'center' },
  actionTd: { textAlign: 'center' },
  smallButton: { backgroundColor: '#fff', color: '#880C09', border: '1px solid #880C09', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  empty: { padding: '28px 16px', color: '#667085', textAlign: 'center', fontSize: '15px', borderBottom: '1px solid #edf2f7' }
};

export default Pacientes;
