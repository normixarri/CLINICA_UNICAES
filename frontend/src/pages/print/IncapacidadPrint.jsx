import React from 'react';
import { useParams } from 'react-router-dom';
import PrintShell, { Line, PrintHeader, SignatureBlock, dateParts } from './PrintShell';
import usePrintDocument from './usePrintDocument';

function IncapacidadPrint() {
  const { id_incapacidad } = useParams();
  const { data, loading, error } = usePrintDocument(`/documentos/incapacidad/${id_incapacidad}`);
  const fecha = dateParts(data?.fecha);

  return (
    <PrintShell title="Incapacidad medica" loading={loading} error={error}>
      {data && (
        <article style={styles.doc}>
          <PrintHeader title="INCAPACIDAD MEDICA" />

          <p>El infrascrito Medico: <Line variant="medium">{data.doctor}</Line></p>
          <p>Inscrito en la J.V.P.M. con numero <Line>{data.jvpm}</Line> por este medio</p>
          <p>Hace constar que <Line variant="medium">{data.paciente}</Line></p>
          <p>
            Ha pasado consulta este dia con mi persona, realizandole examen fisico completo,
            Diagnosticandose <Line variant="long" minHeight={28}>{data.diagnostico_documento || data.diagnostico}</Line>
          </p>
          <p>
            Motivo por el cual se extiende la presente incapacidad por{' '}
            <Line>{data.dias_incapacidad}</Line> dias, a partir de esta fecha.
          </p>
          <p>
            Y para los usos que el interesado estime convenientes, se extiende la presente en la ciudad
            de Santa Ana a los <Line>{fecha.dia}</Line> dias del mes de <Line>{fecha.mes}</Line> de {fecha.anio}.
          </p>

          <SignatureBlock firmaUrl={data.firma_url} selloUrl={data.sello_url} selloDoctorUrl={data.sello_doctor_url} />
        </article>
      )}
    </PrintShell>
  );
}

const styles = {
  doc: {
    fontSize: '12pt',
    lineHeight: 1.2,
    fontWeight: '600'
  }
};

export default IncapacidadPrint;
