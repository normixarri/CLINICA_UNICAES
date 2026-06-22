import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import useMensajeToast from '../hooks/useMensajeToast';

const API = 'http://localhost:3001/api';

function RealizarConsultas() {
  const navigate = useNavigate();
  const [consultas, setConsultas] = useState([]);
  const [mensaje, setMensaje] = useState('');
  useMensajeToast(mensaje);

  const obtenerDoctorActual = useCallback(() => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return usuario.id_doctor || null;
  }, []);

  const cargarConsultas = useCallback(async () => {
    try {
      const idDoctor = obtenerDoctorActual();
      if (!idDoctor) {
        setMensaje('Solo un doctor registrado puede realizar consultas.');
        return;
      }

      const res = await axios.get(`${API}/realizar-consultas/mis-consultas/${idDoctor}`);
      setConsultas(res.data || []);
    } catch (error) {
      console.error('Error cargando consultas:', error);
      setMensaje(error.response?.data?.mensaje || 'No se pudieron cargar las consultas.');
    }
  }, [obtenerDoctorActual]);

  useEffect(() => {
    cargarConsultas();
  }, [cargarConsultas]);

  const iniciar = async (consulta) => {
    try {
      if (normalizarEstado(consulta.estado) === 'pendiente') {
        await axios.put(`${API}/realizar-consultas/${consulta.id_consulta}/iniciar`);
      }
      navigate(`/realizar-consultas/${consulta.id_consulta}`);
    } catch (error) {
      console.error('Error iniciando consulta:', error);
      setMensaje(error.response?.data?.mensaje || 'No se pudo iniciar la consulta.');
    }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <h2 style={styles.title}>Mis consultas</h2>
        <p style={styles.subtitle}>Consultas pendientes o en proceso asignadas al doctor.</p>
      </div>

      {mensaje && <div style={styles.alert}>{mensaje}</div>}

      <div style={styles.card}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Paciente</th>
                <th style={styles.th}>Tipo de consulta</th>
                <th style={styles.th}>Tipo de paciente</th>
                <th style={styles.th}>Proyecto</th>
                <th style={styles.th}>Estado / Acción</th>
              </tr>
            </thead>
            <tbody>
              {consultas.length === 0 ? (
                <tr><td style={styles.empty} colSpan="5">No hay consultas asignadas</td></tr>
              ) : (
                consultas.map((consulta) => (
                  <tr key={consulta.id_consulta}>
                    <td style={styles.td}>{consulta.paciente}</td>
                    <td style={styles.td}>{consulta.tipo_consulta}</td>
                    <td style={styles.td}>{consulta.tipo_paciente || '-'}</td>
                    <td style={styles.td}><ProyectoBadge proyecto={consulta.proyecto} /></td>
                    <td style={styles.td}>
                      <AccionConsulta consulta={consulta} onClick={() => iniciar(consulta)} />
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

function AccionConsulta({ consulta, onClick }) {
  const estado = normalizarEstado(consulta.estado);
  if (estado === 'finalizada' || estado === 'finalizado') {
    return <span style={styles.finalizado}>Finalizado</span>;
  }

  return (
    <button type="button" style={styles.primaryButton} onClick={onClick}>
      {estado === 'en proceso' ? 'Continuar' : 'Iniciar atención'}
    </button>
  );
}

function ProyectoBadge({ proyecto }) {
  if (proyecto === 'PY') return <span style={styles.badgePy}>PY</span>;
  if (proyecto === 'LAMAR') return <span style={styles.badgeLamar}>LAMAR</span>;
  return <span style={styles.muted}>-</span>;
}

function normalizarEstado(estado) {
  return String(estado || '').trim().toLowerCase();
}

const styles = {
  header: { marginBottom: '20px' },
  title: { margin: 0, color: '#1f2933', fontSize: '26px', fontWeight: '700', borderLeft: '5px solid #880C09', paddingLeft: '14px' },
  subtitle: { margin: '8px 0 0 19px', color: '#5b6472', fontSize: '15px' },
  card: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', boxShadow: '0 6px 18px rgba(15,23,42,.05)' },
  tableWrap: { maxHeight: 'min(460px, 56vh)', overflowY: 'auto', overflowX: 'auto' },
  table: { width: '100%', minWidth: '860px', borderCollapse: 'collapse' },
  th: { position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#f8fafc', padding: '13px 15px', textAlign: 'left', borderBottom: '1px solid #d9e0e8', color: '#344054', fontSize: '12px', textTransform: 'uppercase' },
  td: { padding: '13px 15px', borderBottom: '1px solid #edf2f7', fontSize: '14px' },
  primaryButton: { backgroundColor: '#880C09', color: '#fff', border: '1px solid #880C09', borderRadius: '6px', padding: '8px 12px', fontWeight: '800', cursor: 'pointer' },
  finalizado: { backgroundColor: '#ecfdf3', color: '#027a48', borderRadius: '999px', padding: '5px 10px', fontWeight: '800' },
  badgePy: { color: '#075985', backgroundColor: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '999px', padding: '4px 9px', fontSize: '12px', fontWeight: '800' },
  badgeLamar: { color: '#880C09', backgroundColor: '#fff1f1', border: '1px solid #f3c4c4', borderRadius: '999px', padding: '4px 9px', fontSize: '12px', fontWeight: '800' },
  muted: { color: '#98a2b3', fontWeight: '800' },
  empty: { padding: '28px', color: '#667085', textAlign: 'center' },
  alert: { backgroundColor: '#fff1f1', color: '#880C09', border: '1px solid #f3c4c4', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontWeight: '700' }
};

export default RealizarConsultas;
