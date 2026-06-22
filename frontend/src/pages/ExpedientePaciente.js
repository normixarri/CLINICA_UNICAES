import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const API_URL = 'http://localhost:3001/api';

const tabs = [
  { key: 'general', label: 'Información General' },
  { key: 'recetas', label: 'Recetas' },
  { key: 'referencias', label: 'Referencias' },
  { key: 'incapacidades', label: 'Incapacidades' },
  { key: 'consultas', label: 'Consultas' },
  { key: 'constancias', label: 'Constancias' },
  { key: 'examen', label: 'Examen físico' }
];

function ExpedientePaciente() {
  const { id_paciente } = useParams();
  const { id_consulta } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const abiertoDesdeConsulta = Boolean(id_consulta || location.state?.returnTo);
  const returnTo = location.state?.returnTo || (id_consulta ? `/realizar-consultas/${id_consulta}` : '/expedientes');
  const [tabActiva, setTabActiva] = useState('general');
  const [cargando, setCargando] = useState(true);
  const [general, setGeneral] = useState(null);
  const [datos, setDatos] = useState({
    recetas: [],
    referencias: [],
    incapacidades: [],
    consultas: [],
    constancias: [],
    examen: []
  });

  const cargarExpediente = useCallback(async () => {
    try {
      setCargando(true);
      const [generalRes, recetasRes, referenciasRes, incapacidadesRes, consultasRes, constanciasRes, examenRes] = await Promise.all([
        axios.get(`${API_URL}/expedientes/${id_paciente}/general`),
        axios.get(`${API_URL}/expedientes/${id_paciente}/recetas`),
        axios.get(`${API_URL}/expedientes/${id_paciente}/referencias`),
        axios.get(`${API_URL}/expedientes/${id_paciente}/incapacidades`),
        axios.get(`${API_URL}/expedientes/${id_paciente}/consultas`),
        axios.get(`${API_URL}/expedientes/${id_paciente}/constancias`),
        axios.get(`${API_URL}/expedientes/${id_paciente}/examen-fisico`)
      ]);

      setGeneral(generalRes.data || null);
      setDatos({
        recetas: recetasRes.data || [],
        referencias: referenciasRes.data || [],
        incapacidades: incapacidadesRes.data || [],
        consultas: consultasRes.data || [],
        constancias: constanciasRes.data || [],
        examen: examenRes.data || []
      });
    } catch (error) {
      console.error('Error cargando expediente:', error);
    } finally {
      setCargando(false);
    }
  }, [id_paciente]);

  useEffect(() => {
    cargarExpediente();
  }, [cargarExpediente]);

  const renderContenido = () => {
    if (cargando) {
      return <div style={styles.empty}>Cargando expediente...</div>;
    }

    if (tabActiva === 'general') {
      return <InformacionGeneral general={general} />;
    }

    if (tabActiva === 'recetas') {
      return (
        <Tabla
          columnas={[
            { key: 'fecha', label: 'Fecha', render: formatearFecha },
            { key: 'medico', label: 'Médico' },
            { key: 'medicamentos', label: 'Medicamentos' },
            { key: 'indicaciones', label: 'Indicaciones' },
            { key: 'acciones', label: 'Acciones', render: (_, fila) => <BotonImprimir tipo="receta" id={fila.id_receta} /> }
          ]}
          filas={datos.recetas}
        />
      );
    }

    if (tabActiva === 'referencias') {
      return (
        <Tabla
          columnas={[
            { key: 'fecha', label: 'Fecha', render: formatearFecha },
            { key: 'diagnostico', label: 'Diagnóstico' },
            { key: 'doctor', label: 'Doctor' },
            { key: 'lugar_referencia', label: 'Se refiere a' },
            { key: 'especialidad', label: 'Especialidad' },
            { key: 'acciones', label: 'Acciones', render: (_, fila) => <BotonImprimir tipo="referencia" id={fila.id_referencia} /> }
          ]}
          filas={datos.referencias}
        />
      );
    }

    if (tabActiva === 'incapacidades') {
      return (
        <Tabla
          columnas={[
            { key: 'fecha', label: 'Fecha', render: formatearFecha },
            { key: 'diagnostico', label: 'Diagnóstico' },
            { key: 'doctor', label: 'Doctor' },
            { key: 'jvpm', label: 'J.V.P.M.' },
            { key: 'acciones', label: 'Acciones', render: (_, fila) => <BotonImprimir tipo="incapacidad" id={fila.id_incapacidad} /> },
            { key: 'dias_incapacidad', label: 'Días' }
          ]}
          filas={datos.incapacidades}
        />
      );
    }

    if (tabActiva === 'consultas') {
      return (
        <Tabla
          columnas={[
            { key: 'fecha', label: 'Fecha', render: formatearFecha },
            { key: 'diagnostico', label: 'Diagnóstico' },
            { key: 'doctor', label: 'Doctor' },
            { key: 'tipo_consulta', label: 'Tipo' },
            { key: 'estado', label: 'Estado' }
          ]}
          filas={datos.consultas}
        />
      );
    }

    if (tabActiva === 'constancias') {
      return (
        <Tabla
          columnas={[
            { key: 'fecha_emision', label: 'Fecha', render: formatearFecha },
            { key: 'tipo_constancia', label: 'Tipo constancia' },
            { key: 'diagnostico', label: 'Diagnóstico' },
            { key: 'doctor', label: 'Doctor' },
            { key: 'jvpm', label: 'J.V.P.M.' },
            { key: 'acciones', label: 'Acciones', render: (_, fila) => <BotonImprimir tipo="constancia" id={fila.id_constancia} /> }
          ]}
          filas={datos.constancias}
        />
      );
    }

    return (
      <>
        {abiertoDesdeConsulta && (
          <div style={styles.tabActions}>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => navigate(`/examen-fisico?id_consulta=${id_consulta}&id_paciente=${id_paciente}&returnTo=${encodeURIComponent(returnTo)}`)}
            >
              Realizar examen físico
            </button>
          </div>
        )}
        <Tabla
          columnas={[
            { key: 'fecha', label: 'Fecha', render: formatearFecha },
            { key: 'peso', label: 'Peso', render: (_, fila) => formatearMedida(fila.peso, fila.unidad_peso || 'kg') },
            { key: 'talla', label: 'Talla', render: (_, fila) => formatearMedida(fila.talla, fila.unidad_talla || 'm') },
            { key: 'temperatura', label: 'Temp.', render: (valor) => formatearMedida(valor, '\u00b0C') },
            { key: 'pulso', label: 'Pulso', render: (valor) => formatearMedida(valor, 'lpm') },
            { key: 'frecuencia_cardiaca', label: 'Frec. cardíaca', render: (valor) => formatearMedida(valor, 'lpm') },
            { key: 'presion', label: 'Presión', render: (_, fila) => formatearPresion(fila.presion_sistolica, fila.presion_diastolica) },
            { key: 'antecedentes', label: 'Antecedentes' },
            { key: 'examen_fisico', label: 'Examen físico' }
          ]}
          filas={datos.examen}
        />
      </>
    );
  };

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Expedientes</h2>
          <p style={styles.subtitle}>
            {general?.nombre_completo ? `${general.nombre_completo} · ${general.expediente || 'Sin correlativo'}` : 'Detalle del expediente clínico'}
          </p>
        </div>
        <div style={styles.headerActions}>
          {abiertoDesdeConsulta && (
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => navigate(`/examen-fisico?id_consulta=${id_consulta}&id_paciente=${id_paciente}&returnTo=${encodeURIComponent(returnTo)}`)}
            >
              Realizar examen físico
            </button>
          )}
        <button type="button" style={styles.secondaryButton} onClick={() => navigate(returnTo)}>
          Volver
        </button>
        </div>
      </div>

      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            style={tabActiva === tab.key ? styles.tabActive : styles.tab}
            onClick={() => setTabActiva(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.card}>
        {renderContenido()}
      </div>
    </Layout>
  );
}

