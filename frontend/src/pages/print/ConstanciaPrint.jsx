import React from 'react';
import { useParams } from 'react-router-dom';
import PrintShell, { Line, PrintHeader, SignatureBlock, dateParts } from './PrintShell';
import usePrintDocument from './usePrintDocument';

function ConstanciaPrint() {
  const { id_constancia } = useParams();
  const { data, loading, error } = usePrintDocument(`/documentos/constancia/${id_constancia}`);

  return (
    <PrintShell title="Constancia" loading={loading} error={error}>
      {data?.formato_constancia === 'nuevo_ingreso'
        ? <ConstanciaNuevoIngreso data={data} />
        : data && <ConstanciaGeneral data={data} />}
    </PrintShell>
  );
}

function ConstanciaGeneral({ data }) {
  const fecha = dateParts(data.fecha);

  return (
    <article style={styles.doc}>
      <PrintHeader title="CONSTANCIA MEDICA" />
      <p style={styles.notice}>Esta constancia no genera incapacidad.</p>
      <p>El infrascrito Medico: <Line variant="medium">{data.doctor}</Line></p>
      <p>Inscrito en la J.V.P.M. con numero <Line>{data.jvpm}</Line> por este medio,</p>
      <p>Hace constar que <Line variant="medium">{data.paciente}</Line></p>
      <p>
        Ha pasado consulta este dia con mi persona, realizandole examen fisico completo,
        Diagnosticandose <Line variant="long" minHeight={28}>{data.diagnostico}</Line>
      </p>
      <p>
        Y para los usos que el interesado estime convenientes, se extiende la presente en la ciudad
        de Santa Ana a los <Line>{fecha.dia}</Line> dias del mes de <Line>{fecha.mes}</Line> de {fecha.anio}.
      </p>
      <SignatureBlock firmaUrl={data.firma_url} selloUrl={data.sello_url} selloDoctorUrl={data.sello_doctor_url} />
    </article>
  );
}

function ConstanciaNuevoIngreso({ data }) {
  const ingreso = data.nuevo_ingreso || {};
  const fecha = dateParts(data.fecha);

  return (
    <article style={styles.nuevo}>
      <PrintHeader title="CONSTANCIA DE ENFERMERIA" subtitle="Facultad de Ciencias de la Salud - Escuela de Enfermeria" compact />
      <p style={styles.notice}>Esta constancia no genera incapacidad.</p>
      <p>Sres. UNICAES</p>
      <p>Presente:</p>
      <p>El Infrascrito Doctor <Line variant="medium">{data.doctor}</Line> inscrito en JVPM con el numero <Line>{data.jvpm}</Line></p>
      <p>por este medio hago constar que: <Line variant="medium">{data.paciente}</Line> ha pasado consulta este dia con mi persona, presentando los examenes de laboratorio correspondientes.</p>
      <p>Diagnostico: <Line variant="long" minHeight={26}>{data.diagnostico}</Line></p>
      <p>Tratamiento: <Line variant="long" minHeight={26}>{data.tratamiento}</Line></p>

      <h4 style={styles.subheading}>Esquema de vacunacion</h4>
      <div style={styles.vaccineList}>
        <Vacuna label="DT" activa={ingreso.dt} fecha={ingreso.dt_fecha_dosis} dosis={ingreso.dt_dosis} />
        <Vacuna label="Hepatitis B" activa={ingreso.hepatitis_b} fecha={ingreso.hepatitis_b_fecha_dosis} dosis={ingreso.hepatitis_b_dosis} />
        <p style={styles.vaccineLine}>Otras vacunas: {ingreso.otras_vacunas || 'No refiere'}</p>
      </div>

      <p>{textoCondicion('Presenta enfermedades cronicas degenerativas', ingreso.enfermedades_cronicas, ingreso.detalle_enfermedades)}</p>
      <p>{textoCondicion('Presenta problemas auditivos irreversibles', ingreso.problemas_auditivos, ingreso.detalle_auditivos)}</p>
      <p>{textoCondicion('Presenta problemas visuales irreversibles', ingreso.problemas_visuales, ingreso.detalle_visuales)}</p>
      <p>
        Y para los usos que el interesado estime convenientes se le extiende la presente constancia
        a los <Line>{fecha.dia}</Line> dias del mes de <Line>{fecha.mes}</Line> de {fecha.anio}.
      </p>
      <SignatureBlock firmaUrl={data.firma_url} selloUrl={data.sello_url} selloDoctorUrl={data.sello_doctor_url} />
    </article>
  );
}

function textoCondicion(etiqueta, valor, detalle) {
  const presenta = Boolean(valor);
  const detalleLimpio = String(detalle || '').trim();

  if (!presenta) return `${etiqueta}: No`;
  return detalleLimpio ? `${etiqueta}: Sí. Detalle: ${detalleLimpio}` : `${etiqueta}: Sí`;
}

function Vacuna({ label, activa, fecha, dosis }) {
  const aplicada = Boolean(activa);
  return (
    <div style={styles.vaccineItem}>
      <p style={styles.vaccineLine}>{label}: {aplicada ? 'Sí' : 'No'}</p>
      {aplicada && fecha && <p style={styles.vaccineDetail}>Fecha de dosis: {formatDate(fecha)}</p>}
      {aplicada && dosis && <p style={styles.vaccineDetail}>Número de dosis: {dosis}</p>}
    </div>
  );
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-SV');
}

const styles = {
  doc: {
    fontSize: '12pt',
    lineHeight: 1.2,
    fontWeight: '600'
  },
  nuevo: {
    fontSize: '12pt',
    lineHeight: 1.2,
    fontWeight: '600'
  },
  subheading: {
    margin: '14px 0 8px',
    fontSize: '13pt'
  },
  notice: {
    textAlign: 'center',
    fontWeight: '800',
    margin: '8px 0 16px'
  },
  vaccineList: {
    display: 'grid',
    gap: '8px',
    marginBottom: '10px'
  },
  vaccineItem: {
    display: 'grid',
    gap: '2px'
  },
  vaccineLine: {
    margin: 0
  },
  vaccineDetail: {
    margin: 0,
    paddingLeft: '18px',
    fontWeight: '600'
  }
};

export default ConstanciaPrint;
