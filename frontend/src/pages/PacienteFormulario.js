import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import FormActions from '../components/FormActions';
import useMensajeToast from '../hooks/useMensajeToast';
import ValidationWarning, { validationStyles } from '../components/ValidationWarning';
import { formatearDui, formatearTelefonoSv, obtenerFechaHoyInput, validarCorreo, validarDui, validarFechaNoFutura, validarTelefono } from '../utils/validaciones';
import DEPARTAMENTOS_EL_SALVADOR from '../data/territorioElSalvador';

const API_URL = 'http://localhost:3001/api';
const contieneLetras = (valor) => /\p{L}/u.test(String(valor || '').trim());

const formInicial = {
  nombre: '',
  apellidos: '',
  dui: '',
  sexo: '',
  correo_electronico: '',
  telefono: '',
  fecha_nacimiento: '',
  departamento_nacimiento: '',
  municipio_nacimiento: '',
  departamento: '',
  municipio_residencia: '',
  direccion: '',
  sector: '',
  id_tipo_paciente: '',
  id_facultad: '',
  id_carrera: '',
  id_area: '',
  id_proyecto: '',
  carnet: '',
  nombre_padre: '',
  nombre_madre: '',
  contacto_nombre: '',
  contacto_parentesco: '',
  contacto_telefono: '',
  tipo_generacion_expediente: 'automatico',
  expediente_manual: ''
};