function BotonImprimir({ tipo, id }) {
  if (!id) return '-';

  return (
    <button
      type="button"
      style={styles.printButton}
      onClick={() => window.open(`/imprimir/${tipo}/${id}`, '_blank', 'noopener,noreferrer')}
    >
      Imprimir
    </button>
  );
}

function InformacionGeneral({ general }) {
  if (!general) {
    return <div style={styles.empty}>No hay registros disponibles</div>;
  }

  const campos = [
    ['Nombre completo', general.nombre_completo],
    ['Expediente', general.expediente],
    ['Tipo de paciente', general.tipo_paciente],
    ['Sexo', general.sexo],
    ['Fecha de nacimiento', formatearFecha(general.fecha_nacimiento)],
    ['DUI', general.dui],
    ['Carnet', general.carnet],
    ['Teléfono', general.telefono],
    ['Correo', general.correo_electronico],
    ['Facultad', general.facultad],
    ['Carrera', general.carrera],
    ['Área', general.area],
    ['Sector', general.sector],
    ['Departamento', general.departamento],
    ['Municipio residencia', general.municipio_residencia],
    ['Municipio nacimiento', general.municipio_nacimiento],
    ['Dirección', general.direccion],
    ['Nombre del padre', general.nombre_padre],
    ['Nombre de la madre', general.nombre_madre],
    ['Empleado referencia', general.nombre_empleado_referencia]
  ];

  return (
    <div style={styles.infoGrid}>
      {campos.map(([label, value]) => (
        <div key={label} style={styles.infoItem}>
          <span style={styles.infoLabel}>{label}</span>
          <strong style={styles.infoValue}>{value || '-'}</strong>
        </div>
      ))}
    </div>
  );
}

