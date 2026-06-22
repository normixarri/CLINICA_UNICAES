import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { OPS, tieneOperacion } from '../utils/permisos';
import axios from 'axios';

function SelloClinico() {

  const [archivo, setArchivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isLabelHovered, setIsLabelHovered] = useState(false);
  const puedeEditarSello = tieneOperacion([OPS.EDITAR_SELLO_CLINICO]);

  // 🔹 Cargar sello guardado
  useEffect(() => {
    obtenerSello();
  }, []);

  const obtenerSello = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/configuracion/sello', {
        responseType: 'blob'
      });

      const url = URL.createObjectURL(res.data);
      setPreview(url);

    } catch (error) {
      console.log("Sin sello aún");
    }
  };

  // 🔹 Seleccionar imagen
  const handleFile = (e) => {
    const file = e.target.files[0];
    setArchivo(file);

    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  // 🔹 Subir imagen
  const subir = async () => {
    if (!puedeEditarSello) {
      alert("No tiene permiso para editar el sello clínico");
      return;
    }

    if (!archivo) {
      alert("Selecciona una imagen");
      return;
    }

    const formData = new FormData();
    formData.append('sello', archivo);

    try {
      await axios.post('http://localhost:3001/api/configuracion/sello', formData);
      alert("Sello subido correctamente");
    } catch (error) {
      console.error(error);
      alert("Error al subir sello");
    }
  };

  return (
    <Layout>

      <div style={styles.container}>

        <h2 style={styles.title}>Subir Sello Clínico</h2>

        {/* 🔥 IMAGEN */}
        <div
          style={{
            ...styles.previewContainer,
            ...(isHovered && styles.previewContainerHover)
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {preview ? (
            <img src={preview} alt="sello" style={styles.imagen} />
          ) : (
            <div style={styles.placeholder}>
              <svg style={styles.placeholderIcon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span>Sin imagen</span>
            </div>
          )}
        </div>

        {/* 🔥 CONTROLES */}
        {puedeEditarSello ? (
        <div style={styles.controles}>
          <label
            style={{
              ...styles.fileLabel,
              ...(isLabelHovered && styles.fileLabelHover)
            }}
            onMouseEnter={() => setIsLabelHovered(true)}
            onMouseLeave={() => setIsLabelHovered(false)}
          >
            📁 Seleccionar archivo
            <input
              type="file"
              onChange={handleFile}
              style={styles.fileInput}
              accept="image/*"
            />
          </label>

          <button
            onClick={subir}
            style={{
              ...styles.boton,
              ...(isButtonHovered && styles.botonHover)
            }}
            onMouseEnter={() => setIsButtonHovered(true)}
            onMouseLeave={() => setIsButtonHovered(false)}
          >
            💾 Subir Sello
          </button>
        </div>
        ) : (
          <div style={styles.info}>
            <span style={styles.infoText}>No tiene permiso para editar el sello clínico.</span>
          </div>
        )}

        {puedeEditarSello && archivo && (
          <div style={styles.info}>
            <span style={styles.infoText}>
              Archivo seleccionado: {archivo.name}
            </span>
          </div>
        )}

      </div>

    </Layout>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 200px)',
    gap: '25px',
    padding: '20px'
  },

  title: {
    marginBottom: '0',
    color: '#1a1a1a',
    fontSize: '24px',
    fontWeight: '600',
    borderLeft: '4px solid #880C09',
    paddingLeft: '15px',
    marginTop: '0'
  },

  previewContainer: {
    width: '400px',
    height: '400px',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    border: '2px solid #e0e0e0',
    transition: 'all 0.3s ease'
  },

  previewContainerHover: {
    boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
    border: '2px solid #880C09'
  },

  imagen: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#fff'
  },

  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
    color: '#999',
    fontSize: '16px'
  },

  placeholderIcon: {
    width: '80px',
    height: '80px',
    color: '#ccc'
  },

  controles: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },

  fileLabel: {
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    display: 'inline-block'
  },

  fileLabelHover: {
    backgroundColor: '#5a6268'
  },

  fileInput: {
    display: 'none'
  },

  boton: {
    backgroundColor: '#880C09',
    color: '#fff',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s'
  },

  botonHover: {
    backgroundColor: '#6a0a07'
  },

  info: {
    padding: '10px 20px',
    backgroundColor: '#e7f3ff',
    borderRadius: '6px',
    border: '1px solid #b3d9ff'
  },

  infoText: {
    color: '#004085',
    fontSize: '13px',
    fontWeight: '500'
  }
};

export default SelloClinico;