function PacienteFormulario({ modo, idPaciente }) {
  const navigate = useNavigate();
  const fieldRefs = useRef({});
  const editando = modo === 'editar';
  const [form, setForm] = useState(formInicial);
  const [catalogos, setCatalogos] = useState({ tipos: [], facultades: [], carreras: [], areas: [], proyectos: [], departamentos: [] });
  const [mensaje, setMensaje] = useState('');
  useMensajeToast(mensaje);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const [tiposRes, facultadesRes, carrerasRes, areasRes, proyectosRes] = await Promise.all([
        axios.get(`${API_URL}/tipos-paciente`),
        axios.get(`${API_URL}/facultades`),
        axios.get(`${API_URL}/carreras`),
        axios.get(`${API_URL}/areas`),
        axios.get(`${API_URL}/proyectos`)
      ]);

      const departamentosRes = await axios.get(`${API_URL}/departamentos`).catch(() => ({
        data: DEPARTAMENTOS_EL_SALVADOR
      }));

      const nuevosCatalogos = {
        tipos: tiposRes.data || [],
        facultades: facultadesRes.data || [],
        carreras: carrerasRes.data || [],
        areas: areasRes.data || [],
        proyectos: proyectosRes.data || [],
        departamentos: Array.isArray(departamentosRes.data) && departamentosRes.data.length > 0
          ? departamentosRes.data
          : DEPARTAMENTOS_EL_SALVADOR
      };

      setCatalogos(nuevosCatalogos);

      if (editando && idPaciente) {
        const pacienteRes = await axios.get(`${API_URL}/pacientes/${idPaciente}`);
        const paciente = pacienteRes.data || {};
        const carrera = nuevosCatalogos.carreras.find((item) => String(item.id_carrera) === String(paciente.id_carrera || ''));
        const departamentoNacimientoCatalogo =
          encontrarDepartamento(nuevosCatalogos.departamentos, paciente.departamento_nacimiento) ||
          encontrarDepartamentoPorMunicipio(nuevosCatalogos.departamentos, paciente.municipio_nacimiento);
        const departamentoResidenciaCatalogo = encontrarDepartamento(nuevosCatalogos.departamentos, paciente.departamento);
        const municipioNacimiento = encontrarMunicipio(departamentoNacimientoCatalogo, paciente.municipio_nacimiento);
        const municipioResidencia = encontrarMunicipio(departamentoResidenciaCatalogo, paciente.municipio_residencia);

        setForm({
          nombre: paciente.nombre || '',
          apellidos: paciente.apellidos || '',
          dui: paciente.dui || '',
          sexo: paciente.sexo || '',
          correo_electronico: paciente.correo_electronico || '',
          telefono: paciente.telefono || '',
          fecha_nacimiento: fechaInput(paciente.fecha_nacimiento),
          departamento_nacimiento: departamentoNacimientoCatalogo?.nombre || paciente.departamento_nacimiento || '',
          municipio_nacimiento: municipioNacimiento || paciente.municipio_nacimiento || '',
          departamento: departamentoResidenciaCatalogo?.nombre || paciente.departamento || '',
          municipio_residencia: municipioResidencia || paciente.municipio_residencia || '',
          direccion: paciente.direccion || '',
          sector: paciente.sector || '',
          id_tipo_paciente: paciente.id_tipo_paciente ? String(paciente.id_tipo_paciente) : '',
          id_facultad: carrera?.id_facultad ? String(carrera.id_facultad) : '',
          id_carrera: paciente.id_carrera ? String(paciente.id_carrera) : '',
          id_area: paciente.id_area ? String(paciente.id_area) : '',
          id_proyecto: paciente.id_proyecto ? String(paciente.id_proyecto) : '',
          carnet: paciente.carnet || '',
          nombre_padre: paciente.nombre_padre || '',
          nombre_madre: paciente.nombre_madre || '',
          contacto_nombre: paciente.contacto_nombre || '',
          contacto_parentesco: paciente.contacto_parentesco || '',
          contacto_telefono: paciente.contacto_telefono || '',
          tipo_generacion_expediente: 'automatico',
          expediente_manual: ''
        });
      }
    } catch (error) {
      console.error('Error cargando formulario de paciente:', error);
      setMensaje('No se pudieron cargar los datos del formulario.');
    } finally {
      setCargando(false);
    }
  }, [editando, idPaciente]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const tipoSeleccionado = useMemo(() => {
    return catalogos.tipos.find((tipo) => String(tipo.id_tipo) === String(form.id_tipo_paciente));
  }, [catalogos.tipos, form.id_tipo_paciente]);

  const nombreTipo = normalizar(tipoSeleccionado?.nombre);
  const esEstudiante = nombreTipo === 'estudiante';
  const esDocente = nombreTipo === 'docente';
  const esAdministrativo = nombreTipo === 'administrativo';
  const esServicios = nombreTipo === 'servicios generales';
  const esExterno = nombreTipo === 'externo';

  const mostrarAcademico = esEstudiante;
  const mostrarArea = esDocente || esAdministrativo || esServicios;
  const mostrarProyecto = esEstudiante || esDocente || esAdministrativo || esExterno;

  const carrerasFiltradas = useMemo(() => {
    if (!form.id_facultad) return catalogos.carreras;
    return catalogos.carreras.filter((carrera) => String(carrera.id_facultad || '') === form.id_facultad);
  }, [catalogos.carreras, form.id_facultad]);

  const proyectosDisponibles = useMemo(() => {
    if (!form.id_tipo_paciente || esServicios) return [];

    return catalogos.proyectos.filter((proyecto) => {
      const nombreProyecto = normalizar(proyecto.nombre);
      const esProyectoSocial = nombreProyecto.includes('proyeccion social');
      const proyectoLamar = nombreProyecto.includes('lamar');

      if (esProyectoSocial) return esExterno;
      if (proyectoLamar) return esEstudiante || esDocente || esAdministrativo || esExterno;
      return esEstudiante || esDocente || esAdministrativo || esExterno;
    });
  }, [catalogos.proyectos, esAdministrativo, esDocente, esEstudiante, esExterno, esServicios, form.id_tipo_paciente]);

  const municipiosNacimiento = useMemo(() => {
    const departamento = catalogos.departamentos.find((item) => item.nombre === form.departamento_nacimiento);
    return departamento?.municipios || [];
  }, [catalogos.departamentos, form.departamento_nacimiento]);

  const municipiosResidencia = useMemo(() => {
    const departamento = catalogos.departamentos.find((item) => item.nombre === form.departamento);
    return departamento?.municipios || [];
  }, [catalogos.departamentos, form.departamento]);

  useEffect(() => {
    if (!form.id_proyecto) return;

    const proyectoValido = proyectosDisponibles.some((proyecto) => {
      return String(proyecto.id_proyecto) === String(form.id_proyecto);
    });

    if (!proyectoValido) {
      setForm((prev) => ({ ...prev, id_proyecto: '' }));
    }
  }, [form.id_proyecto, proyectosDisponibles]);

  const actualizar = (campo, valor) => {
    const valorFinal = campo === 'dui'
      ? formatearDui(valor)
      : ['telefono', 'contacto_telefono'].includes(campo)
        ? formatearTelefonoSv(valor)
        : valor;
    setErrores((prev) => ({ ...prev, [campo]: '' }));
    setForm((prev) => ({
      ...prev,
      [campo]: valorFinal,
      ...(campo === 'id_facultad' ? { id_carrera: '' } : {}),
      ...(campo === 'departamento_nacimiento' ? { municipio_nacimiento: '' } : {}),
      ...(campo === 'departamento' ? { municipio_residencia: '' } : {}),
      ...(campo === 'id_tipo_paciente'
        ? {
            id_facultad: '',
            id_carrera: '',
            id_area: '',
            id_proyecto: '',
            carnet: '',
            nombre_padre: '',
            nombre_madre: ''
          }
        : {})
    }));
  };

  const guardar = async (event) => {
    event.preventDefault();
    setMensaje('');
    setErrores({});

    try {
      const erroresValidacion = validarFormularioPaciente();

      if (Object.keys(erroresValidacion).length > 0) {
        mostrarErrores(erroresValidacion);
        return;
      }

      setGuardando(true);
      const payload = {
        ...form,
        id_carrera: mostrarAcademico ? form.id_carrera : '',
        id_area: mostrarArea ? form.id_area : '',
        id_proyecto: mostrarProyecto ? form.id_proyecto : '',
        carnet: esEstudiante ? form.carnet : '',
        nombre_padre: esEstudiante ? form.nombre_padre : '',
        nombre_madre: esEstudiante ? form.nombre_madre : '',
        nombre_empleado_referencia: null
      };

      if (editando) {
        await axios.put(`${API_URL}/pacientes/${idPaciente}`, payload);
      } else {
        await axios.post(`${API_URL}/pacientes`, payload);
      }

      navigate('/pacientes');
    } catch (error) {
      console.error('Error guardando paciente:', error);
      const erroresBackend = normalizarErroresBackend(error);
      if (Object.keys(erroresBackend).length > 0) {
        mostrarErrores(erroresBackend);
        return;
      }
      setMensaje(error.response?.data?.mensaje || 'No se pudo guardar el paciente.');
    } finally {
      setGuardando(false);
    }
  };

  const validarFormularioPaciente = () => {
    const nuevosErrores = {};

    if (!editando && form.tipo_generacion_expediente === 'manual' && !form.expediente_manual.trim()) {
      nuevosErrores.expediente_manual = 'Debe ingresar el numero de expediente.';
    }
    if (!form.nombre.trim()) nuevosErrores.nombre = 'Debe ingresar el nombre del paciente.';
    else if (!contieneLetras(form.nombre)) nuevosErrores.nombre = 'El nombre debe contener letras.';
    if (!form.apellidos.trim()) nuevosErrores.apellidos = 'Debe ingresar los apellidos.';
    else if (!contieneLetras(form.apellidos)) nuevosErrores.apellidos = 'Los apellidos deben contener letras.';
    if (form.direccion.trim() && !contieneLetras(form.direccion)) {
      nuevosErrores.direccion = 'La dirección debe contener letras.';
    }
    if (form.nombre_padre.trim() && !contieneLetras(form.nombre_padre)) {
      nuevosErrores.nombre_padre = 'El nombre del padre debe contener letras.';
    }
    if (form.nombre_madre.trim() && !contieneLetras(form.nombre_madre)) {
      nuevosErrores.nombre_madre = 'El nombre de la madre debe contener letras.';
    }
    if (form.contacto_nombre.trim() && !contieneLetras(form.contacto_nombre)) {
      nuevosErrores.contacto_nombre = 'El nombre del contacto de emergencia debe contener letras.';
    }
    if (form.contacto_parentesco.trim() && !contieneLetras(form.contacto_parentesco)) {
      nuevosErrores.contacto_parentesco = 'El parentesco debe contener letras.';
    }
    if (!form.dui.trim()) {
      nuevosErrores.dui = 'Debe ingresar el DUI.';
    } else if (validarDui(form.dui, true)) {
      nuevosErrores.dui = 'Debe ingresar un DUI valido.';
    }
    if (!form.sexo) nuevosErrores.sexo = 'Debe seleccionar el sexo.';
    if (!form.telefono.trim()) {
      nuevosErrores.telefono = 'Debe ingresar el telefono.';
    } else if (validarTelefono(form.telefono, 'telefonico', true)) {
      nuevosErrores.telefono = 'Debe ingresar un telefono valido.';
    }
    if (!form.fecha_nacimiento) nuevosErrores.fecha_nacimiento = 'Debe ingresar la fecha de nacimiento.';
    else if (validarFechaNoFutura(form.fecha_nacimiento)) nuevosErrores.fecha_nacimiento = 'No se permiten fechas futuras.';
    if (!form.id_tipo_paciente) nuevosErrores.id_tipo_paciente = 'Debe seleccionar el tipo de paciente.';
    if (form.correo_electronico && validarCorreo(form.correo_electronico)) {
      nuevosErrores.correo_electronico = 'Debe ingresar un correo electronico valido.';
    }
    if (form.contacto_telefono && validarTelefono(form.contacto_telefono, 'telefonico de emergencia')) {
      nuevosErrores.contacto_telefono = 'Debe ingresar un telefono de emergencia valido.';
    }
    if (esEstudiante) {
      if (!form.carnet.trim()) nuevosErrores.carnet = 'Debe ingresar el carnet.';
      if (!form.id_facultad) nuevosErrores.id_facultad = 'Debe seleccionar la facultad.';
      if (!form.id_carrera) nuevosErrores.id_carrera = 'Debe seleccionar la carrera.';
    }
    if (mostrarArea && !form.id_area) nuevosErrores.id_area = 'Debe seleccionar el area.';

    return nuevosErrores;
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

  const normalizarErroresBackend = (error) => {
    const data = error?.response?.data;
    if (data?.errors && typeof data.errors === 'object') return data.errors;
    const mensajeError = String(data?.mensaje || '');
    const normalizado = normalizar(mensajeError);
    const resultado = {};
    if (normalizado.includes('dui')) resultado.dui = mensajeError;
    if (normalizado.includes('correo')) resultado.correo_electronico = mensajeError;
    if (normalizado.includes('telefono')) resultado.telefono = mensajeError;
    if (normalizado.includes('expediente')) resultado.expediente_manual = mensajeError;
    if (normalizado.includes('carnet')) resultado.carnet = mensajeError;
    if (normalizado.includes('departamento de nacimiento')) resultado.departamento_nacimiento = mensajeError;
    if (normalizado.includes('departamento de residencia')) resultado.departamento = mensajeError;
    if (normalizado.includes('departamento') && !resultado.departamento_nacimiento && !resultado.departamento) resultado.departamento = mensajeError;
    if (normalizado.includes('municipio de nacimiento')) resultado.municipio_nacimiento = mensajeError;
    if (normalizado.includes('municipio de residencia')) resultado.municipio_residencia = mensajeError;
    return resultado;
  };
  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{editando ? 'Editar paciente' : 'Crear paciente'}</h2>
          <p style={styles.subtitle}>Datos administrativos y personales del paciente.</p>
        </div>
        {!cargando && (
          <FormActions
            primaryLabel={guardando ? 'Guardando...' : 'Guardar'}
            onPrimary={() => document.getElementById('paciente-form')?.requestSubmit()}
            onSecondary={() => navigate('/pacientes')}
            disabled={guardando}
          />
        )}
      </div>

      {cargando ? (
        <div style={styles.card}>Cargando formulario...</div>
      ) : (
        <form id="paciente-form" onSubmit={guardar}>
          {mensaje && <div style={styles.alert}>{mensaje}</div>}

          {!editando && (
            <section style={styles.card}>
              <h3 style={styles.sectionTitle}>Expediente</h3>
              <div style={styles.grid}>
                <Select label="Tipo de generación de expediente" value={form.tipo_generacion_expediente} onChange={(value) => actualizar('tipo_generacion_expediente', value)}>
                  <option value="automatico">Generar automáticamente</option>
                  <option value="manual">Ingresar manualmente</option>
                </Select>
                {form.tipo_generacion_expediente === 'manual' && (
                  <Input name="expediente_manual" label="Numero de expediente" value={form.expediente_manual} onChange={(value) => actualizar('expediente_manual', value)} placeholder="Expediente existente" required error={errores.expediente_manual} fieldRefs={fieldRefs} />
                )}
              </div>
            </section>
          )}

          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>Datos personales</h3>
            <div style={styles.grid}>
              <Input name="nombre" label="Nombres" value={form.nombre} onChange={(value) => actualizar('nombre', value)} required error={errores.nombre} fieldRefs={fieldRefs} />
              <Input name="apellidos" label="Apellidos" value={form.apellidos} onChange={(value) => actualizar('apellidos', value)} required error={errores.apellidos} fieldRefs={fieldRefs} />
              <Input name="dui" label="DUI" value={form.dui} onChange={(value) => actualizar('dui', value)} placeholder="00000000-0" inputMode="numeric" required error={errores.dui} fieldRefs={fieldRefs} />
              <Select name="sexo" label="Sexo" value={form.sexo} onChange={(value) => actualizar('sexo', value)} required error={errores.sexo} fieldRefs={fieldRefs}>
                <option value="">Seleccione</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </Select>
              <Input name="correo_electronico" label="Correo" type="email" value={form.correo_electronico} onChange={(value) => actualizar('correo_electronico', value)} placeholder="correo@dominio.com" error={errores.correo_electronico} fieldRefs={fieldRefs} />
              <Input name="telefono" label="Telefono" value={form.telefono} onChange={(value) => actualizar('telefono', value)} placeholder="7777-7777" inputMode="numeric" required error={errores.telefono} fieldRefs={fieldRefs} />
              <Input name="fecha_nacimiento" label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento} onChange={(value) => actualizar('fecha_nacimiento', value)} required error={errores.fecha_nacimiento} fieldRefs={fieldRefs} />
              <div style={styles.subSectionTitle}>Lugar de nacimiento</div>
              <Select name="departamento_nacimiento" label="Departamento de nacimiento" value={form.departamento_nacimiento} onChange={(value) => actualizar('departamento_nacimiento', value)} error={errores.departamento_nacimiento} fieldRefs={fieldRefs}>
                <option value="">Seleccione</option>
                {catalogos.departamentos.map((departamento) => (
                  <option key={`nac-dep-${departamento.id_departamento}`} value={departamento.nombre}>{departamento.nombre}</option>
                ))}
              </Select>
              <Select name="municipio_nacimiento" label="Municipio de nacimiento" value={form.municipio_nacimiento} onChange={(value) => actualizar('municipio_nacimiento', value)} disabled={!form.departamento_nacimiento} error={errores.municipio_nacimiento} fieldRefs={fieldRefs}>
                <option value="">Seleccione</option>
                {municipiosNacimiento.map((municipio) => (
                  <option key={`nac-${municipio.id_municipio}`} value={municipio.nombre}>{municipio.nombre}</option>
                ))}
              </Select>
              <div style={styles.subSectionTitle}>Lugar de residencia</div>
              <Select name="departamento" label="Departamento de residencia" value={form.departamento} onChange={(value) => actualizar('departamento', value)} error={errores.departamento} fieldRefs={fieldRefs}>
                <option value="">Seleccione</option>
                {catalogos.departamentos.map((departamento) => (
                  <option key={`res-dep-${departamento.id_departamento}`} value={departamento.nombre}>{departamento.nombre}</option>
                ))}
              </Select>
              <Select name="municipio_residencia" label="Municipio de residencia" value={form.municipio_residencia} onChange={(value) => actualizar('municipio_residencia', value)} disabled={!form.departamento} error={errores.municipio_residencia} fieldRefs={fieldRefs}>
                <option value="">Seleccione</option>
                {municipiosResidencia.map((municipio) => (
                  <option key={`res-${municipio.id_municipio}`} value={municipio.nombre}>{municipio.nombre}</option>
                ))}
              </Select>
              <Input name="direccion" label="Dirección" value={form.direccion} onChange={(value) => actualizar('direccion', value)} error={errores.direccion} fieldRefs={fieldRefs} />
              <Select label="Zona de vivienda" value={form.sector} onChange={(value) => actualizar('sector', value)}>
                <option value="">Seleccione</option>
                <option value="Urbano">Urbano</option>
                <option value="Rural">Rural</option>
              </Select>
            </div>
          </section>

          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>Clasificación</h3>
            <div style={styles.grid}>
              <Select name="id_tipo_paciente" label="Tipo de paciente" value={form.id_tipo_paciente} onChange={(value) => actualizar('id_tipo_paciente', value)} required error={errores.id_tipo_paciente} fieldRefs={fieldRefs}>
                <option value="">Seleccione</option>
                {catalogos.tipos.map((tipo) => (
                  <option key={tipo.id_tipo} value={tipo.id_tipo}>{tipo.nombre}</option>
                ))}
              </Select>

              {mostrarAcademico && (
                <>
                  <Input name="carnet" label="Carnet" value={form.carnet} onChange={(value) => actualizar('carnet', value)} required error={errores.carnet} fieldRefs={fieldRefs} />
                  <Select name="id_facultad" label="Facultad" value={form.id_facultad} onChange={(value) => actualizar('id_facultad', value)} required error={errores.id_facultad} fieldRefs={fieldRefs}>
                    <option value="">Seleccione</option>
                    {catalogos.facultades.map((facultad) => (
                      <option key={facultad.id_facultad} value={facultad.id_facultad}>{facultad.nombre}</option>
                    ))}
                  </Select>
                  <Select name="id_carrera" label="Carrera" value={form.id_carrera} onChange={(value) => actualizar('id_carrera', value)} required error={errores.id_carrera} fieldRefs={fieldRefs}>
                    <option value="">Seleccione</option>
                    {carrerasFiltradas.map((carrera) => (
                      <option key={carrera.id_carrera} value={carrera.id_carrera}>{carrera.nombre}</option>
                    ))}
                  </Select>
                  <Input name="nombre_padre" label="Nombre del padre" value={form.nombre_padre} onChange={(value) => actualizar('nombre_padre', value)} error={errores.nombre_padre} fieldRefs={fieldRefs} />
                  <Input name="nombre_madre" label="Nombre de la madre" value={form.nombre_madre} onChange={(value) => actualizar('nombre_madre', value)} error={errores.nombre_madre} fieldRefs={fieldRefs} />
                </>
              )}

              {mostrarArea && (
                <Select name="id_area" label="Area" value={form.id_area} onChange={(value) => actualizar('id_area', value)} required error={errores.id_area} fieldRefs={fieldRefs}>
                  <option value="">Seleccione</option>
                  {catalogos.areas.map((area) => (
                    <option key={area.id_area} value={area.id_area}>{area.nombre}</option>
                  ))}
                </Select>
              )}

              {mostrarProyecto && proyectosDisponibles.length > 0 && (
                <Select label="Proyecto / proyección social" value={form.id_proyecto} onChange={(value) => actualizar('id_proyecto', value)}>
                  <option value="">Sin proyecto</option>
                  {proyectosDisponibles.map((proyecto) => (
                    <option key={proyecto.id_proyecto} value={proyecto.id_proyecto}>{proyecto.nombre}</option>
                  ))}
                </Select>
              )}
            </div>
          </section>

          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>Contacto de emergencia</h3>
            <div style={styles.grid}>
              <Input name="contacto_nombre" label="Contacto de emergencia" value={form.contacto_nombre} onChange={(value) => actualizar('contacto_nombre', value)} error={errores.contacto_nombre} fieldRefs={fieldRefs} />
              <Input name="contacto_parentesco" label="Parentesco" value={form.contacto_parentesco} onChange={(value) => actualizar('contacto_parentesco', value)} error={errores.contacto_parentesco} fieldRefs={fieldRefs} />
              <Input name="contacto_telefono" label="Telefono de emergencia" value={form.contacto_telefono} onChange={(value) => actualizar('contacto_telefono', value)} placeholder="7777-7777" inputMode="numeric" error={errores.contacto_telefono} fieldRefs={fieldRefs} />
            </div>
          </section>

        </form>
      )}
    </Layout>
  );
}