function Tabla({ columnas, filas }) {
  if (!filas || filas.length === 0) {
    return <div style={styles.empty}>No hay registros disponibles</div>;
  }

  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columnas.map((columna) => (
              <th key={columna.key} style={styles.th}>{columna.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, index) => (
            <tr key={fila.id_receta || fila.id_referencia || fila.id_incapacidad || fila.id_consulta || fila.id_constancia || fila.id_examen_fisico || index}>
              {columnas.map((columna) => {
                const valor = columna.render ? columna.render(fila[columna.key], fila) : fila[columna.key];
                return <td key={columna.key} style={styles.td}>{valor || '-'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatearFecha(fecha) {
  if (!fecha) return '-';
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return fecha;
  return date.toLocaleDateString('es-SV');
}

function formatearMedida(valor, unidad) {
  if (valor === undefined || valor === null || valor === '') return '-';
  return `${valor} ${unidad}`;
}

function formatearPresion(sistolica, diastolica) {
  if (!sistolica && !diastolica) return '-';
  return `${sistolica || '-'}/${diastolica || '-'} mmHg`;
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '22px'
  },
  title: {
    margin: 0,
    color: '#1f2933',
    fontSize: '26px',
    fontWeight: '700',
    borderLeft: '5px solid #880C09',
    paddingLeft: '14px'
  },
  subtitle: {
    margin: '8px 0 0 19px',
    color: '#5b6472',
    fontSize: '15px'
  },
  secondaryButton: {
    backgroundColor: '#fff',
    color: '#880C09',
    border: '1px solid #880C09',
    borderRadius: '6px',
    padding: '9px 16px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  primaryButton: {
    backgroundColor: '#880C09',
    color: '#fff',
    border: '1px solid #880C09',
    borderRadius: '6px',
    padding: '9px 16px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  printButton: {
    backgroundColor: '#fff',
    color: '#880C09',
    border: '1px solid #880C09',
    borderRadius: '6px',
    padding: '7px 12px',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  tabActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '14px 16px 0'
  },
  tabs: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginBottom: '0'
  },
  tab: {
    backgroundColor: '#fff',
    color: '#344054',
    border: '1px solid #d9e0e8',
    borderBottom: 'none',
    borderRadius: '8px 8px 0 0',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer'
  },
  tabActive: {
    backgroundColor: '#880C09',
    color: '#fff',
    border: '1px solid #880C09',
    borderBottom: 'none',
    borderRadius: '8px 8px 0 0',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: '800',
    cursor: 'pointer'
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #d9e0e8',
    borderRadius: '0 8px 8px 8px',
    minHeight: '320px',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.05)',
    overflow: 'hidden'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '14px',
    padding: '22px'
  },
  infoItem: {
    border: '1px solid #edf2f7',
    borderRadius: '8px',
    padding: '13px 14px',
    backgroundColor: '#fbfcfe'
  },
  infoLabel: {
    display: 'block',
    color: '#667085',
    fontSize: '12px',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: '5px'
  },
  infoValue: {
    color: '#101828',
    fontSize: '14px',
    lineHeight: '1.35'
  },
  tableWrap: {
    maxHeight: 'min(430px, 55vh)',
    overflowY: 'auto',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    minWidth: '920px',
    borderCollapse: 'collapse'
  },
  th: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    backgroundColor: '#f8fafc',
    color: '#344054',
    textAlign: 'left',
    padding: '14px 16px',
    borderBottom: '1px solid #d9e0e8',
    fontSize: '12px',
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  td: {
    padding: '14px 16px',
    borderBottom: '1px solid #edf2f7',
    color: '#101828',
    fontSize: '14px',
    lineHeight: '1.35',
    verticalAlign: 'top'
  },
  empty: {
    padding: '34px 18px',
    color: '#667085',
    textAlign: 'center',
    fontSize: '15px'
  }
};

export default ExpedientePaciente;
