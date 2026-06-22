import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { normalizarOperacionesSeleccionadas } from '../utils/permisos';
import FormActions from '../components/FormActions';
import ValidationWarning, { validationStyles } from '../components/ValidationWarning';
import { formatearDui, formatearTelefonoSv, obtenerFechaHoyInput, validarCorreo, validarDui, validarFechaNoFutura, validarJv, validarTelefono } from '../utils/validaciones';
import { useToast } from '../components/ToastProvider';

const OPERACIONES_DOCTOR = [9, 11, 13];
const OPERACIONES_ENFERMERA = [4, 7, 11, 13, 16];

const normalizarOperaciones = (lista) => {
  return [...lista].filter(op => ![8, 15].includes(Number(op.id_operacion))).sort((a, b) => a.id_operacion - b.id_operacion);
};

const obtenerMensajeError = (error, fallback = 'Error al crear usuario') => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.mensaje) return data.mensaje;
  if (error?.response?.status === 400) return 'No se pudo crear el usuario. Revise los datos ingresados.';
  if (error?.response?.status >= 500) return 'Ocurrió un error en el servidor. Intente nuevamente.';
  return fallback;
};

function CrearUsuario() {
  const { mostrarToast } = useToast();
  const fieldRefs = useRef({});
  const [especialidades, setEspecialidades] = useState([]);
  const [operaciones, setOperaciones] = useState([]);
  const [firma, setFirma] = useState(null);
  const [selloDoctor, setSelloDoctor] = useState(null);
  const [previewFirma, setPreviewFirma] = useState(null);
  const [previewSelloDoctor, setPreviewSelloDoctor] = useState(null);
  const [errores, setErrores] = useState({});

  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    sexo: 'F',
    correo: '',
    fecha_nacimiento: '',
    estado: 1,
    dui: '',
    telefono: '',
    administrador: false,
    doctor: false,
    enfermera: false,
    jvpm: '',
    jvpe: '',
    id_especialidad: '',
    operaciones: []
  });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resEspecialidades, resOperaciones] = await Promise.all([
          axios.get('http://localhost:3001/api/especialidades'),
          axios.get('http://localhost:3001/api/operaciones')
        ]);

        setEspecialidades(resEspecialidades.data);
        setOperaciones(normalizarOperaciones(resOperaciones.data));
      } catch (error) {
        console.error(error);
      }
    };

    cargarDatos();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const valor = name === 'dui'
      ? formatearDui(value)
      : name === 'telefono'
        ? formatearTelefonoSv(value)
        : value;

    setForm({
      ...form,
      [name]: valor
    });
    limpiarError(name);
  };

  const limpiarError = (campo) => {
    setErrores((prev) => {
      if (!prev[campo]) return prev;
      const siguientes = { ...prev };
      delete siguientes[campo];
      return siguientes;
    });
  };

  const handleRol = (rol) => {
    limpiarError('roles');
    if (rol === 'administrador') {
      setForm({
        ...form,
        administrador: !form.administrador
      });
      return;
    }

    if (rol === 'doctor') {
      setForm({
        ...form,
        doctor: !form.doctor,
        enfermera: false,
        jvpe: ''
      });
      return;
    }

    setForm({
      ...form,
      enfermera: !form.enfermera,
      doctor: false,
      jvpm: '',
      id_especialidad: ''
    });
  };

  const handleFirmaChange = (e) => {
    const archivo = e.target.files[0];
    setFirma(archivo || null);
    limpiarError('firma');
    if (previewFirma) URL.revokeObjectURL(previewFirma);
    setPreviewFirma(archivo ? URL.createObjectURL(archivo) : null);
  };

  const handleSelloDoctorChange = (e) => {
    const archivo = e.target.files[0];
    setSelloDoctor(archivo || null);
    limpiarError('sello');
    if (previewSelloDoctor) URL.revokeObjectURL(previewSelloDoctor);
    setPreviewSelloDoctor(archivo ? URL.createObjectURL(archivo) : null);
  };

  useEffect(() => {
    return () => {
      if (previewFirma) URL.revokeObjectURL(previewFirma);
      if (previewSelloDoctor) URL.revokeObjectURL(previewSelloDoctor);
    };
  }, [previewFirma, previewSelloDoctor]);

  const handleOperacion = (idOperacion) => {
    if (operacionesObligatorias().includes(idOperacion)) return;

    const nuevas = form.operaciones.includes(idOperacion)
      ? form.operaciones.filter(op => op !== idOperacion)
      : [...form.operaciones, idOperacion];

    setForm({
      ...form,
      operaciones: normalizarOperacionesSeleccionadas(nuevas)
    });
  };

  const obtenerRolesSeleccionados = () => {
    const roles = [];
    if (form.administrador) roles.push(1);
    if (form.doctor) roles.push(2);
    if (form.enfermera) roles.push(3);
    return roles;
  };

  const operacionesObligatorias = () => {
    const obligatorias = [];
    if (form.doctor) obligatorias.push(...OPERACIONES_DOCTOR);
    if (form.enfermera) obligatorias.push(...OPERACIONES_ENFERMERA);
    return [...new Set(obligatorias)];
  };

  const operacionesVisibles = () => {
    const obligatorias = operacionesObligatorias();
    if (form.administrador) return operaciones;
    return operaciones.filter(op => obligatorias.includes(op.id_operacion));
  };

  const operacionSeleccionada = (idOperacion) => {
    return form.operaciones.includes(idOperacion) || operacionesObligatorias().includes(idOperacion);
  };

  const crearUsuario = async () => {
    try {
      setErrores({});
      const roles = obtenerRolesSeleccionados();
      const erroresValidacion = validarFormulario();

      if (Object.keys(erroresValidacion).length > 0) {
        mostrarErrores(erroresValidacion);
        return;
      }

      const payload = {
        nombre: form.nombre,
        apellidos: form.apellidos,
        sexo: form.sexo,
        correo: form.correo,
        fecha_nacimiento: form.fecha_nacimiento,
        estado: form.estado,
        dui: form.dui,
        telefono: form.telefono,
        roles,
        jvpm: form.doctor ? form.jvpm : '',
        jvpe: form.enfermera ? form.jvpe : '',
        id_especialidad: form.doctor ? form.id_especialidad : '',
        operaciones: normalizarOperacionesSeleccionadas([...new Set([
          ...(form.administrador ? form.operaciones : []),
          ...operacionesObligatorias()
        ])])
      };

      const formData = new FormData();
      Object.entries(payload).forEach(([campo, valor]) => {
        formData.append(campo, Array.isArray(valor) ? JSON.stringify(valor) : String(valor ?? ''));
      });
      if (firma && form.doctor) formData.append('firma', firma);
      if (selloDoctor && form.doctor) formData.append('sello', selloDoctor);

      const res = await axios.post('http://localhost:3001/api/usuarios', formData);
      mostrarToast(
        Number(res.data.estado) === 2
          ? `Usuario ${res.data.usuario || ''} creado pendiente de activación. Se envió el enlace para crear su contraseña.`
          : `Usuario ${res.data.usuario || ''} creado inactivo. No se envió correo de activación.`,
        'success'
      );
      window.setTimeout(() => {
        window.location.href = '/usuarios';
      }, 900);
    } catch (error) {
      console.error(error);
      const erroresBackend = normalizarErroresBackend(error);
      if (Object.keys(erroresBackend).length > 0) {
        mostrarErrores(erroresBackend);
        mostrarToast('Revise los campos marcados.', 'warning');
        return;
      }
      mostrarToast(obtenerMensajeError(error), 'error');
    }
  };

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!form.nombre.trim()) nuevosErrores.nombre = 'Debe ingresar el nombre.';
    if (!form.apellidos.trim()) nuevosErrores.apellidos = 'Debe ingresar los apellidos.';
    if (!form.sexo) nuevosErrores.sexo = 'Debe seleccionar el sexo.';

    if (!form.correo.trim()) {
      nuevosErrores.correo = 'Debe ingresar el correo electronico.';
    } else if (validarCorreo(form.correo)) {
      nuevosErrores.correo = 'Debe ingresar un correo electronico valido.';
    }

    if (!form.telefono.trim()) {
      nuevosErrores.telefono = 'Debe ingresar el telefono.';
    } else if (validarTelefono(form.telefono, 'telefonico', true)) {
      nuevosErrores.telefono = 'Debe ingresar un telefono valido.';
    }

    if (!form.dui.trim()) {
      nuevosErrores.dui = 'Debe ingresar el DUI.';
    } else if (validarDui(form.dui)) {
      nuevosErrores.dui = 'Debe ingresar un DUI valido.';
    }

    if (!form.fecha_nacimiento) nuevosErrores.fecha_nacimiento = 'Debe ingresar la fecha de nacimiento.';
    else if (validarFechaNoFutura(form.fecha_nacimiento)) nuevosErrores.fecha_nacimiento = 'No se permiten fechas futuras.';

    if (form.doctor) {
      if (validarJv(form.jvpm, 'JVPM', true)) nuevosErrores.jvpm = 'Debe ingresar JVPM si el usuario es doctor.';
      if (!form.id_especialidad) nuevosErrores.id_especialidad = 'Debe seleccionar la especialidad del doctor.';
      if (!firma) nuevosErrores.firma = 'Debe subir firma si el usuario es doctor.';
      if (!selloDoctor) nuevosErrores.sello = 'Debe subir sello si el usuario es doctor.';
    }

    if (form.enfermera && validarJv(form.jvpe, 'JVPE', true)) {
      nuevosErrores.jvpe = 'Debe ingresar JVPE si el usuario es enfermera.';
    }

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
    if (!data?.errors) return {};
    const mapa = { correo_electronico: 'correo' };

    return Object.entries(data.errors).reduce((acc, [campo, mensaje]) => {
      acc[mapa[campo] || campo] = mensaje;
      return acc;
    }, {});
  };

  const estiloInput = (campo) => ({
    ...styles.input,
    ...(errores[campo] ? styles.inputError : {})
  });

  const propsCampo = (campo) => ({
    name: campo,
    error: errores[campo],
    refs: fieldRefs
  });

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.title}>Crear usuario</h2>
            <p style={styles.subtitle}>Registro de datos personales, rol y datos medicos</p>
          </div>

          <FormActions primaryLabel="Guardar usuario" onPrimary={crearUsuario} />
        </div>

        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Datos personales</h3>
          <div style={styles.grid}>
            <Field label="Usuario" {...propsCampo('usuario')}>
              <span style={errores.usuario ? styles.generatedError : styles.textMuted}>Generado automaticamente</span>
            </Field>

            <Field label="Nombres" {...propsCampo('nombre')}>
              <input name="nombre" value={form.nombre} onChange={handleChange} style={estiloInput('nombre')} />
            </Field>

            <Field label="Apellidos" {...propsCampo('apellidos')}>
              <input name="apellidos" value={form.apellidos} onChange={handleChange} style={estiloInput('apellidos')} />
            </Field>

            <Field label="Sexo" {...propsCampo('sexo')}>
              <select name="sexo" value={form.sexo} onChange={handleChange} style={estiloInput('sexo')}>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
              </select>
            </Field>

            <Field label="Correo" {...propsCampo('correo')}>
              <input name="correo" value={form.correo} onChange={handleChange} style={estiloInput('correo')} placeholder="correo@dominio.com" />
            </Field>

            <Field label="Telefono" {...propsCampo('telefono')}>
              <input name="telefono" value={form.telefono} onChange={handleChange} style={estiloInput('telefono')} placeholder="7777-7777" inputMode="numeric" />
            </Field>

            <Field label="DUI" {...propsCampo('dui')}>
              <input name="dui" value={form.dui} onChange={handleChange} style={estiloInput('dui')} placeholder="00000000-0" inputMode="numeric" />
            </Field>

            <Field label="Fecha nacimiento" {...propsCampo('fecha_nacimiento')}>
              <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} max={obtenerFechaHoyInput()} onChange={handleChange} style={estiloInput('fecha_nacimiento')} />
            </Field>

            <Field label="Estado" {...propsCampo('estado')}>
              <select name="estado" value={form.estado} onChange={handleChange} style={estiloInput('estado')}>
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </select>
              <span style={styles.stateHint}>
                {Number(form.estado) === 1
                  ? 'El usuario recibirá un correo para crear su contraseña y quedará pendiente de activación hasta completar el proceso.'
                  : 'El usuario será creado inactivo y no recibirá correo hasta que sea activado por un administrador.'}
              </span>
            </Field>
          </div>
        </section>

        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Rol</h3>
          <div style={styles.roles}>
            <label style={styles.checkboxCard}>
              <input type="checkbox" checked={form.administrador} onChange={() => handleRol('administrador')} />
              Administrador
            </label>
            <label style={styles.checkboxCard}>
              <input type="checkbox" checked={form.doctor} onChange={() => handleRol('doctor')} />
              Doctor
            </label>
            <label style={styles.checkboxCard}>
              <input type="checkbox" checked={form.enfermera} onChange={() => handleRol('enfermera')} />
              Enfermera
            </label>
            {!form.administrador && !form.doctor && !form.enfermera && (
              <span style={styles.textMuted}>El usuario se creará sin rol.</span>
            )}
          </div>
        </section>

        {(form.doctor || form.enfermera) && (
          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>Datos médicos</h3>
            <div style={styles.grid}>
              {form.doctor && (
                <>
                  <Field label="JVPM" {...propsCampo('jvpm')}>
                    <input name="jvpm" value={form.jvpm} onChange={handleChange} style={estiloInput('jvpm')} inputMode="numeric" />
                  </Field>
                  <Field label="Especialidad" {...propsCampo('id_especialidad')}>
                    <select name="id_especialidad" value={form.id_especialidad} onChange={handleChange} style={estiloInput('id_especialidad')}>
                      <option value="">Seleccione especialidad</option>
                      {especialidades.map((esp) => (
                        <option key={esp.id_especialidad} value={esp.id_especialidad}>
                          {esp.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}

              {form.enfermera && (
                <Field label="JVPE" {...propsCampo('jvpe')}>
                  <input name="jvpe" value={form.jvpe} onChange={handleChange} style={estiloInput('jvpe')} inputMode="numeric" />
                </Field>
              )}
            </div>
          </section>
        )}

        {(form.administrador || form.doctor || form.enfermera) && (
          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>Operaciones</h3>
            <p style={styles.textMuted}>
              Las operaciones obligatorias del rol médico quedan marcadas y bloqueadas. El examen físico se realiza desde la consulta médica.
            </p>
            <div style={styles.opsGrid}>
              {operacionesVisibles().map((op) => {
                const bloqueada = operacionesObligatorias().includes(op.id_operacion);

                return (
                <label key={op.id_operacion} style={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={operacionSeleccionada(op.id_operacion)}
                    disabled={bloqueada}
                    onChange={() => handleOperacion(op.id_operacion)}
                  />
                  {nombreOperacion(op)}
                  {bloqueada && <span style={styles.lockedHint}>Obligatoria</span>}
                </label>
                );
              })}
            </div>
          </section>
        )}

        {form.doctor && (
          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>Firma y sello del doctor</h3>
            <div style={styles.grid}>
              <Field label="Firma del doctor" {...propsCampo('firma')}>
                <input type="file" accept="image/*" onChange={handleFirmaChange} />
              </Field>
              <Field label="Sello del doctor" {...propsCampo('sello')}>
                <input type="file" accept="image/*" onChange={handleSelloDoctorChange} />
              </Field>
            </div>
            {(previewFirma || previewSelloDoctor) && (
              <div style={styles.previewGrid}>
                {previewFirma && (
                  <div>
                    <p style={styles.previewTitulo}>Vista previa de firma</p>
                    <img src={previewFirma} alt="Vista previa firma" style={styles.imgPreview} />
                  </div>
                )}
                {previewSelloDoctor && (
                  <div>
                    <p style={styles.previewTitulo}>Vista previa de sello</p>
                    <img src={previewSelloDoctor} alt="Vista previa sello" style={styles.imgPreview} />
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </Layout>
  );
}

function Field({ label, children, name, error, refs }) {
  return (
    <label ref={(node) => { if (name && refs) refs.current[name] = node; }} style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
      <ValidationWarning message={error} />
    </label>
  );
}

function nombreOperacion(op) {
  if (op.id_operacion === 7) return 'Generar consulta';
  if (op.id_operacion === 9) return 'Realizar consulta';
  if (op.id_operacion === 14) return 'Editar sello clínico';
  if (op.id_operacion === 16) return 'Ver pacientes';
  if (op.id_operacion === 17) return 'Editar pacientes';
  return op.nombre;
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
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e2e5e8',
    borderRadius: '8px',
    padding: '18px',
    marginBottom: '16px',
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
  inputError: {
    ...validationStyles.inputError
  },
  roles: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  checkboxCard: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    padding: '10px 12px',
    border: '1px solid #dde2e6',
    borderRadius: '6px',
    backgroundColor: '#fafafa',
    fontWeight: '600'
  },
  opsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px'
  },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 10px',
    border: '1px solid #edf0f2',
    borderRadius: '6px'
  },
  lockedHint: {
    marginLeft: 'auto',
    color: '#880C09',
    fontSize: '12px',
    fontWeight: '700'
  },
  textMuted: {
    color: '#666',
    fontSize: '14px'
  },
  stateHint: {
    color: '#666',
    fontSize: '12px',
    lineHeight: '1.4'
  },
  generatedError: {
    color: '#78350f',
    backgroundColor: '#fffbeb',
    border: '1px solid #fbbf24',
    borderRadius: '6px',
    padding: '9px 11px',
    fontSize: '14px',
    fontWeight: '700'
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
  previewGrid: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    marginTop: '16px'
  },
  previewTitulo: {
    margin: '0 0 8px',
    fontWeight: '700'
  },
  imgPreview: {
    maxWidth: '220px',
    maxHeight: '150px',
    objectFit: 'contain',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '10px'
  }
};

export default CrearUsuario;
