import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import useMensajeToast from '../hooks/useMensajeToast';

const API = 'http://localhost:3001/api';

const examenInicial = {
  peso: '',
  unidad_peso: 'kg',
  talla: '',
  unidad_talla: 'm',
  temperatura: '',
  pulso: '',
  frecuencia_cardiaca: '',
  presion_sistolica: '',
  presion_diastolica: '',
  cx: '',
  antecedentes: '',
  examen_fisico: '',
  diagnostico: '',
  tratamiento: ''
};

function ExamenFisico() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const idConsulta = params.get('id_consulta');
  const idPacienteInicial = params.get('id_paciente');
  const returnTo = params.get('returnTo');

  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [form, setForm] = useState(examenInicial);
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  useMensajeToast(mensaje);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        if (!idConsulta || !idPacienteInicial) {
          setMensaje('Debe abrir el examen fisico desde una consulta medica.');
          return;
        }

        const consultaRes = await axios.get(`${API}/realizar-consultas/${idConsulta}`);
        const consulta = consultaRes.data || {};
        const medidas = consulta.medidas_antropometricas || {};

        setPacienteSeleccionado({
          id_paciente: consulta.id_paciente || idPacienteInicial,
          expediente: consulta.expediente,
          paciente: consulta.paciente,
          tipo_paciente: consulta.tipo_paciente
        });

        setForm((prev) => ({
          ...prev,
          peso: medidas.peso || '',
          unidad_peso: medidas.unidad_peso || 'kg',
          talla: medidas.talla || '',
          unidad_talla: medidas.unidad_talla || 'm',
          presion_sistolica: medidas.presion_sistolica || '',
          presion_diastolica: medidas.presion_diastolica || '',
          diagnostico: consulta.diagnostico || '',
          tratamiento: consulta.tratamiento || ''
        }));
      } catch (error) {
        console.error('Error cargando examen fisico:', error);
        setMensaje(error.response?.data?.mensaje || 'No se pudieron cargar los datos.');
      }
    };

    cargarDatos();
  }, [idConsulta, idPacienteInicial]);

  const actualizar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async (event) => {
    event.preventDefault();
    setMensaje('');
    if (!idConsulta) return setMensaje('Debe abrir el examen fisico desde una consulta medica.');
    if (!pacienteSeleccionado) return setMensaje('No se pudo identificar el paciente de la consulta.');

    const errorMedidas = validarMedidas(form);
    if (errorMedidas) return setMensaje(errorMedidas);

    try {
      setGuardando(true);
      await axios.post(`${API}/examen-fisico`, {
        id_paciente: pacienteSeleccionado.id_paciente,
        id_consulta: idConsulta,
        ...form
      });

      setMensaje('Examen fisico registrado correctamente.');
      if (returnTo) {
        navigate(returnTo);
      }
    } catch (error) {
      console.error('Error al registrar examen fisico:', error);
      setMensaje(error.response?.data?.mensaje || 'No se pudo registrar el examen fisico.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <h2 style={styles.title}>Examen fisico</h2>
        <p style={styles.subtitle}>Registro clinico asociado a la consulta medica actual.</p>
      </div>

      {mensaje && <div style={styles.alert}>{mensaje}</div>}

      {!idConsulta ? (
        <section style={styles.card}>
          <p style={styles.selectedText}>
            El examen fisico ya no se realiza como modulo independiente. Debe abrirse desde una consulta asignada al doctor.
          </p>
          <button type="button" style={styles.secondaryButton} onClick={() => navigate('/realizar-consultas')}>
            Ir a mis consultas
          </button>
        </section>
      ) : (
        <>
          <section style={styles.card}>
            <h3 style={styles.sectionTitle}>Paciente de la consulta</h3>
            <div style={styles.selectedText}>Expediente: <strong>{pacienteSeleccionado?.expediente || '-'}</strong></div>
            <div style={styles.selectedText}>Paciente: <strong>{pacienteSeleccionado?.paciente || '-'}</strong></div>
            <div style={styles.selectedText}>Tipo de paciente: <strong>{pacienteSeleccionado?.tipo_paciente || '-'}</strong></div>
          </section>

          <form style={styles.card} onSubmit={guardar}>
            <h3 style={styles.sectionTitle}>Formulario de examen fisico</h3>
            <div style={styles.grid}>
              <InputConUnidad label="Peso" value={form.peso} unidad={form.unidad_peso} unidades={['kg', 'lb']} onChange={(v) => actualizar('peso', v)} onUnidadChange={(v) => actualizar('unidad_peso', v)} />
              <InputConUnidad label="Talla" value={form.talla} unidad={form.unidad_talla} unidades={['m', 'cm']} onChange={(v) => actualizar('talla', v)} onUnidadChange={(v) => actualizar('unidad_talla', v)} />
              <InputConSufijo label="Temperatura" value={form.temperatura} onChange={(v) => actualizar('temperatura', v)} sufijo={'\u00b0C'} />
              <InputConSufijo label="Pulso" value={form.pulso} onChange={(v) => actualizar('pulso', v)} sufijo="lpm" />
              <InputConSufijo label="Frecuencia cardiaca" value={form.frecuencia_cardiaca} onChange={(v) => actualizar('frecuencia_cardiaca', v)} sufijo="lpm" />
              <InputConSufijo label="Presion sistolica" value={form.presion_sistolica} onChange={(v) => actualizar('presion_sistolica', v)} sufijo="mmHg" />
              <InputConSufijo label="Presion diastolica" value={form.presion_diastolica} onChange={(v) => actualizar('presion_diastolica', v)} sufijo="mmHg" />
            </div>

            <div style={styles.textGrid}>
              <Textarea label="P.E y antecedentes" value={form.antecedentes} onChange={(v) => actualizar('antecedentes', v)} />
              <Textarea label="CX: cirugias o antecedentes quirurgicos" value={form.cx} onChange={(v) => actualizar('cx', v)} />
              <Textarea label="Examen fisico" value={form.examen_fisico} onChange={(v) => actualizar('examen_fisico', v)} />
              <Textarea label="Diagnostico" value={form.diagnostico} onChange={(v) => actualizar('diagnostico', v)} />
              <Textarea label="Tratamiento" value={form.tratamiento} onChange={(v) => actualizar('tratamiento', v)} />
            </div>

            <div style={styles.actions}>
              <button type="button" style={styles.secondaryButton} onClick={() => navigate(returnTo || `/realizar-consultas/${idConsulta}`)}>
                Volver
              </button>
              <button style={styles.primaryButton} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar examen fisico'}</button>
            </div>
          </form>
        </>
      )}
    </Layout>
  );
}

function InputConUnidad({ label, value, unidad, unidades, onChange, onUnidadChange }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <div style={styles.inputGroup}>
        <input style={{ ...styles.input, ...styles.inputGrouped }} value={value} onChange={(e) => onChange(e.target.value)} />
        <select style={styles.unitSelect} value={unidad} onChange={(e) => onUnidadChange(e.target.value)}>
          {unidades.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
        </select>
      </div>
    </label>
  );
}

function InputConSufijo({ label, value, onChange, sufijo }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <div style={styles.inputGroup}>
        <input style={{ ...styles.input, ...styles.inputGrouped }} value={value} onChange={(e) => onChange(e.target.value)} />
        <span style={styles.unitFixed}>{sufijo}</span>
      </div>
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return <label style={styles.field}><span style={styles.label}>{label}</span><textarea style={styles.textarea} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function validarMedidas(form) {
  const decimal = /^\d+(\.\d+)?$/;
  const entero = /^\d+$/;
  if (form.peso && !decimal.test(String(form.peso))) return 'El peso debe contener solo numeros y decimales validos.';
  if (form.talla && !decimal.test(String(form.talla))) return 'La talla debe contener solo numeros y decimales validos.';
  if (form.temperatura && !decimal.test(String(form.temperatura))) return 'La temperatura debe contener solo numeros y decimales validos.';
  if (form.pulso && !entero.test(String(form.pulso))) return 'El pulso debe contener solo numeros enteros.';
  if (form.frecuencia_cardiaca && !entero.test(String(form.frecuencia_cardiaca))) return 'La frecuencia cardiaca debe contener solo numeros enteros.';
  if (form.presion_sistolica && !entero.test(String(form.presion_sistolica))) return 'La presion sistolica debe contener solo numeros enteros.';
  if (form.presion_diastolica && !entero.test(String(form.presion_diastolica))) return 'La presion diastolica debe contener solo numeros enteros.';
  return '';
}

const styles = {
  header: { marginBottom: '20px' },
  title: { margin: 0, color: '#1f2933', fontSize: '26px', fontWeight: '700', borderLeft: '5px solid #880C09', paddingLeft: '14px' },
  subtitle: { margin: '8px 0 0 19px', color: '#5b6472', fontSize: '15px' },
  card: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginBottom: '18px', boxShadow: '0 6px 18px rgba(15,23,42,.05)' },
  sectionTitle: { margin: '0 0 14px', color: '#111827', fontSize: '18px', fontWeight: '800' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' },
  textGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', color: '#344054', fontWeight: '700' },
  input: { height: '39px', border: '1px solid #d0d5dd', borderRadius: '6px', padding: '8px 10px', outlineColor: '#880C09' },
  inputGroup: { display: 'grid', gridTemplateColumns: '1fr 82px', alignItems: 'stretch' },
  inputGrouped: { borderRadius: '6px 0 0 6px', minWidth: 0 },
  unitSelect: { height: '39px', border: '1px solid #d0d5dd', borderLeft: 'none', borderRadius: '0 6px 6px 0', padding: '8px', outlineColor: '#880C09', backgroundColor: '#fff', fontWeight: '700' },
  unitFixed: { height: '39px', border: '1px solid #d0d5dd', borderLeft: 'none', borderRadius: '0 6px 6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#344054', fontWeight: '700', fontSize: '13px' },
  textarea: { minHeight: '92px', border: '1px solid #d0d5dd', borderRadius: '6px', padding: '9px 10px', outlineColor: '#880C09', resize: 'vertical' },
  selectedText: { color: '#475467', marginBottom: '12px' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' },
  primaryButton: { backgroundColor: '#880C09', color: '#fff', border: '1px solid #880C09', borderRadius: '6px', padding: '10px 18px', fontWeight: '800', cursor: 'pointer' },
  secondaryButton: { backgroundColor: '#fff', color: '#880C09', border: '1px solid #880C09', borderRadius: '6px', padding: '10px 18px', fontWeight: '800', cursor: 'pointer' },
  alert: { backgroundColor: '#fff1f1', color: '#880C09', border: '1px solid #f3c4c4', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontWeight: '700' }
};

export default ExamenFisico;
