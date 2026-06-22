import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import useMensajeToast from '../hooks/useMensajeToast';
import { formatearTelefonoSv, obtenerFechaHoyInput, validarFechaNoFutura, validarTelefono } from '../utils/validaciones';
import ValidationWarning, { validationStyles } from '../components/ValidationWarning';

const API = 'http://localhost:3001/api';
const medidasIniciales = { peso: '', unidad_peso: 'kg', talla: '', unidad_talla: 'm', presion_sistolica: '', presion_diastolica: '' };
const ingresoInicial = {
  dt: false,
  dt_fecha_dosis: '',
  dt_dosis: '',
  hepatitis_b: false,
  hepatitis_b_fecha_dosis: '',
  hepatitis_b_dosis: '',
  otras_vacunas: '',
  enfermedades_cronicas: false,
  detalle_enfermedades: '',
  problemas_auditivos: false,
  detalle_auditivos: '',
  problemas_visuales: false,
  detalle_visuales: ''
};

const pacienteInicial = {
  nombre: '',
  apellidos: '',
  sexo: '',
  fecha_nacimiento: '',
  id_carrera: '',
  telefono: '',
  contacto_nombre: '',
  contacto_parentesco: '',
  contacto_telefono: '',
  id_tipo_paciente: '1',
};

function GenerarConsulta() {
  const fieldRefs = useRef({});
  const [tab, setTab] = useState('nuevo');
  const [doctores, setDoctores] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [catalogos, setCatalogos] = useState({ tipos: [], carreras: [], areas: [] });
  const [doctorSeleccionado, setDoctorSeleccionado] = useState(null);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [pacienteNuevo, setPacienteNuevo] = useState(pacienteInicial);
  const [nuevoIngreso, setNuevoIngreso] = useState(ingresoInicial);
  const [tipoConsulta, setTipoConsulta] = useState('Primera vez');
  const [medidasNuevo, setMedidasNuevo] = useState(medidasIniciales);
  const [examenBasico, setExamenBasico] = useState(medidasIniciales);
  const [mensaje, setMensaje] = useState('');
  useMensajeToast(mensaje);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [filtroDoctor, setFiltroDoctor] = useState({ nombre: '', apellido: '', especialidad: '' });
  const [filtroPaciente, setFiltroPaciente] = useState({ expediente: '', nombre: '', apellido: '', tipo_paciente: '' });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [doctoresRes, pacientesRes, tiposRes, carrerasRes, areasRes] = await Promise.all([
        axios.get(`${API}/consultas/doctores`),
        axios.get(`${API}/consultas/pacientes`),
        axios.get(`${API}/tipos-paciente`),
        axios.get(`${API}/carreras/nuevo-ingreso`),
        axios.get(`${API}/areas`)
      ]);

      setDoctores(doctoresRes.data || []);
      setPacientes(pacientesRes.data || []);
      setCatalogos({
        tipos: tiposRes.data || [],
        carreras: carrerasRes.data || [],
        areas: areasRes.data || []
      });
    } catch (error) {
      console.error('Error cargando generar consulta:', error);
      setMensaje('No se pudieron cargar los datos.');
    }
  };

  const doctoresFiltrados = useMemo(() => {
    return doctores.filter((doctor) => {
      return contiene(doctor.nombre, filtroDoctor.nombre) &&
        contiene(doctor.apellidos, filtroDoctor.apellido) &&
        contiene(doctor.especialidad, filtroDoctor.especialidad);
    });
  }, [doctores, filtroDoctor]);

  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter((paciente) => {
      return contiene(paciente.expediente, filtroPaciente.expediente) &&
        contiene(paciente.nombre, filtroPaciente.nombre) &&
        contiene(paciente.apellidos, filtroPaciente.apellido) &&
        (!filtroPaciente.tipo_paciente || String(paciente.id_tipo_paciente || '') === filtroPaciente.tipo_paciente);
    });
  }, [pacientes, filtroPaciente]);

  const edadPacienteNuevo = useMemo(() => calcularEdad(pacienteNuevo.fecha_nacimiento), [pacienteNuevo.fecha_nacimiento]);

  const actualizarPacienteNuevo = (campo, valor) => {
    const valorNormalizado = ['telefono', 'contacto_telefono'].includes(campo)
      ? formatearTelefonoSv(valor)
      : valor;

    setErrores((prev) => ({ ...prev, [campo]: '' }));
    setPacienteNuevo((prev) => ({
      ...prev,
      [campo]: valorNormalizado
    }));
  };

  const actualizarMedidasNuevo = (campo, valor) => {
    setErrores((prev) => ({ ...prev, [`nuevo_${campo}`]: '' }));
    setMedidasNuevo((prev) => ({ ...prev, [campo]: valor }));
  };

  const actualizarNuevoIngreso = (campo, valor) => {
    setErrores((prev) => ({ ...prev, [campo]: '' }));
    setNuevoIngreso((prev) => ({ ...prev, [campo]: valor }));
  };

  const actualizarExamenBasico = (campo, valor) => {
    setErrores((prev) => ({ ...prev, [`general_${campo}`]: '' }));
    setExamenBasico((prev) => ({ ...prev, [campo]: valor }));
  };

  const mostrarErrores = (nuevosErrores) => {
    setErrores(nuevosErrores);
    const primerCampo = Object.keys(nuevosErrores)[0];
    setTimeout(() => {
      const nodo = fieldRefs.current[primerCampo];
      if (!nodo) return;
      nodo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const enfocable = nodo.querySelector('input, select, textarea, button');
      if (enfocable) enfocable.focus({ preventScroll: true });
    }, 80);
  };

  const generarNuevoIngreso = async () => {
    setMensaje('');
    setErrores({});
    const erroresValidacion = {};
    if (!doctorSeleccionado) erroresValidacion.doctor = 'Debe seleccionar el doctor.';
    if (!pacienteNuevo.nombre.trim()) erroresValidacion.nombre = 'Debe ingresar el nombre.';
    if (!pacienteNuevo.apellidos.trim()) erroresValidacion.apellidos = 'Debe ingresar los apellidos.';
    if (!pacienteNuevo.sexo) erroresValidacion.sexo = 'Debe seleccionar el sexo.';
    if (!pacienteNuevo.fecha_nacimiento) erroresValidacion.fecha_nacimiento = 'Debe ingresar la fecha de nacimiento.';
    else if (validarFechaNoFutura(pacienteNuevo.fecha_nacimiento)) erroresValidacion.fecha_nacimiento = 'No se permiten fechas futuras.';
    if (!pacienteNuevo.id_carrera) erroresValidacion.id_carrera = 'Debe seleccionar la carrera.';
    if (!pacienteNuevo.telefono.trim()) {
      erroresValidacion.telefono = 'Debe ingresar el telefono.';
    } else {
      const errorTelefono = validarTelefono(pacienteNuevo.telefono, 'telefonico', true);
      if (errorTelefono) erroresValidacion.telefono = 'Debe ingresar un telefono valido.';
    }
    const errorTelefonoEmergencia = validarTelefono(pacienteNuevo.contacto_telefono, 'telefonico de emergencia', false);
    if (errorTelefonoEmergencia) erroresValidacion.contacto_telefono = 'Debe ingresar un telefono de emergencia valido.';
    Object.assign(erroresValidacion, validarMedidasCampos(medidasNuevo, 'nuevo'));
    Object.assign(erroresValidacion, validarNuevoIngresoCampos(nuevoIngreso));
    if (Object.keys(erroresValidacion).length > 0) return mostrarErrores(erroresValidacion);

    try {
      setGuardando(true);
      await axios.post(`${API}/consultas/generar-nuevo-ingreso`, {
        id_doctor: doctorSeleccionado.id_doctor,
        paciente: pacienteNuevo,
        nuevo_ingreso: normalizarNuevoIngresoPayload(nuevoIngreso),
        ...medidasNuevo
      });

      setMensaje('Consulta de nuevo ingreso generada correctamente.');
      setPacienteNuevo(pacienteInicial);
      setNuevoIngreso(ingresoInicial);
      setMedidasNuevo(medidasIniciales);
      await cargarDatos();
    } catch (error) {
      console.error('Error al generar consulta de nuevo ingreso:', error);
      if (error.response?.data?.errors) {
        mostrarErrores(error.response.data.errors);
        return;
      }
      setMensaje(error.response?.data?.mensaje || 'No se pudo crear la consulta. Revise los datos ingresados.');
    } finally {
      setGuardando(false);
    }
  };
  const generarGeneral = async () => {
    setMensaje('');
    setErrores({});
    const erroresValidacion = {};
    if (!doctorSeleccionado) erroresValidacion.doctor = 'Debe seleccionar el doctor.';
    if (!pacienteSeleccionado) erroresValidacion.paciente = 'Debe seleccionar el paciente.';
    Object.assign(erroresValidacion, validarMedidasCampos(examenBasico, 'general'));
    if (Object.keys(erroresValidacion).length > 0) return mostrarErrores(erroresValidacion);

    try {
      setGuardando(true);
      await axios.post(`${API}/consultas/generar-general`, {
        id_doctor: doctorSeleccionado.id_doctor,
        id_paciente: pacienteSeleccionado.id_paciente,
        tipo_consulta: tipoConsulta,
        ...examenBasico
      });

      setMensaje('Consulta generada correctamente.');
      setPacienteSeleccionado(null);
      setExamenBasico(medidasIniciales);
      await cargarDatos();
    } catch (error) {
      console.error('Error al generar consulta general:', error);
      setMensaje(error.response?.data?.mensaje || 'No se pudo generar la consulta.');
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Generar consulta</h2>
          <p style={styles.subtitle}>Crear consultas pendientes para atención médica.</p>
        </div>
      </div>

      <div style={styles.tabs}>
        <button style={tab === 'nuevo' ? styles.tabActive : styles.tab} onClick={() => setTab('nuevo')}>Nuevo ingreso</button>
        <button style={tab === 'general' ? styles.tabActive : styles.tab} onClick={() => setTab('general')}>Consulta general</button>
      </div>

      {mensaje && <div style={styles.alert}>{mensaje}</div>}

      <DoctorSelector
        doctores={doctoresFiltrados}
        seleccionado={doctorSeleccionado}
        setSeleccionado={setDoctorSeleccionado}
        filtros={filtroDoctor}
        setFiltros={setFiltroDoctor}
      />

      {tab === 'nuevo' ? (
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Paciente nuevo</h3>
          <div style={styles.selectedText}>Doctor: <strong>{doctorSeleccionado?.doctor || 'Seleccione un doctor en la tabla'}</strong></div>
          <div style={styles.grid}>
            <Input name="nombre" label="Nombres" value={pacienteNuevo.nombre} onChange={(v) => actualizarPacienteNuevo('nombre', v)} error={errores.nombre} fieldRefs={fieldRefs} />
            <Input name="apellidos" label="Apellidos" value={pacienteNuevo.apellidos} onChange={(v) => actualizarPacienteNuevo('apellidos', v)} error={errores.apellidos} fieldRefs={fieldRefs} />
            <Select name="sexo" label="Sexo" value={pacienteNuevo.sexo} onChange={(v) => actualizarPacienteNuevo('sexo', v)} error={errores.sexo} fieldRefs={fieldRefs}>
              <option value="">Seleccione</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </Select>
            <Input name="fecha_nacimiento" label="Fecha nacimiento" type="date" value={pacienteNuevo.fecha_nacimiento} onChange={(v) => actualizarPacienteNuevo('fecha_nacimiento', v)} error={errores.fecha_nacimiento} fieldRefs={fieldRefs} />
            <CampoLectura label="Edad" value={edadPacienteNuevo !== '' ? `${edadPacienteNuevo} años` : 'Seleccione fecha de nacimiento'} />
            <Select name="id_carrera" label="Carrera" value={pacienteNuevo.id_carrera} onChange={(v) => actualizarPacienteNuevo('id_carrera', v)} error={errores.id_carrera} fieldRefs={fieldRefs}>
              <option value="">Seleccione</option>
              {catalogos.carreras.map((carrera) => <option key={carrera.id_carrera} value={carrera.id_carrera}>{carrera.nombre}</option>)}
            </Select>
            <Input name="telefono" label="Teléfono" value={pacienteNuevo.telefono} onChange={(v) => actualizarPacienteNuevo('telefono', v)} placeholder="7777-7777" inputMode="numeric" error={errores.telefono} fieldRefs={fieldRefs} />
            <Input label="En caso de emergencia llamar a" value={pacienteNuevo.contacto_nombre} onChange={(v) => actualizarPacienteNuevo('contacto_nombre', v)} />
            <Input label="Parentesco" value={pacienteNuevo.contacto_parentesco} onChange={(v) => actualizarPacienteNuevo('contacto_parentesco', v)} />
            <Input name="contacto_telefono" label="Teléfono emergencia" value={pacienteNuevo.contacto_telefono} onChange={(v) => actualizarPacienteNuevo('contacto_telefono', v)} placeholder="7777-7777" inputMode="numeric" error={errores.contacto_telefono} fieldRefs={fieldRefs} />
          </div>
          <h3 style={styles.subSectionTitle}>Medidas antropométricas</h3>
          <div style={styles.grid}>
            <InputConUnidad name="nuevo_peso" label="Peso" value={medidasNuevo.peso} unidad={medidasNuevo.unidad_peso} unidades={['kg', 'lb']} onChange={(v) => actualizarMedidasNuevo('peso', v)} onUnidadChange={(v) => actualizarMedidasNuevo('unidad_peso', v)} inputMode="decimal" error={errores.nuevo_peso} fieldRefs={fieldRefs} />
            <InputConUnidad name="nuevo_talla" label="Talla" value={medidasNuevo.talla} unidad={medidasNuevo.unidad_talla} unidades={['m', 'cm']} onChange={(v) => actualizarMedidasNuevo('talla', v)} onUnidadChange={(v) => actualizarMedidasNuevo('unidad_talla', v)} inputMode="decimal" error={errores.nuevo_talla} fieldRefs={fieldRefs} />
            <InputConSufijo name="nuevo_presion_sistolica" label="Presión sistólica" value={medidasNuevo.presion_sistolica} onChange={(v) => actualizarMedidasNuevo('presion_sistolica', v)} sufijo="mmHg" inputMode="numeric" error={errores.nuevo_presion_sistolica} fieldRefs={fieldRefs} />
            <InputConSufijo name="nuevo_presion_diastolica" label="Presión diastólica" value={medidasNuevo.presion_diastolica} onChange={(v) => actualizarMedidasNuevo('presion_diastolica', v)} sufijo="mmHg" inputMode="numeric" error={errores.nuevo_presion_diastolica} fieldRefs={fieldRefs} />
          </div>
          <h3 style={styles.subSectionTitle}>Datos de nuevo ingreso</h3>
          <div style={styles.grid}>
            <Check label="DT" checked={nuevoIngreso.dt} onChange={(v) => actualizarNuevoIngreso('dt', v)} />
            <Input name="dt_fecha_dosis" label="Fecha de dosis DT" type="date" value={nuevoIngreso.dt_fecha_dosis} onChange={(v) => actualizarNuevoIngreso('dt_fecha_dosis', v)} error={errores.dt_fecha_dosis} fieldRefs={fieldRefs} />
            <Input name="dt_dosis" label="Número de dosis DT" value={nuevoIngreso.dt_dosis} onChange={(v) => actualizarNuevoIngreso('dt_dosis', v)} inputMode="numeric" error={errores.dt_dosis} fieldRefs={fieldRefs} />
            <Check label="Hepatitis B" checked={nuevoIngreso.hepatitis_b} onChange={(v) => actualizarNuevoIngreso('hepatitis_b', v)} />
            <Input name="hepatitis_b_fecha_dosis" label="Fecha de dosis Hepatitis B" type="date" value={nuevoIngreso.hepatitis_b_fecha_dosis} onChange={(v) => actualizarNuevoIngreso('hepatitis_b_fecha_dosis', v)} error={errores.hepatitis_b_fecha_dosis} fieldRefs={fieldRefs} />
            <Input name="hepatitis_b_dosis" label="Número de dosis Hepatitis B" value={nuevoIngreso.hepatitis_b_dosis} onChange={(v) => actualizarNuevoIngreso('hepatitis_b_dosis', v)} inputMode="numeric" error={errores.hepatitis_b_dosis} fieldRefs={fieldRefs} />
            <Input label="Otras vacunas" value={nuevoIngreso.otras_vacunas} onChange={(v) => actualizarNuevoIngreso('otras_vacunas', v)} />
          </div>
          <div style={styles.textGrid}>
            <CampoCondicional checkName="enfermedades_cronicas" detailName="detalle_enfermedades" label="Enfermedades crónicas degenerativas" checked={nuevoIngreso.enfermedades_cronicas} value={nuevoIngreso.detalle_enfermedades} onCheck={(v) => actualizarNuevoIngreso('enfermedades_cronicas', v)} onChange={(v) => actualizarNuevoIngreso('detalle_enfermedades', v)} error={errores.detalle_enfermedades} fieldRefs={fieldRefs} />
            <CampoCondicional checkName="problemas_auditivos" detailName="detalle_auditivos" label="Problemas auditivos irreversibles" checked={nuevoIngreso.problemas_auditivos} value={nuevoIngreso.detalle_auditivos} onCheck={(v) => actualizarNuevoIngreso('problemas_auditivos', v)} onChange={(v) => actualizarNuevoIngreso('detalle_auditivos', v)} error={errores.detalle_auditivos} fieldRefs={fieldRefs} />
            <CampoCondicional checkName="problemas_visuales" detailName="detalle_visuales" label="Problemas visuales irreversibles" checked={nuevoIngreso.problemas_visuales} value={nuevoIngreso.detalle_visuales} onCheck={(v) => actualizarNuevoIngreso('problemas_visuales', v)} onChange={(v) => actualizarNuevoIngreso('detalle_visuales', v)} error={errores.detalle_visuales} fieldRefs={fieldRefs} />
          </div>
          <div style={styles.actions}>
            <button style={styles.primaryButton} onClick={generarNuevoIngreso} disabled={guardando}>Generar consulta</button>
          </div>
        </section>
      ) : (
        <>
          <PacienteSelector
            pacientes={pacientesFiltrados}
            seleccionado={pacienteSeleccionado}
            setSeleccionado={setPacienteSeleccionado}
            filtros={filtroPaciente}
            setFiltros={setFiltroPaciente}
            tipos={catalogos.tipos}
          />
          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>Datos de consulta</h3>
            <div style={styles.selectedText}>Paciente: <strong>{pacienteSeleccionado?.paciente || 'Seleccione un paciente'}</strong></div>
            <div style={styles.selectedText}>Doctor: <strong>{doctorSeleccionado?.doctor || 'Seleccione un doctor'}</strong></div>
            <div style={styles.grid}>
              <Select label="Tipo de consulta" value={tipoConsulta} onChange={setTipoConsulta}>
                <option value="Primera vez">Primera vez</option>
                <option value="Subsecuente">Subsecuente</option>
                <option value="Examen Físico">Examen Físico</option>
                <option value="General">General</option>
              </Select>
              <h3 style={{ ...styles.subSectionTitle, gridColumn: '1 / -1', marginTop: 0 }}>Medidas antropométricas</h3>
              <InputConUnidad name="general_peso" label="Peso" value={examenBasico.peso} unidad={examenBasico.unidad_peso} unidades={['kg', 'lb']} onChange={(v) => actualizarExamenBasico('peso', v)} onUnidadChange={(v) => actualizarExamenBasico('unidad_peso', v)} inputMode="decimal" error={errores.general_peso} fieldRefs={fieldRefs} />
              <InputConUnidad name="general_talla" label="Talla" value={examenBasico.talla} unidad={examenBasico.unidad_talla} unidades={['m', 'cm']} onChange={(v) => actualizarExamenBasico('talla', v)} onUnidadChange={(v) => actualizarExamenBasico('unidad_talla', v)} inputMode="decimal" error={errores.general_talla} fieldRefs={fieldRefs} />
              <InputConSufijo name="general_presion_sistolica" label="Presión sistólica" value={examenBasico.presion_sistolica} onChange={(v) => actualizarExamenBasico('presion_sistolica', v)} sufijo="mmHg" error={errores.general_presion_sistolica} fieldRefs={fieldRefs} />
              <InputConSufijo name="general_presion_diastolica" label="Presión diastólica" value={examenBasico.presion_diastolica} onChange={(v) => actualizarExamenBasico('presion_diastolica', v)} sufijo="mmHg" error={errores.general_presion_diastolica} fieldRefs={fieldRefs} />
            </div>
            <div style={styles.actions}>
              <button style={styles.primaryButton} onClick={generarGeneral} disabled={guardando}>Generar consulta</button>
            </div>
          </section>
        </>
      )}
    </Layout>
  );
}

