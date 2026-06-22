import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ToastContext = createContext(null);

const tipos = {
  success: {
    border: '#198754',
    background: '#ecfdf3',
    color: '#0f5132',
    title: 'Exito'
  },
  error: {
    border: '#b42318',
    background: '#fff1f0',
    color: '#842029',
    title: 'Error'
  },
  warning: {
    border: '#b7791f',
    background: '#fff8e5',
    color: '#664d03',
    title: 'Advertencia'
  },
  info: {
    border: '#0b5ed7',
    background: '#eef6ff',
    color: '#084298',
    title: 'Informacion'
  }
};
const detectarTipo = (mensaje, tipo) => {
  if (tipo) return tipo;
  const texto = String(mensaje || '').toLowerCase();
  if (texto.includes('correctamente') || texto.includes('exitos') || texto.includes('guardad')) return 'success';
  if (texto.includes('error') || texto.includes('no se pudo') || texto.includes('incorrect') || texto.includes('invalido') || texto.includes('inválido')) return 'error';
  if (texto.includes('debe') || texto.includes('falta') || texto.includes('seleccione') || texto.includes('obligatorio')) return 'warning';
  return 'info';
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const cerrarToast = useCallback((id) => {
    setToasts((actuales) => actuales.filter((toast) => toast.id !== id));
  }, []);

  const mostrarToast = useCallback((mensaje, tipo = null, opciones = {}) => {
    if (!mensaje) return null;
    const id = Date.now() + Math.random();
    const tipoFinal = detectarTipo(mensaje, tipo);
    const duracion = opciones.duracion ?? (tipoFinal === 'error' || tipoFinal === 'warning' ? 6500 : 4200);

    setToasts((actuales) => [
      ...actuales,
      {
        id,
        mensaje: String(mensaje),
        tipo: tipoFinal
      }
    ]);

    if (duracion > 0) {
      window.setTimeout(() => cerrarToast(id), duracion);
    }

    return id;
  }, [cerrarToast]);

  useEffect(() => {
    const listener = (event) => {
      mostrarToast(event.detail?.mensaje, event.detail?.tipo, event.detail?.opciones);
    };

    window.addEventListener('app:toast', listener);
    return () => window.removeEventListener('app:toast', listener);
  }, [mostrarToast]);

  useEffect(() => {
    const alertOriginal = window.alert;
    window.alert = (mensaje) => {
      mostrarToast(mensaje);
    };

    return () => {
      window.alert = alertOriginal;
    };
  }, [mostrarToast]);

  const valor = useMemo(() => ({ mostrarToast, cerrarToast }), [mostrarToast, cerrarToast]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div style={styles.container} aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const tema = tipos[toast.tipo] || tipos.info;
          return (
            <div
              key={toast.id}
              style={{
                ...styles.toast,
                backgroundColor: tema.background,
                borderLeftColor: tema.border,
                color: tema.color
              }}
            >
              <div style={styles.content}>
                <strong style={styles.title}>{tema.title}</strong>
                <span style={styles.message}>{toast.mensaje}</span>
              </div>
              <button
                type="button"
                onClick={() => cerrarToast(toast.id)}
                style={{ ...styles.close, color: tema.color }}
                aria-label="Cerrar mensaje"
              >
                x
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      mostrarToast: (mensaje, tipo, opciones) => {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { mensaje, tipo, opciones } }));
      }
    };
  }
  return context;
};

export const notificar = (mensaje, tipo = null, opciones = {}) => {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { mensaje, tipo, opciones } }));
};

const styles = {
  container: {
    position: 'fixed',
    top: '18px',
    right: '18px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: 'min(420px, calc(100vw - 32px))',
    pointerEvents: 'none'
  },
  toast: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    borderLeft: '5px solid',
    borderRadius: '8px',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.18)',
    padding: '12px 12px 12px 14px',
    fontSize: '14px',
    lineHeight: 1.35,
    pointerEvents: 'auto'
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0
  },
  title: {
    fontSize: '13px'
  },
  message: {
    overflowWrap: 'anywhere'
  },
  close: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '16px',
    lineHeight: 1,
    padding: '0 2px'
  }
};
