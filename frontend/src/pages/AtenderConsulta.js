import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import useMensajeToast from '../hooks/useMensajeToast';
import { obtenerFechaHoyInput, validarFechaNoFutura } from '../utils/validaciones';

const API = 'http://localhost:3001/api';
const RUTAS_IMPRESION = {
  Receta: 'receta',
  Incapacidad: 'incapacidad',
  Constancia: 'constancia',
  Referencia: 'referencia'
};

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

const recetaInicial = {
  id_receta: null,
  indicaciones: ''
};

const medicamentoRecetaInicial = {
  categoria: '',
  busqueda: '',
  id_medicamento: '',
  cantidad_por_toma: '',
  frecuencia: 'cada',
  intervalo: '',
  unidad_intervalo: 'horas',
  duracion: '',
  unidad_duracion: 'dias',
  cantidad_indicada: '',
  cantidad_entregada: ''
};

const unidadesIntervalo = ['horas', 'dias', 'semanas'];
const unidadesDuracion = ['dias', 'semanas', 'meses'];

function AtenderConsulta() {
  const { id_consulta } = useParams();
  const navigate = useNavigate();
  const [consulta, setConsulta] = useState(null);
  const [medicamentos, setMedicamentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [mensaje, setMensaje] = useState('');
  useMensajeToast(mensaje);
  const [form, setForm] = useState({ diagnostico: '', tratamiento: '' });
  const [nuevoIngreso, setNuevoIngreso] = useState(ingresoInicial);
  const [receta, setReceta] = useState(recetaInicial);
  const [medicamentoReceta, setMedicamentoReceta] = useState(medicamentoRecetaInicial);
  const [incapacidad, setIncapacidad] = useState({ dias_incapacidad: '' });
  const [referencia, setReferencia] = useState({ lugar_referencia: '', especialidad: '' });
  const [documentos, setDocumentos] = useState({ Receta: null, Incapacidad: null, Constancia: null, Referencia: null });
  const [medicamentosReceta, setMedicamentosReceta] = useState([]);
  const [consultaGuardada, setConsultaGuardada] = useState(true);
  const [nuevoIngresoExiste, setNuevoIngresoExiste] = useState(false);
  const [nuevoIngresoGuardado, setNuevoIngresoGuardado] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const [consultaRes, medicamentosRes, categoriasRes] = await Promise.all([
        axios.get(`${API}/realizar-consultas/${id_consulta}`),
        axios.get(`${API}/medicamentos`),
        axios.get(`${API}/categorias`)
      ]);
      const c = consultaRes.data;
      setConsulta(c);
      setForm({
        diagnostico: c.diagnostico || '',
        tratamiento: c.tratamiento || ''
      });
      const ingreso = c.nuevo_ingreso;
      setNuevoIngreso(ingreso ? {
        dt: esVerdaderoBD(ingreso.dt),
        dt_fecha_dosis: fechaParaInput(ingreso.dt_fecha_dosis),
        dt_dosis: c.nuevo_ingreso.dt_dosis || '',
        hepatitis_b: esVerdaderoBD(ingreso.hepatitis_b),
        hepatitis_b_fecha_dosis: fechaParaInput(ingreso.hepatitis_b_fecha_dosis),
        hepatitis_b_dosis: c.nuevo_ingreso.hepatitis_b_dosis || '',
        otras_vacunas: c.nuevo_ingreso.otras_vacunas || '',
        enfermedades_cronicas: esVerdaderoBD(ingreso.enfermedades_cronicas),
        detalle_enfermedades: c.nuevo_ingreso.detalle_enfermedades || '',
        problemas_auditivos: esVerdaderoBD(ingreso.problemas_auditivos),
        detalle_auditivos: c.nuevo_ingreso.detalle_auditivos || '',
        problemas_visuales: esVerdaderoBD(ingreso.problemas_visuales),
        detalle_visuales: c.nuevo_ingreso.detalle_visuales || ''
      } : ingresoInicial);
      const tieneNuevoIngreso = Boolean(ingreso?.tiene_datos_enfermeria);
      setNuevoIngresoExiste(tieneNuevoIngreso);
      setNuevoIngresoGuardado(tieneNuevoIngreso);
      setReceta((prev) => ({
        ...prev,
        id_receta: c.receta?.id_receta || null,
        indicaciones: c.receta?.indicaciones || ''
      }));
      setIncapacidad({ dias_incapacidad: c.incapacidad?.dias_incapacidad || '' });
      setReferencia({
        lugar_referencia: c.referencia?.lugar_referencia || '',
        especialidad: c.referencia?.especialidad || ''
      });
      setDocumentos({
        Receta: c.receta?.id_receta || null,
        Incapacidad: c.incapacidad?.id_incapacidad || null,
        Constancia: c.constancia?.id_constancia || null,
        Referencia: c.referencia?.id_referencia || null
      });
      setMedicamentosReceta((c.medicamentos_receta || []).map(mapMedicamentoReceta));
      setConsultaGuardada(true);
      setMedicamentos(medicamentosRes.data || []);
      setCategorias(categoriasRes.data || []);
    } catch (error) {
      console.error('Error cargando atención:', error);
      setMensaje('No se pudo cargar la consulta.');
    }
  }, [id_consulta]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const esNuevoIngreso = useMemo(() => {
    return String(consulta?.tipo_consulta || '').toLowerCase().includes('nuevo ingreso');
  }, [consulta]);

  const medicamentosFiltrados = useMemo(() => {
    const texto = normalizarTexto(medicamentoReceta.busqueda);
    return medicamentos
      .filter((m) => !medicamentoReceta.categoria || String(m.id_categoria || '') === medicamentoReceta.categoria)
      .filter((m) => !texto || normalizarTexto(`${m.nombre || ''} ${m.presentacion || m.nombre_presentacion || ''}`).includes(texto))
      .slice(0, 8);
  }, [medicamentos, medicamentoReceta.busqueda, medicamentoReceta.categoria]);

  const medicamentoSeleccionado = medicamentos.find((m) => String(m.id_medicamento) === String(medicamentoReceta.id_medicamento));
  const medidas = consulta?.medidas_antropometricas || {};

  const actualizarForm = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setConsultaGuardada(false);
  };

  const guardarConsulta = async () => {
    try {
      await axios.put(`${API}/realizar-consultas/${id_consulta}/guardar`, {
        ...form
      });
      setConsultaGuardada(true);
      setMensaje('Consulta guardada correctamente.');
    } catch (error) {
      setMensaje(error.response?.data?.mensaje || 'No se pudo guardar la consulta.');
    }
  };

  const actualizarNuevoIngreso = (campo, valor) => {
    setNuevoIngreso((prev) => ({ ...prev, [campo]: valor }));
    setNuevoIngresoGuardado(false);
  };

  const validarNuevoIngresoCampos = () => {
    const errores = [];
    if (nuevoIngreso.dt) {
      if (!nuevoIngreso.dt_fecha_dosis) errores.push('Debe ingresar la fecha de dosis DT.');
      else if (validarFechaNoFutura(nuevoIngreso.dt_fecha_dosis)) errores.push('No se permiten fechas futuras.');
      if (!nuevoIngreso.dt_dosis) errores.push('Debe ingresar el numero de dosis DT.');
    }
    if (nuevoIngreso.hepatitis_b) {
      if (!nuevoIngreso.hepatitis_b_fecha_dosis) errores.push('Debe ingresar la fecha de dosis Hepatitis B.');
      else if (validarFechaNoFutura(nuevoIngreso.hepatitis_b_fecha_dosis)) errores.push('No se permiten fechas futuras.');
      if (!nuevoIngreso.hepatitis_b_dosis) errores.push('Debe ingresar el numero de dosis Hepatitis B.');
    }
    if (nuevoIngreso.enfermedades_cronicas && !String(nuevoIngreso.detalle_enfermedades || '').trim()) {
      errores.push('Debe ingresar el detalle de enfermedades cronicas.');
    }
    if (nuevoIngreso.problemas_auditivos && !String(nuevoIngreso.detalle_auditivos || '').trim()) {
      errores.push('Debe ingresar el detalle de problemas auditivos.');
    }
    if (nuevoIngreso.problemas_visuales && !String(nuevoIngreso.detalle_visuales || '').trim()) {
      errores.push('Debe ingresar el detalle de problemas visuales.');
    }
    return errores;
  };

  const normalizarNuevoIngresoPayload = () => ({
    dt: Boolean(nuevoIngreso.dt),
    dt_fecha_dosis: nuevoIngreso.dt ? nuevoIngreso.dt_fecha_dosis || null : null,
    dt_dosis: nuevoIngreso.dt ? nuevoIngreso.dt_dosis || null : null,
    hepatitis_b: Boolean(nuevoIngreso.hepatitis_b),
    hepatitis_b_fecha_dosis: nuevoIngreso.hepatitis_b ? nuevoIngreso.hepatitis_b_fecha_dosis || null : null,
    hepatitis_b_dosis: nuevoIngreso.hepatitis_b ? nuevoIngreso.hepatitis_b_dosis || null : null,
    otras_vacunas: String(nuevoIngreso.otras_vacunas || '').trim() || null,
    enfermedades_cronicas: Boolean(nuevoIngreso.enfermedades_cronicas),
    detalle_enfermedades: nuevoIngreso.enfermedades_cronicas ? String(nuevoIngreso.detalle_enfermedades || '').trim() || null : null,
    problemas_auditivos: Boolean(nuevoIngreso.problemas_auditivos),
    detalle_auditivos: nuevoIngreso.problemas_auditivos ? String(nuevoIngreso.detalle_auditivos || '').trim() || null : null,
    problemas_visuales: Boolean(nuevoIngreso.problemas_visuales),
    detalle_visuales: nuevoIngreso.problemas_visuales ? String(nuevoIngreso.detalle_visuales || '').trim() || null : null
  });

  const guardarDatosNuevoIngreso = async () => {
    const errores = validarNuevoIngresoCampos();
    if (errores.length > 0) {
      setMensaje(errores.join(' '));
      return;
    }

    try {
      await axios.put(`${API}/realizar-consultas/${id_consulta}/nuevo-ingreso`, {
        nuevo_ingreso: normalizarNuevoIngresoPayload()
      });
      setNuevoIngresoExiste(true);
      setNuevoIngresoGuardado(true);
      setMensaje('Datos de nuevo ingreso guardados correctamente.');
      await cargarDatos();
    } catch (error) {
      setMensaje(error.response?.data?.mensaje || 'No se pudieron guardar los datos de nuevo ingreso.');
    }
  };

  const validarConsultaGuardada = () => {
    if (consultaGuardada) return true;
    setMensaje('Primero debe guardar la consulta para generar documentos clinicos.');
    return false;
  };

  const agregarMedicamentoTemporal = () => {
    const textoBusqueda = normalizarTexto(medicamentoReceta.busqueda);
    const medicamentoPorTexto = medicamentosFiltrados.find((m) => {
      const nombre = normalizarTexto(m.nombre);
      const nombrePresentacion = normalizarTexto(`${m.nombre || ''} ${m.presentacion || m.nombre_presentacion || ''}`);
      return nombre === textoBusqueda || nombrePresentacion === textoBusqueda;
    });
    const medicamentoActivo = medicamentoSeleccionado || medicamentoPorTexto || (medicamentosFiltrados.length === 1 ? medicamentosFiltrados[0] : null);

    if (!medicamentoActivo) {
      setMensaje('Seleccione un medicamento valido.');
      return;
    }

    if (medicamentosReceta.some((m) => String(m.id_medicamento) === String(medicamentoActivo.id_medicamento))) {
      setMensaje('Este medicamento ya fue agregado a la receta.');
      return;
    }

    const camposObligatorios = [
      ['cantidad_por_toma', 'Ingrese la cantidad por toma.'],
      ['intervalo', 'Ingrese el intervalo.'],
      ['duracion', 'Ingrese la duracion.'],
      ['cantidad_indicada', 'Ingrese la cantidad indicada.'],
      ['cantidad_entregada', 'Ingrese la cantidad entregada.']
    ];

    for (const [campo, texto] of camposObligatorios) {
      if (medicamentoReceta[campo] === '' || medicamentoReceta[campo] === null || medicamentoReceta[campo] === undefined) {
        setMensaje(texto);
        return;
      }
    }

    const cantidadEntregada = Number(medicamentoReceta.cantidad_entregada);
    const stockDisponible = Number(medicamentoActivo.stock || 0);

    if (!Number.isInteger(cantidadEntregada) || cantidadEntregada < 0) {
      setMensaje('La cantidad entregada debe ser un numero entero igual o mayor que cero.');
      return;
    }

    if (cantidadEntregada > stockDisponible) {
      setMensaje('No hay suficiente stock para entregar esa cantidad.');
      return;
    }

    const nuevoMedicamento = {
      ...medicamentoReceta,
      id_medicamento: medicamentoActivo.id_medicamento,
      nombre: medicamentoActivo.nombre,
      presentacion: medicamentoActivo.presentacion || medicamentoActivo.nombre_presentacion || '',
      categoria_nombre: medicamentoActivo.categoria || '',
      descripcion: medicamentoActivo.descripcion || '',
      stock: stockDisponible
    };
    nuevoMedicamento.indicacion_generada = construirIndicacionReceta(nuevoMedicamento);
    nuevoMedicamento.frecuencia_texto = nuevoMedicamento.indicacion_generada;

    setMedicamentosReceta((prev) => [...prev, nuevoMedicamento]);
    setMedicamentoReceta((prev) => ({ ...medicamentoRecetaInicial, categoria: prev.categoria }));
    setMensaje('Medicamento agregado a la receta.');
  };

  const eliminarMedicamentoTemporal = (idMedicamento) => {
    setMedicamentosReceta((prev) => prev.filter((m) => String(m.id_medicamento) !== String(idMedicamento)));
  };

  const limpiarMedicamentoActual = () => {
    setMedicamentoReceta((prev) => ({ ...medicamentoRecetaInicial, categoria: prev.categoria }));
    setMensaje('Formulario de medicamento limpiado.');
  };

  const guardarReceta = async () => {
    setMensaje('');
    if (!validarConsultaGuardada()) return;
    if (medicamentosReceta.length === 0) {
      setMensaje('Debe agregar al menos un medicamento antes de guardar la receta.');
      return;
    }

    try {
      const res = await axios.post(`${API}/recetas/guardar-completa`, {
        id_consulta,
        indicaciones: receta.indicaciones,
        medicamentos: medicamentosReceta
      });

      setReceta((prev) => ({ ...prev, id_receta: res.data.id_receta }));
      setDocumentos((prev) => ({ ...prev, Receta: res.data.id_receta }));
      setMensaje('Receta guardada correctamente.');
      await cargarDatos();
    } catch (error) {
      setMensaje(error.response?.data?.mensaje || 'No se pudo guardar la receta.');
    }
  };

  const guardarIncapacidad = async () => {
    if (!validarConsultaGuardada()) return;
    try {
      const res = await axios.post(`${API}/incapacidades`, {
        id_consulta,
        diagnostico: form.diagnostico,
        dias_incapacidad: incapacidad.dias_incapacidad
      });
      setDocumentos((prev) => ({ ...prev, Incapacidad: res.data.id_incapacidad }));
      await cargarDatos();
      setMensaje('Incapacidad generada correctamente.');
    } catch (error) {
      setMensaje(error.response?.data?.mensaje || 'No se pudo generar la incapacidad.');
    }
  };

  const guardarConstancia = async () => {
    if (!validarConsultaGuardada()) return;
    try {
      const res = await axios.post(`${API}/constancias`, {
        id_consulta
      });
      setDocumentos((prev) => ({ ...prev, Constancia: res.data.id_constancia }));
      await cargarDatos();
      setMensaje('Constancia generada correctamente.');
    } catch (error) {
      setMensaje(error.response?.data?.mensaje || 'No se pudo generar la constancia.');
    }
  };

  const guardarReferencia = async () => {
    if (!validarConsultaGuardada()) return;
    try {
      const res = await axios.post(`${API}/referencias`, {
        id_consulta,
        lugar_referencia: referencia.lugar_referencia,
        especialidad: referencia.especialidad
      });
      setDocumentos((prev) => ({ ...prev, Referencia: res.data.id_referencia }));
      await cargarDatos();
      setMensaje('Referencia generada correctamente.');
    } catch (error) {
      setMensaje(error.response?.data?.mensaje || 'No se pudo generar la referencia.');
    }
  };

  const finalizar = async () => {
    try {
      await axios.put(`${API}/realizar-consultas/${id_consulta}/finalizar`, {
        ...form
      });
      setMensaje('Consulta finalizada correctamente.');
      navigate('/realizar-consultas');
    } catch (error) {
      setMensaje(error.response?.data?.mensaje || 'No se pudo finalizar la consulta.');
    }
  };

  const mandarAImpresion = async (tipoDocumento) => {
    const idDocumento = documentos[tipoDocumento] || (tipoDocumento === 'Receta' ? receta.id_receta : null);
    if (!idDocumento) {
      setMensaje(`Primero debe guardar ${tipoDocumento.toLowerCase()}.`);
      return;
    }

    try {
      await axios.post(`${API}/impresiones`, {
        id_documento: idDocumento,
        tipo_documento: tipoDocumento,
        id_paciente: consulta.id_paciente,
        id_doctor: consulta.id_doctor
      });
      setMensaje(`${tipoDocumento} enviado a impresion.`);
    } catch (error) {
      setMensaje(error.response?.data?.mensaje || 'No se pudo enviar a impresion.');
    }
  };

  const imprimirDocumento = (tipoDocumento) => {
    const idDocumento = documentos[tipoDocumento] || (tipoDocumento === 'Receta' ? receta.id_receta : null);
    if (!idDocumento) {
      setMensaje(`Primero debe guardar ${tipoDocumento.toLowerCase()}.`);
      return;
    }

    const ruta = RUTAS_IMPRESION[tipoDocumento];
    if (!ruta) {
      setMensaje('Tipo de documento no valido para impresion.');
      return;
    }

    window.open(`/imprimir/${ruta}/${idDocumento}`, '_blank', 'noopener,noreferrer');
  };

  if (!consulta) {
    return (
      <Layout>
        <div style={styles.card}>Cargando consulta...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Atención de consulta</h2>
          <p style={styles.subtitle}>{consulta.paciente} · {consulta.expediente}</p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.secondaryButton} onClick={() => navigate(`/realizar-consultas/${id_consulta}/expediente/${consulta.id_paciente}`, { state: { returnTo: `/realizar-consultas/${id_consulta}` } })}>Ver expediente</button>
        </div>
      </div>

      {mensaje && <div style={styles.alert}>{mensaje}</div>}

      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>Consulta</h3>
        <div style={styles.infoLine}>
          <span>Paciente: <strong>{consulta.paciente}</strong></span>
          <span>Expediente: <strong>{consulta.expediente}</strong></span>
          <span>Tipo: <strong>{consulta.tipo_consulta}</strong></span>
        </div>
      </section>

      {esNuevoIngreso && (
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Nuevo ingreso</h3>
          <p style={nuevoIngresoExiste ? styles.savedText : styles.pendingText}>
            {nuevoIngresoExiste
              ? 'Datos de nuevo ingreso registrados por enfermeria.'
              : 'No existen datos de nuevo ingreso registrados. Puede completarlos si es necesario.'}
          </p>
          <div style={styles.readGrid}>
            <Check label="DT" checked={nuevoIngreso.dt} onChange={(v) => actualizarNuevoIngreso('dt', v)} />
            <Input label="Fecha de dosis DT" type="date" disabled={!nuevoIngreso.dt} value={nuevoIngreso.dt_fecha_dosis} onChange={(v) => actualizarNuevoIngreso('dt_fecha_dosis', v)} />
            <Input label="Numero de dosis DT" disabled={!nuevoIngreso.dt} value={nuevoIngreso.dt_dosis} onChange={(v) => actualizarNuevoIngreso('dt_dosis', soloNumeros(v))} />
            <Check label="Hepatitis B" checked={nuevoIngreso.hepatitis_b} onChange={(v) => actualizarNuevoIngreso('hepatitis_b', v)} />
            <Input label="Fecha de dosis Hepatitis B" type="date" disabled={!nuevoIngreso.hepatitis_b} value={nuevoIngreso.hepatitis_b_fecha_dosis} onChange={(v) => actualizarNuevoIngreso('hepatitis_b_fecha_dosis', v)} />
            <Input label="Numero de dosis Hepatitis B" disabled={!nuevoIngreso.hepatitis_b} value={nuevoIngreso.hepatitis_b_dosis} onChange={(v) => actualizarNuevoIngreso('hepatitis_b_dosis', soloNumeros(v))} />
            <Input label="Otras vacunas" value={nuevoIngreso.otras_vacunas} onChange={(v) => actualizarNuevoIngreso('otras_vacunas', v)} />
          </div>
          <div style={styles.textGrid}>
            <CampoCondicional
              label="Enfermedades cronicas degenerativas"
              checked={nuevoIngreso.enfermedades_cronicas}
              detail={nuevoIngreso.detalle_enfermedades}
              onChecked={(v) => actualizarNuevoIngreso('enfermedades_cronicas', v)}
              onDetail={(v) => actualizarNuevoIngreso('detalle_enfermedades', v)}
            />
            <CampoCondicional
              label="Problemas auditivos irreversibles"
              checked={nuevoIngreso.problemas_auditivos}
              detail={nuevoIngreso.detalle_auditivos}
              onChecked={(v) => actualizarNuevoIngreso('problemas_auditivos', v)}
              onDetail={(v) => actualizarNuevoIngreso('detalle_auditivos', v)}
            />
            <CampoCondicional
              label="Problemas visuales irreversibles"
              checked={nuevoIngreso.problemas_visuales}
              detail={nuevoIngreso.detalle_visuales}
              onChecked={(v) => actualizarNuevoIngreso('problemas_visuales', v)}
              onDetail={(v) => actualizarNuevoIngreso('detalle_visuales', v)}
            />
          </div>
          <div style={styles.actions}>
            <span style={nuevoIngresoGuardado ? styles.savedText : styles.pendingText}>
              {nuevoIngresoGuardado ? 'Datos de nuevo ingreso guardados' : 'Cambios pendientes de guardar'}
            </span>
            <button style={styles.primaryButton} type="button" onClick={guardarDatosNuevoIngreso}>
              {nuevoIngresoExiste ? 'Actualizar datos de nuevo ingreso' : 'Guardar datos de nuevo ingreso'}
            </button>
          </div>
        </section>
      )}

      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>Medidas antropometricas del paciente</h3>
        <div style={styles.measureGrid}>
          <Medida label="Peso" value={formatearMedida(medidas.peso, medidas.unidad_peso || 'kg')} />
          <Medida label="Talla" value={formatearMedida(medidas.talla, medidas.unidad_talla || 'm')} />
          <Medida label="Presion arterial" value={formatearPresion(medidas.presion_sistolica, medidas.presion_diastolica)} />
        </div>
        <div style={styles.actions}>
          <button style={styles.secondaryButton} type="button" onClick={() => navigate(`/examen-fisico?id_consulta=${id_consulta}&id_paciente=${consulta.id_paciente}&returnTo=${encodeURIComponent(`/realizar-consultas/${id_consulta}`)}`)}>
            Generar examen fisico
          </button>
        </div>
      </section>

      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>Diagnóstico y tratamiento</h3>
        <div style={styles.textGrid}>
          <Textarea label="Diagnóstico" value={form.diagnostico} onChange={(v) => actualizarForm('diagnostico', v)} />
          <Textarea label="Tratamiento" value={form.tratamiento} onChange={(v) => actualizarForm('tratamiento', v)} />
        </div>
        <div style={styles.actions}>
          <button style={styles.primaryButton} type="button" onClick={guardarConsulta}>Guardar consulta</button>
        </div>
      </section>

      <section style={styles.card}>
        <h3 style={styles.sectionTitle}>Documentos clínicos</h3>
        <div style={styles.docGrid}>
          <div style={styles.docBox}>
            <h4 style={styles.docTitle}>Generar receta</h4>
            <Textarea label="Indicaciones" value={receta.indicaciones} onChange={(v) => setReceta({ ...receta, indicaciones: v })} />
            <Select label="Categoria" value={medicamentoReceta.categoria} onChange={(v) => setMedicamentoReceta({ ...medicamentoReceta, categoria: v, id_medicamento: '', busqueda: '' })}>
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
            </Select>
            <label style={styles.field}>
              <span style={styles.label}>Medicamento</span>
              <input
                style={styles.input}
                value={medicamentoReceta.busqueda}
                placeholder="Buscar por nombre"
                onChange={(e) => setMedicamentoReceta({ ...medicamentoReceta, busqueda: e.target.value, id_medicamento: '' })}
              />
            </label>
            {medicamentoReceta.busqueda && !medicamentoReceta.id_medicamento && medicamentosFiltrados.length > 0 && (
              <div style={styles.suggestions}>
                {medicamentosFiltrados.map((m) => (
                  <button
                    key={m.id_medicamento}
                    type="button"
                    style={styles.suggestionItem}
                    onClick={() => setMedicamentoReceta({
                      ...medicamentoReceta,
                      id_medicamento: m.id_medicamento,
                      busqueda: `${m.nombre} ${m.presentacion || m.nombre_presentacion || ''}`.trim()
                    })}
                  >
                    <strong>{m.nombre}</strong>
                    <span>{m.presentacion || m.nombre_presentacion || 'Sin presentacion'} - Stock: {m.stock ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
            {medicamentoSeleccionado && (
              <div style={styles.medInfo}>
                <strong>{medicamentoSeleccionado.nombre} ({medicamentoSeleccionado.presentacion || medicamentoSeleccionado.nombre_presentacion || 'Sin presentación'})</strong>
                <span>Stock disponible: <strong>{medicamentoSeleccionado.stock ?? 0}</strong></span>
              </div>
            )}
            <div style={styles.gridTwo}>
              <Input label="Cantidad por toma" value={medicamentoReceta.cantidad_por_toma} onChange={(v) => setMedicamentoReceta({ ...medicamentoReceta, cantidad_por_toma: v })} />
              <Select label="Frecuencia" value={medicamentoReceta.frecuencia} onChange={(v) => setMedicamentoReceta({ ...medicamentoReceta, frecuencia: v })}>
                <option value="cada">cada</option>
                <option value="una vez cada">una vez cada</option>
                <option value="dos veces cada">dos veces cada</option>
              </Select>
              <Input label="Intervalo" value={medicamentoReceta.intervalo} onChange={(v) => setMedicamentoReceta({ ...medicamentoReceta, intervalo: v })} />
              <Select label="Unidad de intervalo" value={medicamentoReceta.unidad_intervalo} onChange={(v) => setMedicamentoReceta({ ...medicamentoReceta, unidad_intervalo: v })}>
                {unidadesIntervalo.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
              <Input label="Duracion" value={medicamentoReceta.duracion} onChange={(v) => setMedicamentoReceta({ ...medicamentoReceta, duracion: v })} />
              <Select label="Unidad de duracion" value={medicamentoReceta.unidad_duracion} onChange={(v) => setMedicamentoReceta({ ...medicamentoReceta, unidad_duracion: v })}>
                {unidadesDuracion.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
              <Input label="Cantidad indicada" value={medicamentoReceta.cantidad_indicada} onChange={(v) => setMedicamentoReceta({ ...medicamentoReceta, cantidad_indicada: v })} />
              <Input label="Cantidad entregada" value={medicamentoReceta.cantidad_entregada} onChange={(v) => setMedicamentoReceta({ ...medicamentoReceta, cantidad_entregada: v })} />
            </div>
            <div style={styles.docActions}>
              <button style={styles.secondaryButton} type="button" onClick={agregarMedicamentoTemporal}>Anadir medicamento</button>
              <button style={styles.secondaryButton} type="button" onClick={limpiarMedicamentoActual}>Limpiar formulario</button>
            </div>
            {medicamentosReceta.length > 0 && (
              <div style={styles.recetaList}>
                {medicamentosReceta.map((med, index) => (
                  <div key={med.id_medicamento} style={styles.recetaItem}>
                    <div>
                      <strong>{index + 1}. {med.nombre} ({med.presentacion || med.nombre_presentacion || 'Sin presentación'})</strong>
                      <p style={styles.recetaIndicacion}>{med.indicacion_generada || med.frecuencia_texto || construirIndicacionReceta(med)}</p>
                    </div>
                    <button style={styles.linkButton} type="button" onClick={() => eliminarMedicamentoTemporal(med.id_medicamento)}>Eliminar</button>
                  </div>
                ))}
              </div>
            )}
            <div style={styles.docActions}>
              <button style={styles.primaryButton} type="button" onClick={guardarReceta}>Guardar</button>
              <button style={styles.secondaryButton} type="button" onClick={() => mandarAImpresion('Receta')}>Enviar a impresión</button>
              <button style={styles.secondaryButton} type="button" onClick={() => imprimirDocumento('Receta')}>Imprimir</button>
            </div>
          </div>

          <div style={styles.docBox}>
            <h4 style={styles.docTitle}>Generar incapacidad</h4>
            <Input label="Días de incapacidad" value={incapacidad.dias_incapacidad} onChange={(v) => setIncapacidad({ dias_incapacidad: v })} />
            <div style={styles.docActions}>
              <button style={styles.primaryButton} type="button" onClick={guardarIncapacidad}>Guardar</button>
              <button style={styles.secondaryButton} type="button" onClick={() => mandarAImpresion('Incapacidad')}>Enviar a impresión</button>
              <button style={styles.secondaryButton} type="button" onClick={() => imprimirDocumento('Incapacidad')}>Imprimir</button>
            </div>
          </div>

          <div style={styles.docBox}>
            <h4 style={styles.docTitle}>Generar constancia</h4>
            <p style={styles.helpText}>{esNuevoIngreso ? 'Se generara constancia de nuevo ingreso automaticamente.' : 'Se generara constancia medica general automaticamente.'}</p>
            <div style={styles.docActions}>
              <button style={styles.primaryButton} type="button" onClick={guardarConstancia}>Guardar</button>
              <button style={styles.secondaryButton} type="button" onClick={() => mandarAImpresion('Constancia')}>Enviar a impresión</button>
              <button style={styles.secondaryButton} type="button" onClick={() => imprimirDocumento('Constancia')}>Imprimir</button>
            </div>
          </div>

          <div style={styles.docBox}>
            <h4 style={styles.docTitle}>Generar referencia</h4>
            <Input label="Centro" value={referencia.lugar_referencia} onChange={(v) => setReferencia({ ...referencia, lugar_referencia: v })} />
            <Input label="Especialidad" value={referencia.especialidad} onChange={(v) => setReferencia({ ...referencia, especialidad: v })} />
            <div style={styles.docActions}>
              <button style={styles.primaryButton} type="button" onClick={guardarReferencia}>Guardar</button>
              <button style={styles.secondaryButton} type="button" onClick={() => mandarAImpresion('Referencia')}>Enviar a impresión</button>
              <button style={styles.secondaryButton} type="button" onClick={() => imprimirDocumento('Referencia')}>Imprimir</button>
            </div>
          </div>
        </div>
      </section>

      <div style={styles.actions}>
        <button style={styles.secondaryButton} onClick={() => navigate('/realizar-consultas')}>Regresar</button>
        <button style={styles.primaryButton} onClick={finalizar}>Finalizar consulta</button>
      </div>
    </Layout>
  );
}

function Input({ label, value, onChange, type = 'text', disabled = false }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        style={{ ...styles.input, ...(disabled ? styles.disabledInput : {}) }}
        type={type}
        disabled={disabled}
        value={value || ''}
        max={type === 'date' ? obtenerFechaHoyInput() : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Select({ label, value, onChange, children }) {
  return <label style={styles.field}><span style={styles.label}>{label}</span><select style={styles.input} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select></label>;
}

function Textarea({ label, value, onChange }) {
  return <label style={styles.field}><span style={styles.label}>{label}</span><textarea style={styles.textarea} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Check({ label, checked, onChange }) {
  return (
    <label style={styles.check}>
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function CampoCondicional({ label, checked, detail, onChecked, onDetail }) {
  return (
    <div style={styles.conditionalBox}>
      <Check label={label} checked={checked} onChange={onChecked} />
      {checked && <Textarea label="Detalle" value={detail || ''} onChange={onDetail} />}
    </div>
  );
}

function Medida({ label, value }) {
  return (
    <div style={styles.measureItem}>
      <span style={styles.measureLabel}>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function soloNumeros(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function esVerdaderoBD(valor) {
  return valor === true || valor === 1 || valor === '1' || String(valor).toLowerCase() === 'true';
}

function fechaParaInput(valor) {
  if (!valor) return '';
  if (typeof valor === 'string') {
    const match = valor.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : '';
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toISOString().slice(0, 10);
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function construirIndicacionReceta(med) {
  const cantidadPorToma = med.cantidad_por_toma ?? med.dosis;
  const unidad = unidadPresentacion(med, Number(cantidadPorToma || 0));
  const dosis = [cantidadPorToma, unidad].filter(Boolean).join(' ');
  const intervalo = [med.intervalo, med.unidad_intervalo].filter(Boolean).join(' ');
  const duracion = [med.duracion, med.unidad_duracion].filter(Boolean).join(' ');
  const indicada = [med.cantidad_indicada, unidadPresentacion(med, Number(med.cantidad_indicada || 0))].filter(Boolean).join(' ');
  const entregada = [med.cantidad_entregada, unidadPresentacion(med, Number(med.cantidad_entregada || 0))].filter(Boolean).join(' ');
  const faltante = Number(med.cantidad_indicada || 0) - Number(med.cantidad_entregada || 0);

  return [
    dosis ? `Tomar ${dosis}` : null,
    intervalo ? `${med.frecuencia || 'cada'} ${intervalo}` : null,
    duracion ? `por ${duracion}.` : null,
    indicada ? `Cantidad indicada: ${indicada}.` : null,
    entregada ? `Cantidad entregada: ${entregada}.` : null,
    faltante > 0 ? `Paciente debe completar ${faltante} ${unidadPresentacion(med, faltante)} por cuenta propia.` : null
  ].filter(Boolean).join(' ');
}

function unidadPresentacion(med, cantidad = 1) {
  const unidad = String(med.presentacion || med.nombre_presentacion || med.unidad_dosis || med.unidad_entrega || 'unidad').trim().toLowerCase();
  if (!unidad || cantidad === 1 || unidad.endsWith('s')) return unidad;
  return `${unidad}s`;
}

function mapMedicamentoReceta(med) {
  const normalizado = {
    id_medicamento: med.id_medicamento,
    nombre: med.nombre,
    presentacion: med.presentacion || med.nombre_presentacion || '',
    categoria_nombre: med.categoria || '',
    descripcion: med.descripcion || '',
    stock: med.stock,
    cantidad_por_toma: med.cantidad_por_toma ?? med.dosis ?? '',
    frecuencia: med.frecuencia && !String(med.frecuencia).startsWith('Tomar') ? med.frecuencia : 'cada',
    intervalo: med.intervalo || '',
    unidad_intervalo: med.unidad_intervalo || 'horas',
    duracion: med.duracion || '',
    unidad_duracion: med.unidad_duracion || 'dias',
    cantidad_indicada: med.cantidad_indicada || '',
    cantidad_entregada: med.cantidad_entregada ?? med.dosis ?? ''
  };
  normalizado.indicacion_generada = med.indicacion_generada || med.frecuencia || construirIndicacionReceta(normalizado);
  normalizado.frecuencia_texto = normalizado.indicacion_generada;
  return normalizado;
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
  header: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' },
  headerActions: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' },
  title: { margin: 0, color: '#1f2933', fontSize: '26px', fontWeight: '700', borderLeft: '5px solid #880C09', paddingLeft: '14px' },
  subtitle: { margin: '8px 0 0 19px', color: '#5b6472', fontSize: '15px' },
  card: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginBottom: '18px', boxShadow: '0 6px 18px rgba(15,23,42,.05)' },
  sectionTitle: { margin: '0 0 14px', color: '#111827', fontSize: '18px', fontWeight: '800' },
  infoLine: { display: 'flex', flexWrap: 'wrap', gap: '14px', color: '#475467', marginBottom: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' },
  measureGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' },
  readGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' },
  measureItem: { border: '1px solid #edf2f7', borderRadius: '8px', padding: '12px', backgroundColor: '#fbfcfe' },
  readItem: { border: '1px solid #edf2f7', borderRadius: '8px', padding: '12px', backgroundColor: '#fbfcfe', lineHeight: 1.35 },
  measureLabel: { display: 'block', color: '#667085', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '5px' },
  gridTwo: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' },
  textGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' },
  docGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' },
  docBox: { border: '1px solid #edf2f7', borderRadius: '8px', padding: '14px', backgroundColor: '#fbfcfe', display: 'flex', flexDirection: 'column', gap: '10px' },
  docTitle: { margin: 0, color: '#880C09', fontSize: '15px' },
  docActions: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' },
  medInfo: { display: 'grid', gap: '4px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff' },
  recetaList: { display: 'grid', gap: '10px', maxHeight: '260px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px', backgroundColor: '#fff' },
  recetaItem: { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', borderBottom: '1px solid #edf2f7', paddingBottom: '8px' },
  recetaIndicacion: { margin: '5px 0 0', color: '#344054', lineHeight: 1.35 },
  suggestions: { display: 'grid', gap: '6px', maxHeight: '190px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px', backgroundColor: '#fff' },
  suggestionItem: { display: 'flex', justifyContent: 'space-between', gap: '10px', textAlign: 'left', border: '1px solid #edf2f7', borderRadius: '6px', padding: '9px 10px', backgroundColor: '#fbfcfe', cursor: 'pointer' },
  tableScroll: { maxHeight: '260px', overflowY: 'auto', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff' },
  miniTable: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  linkButton: { background: 'transparent', border: 'none', color: '#880C09', fontWeight: '800', cursor: 'pointer' },
  helpText: { margin: 0, color: '#475467', lineHeight: 1.4 },
  savedList: { display: 'grid', gap: '6px', padding: '10px', border: '1px solid #d9e0e8', borderRadius: '6px', backgroundColor: '#fff' },
  savedItem: { color: '#344054', fontSize: '13px', lineHeight: 1.35 },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', color: '#344054', fontWeight: '700' },
  input: { height: '39px', border: '1px solid #d0d5dd', borderRadius: '6px', padding: '8px 10px', outlineColor: '#880C09' },
  textarea: { minHeight: '86px', border: '1px solid #d0d5dd', borderRadius: '6px', padding: '9px 10px', outlineColor: '#880C09', resize: 'vertical' },
  disabledInput: { backgroundColor: '#f8fafc', color: '#667085' },
  check: { display: 'flex', alignItems: 'center', gap: '8px', color: '#344054', fontWeight: '700' },
  conditionalBox: { border: '1px solid #edf2f7', borderRadius: '8px', padding: '12px', backgroundColor: '#fbfcfe', display: 'grid', gap: '10px' },
  actions: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' },
  savedText: { color: '#067647', backgroundColor: '#ecfdf3', border: '1px solid #abefc6', borderRadius: '999px', padding: '7px 11px', fontWeight: '800', fontSize: '13px' },
  pendingText: { color: '#880C09', backgroundColor: '#fff1f1', border: '1px solid #f3c4c4', borderRadius: '999px', padding: '7px 11px', fontWeight: '800', fontSize: '13px' },
  primaryButton: { backgroundColor: '#880C09', color: '#fff', border: '1px solid #880C09', borderRadius: '6px', padding: '9px 14px', fontWeight: '800', cursor: 'pointer' },
  secondaryButton: { backgroundColor: '#fff', color: '#880C09', border: '1px solid #880C09', borderRadius: '6px', padding: '9px 14px', fontWeight: '800', cursor: 'pointer' },
  alert: { backgroundColor: '#fff1f1', color: '#880C09', border: '1px solid #f3c4c4', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontWeight: '700' }
};

export default AtenderConsulta;