function DoctorSelector({ doctores, seleccionado, setSeleccionado, filtros, setFiltros }) {
  return (
    <section style={styles.card}>
      <h3 style={styles.sectionTitle}>Doctores activos</h3>
      <div style={styles.filters}>
        <Input label="Nombre doctor" value={filtros.nombre} onChange={(v) => setFiltros({ ...filtros, nombre: v })} />
        <Input label="Apellido doctor" value={filtros.apellido} onChange={(v) => setFiltros({ ...filtros, apellido: v })} />
        <Input label="Especialidad" value={filtros.especialidad} onChange={(v) => setFiltros({ ...filtros, especialidad: v })} />
      </div>
      <Table>
        <thead><tr><th style={styles.th}>Doctor</th><th style={styles.th}>Especialidad</th><th style={styles.th}>Realizadas hoy</th><th style={styles.th}>Pendientes hoy</th></tr></thead>
        <tbody>
          {doctores.map((doctor) => (
            <tr key={doctor.id_doctor} style={seleccionado?.id_doctor === doctor.id_doctor ? styles.selectedRow : styles.row} onClick={() => setSeleccionado(doctor)}>
              <td style={styles.td}>{doctor.doctor}</td>
              <td style={styles.td}>{doctor.especialidad}</td>
              <td style={styles.td}>{doctor.consultas_realizadas_hoy}</td>
              <td style={styles.td}>{doctor.consultas_pendientes_hoy}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}

function PacienteSelector({ pacientes, seleccionado, setSeleccionado, filtros, setFiltros, tipos }) {
  return (
    <section style={styles.card}>
      <h3 style={styles.sectionTitle}>Pacientes</h3>
      <div style={styles.filters}>
        <Input label="Expediente" value={filtros.expediente} onChange={(v) => setFiltros({ ...filtros, expediente: v })} />
        <Input label="Nombre" value={filtros.nombre} onChange={(v) => setFiltros({ ...filtros, nombre: v })} />
        <Input label="Apellido" value={filtros.apellido} onChange={(v) => setFiltros({ ...filtros, apellido: v })} />
        <Select label="Tipo paciente" value={filtros.tipo_paciente} onChange={(v) => setFiltros({ ...filtros, tipo_paciente: v })}>
          <option value="">Todos</option>
          {tipos.map((tipo) => <option key={tipo.id_tipo} value={tipo.id_tipo}>{tipo.nombre}</option>)}
        </Select>
      </div>
      <Table>
        <thead><tr><th style={styles.th}>Expediente</th><th style={styles.th}>Paciente</th><th style={styles.th}>Tipo de paciente</th></tr></thead>
        <tbody>
          {pacientes.map((paciente) => (
            <tr key={paciente.id_paciente} style={seleccionado?.id_paciente === paciente.id_paciente ? styles.selectedRow : styles.row} onClick={() => setSeleccionado(paciente)}>
              <td style={{ ...styles.td, ...styles.code }}>{paciente.expediente}</td>
              <td style={styles.td}>{paciente.paciente}</td>
              <td style={styles.td}>{paciente.tipo_paciente}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}

function Input({ name, label, value, onChange, type = 'text', placeholder = '', inputMode, error, fieldRefs }) {
  return (
    <label ref={(node) => { if (name && fieldRefs) fieldRefs.current[name] = node; }} style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input style={{ ...styles.input, ...(error ? validationStyles.inputError : {}) }} type={type} value={value} max={type === 'date' ? obtenerFechaHoyInput() : undefined} placeholder={placeholder} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
      <ValidationWarning message={error} />
    </label>
  );
}

function Select({ name, label, value, onChange, children, error, fieldRefs }) {
  return (
    <label ref={(node) => { if (name && fieldRefs) fieldRefs.current[name] = node; }} style={styles.field}>
      <span style={styles.label}>{label}</span>
      <select style={{ ...styles.input, ...(error ? validationStyles.inputError : {}) }} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
      <ValidationWarning message={error} />
    </label>
  );
}

function CampoLectura({ label, value }) {
  return (
    <div style={styles.field}>
      <span style={styles.label}>{label}</span>
      <div style={styles.readonlyBox}>{value || '-'}</div>
    </div>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label style={styles.check}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function CampoCondicional({ detailName, label, checked, value, onCheck, onChange, error, fieldRefs }) {
  return (
    <label ref={(node) => { if (detailName && fieldRefs) fieldRefs.current[detailName] = node; }} style={styles.field}>
      <span style={styles.label}>{label}</span>
      <Check label={checked ? 'Sí presenta' : 'No presenta'} checked={checked} onChange={onCheck} />
      <textarea
        style={{ ...styles.textarea, ...(error ? validationStyles.inputError : {}) }}
        value={value}
        placeholder={checked ? 'Detalle' : 'Sin detalle'}
        disabled={!checked}
        onChange={(event) => onChange(event.target.value)}
      />
      <ValidationWarning message={error} />
    </label>
  );
}

function InputConUnidad({ name, label, value, unidad, unidades, onChange, onUnidadChange, inputMode, error, fieldRefs }) {
  return (
    <label ref={(node) => { if (name && fieldRefs) fieldRefs.current[name] = node; }} style={styles.field}>
      <span style={styles.label}>{label}</span>
      <div style={styles.inputGroup}>
        <input style={{ ...styles.input, ...styles.inputGrouped, ...(error ? validationStyles.inputError : {}) }} value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
        <select style={styles.unitSelect} value={unidad} onChange={(e) => onUnidadChange(e.target.value)}>
          {unidades.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
        </select>
      </div>
      <ValidationWarning message={error} />
    </label>
  );
}

function InputConSufijo({ name, label, value, onChange, sufijo, inputMode, error, fieldRefs }) {
  return (
    <label ref={(node) => { if (name && fieldRefs) fieldRefs.current[name] = node; }} style={styles.field}>
      <span style={styles.label}>{label}</span>
      <div style={styles.inputGroup}>
        <input style={{ ...styles.input, ...styles.inputGrouped, ...(error ? validationStyles.inputError : {}) }} value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
        <span style={styles.unitFixed}>{sufijo}</span>
      </div>
      <ValidationWarning message={error} />
    </label>
  );
}

function Table({ children }) {
  return <div style={styles.tableWrap}><table style={styles.table}>{children}</table></div>;
}

function contiene(valor, filtro) {
  return String(valor || '').toLowerCase().includes(String(filtro || '').toLowerCase());
}

function validarMedidasCampos(medidas, prefijo) {
  const decimal = /^\d+(\.\d+)?$/;
  const entero = /^\d+$/;
  const errores = {};
  if (medidas.peso && !decimal.test(String(medidas.peso))) errores[`${prefijo}_peso`] = 'El peso debe contener solo numeros y decimales validos.';
  if (medidas.talla && !decimal.test(String(medidas.talla))) errores[`${prefijo}_talla`] = 'La talla debe contener solo numeros y decimales validos.';
  if (medidas.presion_sistolica && !entero.test(String(medidas.presion_sistolica))) errores[`${prefijo}_presion_sistolica`] = 'La presion sistolica debe contener solo numeros enteros.';
  if (medidas.presion_diastolica && !entero.test(String(medidas.presion_diastolica))) errores[`${prefijo}_presion_diastolica`] = 'La presion diastolica debe contener solo numeros enteros.';
  return errores;
}

function validarNuevoIngresoCampos(ingreso) {
  const entero = /^\d+$/;
  const errores = {};

  if (ingreso.dt) {
    if (!ingreso.dt_fecha_dosis) errores.dt_fecha_dosis = 'Debe ingresar la fecha de dosis DT.';
    else if (validarFechaNoFutura(ingreso.dt_fecha_dosis)) errores.dt_fecha_dosis = 'No se permiten fechas futuras.';
    if (!ingreso.dt_dosis) errores.dt_dosis = 'Debe ingresar el número de dosis DT.';
    else if (!entero.test(String(ingreso.dt_dosis))) errores.dt_dosis = 'El número de dosis DT debe ser entero.';
  }

  if (ingreso.hepatitis_b) {
    if (!ingreso.hepatitis_b_fecha_dosis) errores.hepatitis_b_fecha_dosis = 'Debe ingresar la fecha de dosis Hepatitis B.';
    else if (validarFechaNoFutura(ingreso.hepatitis_b_fecha_dosis)) errores.hepatitis_b_fecha_dosis = 'No se permiten fechas futuras.';
    if (!ingreso.hepatitis_b_dosis) errores.hepatitis_b_dosis = 'Debe ingresar el número de dosis Hepatitis B.';
    else if (!entero.test(String(ingreso.hepatitis_b_dosis))) errores.hepatitis_b_dosis = 'El número de dosis Hepatitis B debe ser entero.';
  }

  if (ingreso.enfermedades_cronicas && !String(ingreso.detalle_enfermedades || '').trim()) {
    errores.detalle_enfermedades = 'Debe ingresar el detalle de enfermedades crónicas.';
  }
  if (ingreso.problemas_auditivos && !String(ingreso.detalle_auditivos || '').trim()) {
    errores.detalle_auditivos = 'Debe ingresar el detalle de problemas auditivos.';
  }
  if (ingreso.problemas_visuales && !String(ingreso.detalle_visuales || '').trim()) {
    errores.detalle_visuales = 'Debe ingresar el detalle de problemas visuales.';
  }

  return errores;
}

function normalizarEnteroOpcional(valor) {
  const limpio = String(valor ?? '').trim();
  if (!limpio) return null;
  const numero = Number(limpio);
  return Number.isInteger(numero) ? numero : null;
}

function normalizarTextoOpcional(valor) {
  const limpio = String(valor ?? '').trim();
  return limpio || null;
}

function normalizarNuevoIngresoPayload(ingreso) {
  return {
    dt: Boolean(ingreso.dt),
    dt_fecha_dosis: ingreso.dt ? normalizarTextoOpcional(ingreso.dt_fecha_dosis) : null,
    dt_dosis: ingreso.dt ? normalizarEnteroOpcional(ingreso.dt_dosis) : null,
    hepatitis_b: Boolean(ingreso.hepatitis_b),
    hepatitis_b_fecha_dosis: ingreso.hepatitis_b ? normalizarTextoOpcional(ingreso.hepatitis_b_fecha_dosis) : null,
    hepatitis_b_dosis: ingreso.hepatitis_b ? normalizarEnteroOpcional(ingreso.hepatitis_b_dosis) : null,
    otras_vacunas: normalizarTextoOpcional(ingreso.otras_vacunas),
    enfermedades_cronicas: Boolean(ingreso.enfermedades_cronicas),
    detalle_enfermedades: ingreso.enfermedades_cronicas ? normalizarTextoOpcional(ingreso.detalle_enfermedades) : null,
    problemas_auditivos: Boolean(ingreso.problemas_auditivos),
    detalle_auditivos: ingreso.problemas_auditivos ? normalizarTextoOpcional(ingreso.detalle_auditivos) : null,
    problemas_visuales: Boolean(ingreso.problemas_visuales),
    detalle_visuales: ingreso.problemas_visuales ? normalizarTextoOpcional(ingreso.detalle_visuales) : null
  };
}

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '';
  const fecha = new Date(fechaNacimiento);
  if (Number.isNaN(fecha.getTime())) return '';
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const mes = hoy.getMonth() - fecha.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getDate())) edad -= 1;
  return edad >= 0 ? edad : '';
}

const styles = {
  header: { marginBottom: '20px' },
  title: { margin: 0, color: '#1f2933', fontSize: '26px', fontWeight: '700', borderLeft: '5px solid #880C09', paddingLeft: '14px' },
  subtitle: { margin: '8px 0 0 19px', color: '#5b6472', fontSize: '15px' },
  tabs: { display: 'flex', gap: '6px', borderBottom: '2px solid #dee2e6' },
  tab: { padding: '12px 20px', backgroundColor: '#fff', border: '1px solid #dee2e6', borderBottom: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: '700' },
  tabActive: { padding: '12px 20px', backgroundColor: '#880C09', color: '#fff', border: '1px solid #880C09', borderBottom: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: '800' },
  card: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginBottom: '18px', boxShadow: '0 6px 18px rgba(15,23,42,.05)' },
  sectionTitle: { margin: '0 0 14px', color: '#111827', fontSize: '18px', fontWeight: '800' },
  subSectionTitle: { margin: '18px 0 12px', color: '#880C09', fontSize: '16px', fontWeight: '800' },
  filters: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', color: '#344054', fontWeight: '700' },
  input: { height: '39px', border: '1px solid #d0d5dd', borderRadius: '6px', padding: '8px 10px', outlineColor: '#880C09' },
  readonlyBox: { minHeight: '39px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '9px 10px', backgroundColor: '#f8fafc', color: '#344054', fontWeight: '700' },
  textarea: { minHeight: '84px', border: '1px solid #d0d5dd', borderRadius: '6px', padding: '9px 10px', outlineColor: '#880C09', resize: 'vertical' },
  textGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', marginTop: '14px' },
  check: { display: 'flex', alignItems: 'center', gap: '8px', minHeight: '39px', color: '#344054', fontWeight: '700' },
  inputGroup: { display: 'grid', gridTemplateColumns: '1fr 82px', alignItems: 'stretch' },
  inputGrouped: { borderRadius: '6px 0 0 6px', minWidth: 0 },
  unitSelect: { height: '39px', border: '1px solid #d0d5dd', borderLeft: 'none', borderRadius: '0 6px 6px 0', padding: '8px', outlineColor: '#880C09', backgroundColor: '#fff', fontWeight: '700' },
  unitFixed: { height: '39px', border: '1px solid #d0d5dd', borderLeft: 'none', borderRadius: '0 6px 6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#344054', fontWeight: '700', fontSize: '13px' },
  tableWrap: { maxHeight: 'min(320px, 45vh)', overflowY: 'auto', overflowX: 'auto' },
  table: { width: '100%', minWidth: '720px', borderCollapse: 'collapse' },
  th: { position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#f8fafc', padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #d9e0e8', color: '#344054', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '12px 14px', borderBottom: '1px solid #edf2f7', fontSize: '14px' },
  row: { cursor: 'pointer' },
  selectedRow: { cursor: 'pointer', backgroundColor: '#fff1f1', outline: '2px solid #880C09' },
  code: { color: '#880C09', fontWeight: '800', fontFamily: 'Consolas, monospace' },
  selectedText: { color: '#475467', marginBottom: '12px' },
  actions: { display: 'flex', justifyContent: 'flex-end', marginTop: '16px' },
  primaryButton: { backgroundColor: '#880C09', color: '#fff', border: '1px solid #880C09', borderRadius: '6px', padding: '10px 18px', fontWeight: '800', cursor: 'pointer' },
  alert: { backgroundColor: '#fff1f1', color: '#880C09', border: '1px solid #f3c4c4', borderRadius: '8px', padding: '12px 14px', margin: '14px 0', fontWeight: '700' }
};

export default GenerarConsulta;
