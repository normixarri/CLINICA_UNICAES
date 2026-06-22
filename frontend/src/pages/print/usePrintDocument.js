import { useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:3001/api';

function usePrintDocument(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}${path}`);
        if (mounted) setData(res.data);
      } catch (err) {
        if (mounted) setError(err.response?.data?.mensaje || 'No se pudo cargar el documento.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [path]);

  return { data, loading, error };
}

export default usePrintDocument;
