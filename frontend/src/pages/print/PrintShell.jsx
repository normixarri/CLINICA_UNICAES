import React, { useEffect } from 'react';

const API_ORIGIN = 'http://localhost:3001';

export const assetUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/api')) return `${API_ORIGIN}${url}`;
  return url;
};

export const formatDate = (value = new Date()) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-SV');
};

export const dateParts = (value = new Date()) => {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return {
    dia: String(safeDate.getDate()).padStart(2, '0'),
    mes: safeDate.toLocaleDateString('es-SV', { month: 'long' }),
    anio: safeDate.getFullYear()
  };
};

function PrintShell({ title, loading, error, children, autoPrint = true }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} - Clinica Universitaria UNICAES` : 'Clinica Universitaria UNICAES';

    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  useEffect(() => {
    const previewMode = new URLSearchParams(window.location.search).has('preview');
    if (!loading && !error && autoPrint && !previewMode) {
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [loading, error, autoPrint]);

  return (
    <div style={styles.screen}>
      <style>{printCss}</style>
      <div className="print-toolbar no-print" style={styles.toolbar}>
        <strong>{title}</strong>
        <button type="button" style={styles.button} onClick={() => window.print()}>Imprimir</button>
      </div>

      <main className="print-page documento-print" style={styles.page}>
        {loading && <div style={styles.center}>Cargando documento...</div>}
        {error && <div style={styles.error}>{error}</div>}
        {!loading && !error && children}
      </main>
    </div>
  );
}

export function PrintHeader({ title, subtitle, compact = false }) {
  return (
    <header style={compact ? styles.headerCompact : styles.header}>
      <img src="/logo.png" alt="UNICAES" style={compact ? styles.logoSmall : styles.logo} />
      <div style={styles.headerText}>
        <h1 style={compact ? styles.institutionSmall : styles.institution}>UNIVERSIDAD CATOLICA DE EL SALVADOR</h1>
        <h2 style={compact ? styles.clinicSmall : styles.clinic}>CLINICA UNIVERSITARIA</h2>
        {title && <h3 style={compact ? styles.docTitleSmall : styles.docTitle}>{title}</h3>}
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>
    </header>
  );
}

export function SignatureBlock({ firmaUrl, selloUrl, selloDoctorUrl, label = 'Firma y sello medico' }) {
  return (
    <div className="firma-sello-section" style={styles.signatureSection}>
      <div style={styles.institutionSealBox}>
        {selloUrl && (
          <>
            <img
              className="sello-institucional"
              src={assetUrl(selloUrl)}
              alt="Sello institucional"
              style={styles.selloInstitucional}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div style={styles.sealLine} />
            <strong style={styles.sealLabel}>Sello Clínico</strong>
          </>
        )}
      </div>

      <div style={styles.signatureWrap}>
        <div style={styles.signatureImages}>
          {firmaUrl && (
            <img
              className="firma-doctor"
              src={assetUrl(firmaUrl)}
              alt="Firma medico"
              style={styles.firma}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          {selloDoctorUrl && (
            <img
              className="sello-doctor"
              src={assetUrl(selloDoctorUrl)}
              alt="Sello del doctor"
              style={styles.selloDoctor}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
        </div>
        <div style={styles.signatureLine} />
        <strong>{label}</strong>
      </div>
    </div>
  );
}

export const Line = ({ children, minHeight = 20, variant = 'short', block = false }) => {
  const variants = {
    short: styles.lineShort,
    medium: styles.lineMedium,
    long: styles.lineLong
  };

  return (
    <span
      className={`campo-linea campo-linea-${variant}`}
      style={{
        ...styles.line,
        ...(variants[variant] || styles.lineShort),
        ...(block ? styles.lineBlock : null),
        minHeight
      }}
    >
      {children || '\u00a0'}
    </span>
  );
};

const printCss = `
  @page {
    size: letter;
    margin: 0;
  }

  @media print {
    html,
    body {
      margin: 0 !important;
      background: #fff !important;
      font-size: 12pt !important;
      line-height: 1.2 !important;
      word-spacing: normal !important;
      letter-spacing: normal !important;
      text-align: left !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .no-print,
    .print-toolbar {
      display: none !important;
    }

    .documento-print,
    .print-page {
      width: 8.5in !important;
      min-height: 11in !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0.55in !important;
      border: none !important;
      box-sizing: border-box !important;
      font-size: 12pt !important;
      line-height: 1.2 !important;
      word-spacing: normal !important;
      letter-spacing: normal !important;
      text-align: left !important;
    }

    .firma-sello-section {
      display: flex !important;
      justify-content: space-between !important;
      align-items: flex-end !important;
      margin-top: 40px !important;
    }

    .sello-institucional {
      width: 150px !important;
      height: 150px !important;
      object-fit: contain !important;
    }

    .firma-doctor {
      width: 165px !important;
      height: 82px !important;
      object-fit: contain !important;
    }

    .sello-doctor {
      width: 145px !important;
      height: 145px !important;
      object-fit: contain !important;
    }

    .campo-linea {
      display: inline !important;
      min-width: 0 !important;
      width: fit-content !important;
      max-width: 100% !important;
      padding: 0 !important;
    }

    p,
    span,
    strong,
    article {
      word-spacing: normal !important;
      letter-spacing: normal !important;
      text-align: left !important;
    }
  }
`;

const styles = {
  screen: {
    minHeight: '100vh',
    backgroundColor: '#eef1f5',
    padding: '18px',
    fontFamily: 'Arial, Helvetica, sans-serif',
    color: '#000'
  },
  toolbar: {
    width: '8.5in',
    maxWidth: '100%',
    margin: '0 auto 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    border: '1px solid #d0d5dd',
    borderRadius: '8px',
    padding: '10px 12px'
  },
  button: {
    backgroundColor: '#880C09',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 14px',
    fontWeight: '700',
    cursor: 'pointer'
  },
  page: {
    width: '8.5in',
    minHeight: '11in',
    margin: '0 auto',
    backgroundColor: '#fff',
    padding: '0.55in',
    boxShadow: '0 8px 28px rgba(15,23,42,.18)',
    boxSizing: 'border-box',
    fontSize: '12pt',
    lineHeight: 1.2,
    wordSpacing: 'normal',
    letterSpacing: 'normal',
    textAlign: 'left'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '20px'
  },
  headerCompact: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '12px',
    marginBottom: '12px'
  },
  logo: {
    width: '70px',
    height: '70px',
    objectFit: 'contain'
  },
  logoSmall: {
    width: '50px',
    height: '50px',
    objectFit: 'contain'
  },
  headerText: {
    textAlign: 'center'
  },
  institution: {
    margin: 0,
    fontSize: '14pt',
    fontWeight: '800'
  },
  institutionSmall: {
    margin: 0,
    fontSize: '12pt',
    fontWeight: '800'
  },
  clinic: {
    margin: '8px 0 0',
    fontSize: '13pt',
    fontWeight: '800'
  },
  clinicSmall: {
    margin: '2px 0',
    fontSize: '11pt',
    fontWeight: '800'
  },
  docTitle: {
    margin: '2px 0 0',
    fontSize: '14pt',
    fontWeight: '800'
  },
  docTitleSmall: {
    margin: '2px 0 0',
    fontSize: '11pt',
    fontWeight: '800'
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '10pt'
  },
  line: {
    display: 'inline-block',
    borderBottom: 'none',
    padding: 0,
    verticalAlign: 'baseline',
    width: 'fit-content',
    maxWidth: '100%',
    whiteSpace: 'normal'
  },
  lineShort: {
    minWidth: 0
  },
  lineMedium: {
    minWidth: 0,
    maxWidth: '420px'
  },
  lineLong: {
    minWidth: 0,
    maxWidth: '600px'
  },
  lineBlock: {
    display: 'block'
  },
  signatureSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '24px',
    marginTop: '40px'
  },
  institutionSealBox: {
    width: '210px',
    minHeight: '190px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    textAlign: 'center'
  },
  selloInstitucional: {
    width: '150px',
    height: '150px',
    objectFit: 'contain'
  },
  sealLine: {
    width: '175px',
    borderTop: '1.5px solid #000',
    marginTop: '6px',
    marginBottom: '4px'
  },
  sealLabel: {
    fontSize: '11pt'
  },
  signatureWrap: {
    width: '410px',
    textAlign: 'center',
    position: 'relative'
  },
  signatureImages: {
    minHeight: '150px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: '8px'
  },
  firma: {
    width: '165px',
    height: '82px',
    objectFit: 'contain'
  },
  selloDoctor: {
    width: '145px',
    height: '145px',
    objectFit: 'contain'
  },
  signatureLine: {
    borderTop: '1.5px solid #000',
    marginTop: '4px',
    marginBottom: '4px'
  },
  center: {
    padding: '80px 20px',
    textAlign: 'center'
  },
  error: {
    padding: '18px',
    color: '#880C09',
    border: '1px solid #f3c4c4',
    backgroundColor: '#fff1f1'
  }
};

export default PrintShell;
