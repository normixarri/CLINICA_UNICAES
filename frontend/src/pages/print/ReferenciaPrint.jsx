import React from 'react';
import { useParams } from 'react-router-dom';
import PrintShell, { Line, PrintHeader, SignatureBlock, dateParts } from './PrintShell';
import usePrintDocument from './usePrintDocument';

function ReferenciaPrint() {
  const { id_referencia } = useParams();
  const { data, loading, error } = usePrintDocument(`/documentos/referencia/${id_referencia}`);
  const fecha = dateParts(data?.fecha);

  return (
    <PrintShell title="Referencia" loading={loading} error={error}>
      {data && (
        <article style={styles.doc}>
          <PrintHeader title="REFERENCIA" />
          <p><strong>Por este medio se refiere a:</strong> <Line variant="long">{data.paciente}</Line></p>

          <p><strong>Con diagnostico de:</strong> <Line variant="long">{data.diagnostico}</Line></p>

          <p><strong>Por lo que se refiere para manejo adecuado de dicha patologia</strong></p>
          <p><strong>Al centro:</strong> <Line variant="medium">{data.lugar_referencia}</Line></p>
          <p><strong>Especialidad:</strong> <Line variant="medium">{data.especialidad_referencia}</Line></p>
          <p>
            a los <Line>{fecha.dia}</Line> dias del mes de <Line>{fecha.mes}</Line> del ano <Line>{fecha.anio}</Line>
          </p>

          <p style={styles.thanks}>Gracias por su atencion.</p>
          <SignatureBlock firmaUrl={data.firma_url} selloUrl={data.sello_url} selloDoctorUrl={data.sello_doctor_url} label="Atentamente Medico" />
        </article>
      )}
    </PrintShell>
  );
}

const styles = {
  doc: {
    fontSize: '12pt',
    lineHeight: 1.2,
    fontWeight: '700'
  },
  thanks: {
    marginTop: '36px'
  }
};

export default ReferenciaPrint;
