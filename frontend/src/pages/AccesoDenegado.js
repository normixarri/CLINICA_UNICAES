import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { primeraRutaPermitida } from '../utils/permisos';

function AccesoDenegado() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div style={styles.card}>
        <h2 style={styles.title}>Acceso denegado</h2>
        <p style={styles.text}>
          Tu usuario no tiene permisos para ver esta pantalla.
        </p>
        <button style={styles.button} onClick={() => navigate(primeraRutaPermitida())}>
          Ir a una pantalla permitida
        </button>
      </div>
    </Layout>
  );
}

const styles = {
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '28px',
    maxWidth: '520px',
    margin: '40px auto',
    textAlign: 'center',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)'
  },
  title: {
    margin: '0 0 10px 0',
    color: '#880C09'
  },
  text: {
    color: '#475467',
    marginBottom: '20px'
  },
  button: {
    backgroundColor: '#880C09',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontWeight: '700'
  }
};

export default AccesoDenegado;
