import React from 'react';
import { useParams } from 'react-router-dom';
import PrintShell, { PrintHeader, SignatureBlock, formatDate } from './PrintShell';
import usePrintDocument from './usePrintDocument';

function RecetaPrint() {
  const { id_receta } = useParams();
  const { data, loading, error } = usePrintDocument(`/documentos/receta/${id_receta}`);

  return (
    <PrintShell title="Receta" loading={loading} error={error}>
      {data && (
        <div style={styles.sheet}>
          <PrintHeader title="RECETA" compact />
          <section style={styles.patientRow}>
            <span><strong>NOMBRE:</strong> {data.paciente}</span>
            <span><strong>EDAD:</strong> {data.edad || '-'}</span>
            <span><strong>EXPEDIENTE:</strong> {data.expediente}</span>
            <span><strong>FECHA:</strong> {formatDate(data.fecha)}</span>
          </section>

          <ol style={styles.list}>
            {(data.medicamentos || []).map((med) => (
              <li key={`${med.nombre}-${med.frecuencia}`} style={styles.item}>
                <strong>{med.nombre}</strong>
                {med.presentacion && <span> ({med.presentacion})</span>}
                {med.descripcion && <div style={styles.meta}>{med.descripcion}</div>}
                {med.categoria && <div style={styles.meta}>Categoria: {med.categoria}</div>}
                <div>{med.indicacion_generada || med.frecuencia || construirIndicacion(med)}</div>
                <div style={styles.meta}>
                  Cantidad indicada: {med.cantidad_indicada || '-'} {unidadPresentacion(med, Number(med.cantidad_indicada || 0))}
                  {' | '}
                  Cantidad entregada: {med.cantidad_entregada ?? '-'} {unidadPresentacion(med, Number(med.cantidad_entregada || 0))}
                </div>
              </li>
            ))}
          </ol>

          {data.indicaciones && (
            <div style={styles.indicaciones}>
              <strong>Indicaciones:</strong>
              <p>{data.indicaciones}</p>
            </div>
          )}

          <SignatureBlock firmaUrl={data.firma_url} selloUrl={data.sello_url} selloDoctorUrl={data.sello_doctor_url} label="MEDICO F." />
        </div>
      )}
    </PrintShell>
  );
}

function construirIndicacion(med) {
  const cantidadPorToma = med.cantidad_por_toma ?? med.dosis;
  const dosis = [cantidadPorToma, unidadPresentacion(med, Number(cantidadPorToma || 0))].filter(Boolean).join(' ');
  const intervalo = [med.intervalo, med.unidad_intervalo].filter(Boolean).join(' ');
  const duracion = [med.duracion, med.unidad_duracion || 'dias'].filter(Boolean).join(' ');
  const faltante = Number(med.cantidad_indicada || 0) - Number(med.cantidad_entregada || 0);
  return [
    dosis ? `Tomar ${dosis}` : null,
    intervalo ? `cada ${intervalo}` : null,
    duracion ? `por ${duracion}.` : null,
    faltante > 0 ? `Paciente debe completar ${faltante} ${unidadPresentacion(med, faltante)} por cuenta propia.` : null
  ].filter(Boolean).join(' ');
}

function unidadPresentacion(med, cantidad = 1) {
  const unidad = String(med.presentacion || med.unidad_dosis || med.unidad_entrega || 'unidad').trim().toLowerCase();
  if (!unidad || cantidad === 1 || unidad.endsWith('s')) return unidad;
  return `${unidad}s`;
}

const styles = {
  sheet: {
    fontSize: '12pt',
    minHeight: '9.8in'
  },
  patientRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto auto',
    gap: '12px',
    borderTop: '2px solid #000',
    borderBottom: '2px solid #000',
    padding: '8px 0',
    marginTop: '12px'
  },
  list: {
    margin: '20px 0 0',
    paddingLeft: '28px',
    minHeight: '360px',
    fontSize: '12pt',
    lineHeight: 1.2
  },
  item: {
    marginBottom: '14px'
  },
  meta: {
    fontSize: '10.5pt',
    color: '#222',
    marginTop: '2px'
  },
  indicaciones: {
    borderTop: '1px solid #000',
    paddingTop: '10px',
    minHeight: '70px'
  }
};

export default RecetaPrint;
