import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { obtenerCensoInstitucional, obtenerCensoNuevoIngreso } from '../services/censoService';
import { obtenerFechaHoyInput } from '../utils/validaciones';

const API = 'http://localhost:3001/api';

const filtrosIniciales = {
  fechaInicio: '',
  fechaFin: '',
  expediente: '',
  nombre: '',
  apellido: '',
  tipo_paciente: '',
  facultad: '',
  proyecto: '',
  sexo: '',
  region: '',
  documentos: ''
};

const filtrosNuevoIniciales = {
  fechaInicio: '',
  fechaFin: '',
  expediente: '',
  nombre: '',
  carrera: ''
};

function AdminCenso() {
  const [tab, setTab] = useState('institucional');
  const [censos, setCensos] = useState([]);
  const [catalogos, setCatalogos] = useState({
    tipos: [],
    facultades: [],
    carreras: [],
    areas: [],
    proyectos: []
  });
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [filtrosNuevo, setFiltrosNuevo] = useState(filtrosNuevoIniciales);
  const [cargando, setCargando] = useState(false);

  const cargarCatalogos = useCallback(async () => {
    try {
      const [tiposRes, facultadesRes, carrerasRes, areasRes, proyectosRes] = await Promise.all([
        fetch(`${API}/tipos-paciente`),
        fetch(`${API}/facultades`),
        fetch(`${API}/carreras`),
        fetch(`${API}/areas`),
        fetch(`${API}/proyectos`)
      ]);

      setCatalogos({
        tipos: await tiposRes.json(),
        facultades: await facultadesRes.json(),
        carreras: await carrerasRes.json(),
        areas: await areasRes.json(),
        proyectos: await proyectosRes.json()
      });
    } catch (error) {
      console.error('Error cargando catálogos del censo:', error);
    }
  }, []);

  const cargarCensos = useCallback(async () => {
    try {
      setCargando(true);
      const data = tab === 'institucional'
        ? await obtenerCensoInstitucional()
        : await obtenerCensoNuevoIngreso();

      setCensos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando censos:', error);
    } finally {
      setCargando(false);
    }
  }, [tab]);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  useEffect(() => {
    cargarCensos();
  }, [cargarCensos]);

  const tipoSeleccionado = useMemo(() => {
    return catalogos.tipos.find((tipo) => String(tipo.id_tipo) === String(filtros.tipo_paciente));
  }, [catalogos.tipos, filtros.tipo_paciente]);

  const nombreTipo = normalizar(tipoSeleccionado?.nombre);
  const esEstudiante = nombreTipo === 'estudiante';
  const esServicios = nombreTipo === 'servicios generales';

  const mostrarFacultad = esEstudiante;
  const mostrarProyecto = !esServicios;

  const proyectosFiltro = useMemo(() => {
    if (esServicios) return [];
    return [
      { value: 'LAMAR', label: 'LAMAR' },
      { value: 'PY', label: 'Proyección Social' },
      { value: 'SIN', label: 'Sin proyecto' }
    ];
  }, [esServicios]);

  const regiones = ['Rural', 'Urbano'];

  const censosFiltrados = useMemo(() => {
    if (tab !== 'institucional') {
      return censos.filter((censo) => {
        const fecha = formatearFecha(censo.fecha);
        const fechaOk =
          (!filtrosNuevo.fechaInicio || fecha >= filtrosNuevo.fechaInicio) &&
          (!filtrosNuevo.fechaFin || fecha <= filtrosNuevo.fechaFin);

        return (
          fechaOk &&
          contiene(censo.expediente, filtrosNuevo.expediente) &&
          contiene(censo.nombre, filtrosNuevo.nombre) &&
          contiene(censo.carrera, filtrosNuevo.carrera)
        );
      });
    }

    return censos.filter((censo) => {
      const fecha = formatearFecha(censo.fecha);
      const documentos = String(censo.documentos || '').trim();
      const proyecto = String(censo.proyecto || '-').trim();

      const texto =
        contiene(censo.expediente, filtros.expediente) &&
        contiene(censo.nombres || censo.nombre, filtros.nombre) &&
        contiene(censo.apellidos, filtros.apellido);

      const fechaOk =
        (!filtros.fechaInicio || fecha >= filtros.fechaInicio) &&
        (!filtros.fechaFin || fecha <= filtros.fechaFin);

      const tipoOk = !filtros.tipo_paciente || String(censo.id_tipo_paciente || '') === filtros.tipo_paciente;
      const facultadOk = !filtros.facultad || String(censo.id_facultad || '') === filtros.facultad;
      const sexoOk = !filtros.sexo || String(censo.sexo || '') === filtros.sexo;
      const regionOk = !filtros.region || String(censo.region || '') === filtros.region;

      const proyectoOk =
        !filtros.proyecto ||
        (filtros.proyecto === 'SIN' ? proyecto === '-' || proyecto === '' : proyecto.includes(filtros.proyecto));

      const documentosOk =
        !filtros.documentos ||
        (filtros.documentos === 'SIN' ? documentos === '' : documentos.includes(filtros.documentos));

      return texto && fechaOk && tipoOk && facultadOk && sexoOk && regionOk && proyectoOk && documentosOk;
    });
  }, [censos, filtros, filtrosNuevo, tab]);

  useEffect(() => {
    if (esServicios && filtros.proyecto) {
      setFiltros((prev) => ({ ...prev, proyecto: '' }));
    }
  }, [esServicios, filtros.proyecto]);

  useEffect(() => {
    if (!mostrarFacultad && filtros.facultad) {
      setFiltros((prev) => ({ ...prev, facultad: '' }));
    }
  }, [filtros.facultad, mostrarFacultad]);

  const actualizarFiltro = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor,
      ...(campo === 'tipo_paciente' ? { facultad: '', proyecto: '' } : {})
    }));
  };

  const actualizarFiltroNuevo = (campo, valor) => {
    setFiltrosNuevo((prev) => ({
      ...prev,
      [campo]: valor
    }));
  };

  const limpiarFiltros = () => setFiltros(filtrosIniciales);
  const limpiarFiltrosNuevo = () => setFiltrosNuevo(filtrosNuevoIniciales);

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Censos</h2>
          <p style={styles.subtitle}>Control institucional de consultas y registros clínicos.</p>
        </div>
      </div>

      <div style={styles.tabs}>
        <button style={tab === 'institucional' ? styles.tabActive : styles.tab} onClick={() => setTab('institucional')}>
          Censo Institucional
        </button>
        <button style={tab === 'nuevo' ? styles.tabActive : styles.tab} onClick={() => setTab('nuevo')}>
          Censo Nuevo Ingreso
        </button>
      </div>

      {tab === 'institucional' && (
        <div style={styles.filtros}>
          <Input label="Fecha inicial" type="date" value={filtros.fechaInicio} onChange={(value) => actualizarFiltro('fechaInicio', value)} />
          <Input label="Fecha final" type="date" value={filtros.fechaFin} onChange={(value) => actualizarFiltro('fechaFin', value)} />
          <Input label="Expediente" value={filtros.expediente} onChange={(value) => actualizarFiltro('expediente', value)} />
          <Input label="Nombre" value={filtros.nombre} onChange={(value) => actualizarFiltro('nombre', value)} />
          <Input label="Apellido" value={filtros.apellido} onChange={(value) => actualizarFiltro('apellido', value)} />
          <Select label="Tipo de paciente" value={filtros.tipo_paciente} onChange={(value) => actualizarFiltro('tipo_paciente', value)}>
            <option value="">Todos</option>
            {catalogos.tipos.map((tipo) => <option key={tipo.id_tipo} value={tipo.id_tipo}>{tipo.nombre}</option>)}
          </Select>

          {mostrarFacultad && (
            <Select label="Facultad" value={filtros.facultad} onChange={(value) => actualizarFiltro('facultad', value)}>
              <option value="">Todas</option>
              {catalogos.facultades.map((facultad) => <option key={facultad.id_facultad} value={facultad.id_facultad}>{facultad.nombre}</option>)}
            </Select>
          )}

          {mostrarProyecto && (
            <Select label="Proyecto" value={filtros.proyecto} onChange={(value) => actualizarFiltro('proyecto', value)}>
              <option value="">Todos</option>
              {proyectosFiltro.map((proyecto) => <option key={proyecto.value} value={proyecto.value}>{proyecto.label}</option>)}
            </Select>
          )}

          <Select label="Sexo" value={filtros.sexo} onChange={(value) => actualizarFiltro('sexo', value)}>
            <option value="">Todos</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </Select>

          <Select label="Zona de vivienda" value={filtros.region} onChange={(value) => actualizarFiltro('region', value)}>
            <option value="">Todas</option>
            {regiones.map((region) => <option key={region} value={region}>{region}</option>)}
          </Select>

          <Select label="Documentos" value={filtros.documentos} onChange={(value) => actualizarFiltro('documentos', value)}>
            <option value="">Todos</option>
            <option value="C">Constancia</option>
            <option value="R">Referencia</option>
            <option value="I">Incapacidad</option>
            <option value="SIN">Sin documentos</option>
          </Select>

          <div style={styles.filterActions}>
            <button type="button" style={styles.secondaryButton} onClick={limpiarFiltros}>Limpiar filtros</button>
          </div>
        </div>
      )}

      {tab === 'nuevo' && (
        <div style={styles.filtros}>
          <Input label="Fecha inicial" type="date" value={filtrosNuevo.fechaInicio} onChange={(value) => actualizarFiltroNuevo('fechaInicio', value)} />
          <Input label="Fecha final" type="date" value={filtrosNuevo.fechaFin} onChange={(value) => actualizarFiltroNuevo('fechaFin', value)} />
          <Input label="Expediente" value={filtrosNuevo.expediente} onChange={(value) => actualizarFiltroNuevo('expediente', value)} />
          <Input label="Nombre" value={filtrosNuevo.nombre} onChange={(value) => actualizarFiltroNuevo('nombre', value)} />
          <Input label="Carrera" value={filtrosNuevo.carrera} onChange={(value) => actualizarFiltroNuevo('carrera', value)} />
          <div style={styles.filterActions}>
            <button type="button" style={styles.secondaryButton} onClick={limpiarFiltrosNuevo}>Limpiar filtros</button>
          </div>
        </div>
      )}

      <div style={styles.tableContainer}>
        {tab === 'institucional' ? (
          <TablaInstitucional censos={censosFiltrados} cargando={cargando} />
        ) : (
          <TablaNuevoIngreso censos={censosFiltrados} cargando={cargando} />
        )}
      </div>
    </Layout>
  );
}

