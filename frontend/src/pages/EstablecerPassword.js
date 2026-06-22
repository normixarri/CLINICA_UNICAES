import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import useMensajeToast from '../hooks/useMensajeToast';

const API = 'http://localhost:3001/api';
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_MSG = 'La contraseña debe tener mínimo 8 caracteres, al menos una letra mayúscula y al menos un número.';

function EstablecerPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmacion: '' });
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [mensaje, setMensaje] = useState('');
  useMensajeToast(mensaje);
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [usuarioFinal, setUsuarioFinal] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [verConfirmacion, setVerConfirmacion] = useState(false);

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const res = await axios.get(`${API}/establecer-password/${token}`);
        setDatosUsuario(res.data);
      } catch (error) {
        setMensaje(error.response?.data?.mensaje || 'El enlace no es válido o ya expiró.');
      }
    };

    cargarUsuario();
  }, [token]);

  const guardar = async () => {
    const error = validarPassword(form.password, form.confirmacion);
    if (error) {
      setMensaje(error);
      return;
    }

    try {
      setCargando(true);
      const res = await axios.post(`${API}/establecer-password`, {
        token,
        password: form.password,
        confirmacion: form.confirmacion
      });

      setUsuarioFinal(res.data.usuario || datosUsuario?.usuario || '');
      setGuardado(true);
      setMensaje('');
    } catch (error) {
      setMensaje(error.response?.data?.mensaje || 'No se pudo crear la contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={styles.container}>
      <img src="/logo.png" alt="logo" style={styles.logo} />
      <h1 style={styles.title}>Crear contraseña</h1>

      <div style={styles.card}>
        {guardado ? (
          <div style={styles.successBox}>
            <h2 style={styles.successTitle}>Registro completado</h2>
            <p>Has sido registrado correctamente y tu contraseña ha sido guardada.</p>
            <p>
              Cuando inicies sesión utiliza este usuario:
              <strong style={styles.userBadge}> {usuarioFinal}</strong>
            </p>
            <p>Usa la contraseña que acabas de registrar. No pierdas ni olvides tu información de acceso.</p>
            <button style={styles.button} onClick={() => navigate('/login', { replace: true })}>
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <>
            {mensaje && <div style={styles.alert}>{mensaje}</div>}

            {datosUsuario && (
              <div style={styles.infoBox}>
                <span>Nombre: <strong>{datosUsuario.nombre}</strong></span>
                <span>Usuario asignado: <strong>{datosUsuario.usuario}</strong></span>
              </div>
            )}

            <label style={styles.label}>Nueva contraseña</label>
            <PasswordInput
              value={form.password}
              onChange={(value) => setForm({ ...form, password: value })}
              visible={verPassword}
              onToggle={() => setVerPassword((prev) => !prev)}
              disabled={!datosUsuario}
            />

            <label style={styles.label}>Confirmar contraseña</label>
            <PasswordInput
              value={form.confirmacion}
              onChange={(value) => setForm({ ...form, confirmacion: value })}
              visible={verConfirmacion}
              onToggle={() => setVerConfirmacion((prev) => !prev)}
              disabled={!datosUsuario}
            />

            <p style={styles.help}>{PASSWORD_MSG}</p>
            <button style={styles.button} onClick={guardar} disabled={cargando || !datosUsuario}>
              {cargando ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function validarPassword(password, confirmacion) {
  if (!password) return 'La contraseña es obligatoria.';
  if (!confirmacion) return 'La confirmación de contraseña es obligatoria.';
  if (password !== confirmacion) return 'La contraseña y la confirmación deben coincidir.';
  if (!PASSWORD_REGEX.test(password)) return PASSWORD_MSG;
  return '';
}

function PasswordInput({ value, onChange, visible, onToggle, disabled }) {
  return (
    <div style={styles.passwordWrap}>
      <input
        type={visible ? 'text' : 'password'}
        className="password-no-native-eye"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...styles.input, ...styles.passwordInput }}
        disabled={disabled}
      />
      <button type="button" onClick={onToggle} style={styles.eyeButton} disabled={disabled} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        {visible ? 'Ocultar' : 'Ver'}
      </button>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  logo: { width: '105px', marginBottom: '10px' },
  title: { color: '#880C09', margin: '0 0 20px' },
  card: { backgroundColor: '#fff', padding: '30px', borderRadius: '10px', boxShadow: '0px 0px 10px rgba(0,0,0,0.1)', width: '430px', maxWidth: '100%', display: 'flex', flexDirection: 'column' },
  label: { fontWeight: '700', marginBottom: '6px' },
  input: { marginBottom: '15px', padding: '12px', borderRadius: '5px', border: '1px solid #ccc' },
  passwordWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  passwordInput: { width: '100%', paddingRight: '78px' },
  eyeButton: { position: 'absolute', right: '8px', top: '7px', border: 'none', backgroundColor: '#f3f4f6', color: '#880C09', borderRadius: '4px', padding: '6px 9px', fontWeight: '700', cursor: 'pointer' },
  help: { margin: '0 0 16px', color: '#555', fontSize: '13px', lineHeight: 1.4 },
  button: { backgroundColor: '#880C09', color: '#fff', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: '700' },
  alert: { backgroundColor: '#fff1f1', color: '#880C09', border: '1px solid #f3c4c4', borderRadius: '6px', padding: '10px', marginBottom: '14px', fontWeight: '700' },
  infoBox: { display: 'grid', gap: '6px', backgroundColor: '#f8fafc', border: '1px solid #d9e0e8', borderRadius: '6px', padding: '12px', marginBottom: '16px' },
  successBox: { display: 'grid', gap: '10px', color: '#1f2933', lineHeight: 1.45 },
  successTitle: { margin: 0, color: '#880C09' },
  userBadge: { display: 'inline-block', backgroundColor: '#f8e3a2', borderRadius: '5px', padding: '3px 8px', color: '#111827' }
};

export default EstablecerPassword;