function Input({ name, label, value, onChange, type = 'text', required = false, placeholder = '', inputMode, error, fieldRefs }) {
  return (
    <label ref={(node) => { if (name && fieldRefs) fieldRefs.current[name] = node; }} style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        style={{ ...styles.input, ...(error ? validationStyles.inputError : {}) }}
        type={type}
        value={value}
        max={type === 'date' ? obtenerFechaHoyInput() : undefined}
        aria-required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
      <ValidationWarning message={error} />
    </label>
  );
}

function Select({ name, label, value, onChange, children, required = false, error, fieldRefs, disabled = false }) {
  return (
    <label ref={(node) => { if (name && fieldRefs) fieldRefs.current[name] = node; }} style={styles.field}>
      <span style={styles.label}>{label}</span>
      <select
        style={{ ...styles.input, ...(disabled ? styles.inputDisabled : {}), ...(error ? validationStyles.inputError : {}) }}
        value={value}
        aria-required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
      <ValidationWarning message={error} />
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

function encontrarDepartamento(departamentos, valor) {
  if (!valor) return null;
  return departamentos.find((departamento) => normalizar(departamento.nombre) === normalizar(valor)) || null;
}

function encontrarMunicipio(departamento, valor) {
  if (!departamento || !valor) return '';
  const municipio = (departamento.municipios || []).find((item) => normalizar(item.nombre) === normalizar(valor));
  return municipio?.nombre || '';
}

function encontrarDepartamentoPorMunicipio(departamentos, municipioValor) {
  if (!municipioValor) return null;
  return departamentos.find((departamento) => {
    return (departamento.municipios || []).some((municipio) => normalizar(municipio.nombre) === normalizar(municipioValor));
  }) || null;
}

function fechaInput(fecha) {
  if (!fecha) return '';
  return String(fecha).split('T')[0];
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' },
  title: { margin: 0, color: '#1f2933', fontSize: '26px', fontWeight: '700', borderLeft: '5px solid #880C09', paddingLeft: '14px' },
  subtitle: { margin: '8px 0 0 19px', color: '#5b6472', fontSize: '15px' },
  card: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.05)', marginBottom: '18px' },
  sectionTitle: { margin: '0 0 16px 0', color: '#111827', fontSize: '18px', fontWeight: '800' },
  subSectionTitle: { gridColumn: '1 / -1', color: '#880C09', fontSize: '16px', fontWeight: '800', marginTop: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '7px' },
  label: { color: '#344054', fontSize: '13px', fontWeight: '700' },
  input: { height: '40px', border: '1px solid #d0d5dd', borderRadius: '6px', padding: '8px 11px', fontSize: '14px', color: '#111827', backgroundColor: '#fff', outlineColor: '#880C09' },
  inputDisabled: { backgroundColor: '#f3f4f6', color: '#667085', cursor: 'not-allowed' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '20px' },
  primaryButton: { backgroundColor: '#880C09', color: '#fff', border: '1px solid #880C09', borderRadius: '6px', padding: '10px 18px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  secondaryButton: { backgroundColor: '#fff', color: '#880C09', border: '1px solid #880C09', borderRadius: '6px', padding: '10px 16px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  alert: { backgroundColor: '#fff1f1', color: '#880C09', border: '1px solid #f2c7c7', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontWeight: '700' }
};

export default PacienteFormulario;