function TablaInstitucional({ censos, cargando }) {
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Fecha</th>
          <th style={styles.th}>Expediente</th>
          <th style={styles.th}>Nombre</th>
          <th style={styles.th}>Diagnóstico</th>
          <th style={styles.th}>Sexo</th>
          <th style={styles.th}>Edad</th>
          <th style={styles.th}>Tipo Paciente</th>
          <th style={styles.th}>Facultad</th>
          <th style={styles.th}>Proyecto</th>
          <th style={styles.th}>Zona de vivienda</th>
          <th style={styles.th}>Consulta</th>
          <th style={styles.th}>Documento</th>
        </tr>
      </thead>
      <tbody>
        {cargando ? (
          <tr><td style={styles.empty} colSpan="12">Cargando censo...</td></tr>
        ) : censos.length === 0 ? (
          <tr><td style={styles.empty} colSpan="12">No se encontraron registros</td></tr>
        ) : (
          censos.map((censo, index) => (
            <tr key={`${censo.expediente}-${censo.fecha}-${index}`}>
              <td style={styles.td}>{formatearFecha(censo.fecha)}</td>
              <td style={{ ...styles.td, ...styles.expedienteCell }}>{censo.expediente}</td>
              <td style={styles.td}>{censo.nombre}</td>
              <td style={styles.td}>{censo.diagnostico || '-'}</td>
              <td style={styles.td}>{censo.sexo || '-'}</td>
              <td style={styles.td}>{censo.edad ?? '-'}</td>
              <td style={styles.td}>{censo.tipo_paciente || '-'}</td>
              <td style={styles.td}>{censo.facultad || '-'}</td>
              <td style={styles.td}><ProyectoBadge proyecto={censo.proyecto} /></td>
              <td style={styles.td}>{censo.region || '-'}</td>
              <td style={styles.td}>{censo.tipo_consulta || '-'}</td>
              <td style={{ ...styles.td, ...styles.documentosCell }}>{String(censo.documentos || '').trim() || '-'}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function TablaNuevoIngreso({ censos, cargando }) {
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Fecha</th>
          <th style={styles.th}>Expediente</th>
          <th style={styles.th}>Nombre</th>
          <th style={styles.th}>Carrera</th>
        </tr>
      </thead>
      <tbody>
        {cargando ? (
          <tr><td style={styles.empty} colSpan="4">Cargando censo...</td></tr>
        ) : censos.length === 0 ? (
          <tr><td style={styles.empty} colSpan="4">No se encontraron registros</td></tr>
        ) : (
          censos.map((censo) => (
            <tr key={censo.id_nuevo_ingreso}>
              <td style={styles.td}>{formatearFecha(censo.fecha)}</td>
              <td style={{ ...styles.td, ...styles.expedienteCell }}>{censo.expediente}</td>
              <td style={styles.td}>{censo.nombre}</td>
              <td style={styles.td}>{censo.carrera}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function ProyectoBadge({ proyecto }) {
  const valor = String(proyecto || '-').trim();
  if (!valor || valor === '-') return <span style={styles.muted}>-</span>;

  if (valor.includes('PY') && valor.includes('LAMAR')) {
    return (
      <span style={styles.badgeGroup}>
        <span style={styles.badgePy}>PY</span>
        <span style={styles.badgeLamar}>LAMAR</span>
      </span>
    );
  }

  if (valor.includes('PY')) return <span style={styles.badgePy}>PY</span>;
  return <span style={styles.badgeLamar}>LAMAR</span>;
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <label style={styles.filtroItem}>
      <span style={styles.label}>{label}</span>
      <input type={type} max={type === 'date' ? obtenerFechaHoyInput() : undefined} style={styles.input} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label style={styles.filtroItem}>
      <span style={styles.label}>{label}</span>
      <select style={styles.input} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function normalizar(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function contiene(valor, filtro) {
  return normalizar(valor).includes(normalizar(filtro));
}

function formatearFecha(fechaCompleta) {
  if (!fechaCompleta) return '';
  return String(fechaCompleta).split('T')[0];
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px'
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
  filtros: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '14px',
    marginBottom: '20px',
    padding: '18px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.05)'
  },
  filtrosCompactos: {
    marginBottom: '20px',
    padding: '16px 18px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  filtroItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#344054'
  },
  input: {
    height: '40px',
    padding: '8px 11px',
    border: '1px solid #d0d5dd',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    outlineColor: '#880C09'
  },
  filterActions: {
    display: 'flex',
    alignItems: 'flex-end'
  },
  secondaryButton: {
    height: '40px',
    backgroundColor: '#fff',
    color: '#880C09',
    border: '1px solid #880C09',
    borderRadius: '6px',
    padding: '8px 14px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  tabs: {
    display: 'flex',
    gap: '6px',
    marginBottom: '0',
    borderBottom: '2px solid #dee2e6'
  },
  tab: {
    padding: '12px 20px',
    backgroundColor: '#fff',
    color: '#344054',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700',
    border: '1px solid #dee2e6',
    borderBottom: 'none'
  },
  tabActive: {
    padding: '12px 20px',
    backgroundColor: '#880C09',
    color: '#fff',
    borderRadius: '8px 8px 0 0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '800',
    border: '1px solid #880C09',
    borderBottom: 'none'
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    maxHeight: 'min(460px, 56vh)',
    overflowY: 'auto',
    overflowX: 'auto',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.05)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    minWidth: '1180px'
  },
  th: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    textAlign: 'left',
    padding: '13px 15px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #d9e0e8',
    fontSize: '12px',
    fontWeight: '800',
    color: '#344054',
    textTransform: 'uppercase'
  },
  td: {
    padding: '13px 15px',
    borderBottom: '1px solid #edf2f7',
    fontSize: '14px',
    color: '#101828',
    verticalAlign: 'middle'
  },
  expedienteCell: {
    color: '#880C09',
    fontWeight: '800',
    fontFamily: 'Consolas, monospace'
  },
  documentosCell: {
    color: '#880C09',
    fontWeight: '800',
    textAlign: 'center'
  },
  badgeGroup: {
    display: 'inline-flex',
    gap: '6px',
    alignItems: 'center'
  },
  badgePy: {
    display: 'inline-block',
    color: '#075985',
    backgroundColor: '#e0f2fe',
    border: '1px solid #bae6fd',
    borderRadius: '999px',
    padding: '4px 9px',
    fontSize: '12px',
    fontWeight: '800'
  },
  badgeLamar: {
    display: 'inline-block',
    color: '#880C09',
    backgroundColor: '#fff1f1',
    border: '1px solid #f3c4c4',
    borderRadius: '999px',
    padding: '4px 9px',
    fontSize: '12px',
    fontWeight: '800'
  },
  muted: {
    color: '#98a2b3',
    fontWeight: '700'
  },
  empty: {
    padding: '28px 16px',
    color: '#667085',
    textAlign: 'center',
    fontSize: '15px'
  },
  infoText: {
    color: '#5b6472',
    fontWeight: '700'
  }
};

export default AdminCenso;
