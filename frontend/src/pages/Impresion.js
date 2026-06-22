import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import useMensajeToast from '../hooks/useMensajeToast';
import { obtenerFechaHoyInput } from '../utils/validaciones';

const API = 'http://localhost:3001/api';
const RUTAS_IMPRESION = {
  Receta: 'receta',
  Incapacidad: 'incapacidad',
  Constancia: 'constancia',
  Referencia: 'referencia'
};

function Impresion() {
  const [impresiones, setImpresiones] = useState([]);
  const [filtros, setFiltros] = useState({ paciente: '', tipo_documento: '', doctor: '', fecha: '', estado: '' });
  const [mensaje, setMensaje] = useState('');
  useMensajeToast(mensaje);

  useEffect(() => {
    cargarImpresiones();
  }, []);

  const cargarImpresiones = async () => {
    try {
      const res = await axios.get(`${API}/impresiones`);
      setImpresiones(res.data || []);
    } catch (error) {
      console.error('Error cargando impresiones:', error);
      setMensaje('No se pudo cargar la lista de impresión.');
    }
  };

  const impresionesFiltradas = useMemo(() => {
    return impresiones.filter((item) => {
      const fecha = formatearFecha(item.fecha_creacion);
      return contiene(item.paciente, filtros.paciente) &&
        (!filtros.tipo_documento || item.tipo_documento === filtros.tipo_documento) &&
        contiene(item.doctor, filtros.doctor) &&
        (!filtros.fecha || fecha === filtros.fecha) &&
        (!filtros.estado || item.estado === filtros.estado);
    });
  }, [impresiones, filtros]);

  const imprimir = async (item) => {
    try {
      const ruta = RUTAS_IMPRESION[item.tipo_documento];
      if (!ruta) {
        setMensaje('Tipo de documento no vÃ¡lido para impresiÃ³n.');
        return;
      }

      window.open(`/imprimir/${ruta}/${item.id_documento}`, '_blank', 'noopener,noreferrer');

      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      await axios.put(`${API}/impresiones/${item.id_impresion}/impreso`, {
        impreso_por: usuario.id_usuario || null
      });

      setMensaje('Documento marcado como impreso.');
      await cargarImpresiones();
    } catch (error) {
      console.error('Error imprimiendo:', error);
      setMensaje('No se pudo marcar el documento como impreso.');
    }
  };

  const limpiar = () => setFiltros({ paciente: '', tipo_documento: '', doctor: '', fecha: '', estado: '' });

  return (
    <Layout>
      <div style={styles.header}>
        <h2 style={styles.title}>Impresión</h2>
        <p style={styles.subtitle}>Cola de documentos clínicos enviados por doctores.</p>
      </div>

      {mensaje && <div style={styles.alert}>{mensaje}</div>}

      <div style={styles.filters}>
        <Input label="Paciente" value={filtros.paciente} onChange={(v) => setFiltros({ ...filtros, paciente: v })} />
        <Select label="Tipo de documento" value={filtros.tipo_documento} onChange={(v) => setFiltros({ ...filtros, tipo_documento: v })}>
          <option value="">Todos</option>
          <option value="Receta">Receta</option>
          <option value="Referencia">Referencia</option>
          <option value="Constancia">Constancia</option>
          <option value="Incapacidad">Incapacidad</option>
        </Select>
        <Input label="Doctor" value={filtros.doctor} onChange={(v) => setFiltros({ ...filtros, doctor: v })} />
        <Input label="Fecha" type="date" value={filtros.fecha} onChange={(v) => setFiltros({ ...filtros, fecha: v })} />
        <Select label="Estado" value={filtros.estado} onChange={(v) => setFiltros({ ...filtros, estado: v })}>
          <option value="">Todos</option>
          <option value="sin imprimir">Sin imprimir</option>
          <option value="impreso">Impreso</option>
        </Select>
        <div style={styles.filterActions}>
          <button type="button" style={styles.secondaryButton} onClick={limpiar}>Limpiar filtros</button>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Paciente</th>
                <th style={styles.th}>Tipo de documento</th>
                <th style={styles.th}>Doctor</th>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Estado de impresión</th>
                <th style={styles.th}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {impresionesFiltradas.length === 0 ? (
                <tr><td style={styles.empty} colSpan="6">No hay documentos en la lista de impresión</td></tr>
              ) : (
                impresionesFiltradas.map((item) => (
                  <tr key={item.id_impresion}>
                    <td style={styles.td}>{item.paciente || '-'}</td>
                    <td style={styles.td}>{item.tipo_documento}</td>
                    <td style={styles.td}>{item.doctor || '-'}</td>
                    <td style={styles.td}>{formatearFecha(item.fecha_creacion)}</td>
                    <td style={styles.td}><Estado estado={item.estado} /></td>
                    <td style={styles.td}>
                      {item.estado === 'sin imprimir' ? (
                        <button type="button" style={styles.primaryButton} onClick={() => imprimir(item)}>Imprimir</button>
                      ) : (
                        <span style={styles.muted}>Impreso {formatearFecha(item.fecha_impresion)}</span>
                      )}
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

function Estado({ estado }) {
  if (estado === 'impreso') return <span style={styles.badgeOk}>Impreso</span>;
  return <span style={styles.badgePending}>Sin imprimir</span>;
}

function Input({ label, value, onChange, type = 'text' }) {
  return <label style={styles.field}><span style={styles.label}>{label}</span><input type={type} max={type === 'date' ? obtenerFechaHoyInput() : undefined} style={styles.input} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, children }) {
  return <label style={styles.field}><span style={styles.label}>{label}</span><select style={styles.input} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select></label>;
}

function contiene(valor, filtro) {
  return String(valor || '').toLowerCase().includes(String(filtro || '').toLowerCase());
}

function formatearFecha(fecha) {
  if (!fecha) return '-';
  return String(fecha).split('T')[0];
}

const styles = {
  header: { marginBottom: '20px' },
  title: { margin: 0, color: '#1f2933', fontSize: '26px', fontWeight: '700', borderLeft: '5px solid #880C09', paddingLeft: '14px' },
  subtitle: { margin: '8px 0 0 19px', color: '#5b6472', fontSize: '15px' },
  filters: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px', marginBottom: '18px', padding: '18px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 6px 18px rgba(15,23,42,.05)' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#344054', fontSize: '13px', fontWeight: '700' },
  input: { height: '39px', border: '1px solid #d0d5dd', borderRadius: '6px', padding: '8px 10px', outlineColor: '#880C09' },
  filterActions: { display: 'flex', alignItems: 'flex-end' },
  card: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0', boxShadow: '0 6px 18px rgba(15,23,42,.05)' },
  tableWrap: { maxHeight: 'min(460px, 56vh)', overflowY: 'auto', overflowX: 'auto' },
  table: { width: '100%', minWidth: '920px', borderCollapse: 'collapse' },
  th: { position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#f8fafc', color: '#344054', textAlign: 'left', padding: '13px 15px', borderBottom: '1px solid #d9e0e8', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' },
  td: { padding: '13px 15px', borderBottom: '1px solid #edf2f7', fontSize: '14px', color: '#101828' },
  primaryButton: { backgroundColor: '#880C09', color: '#fff', border: '1px solid #880C09', borderRadius: '6px', padding: '8px 12px', fontWeight: '800', cursor: 'pointer' },
  secondaryButton: { backgroundColor: '#fff', color: '#880C09', border: '1px solid #880C09', borderRadius: '6px', padding: '8px 12px', fontWeight: '800', cursor: 'pointer', height: '39px' },
  badgePending: { color: '#92400e', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '999px', padding: '4px 9px', fontWeight: '800', fontSize: '12px' },
  badgeOk: { color: '#027a48', backgroundColor: '#ecfdf3', border: '1px solid #abefc6', borderRadius: '999px', padding: '4px 9px', fontWeight: '800', fontSize: '12px' },
  muted: { color: '#667085', fontWeight: '700' },
  empty: { padding: '28px', textAlign: 'center', color: '#667085' },
  alert: { backgroundColor: '#fff1f1', color: '#880C09', border: '1px solid #f3c4c4', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontWeight: '700' }
};

export default Impresion;
