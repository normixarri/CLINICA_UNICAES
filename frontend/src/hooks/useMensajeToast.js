import { useEffect, useRef } from 'react';
import { useToast } from '../components/ToastProvider';

export default function useMensajeToast(mensaje, tipo = null) {
  const { mostrarToast } = useToast();
  const ultimoMensaje = useRef('');

  useEffect(() => {
    if (!mensaje) {
      ultimoMensaje.current = '';
      return;
    }

    if (mensaje === ultimoMensaje.current) return;
    ultimoMensaje.current = mensaje;
    mostrarToast(mensaje, tipo);
  }, [mensaje, tipo, mostrarToast]);
}
