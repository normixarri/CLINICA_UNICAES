import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { OPS, tieneOperacion } from '../utils/permisos';

function Medicamentos() {
  const navigate = useNavigate();
  const puedeCrear = tieneOperacion([OPS.CREAR_MEDICAMENTO]);
  const puedeEditar = tieneOperacion([OPS.EDITAR_MEDICAMENTOS]);

  const [medicamentos, setMedicamentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [presentacionFiltro, setPresentacionFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [stockFiltro, setStockFiltro] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [medRes, catRes, preRes] = await Promise.all([
        axios.get('http://localhost:3001/api/medicamentos'),
        axios.get('http://localhost:3001/api/categorias'),
        axios.get('http://localhost:3001/api/presentaciones')
      ]);

      setMedicamentos(medRes.data);
      setCategorias(catRes.data);
      setPresentaciones(preRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const medicamentosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return medicamentos.filter((m) => {
      const stock = Number(m.stock || 0);

      const coincideBusqueda = !texto || String(m.nombre || '').toLowerCase().includes(texto);
      const coincideCategoria = !categoriaFiltro || String(m.id_categoria) === String(categoriaFiltro);
      const coincidePresentacion = !presentacionFiltro || String(m.id_presentacion) === String(presentacionFiltro);
      const coincideEstado = estadoFiltro === '' || Number(m.estado) === Number(estadoFiltro);

      const coincideStock =
        !stockFiltro ||
        (stockFiltro === 'bajo' && stock > 0 && stock <= 20) ||
        (stockFiltro === 'sin_stock' && stock === 0) ||
        (stockFiltro === 'disponible' && stock > 20);

      return coincideBusqueda &&
        coincideCategoria &&
        coincidePresentacion &&
        coincideEstado &&
        coincideStock;
    });
  }, [medicamentos, busqueda, categoriaFiltro, presentacionFiltro, estadoFiltro, stockFiltro]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaFiltro('');
    setPresentacionFiltro('');
    setEstadoFiltro('');
    setStockFiltro('');
  };

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.title}>Gestión de Medicamentos</h2>
            <p style={styles.subtitle}>Inventario, disponibilidad y estado de medicamentos</p>
          </div>

          {puedeCrear && (
            <button
              style={styles.btnPrincipal}
              onClick={() => navigate('/medicamentos/crear')}
            >
              + Crear medicamento
            </button>
          )}
        </div>

        <div style={styles.filtros}>
          <input
            placeholder="Buscar por nombre"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={styles.input}
          />

          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            style={styles.select}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            value={presentacionFiltro}
            onChange={(e) => setPresentacionFiltro(e.target.value)}
            style={styles.select}
          >
            <option value="">Todas las presentaciones</option>
            {presentaciones.map((p) => (
              <option key={p.id_presentacion} value={p.id_presentacion}>
                {p.nombre_presentacion}
              </option>
            ))}
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            style={styles.select}
          >
            <option value="">Todos los estados</option>
            <option value="1">Activo</option>
            <option value="0">Inactivo</option>
          </select>

          <select
            value={stockFiltro}
            onChange={(e) => setStockFiltro(e.target.value)}
            style={styles.select}
          >
            <option value="">Todo stock</option>
            <option value="bajo">Bajo stock</option>
            <option value="sin_stock">Sin stock</option>
            <option value="disponible">Disponible</option>
          </select>

          <button style={styles.btnSecundario} onClick={limpiarFiltros}>
            Limpiar
          </button>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Presentación</th>
                <th style={styles.th}>Categoría</th>
                <th style={styles.th}>Stock</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {medicamentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" style={styles.emptyCell}>
                    No se encontraron medicamentos
                  </td>
                </tr>
              ) : (
                medicamentosFiltrados.map((m) => (
                  <tr key={m.id_medicamento} style={styles.tr}>
                    <td style={styles.tdStrong}>{m.nombre}</td>
                    <td style={styles.td}>{m.presentacion || '-'}</td>
                    <td style={styles.td}>{m.categoria || '-'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.stockBadge,
                        ...(Number(m.stock) === 0
                          ? styles.stockSin
                          : Number(m.stock) <= 20
                            ? styles.stockBajo
                            : styles.stockDisponible)
                      }}>
                        {m.stock}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        ...(Number(m.estado) === 1 ? styles.badgeActivo : styles.badgeInactivo)
                      }}>
                        {Number(m.estado) === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {puedeEditar ? (
                        <button
                          style={styles.btnEditar}
                          onClick={() => navigate(`/medicamentos/editar/${m.id_medicamento}`)}
                        >
                          Editar
                        </button>
                      ) : '-'}
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

const styles = {
  page: {
    padding: '20px',
    flex: 1
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  title: {
    margin: 0,
    color: '#1a1a1a',
    fontSize: '24px',
    fontWeight: '600',
    borderLeft: '4px solid #880C09',
    paddingLeft: '15px'
  },
  subtitle: {
    margin: '8px 0 0 19px',
    color: '#666',
    fontSize: '14px'
  },
  filtros: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    alignItems: 'center',
    flexWrap: 'wrap',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
  },
  input: {
    padding: '9px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '220px',
    outline: 'none'
  },
  select: {
    padding: '9px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    outline: 'none'
  },
  btnPrincipal: {
    backgroundColor: '#880C09',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700'
  },
  btnSecundario: {
    border: '1px solid #880C09',
    color: '#880C09',
    backgroundColor: '#fff',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
    maxHeight: 'min(430px, 55vh)',
    overflowY: 'auto',
    overflowX: 'auto',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    minWidth: '880px'
  },
  th: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    textAlign: 'left',
    padding: '13px 15px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    fontSize: '12px',
    fontWeight: '700',
    color: '#495057',
    textTransform: 'uppercase'
  },
  td: {
    padding: '13px 15px',
    borderBottom: '1px solid #f0f0f0',
    color: '#212529'
  },
  tdStrong: {
    padding: '13px 15px',
    borderBottom: '1px solid #f0f0f0',
    color: '#212529',
    fontWeight: '700'
  },
  tr: {
    backgroundColor: '#fff'
  },
  emptyCell: {
    padding: '28px 15px',
    textAlign: 'center',
    color: '#666'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '700'
  },
  badgeActivo: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  badgeInactivo: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },
  stockBadge: {
    display: 'inline-block',
    minWidth: '42px',
    textAlign: 'center',
    padding: '4px 9px',
    borderRadius: '4px',
    fontWeight: '700'
  },
  stockDisponible: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },
  stockBajo: {
    backgroundColor: '#fff3cd',
    color: '#856404'
  },
  stockSin: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },
  btnEditar: {
    padding: '7px 13px',
    border: '1px solid #880C09',
    backgroundColor: 'transparent',
    color: '#880C09',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600'
  }
};

export default Medicamentos;
