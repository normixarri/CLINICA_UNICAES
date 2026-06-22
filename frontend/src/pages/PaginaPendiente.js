import React from 'react';
import Layout from '../components/Layout';

function PaginaPendiente({ titulo }) {
  return (
    <Layout>
      <div style={styles.card}>
        <h2 style={styles.title}>{titulo}</h2>
        <p style={styles.text}>Esta pantalla ya quedó separada en el menú y lista para conectarse al flujo correspondiente.</p>
      </div>
    </Layout>
  );
}

const styles = {
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.05)'
  },
  title: {
    margin: 0,
    color: '#1f2933',
    fontSize: '26px',
    fontWeight: '700',
    borderLeft: '5px solid #880C09',
    paddingLeft: '14px'
  },
  text: {
    margin: '14px 0 0 19px',
    color: '#5b6472',
    fontSize: '15px'
  }
};

export default PaginaPendiente;
