import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { normalizarOperacionesSeleccionadas } from '../utils/permisos';
import FormActions from '../components/FormActions';
import { formatearDui, formatearTelefonoSv, obtenerFechaHoyInput, primerError, validarCorreo, validarDui, validarJv, validarTelefono } from '../utils/validaciones';

const OPERACIONES_DOCTOR = [9, 11, 13];
const OPERACIONES_ENFERMERA = [4, 7, 11, 13, 16];

const normalizarOperaciones = (lista) => {
  return [...lista].filter(op => ![8, 15].includes(Number(op.id_operacion))).sort((a, b) => a.id_operacion - b.id_operacion);
};

const obtenerMensajeError = (error, fallback = 'Error al actualizar usuario') => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.mensaje) return data.mensaje;
  if (error?.response?.status === 400) return 'No se pudo actualizar el usuario. Revise los datos ingresados.';
  if (error?.response?.status >= 500) return 'Ocurrió un error en el servidor. Intente nuevamente.';
  return fallback;
};

function EditarUsuario() {
  const { id } = useParams();

  const [especialidades, setEspecialidades] = useState([]);
  const [operaciones, setOperaciones] = useState([]);
  const [firma, setFirma] = useState(null);
  const [previewFirma, setPreviewFirma] = useState(null);
  const [selloDoctor, setSelloDoctor] = useState(null);
  const [previewSelloDoctor, setPreviewSelloDoctor] = useState(null);
  const [rolAsignadoInicial, setRolAsignadoInicial] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    sexo: '',
    correo: '',
    fecha_nacimiento: '',
    estado: 1,
    dui: '',
    telefono: '',
    roles: [],
    jvpm: '',
    jvpe: '',
    id_especialidad: '',
    operaciones: []
  });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resUsuario, resEspecialidades, resOperaciones] = await Promise.all([
          axios.get(`http://localhost:3001/api/usuarios/${id}`),
          axios.get('http://localhost:3001/api/especialidades'),
          axios.get('http://localhost:3001/api/operaciones')
        ]);

        const u = resUsuario.data;
        const roles = Array.isArray(u.roles)
          ? u.roles
          : Array.isArray(u.id_roles)
            ? u.id_roles
            : u.id_rol
              ? [u.id_rol]
              : [];

        setForm({
          nombre: u.nombre || '',
          apellidos: u.apellidos || '',
          sexo: u.sexo === 'Femenino' ? 'F' : u.sexo === 'Masculino' ? 'M' : u.sexo || '',
          correo: u.correo_electronico || '',
          fecha_nacimiento: u.fecha_nacimiento ? u.fecha_nacimiento.substring(0, 10) : '',
          estado: Number(u.estado),
          dui: u.dui || '',
          telefono: u.telefono || '',
          roles,
          jvpm: u.jvpm || '',
          jvpe: u.jvpe || '',
          id_especialidad: u.id_especialidad || '',
          operaciones: normalizarOperacionesSeleccionadas(u.operaciones_admin || u.operaciones || [])
        });

        setRolAsignadoInicial(roles.length > 0);

        setEspecialidades(resEspecialidades.data);
        setOperaciones(normalizarOperaciones(resOperaciones.data));
      } catch (error) {
        console.error(error);
        alert('Error al cargar usuario');
      }
    };

    cargarDatos();
  }, [id]);

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
  };

  const puedeAsignarRol = !rolAsignadoInicial;
  const esAdmin = form.roles.includes(1);
  const esDoctor = form.roles.includes(2);
  const esEnfermera = form.roles.includes(3);

  const handleRol = (rol) => {
    if (!puedeAsignarRol) return;

    if (rol === 1) {
      setForm({
        ...form,
        roles: form.roles.includes(1)
          ? form.roles.filter(idRol => idRol !== 1)
          : [...form.roles, 1]
      });
      return;
    }

    if (rol === 2) {
      setForm({
        ...form,
        roles: form.roles.includes(2)
          ? form.roles.filter(idRol => idRol !== 2)
          : [...form.roles.filter(idRol => idRol !== 3), 2],
        jvpe: ''
      });
      return;
    }

    setForm({
      ...form,
      roles: form.roles.includes(3)
        ? form.roles.filter(idRol => idRol !== 3)
        : [...form.roles.filter(idRol => idRol !== 2), 3],
      jvpm: '',
      id_especialidad: ''
    });
  };

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

  const handleFirmaChange = (e) => {
    const archivo = e.target.files[0];
    setFirma(archivo || null);

    if (previewFirma) {
      URL.revokeObjectURL(previewFirma);
    }

    setPreviewFirma(archivo ? URL.createObjectURL(archivo) : null);
  };

  const handleSelloDoctorChange = (e) => {
    const archivo = e.target.files[0];
    setSelloDoctor(archivo || null);

    if (previewSelloDoctor) {
      URL.revokeObjectURL(previewSelloDoctor);
    }

    setPreviewSelloDoctor(archivo ? URL.createObjectURL(archivo) : null);
  };

  useEffect(() => {
    return () => {
      if (previewFirma) {
        URL.revokeObjectURL(previewFirma);
      }
      if (previewSelloDoctor) {
        URL.revokeObjectURL(previewSelloDoctor);
      }
    };
  }, [previewFirma, previewSelloDoctor]);

  const operacionesObligatorias = () => {
    const obligatorias = [];
    if (esDoctor) obligatorias.push(...OPERACIONES_DOCTOR);
    if (esEnfermera) obligatorias.push(...OPERACIONES_ENFERMERA);
    return [...new Set(obligatorias)];
  };

  const operacionesVisibles = () => {
    const obligatorias = operacionesObligatorias();
    if (esAdmin) return operaciones;
    return operaciones.filter(op => obligatorias.includes(op.id_operacion));
  };

  const operacionSeleccionada = (idOperacion) => {
    return form.operaciones.includes(idOperacion) || operacionesObligatorias().includes(idOperacion);
  };

  const guardarCambios = async () => {
    try {
      const errorValidacion = primerError(
        !form.nombre.trim() && 'El nombre es obligatorio.',
        !form.apellidos.trim() && 'Los apellidos son obligatorios.',
        validarCorreo(form.correo),
        validarTelefono(form.telefono, 'telefónico'),
        validarDui(form.dui),
        form.roles.includes(2) && validarJv(form.jvpm, 'JVPM', true),
        form.roles.includes(3) && validarJv(form.jvpe, 'JVPE', true)
      );

      if (errorValidacion) {
        alert(errorValidacion);
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
        jvpm: form.roles.includes(2) ? form.jvpm : '',
        jvpe: form.roles.includes(3) ? form.jvpe : '',
        id_especialidad: form.roles.includes(2) ? form.id_especialidad : '',
        operaciones: normalizarOperacionesSeleccionadas([...new Set([
          ...(form.roles.includes(1) ? form.operaciones : []),
          ...operacionesObligatorias()
        ])])
      };

      if (puedeAsignarRol && form.roles.length > 0) {
        payload.roles = form.roles;
      }

      if (firma) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          formData.append(key, Array.isArray(value) ? JSON.stringify(value) : value);
        });
        formData.append('firma', firma);

        await axios.put(`http://localhost:3001/api/usuarios/${id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await axios.put(`http://localhost:3001/api/usuarios/${id}`, payload);
      }

      if (selloDoctor) {
        const formDataSello = new FormData();
        formDataSello.append('sello', selloDoctor);

        await axios.post(`http://localhost:3001/api/usuarios/sello-doctor/${id}`, formDataSello, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      const usuarioActual = JSON.parse(localStorage.getItem('usuario') || 'null');

      if (Number(usuarioActual?.id_usuario) === Number(id)) {
        localStorage.removeItem('usuario');
        localStorage.removeItem('token');
        alert('Usuario actualizado correctamente. Vuelve a iniciar sesión para cargar los permisos actualizados.');
        window.location.href = '/login';
        return;
      }

      alert('Usuario actualizado correctamente');
      window.location.href = '/usuarios';
    } catch (error) {
      console.error(error);
      alert(obtenerMensajeError(error));
    }
  };

  const textoRoles = form.roles.length > 0
    ? form.roles.map(nombreRol).join(' + ')
    : 'Sin rol';

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.title}>Editar usuario</h2>
            <p style={styles.subtitle}>Actualización de datos personales y datos asociados al rol</p>
          </div>

          <FormActions primaryLabel="Guardar cambios" onPrimary={guardarCambios} />
        </div>

        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Datos personales</h3>
          <div style={styles.grid}>
            <Field label="Nombres">
              <input name="nombre" value={form.nombre} onChange={handleChange} style={styles.input} />
            </Field>
            <Field label="Apellidos">
              <input name="apellidos" value={form.apellidos} onChange={handleChange} style={styles.input} />
            </Field>
            <Field label="Sexo">
              <select name="sexo" value={form.sexo} onChange={handleChange} style={styles.input}>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
              </select>
            </Field>
            <Field label="Correo">
              <input name="correo" value={form.correo} onChange={handleChange} style={styles.input} placeholder="correo@dominio.com" />
            </Field>
            <Field label="Teléfono">
              <input name="telefono" value={form.telefono} onChange={handleChange} style={styles.input} placeholder="7777-7777" inputMode="numeric" />
            </Field>
            <Field label="DUI">
              <input name="dui" value={form.dui} onChange={handleChange} style={styles.input} placeholder="00000000-0" inputMode="numeric" />
            </Field>
            <Field label="Fecha nacimiento">
              <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} max={obtenerFechaHoyInput()} onChange={handleChange} style={styles.input} />
            </Field>
            <Field label="Estado">
              <select name="estado" value={form.estado} onChange={handleChange} style={styles.input}>
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
                {Number(form.estado) === 2 && <option value={2}>Pendiente de activación</option>}
              </select>
              <span style={styles.stateHint}>
                {Number(form.estado) === 0
                  ? 'Al cambiarlo a Activo se enviará un correo para crear la contraseña y quedará pendiente de activación.'
                  : Number(form.estado) === 2
                    ? 'El usuario debe crear su contraseña desde el enlace enviado antes de poder iniciar sesión.'
                    : 'El usuario ya está activo.'}
              </span>
            </Field>
          </div>
        </section>

        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Rol</h3>
          {puedeAsignarRol ? (
            <>
              <p style={styles.textMuted}>Este usuario no tiene rol. Puedes asignarlo una sola vez.</p>
              <div style={styles.roles}>
                <label style={styles.checkboxCard}>
                  <input type="checkbox" checked={form.roles.includes(1)} onChange={() => handleRol(1)} />
                  Administrador
                </label>
                <label style={styles.checkboxCard}>
                  <input type="checkbox" checked={form.roles.includes(2)} onChange={() => handleRol(2)} />
                  Doctor
                </label>
                <label style={styles.checkboxCard}>
                  <input type="checkbox" checked={form.roles.includes(3)} onChange={() => handleRol(3)} />
                  Enfermera
                </label>
              </div>
            </>
          ) : (
            <div style={styles.lockedRole}>{textoRoles}</div>
          )}
        </section>

        {(esDoctor || esEnfermera) && (
          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>Datos médicos</h3>
            <div style={styles.grid}>
              {esDoctor && (
                <>
                  <Field label="JVPM">
                    <input name="jvpm" value={form.jvpm} onChange={handleChange} style={styles.input} inputMode="numeric" />
                  </Field>
                  <Field label="Especialidad">
                    <select name="id_especialidad" value={form.id_especialidad} onChange={handleChange} style={styles.input}>
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

              {esEnfermera && (
                <Field label="JVPE">
                  <input name="jvpe" value={form.jvpe} onChange={handleChange} style={styles.input} inputMode="numeric" />
                </Field>
              )}
            </div>
          </section>
        )}

        {(esAdmin || esDoctor || esEnfermera) && (
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

        {esDoctor && (
          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>Firma y sello del doctor</h3>
            <div style={styles.grid}>
              <Field label="Firma del doctor">
                <input type="file" accept="image/*" onChange={handleFirmaChange} />
              </Field>
              <Field label="Sello del doctor">
                <input type="file" accept="image/*" onChange={handleSelloDoctorChange} />
              </Field>
            </div>

            <div style={styles.firmaPreviewGrid}>
              <div>
                <p style={styles.previewTitulo}>Firma actual</p>
                <img
                  src={`http://localhost:3001/api/usuarios/firma/${id}`}
                  alt="Firma actual"
                  style={styles.imgFirma}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>

              {previewFirma && (
                <div>
                  <p style={styles.previewTitulo}>Nueva firma</p>
                  <img src={previewFirma} alt="Nueva firma seleccionada" style={styles.imgFirma} />
                </div>
              )}
              <div>
                <p style={styles.previewTitulo}>Sello actual del doctor</p>
                <img
                  src={`http://localhost:3001/api/usuarios/sello-doctor/${id}`}
                  alt="Sello actual del doctor"
                  style={styles.imgFirma}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>

              {previewSelloDoctor && (
                <div>
                  <p style={styles.previewTitulo}>Nuevo sello</p>
                  <img src={previewSelloDoctor} alt="Nuevo sello seleccionado" style={styles.imgFirma} />
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

function nombreRol(idRol) {
  if (idRol === 1) return 'Administrador';
  if (idRol === 2) return 'Doctor';
  if (idRol === 3) return 'Enfermera';
  return 'Sin rol';
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
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
  lockedRole: {
    display: 'inline-block',
    padding: '10px 12px',
    borderRadius: '6px',
    backgroundColor: '#f1f3f4',
    color: '#333',
    fontWeight: '700'
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
    fontSize: '14px',
    marginTop: 0
  },
  stateHint: {
    color: '#666',
    fontSize: '12px',
    lineHeight: '1.4'
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
  firmaPreviewGrid: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginTop: '16px'
  },
  previewTitulo: {
    margin: '0 0 8px 0',
    fontWeight: '700'
  },
  imgFirma: {
    maxWidth: '220px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '10px'
  }
};

export default EditarUsuario;
