import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { primeraRutaPermitida } from '../utils/permisos';
import useMensajeToast from '../hooks/useMensajeToast';
import { validarCorreo } from '../utils/validaciones';

const API = 'http://localhost:3001/api';
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_MSG = 'La contraseña debe tener mínimo 8 caracteres, al menos una letra mayúscula y al menos un número.';

function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [recuperando, setRecuperando] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [verNuevaPassword, setVerNuevaPassword] = useState(false);
  const [verConfirmacion, setVerConfirmacion] = useState(false);
  useMensajeToast(mensaje);

  const handleLogin = async () => {
    try {
      setMensaje('');
      const res = await axios.post(`${API}/login`, { usuario, password });

      if (res.data.usuario) {
        localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
        localStorage.setItem('token', res.data.token);
        navigate(primeraRutaPermitida(), { replace: true });
      }
    } catch (error) {
      setMensaje(error.response?.data?.mensaje || 'Error al iniciar sesión');
    }
  };

  const solicitarRecuperacion = async () => {
    const errorCorreo = validarCorreo(correo, true);
    if (errorCorreo) {
      setMensaje('Escriba un correo electrónico válido.');
      return;
    }

    try {
      setMensaje('');
      const res = await axios.post(`${API}/recuperar-password`, { correo });
      setCodigoEnviado(true);
      setMensaje(res.data.mensaje);
    } catch (error) {
      setMensaje(error.response?.data?.mensaje || 'No se pudo solicitar recuperación.');
    }
  };

  const restablecerPassword = async () => {
    const error = validarPassword(nuevaPassword, confirmacion);
    if (error) {
      setMensaje(error);
      return;
    }

    try {
      setMensaje('');
      const res = await axios.post(`${API}/reset-password`, {
        correo,
        codigo,
        password: nuevaPassword,
        confirmacion
      });

      setMensaje(res.data.mensaje);
      setTimeout(() => {
        setRecuperando(false);
        setCodigoEnviado(false);
        setCodigo('');
        setNuevaPassword('');
        setConfirmacion('');
      }, 1200);
    } catch (error) {
      setMensaje(error.response?.data?.mensaje || 'No se pudo cambiar la contraseña.');
    }
  };

  return (
    <div style={styles.container}>
      <img src="/logo.png" alt="logo" style={styles.logo} />
      <h1 style={styles.title}>Clínica Universitaria</h1>

      <div style={styles.card}>
        {mensaje && <div style={styles.alert}>{mensaje}</div>}

        {!recuperando ? (
          <>
            <label>Usuario</label>
            <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} style={styles.input} />

            <label>Contraseña</label>
            <PasswordInput value={password} onChange={setPassword} visible={verPassword} onToggle={() => setVerPassword((prev) => !prev)} />

            <button style={styles.button} onClick={handleLogin}>Iniciar Sesión</button>
            <button style={styles.link} onClick={() => { setRecuperando(true); setMensaje(''); }}>Recuperar contraseña</button>
          </>
        ) : (
          <>
            <label>Correo electrónico</label>
            <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} style={styles.input} />

            <button style={styles.button} onClick={solicitarRecuperacion}>Enviar código</button>

            {codigoEnviado && (
              <>
                <label>Código recibido</label>
                <input value={codigo} onChange={(e) => setCodigo(e.target.value)} style={styles.input} />

                <label>Nueva contraseña</label>
                <PasswordInput value={nuevaPassword} onChange={setNuevaPassword} visible={verNuevaPassword} onToggle={() => setVerNuevaPassword((prev) => !prev)} />

                <label>Confirmar contraseña</label>
                <PasswordInput value={confirmacion} onChange={setConfirmacion} visible={verConfirmacion} onToggle={() => setVerConfirmacion((prev) => !prev)} />

                <p style={styles.help}>{PASSWORD_MSG}</p>
                <button style={styles.button} onClick={restablecerPassword}>Guardar nueva contraseña</button>
              </>
            )}

            <button style={styles.link} onClick={() => { setRecuperando(false); setMensaje(''); }}>Volver al login</button>
          </>
        )}
      </div>

      <p style={styles.footer}>Universidad Católica de El Salvador - Santa Ana</p>
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

function PasswordInput({ value, onChange, visible, onToggle }) {
  return (
    <div style={styles.passwordWrap}>
      <input
        type={visible ? 'text' : 'password'}
        className="password-no-native-eye"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...styles.input, ...styles.passwordInput }}
      />
      <button type="button" onClick={onToggle} style={styles.eyeButton} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        {visible ? 'Ocultar' : 'Ver'}
      </button>
    </div>
  );
}

const styles = {
  container: { height: '100vh', backgroundColor: '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  logo: { width: '110px', marginBottom: '10px' },
  title: { color: '#880C09', marginBottom: '20px' },
  card: { backgroundColor: '#fff', padding: '35px', borderRadius: '10px', boxShadow: '0px 0px 10px rgba(0,0,0,0.1)', width: '390px', maxWidth: 'calc(100vw - 32px)', display: 'flex', flexDirection: 'column' },
  input: { marginBottom: '15px', padding: '12px', borderRadius: '5px', border: '1px solid #ccc' },
  passwordWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  passwordInput: { width: '100%', paddingRight: '78px' },
  eyeButton: { position: 'absolute', right: '8px', top: '7px', border: 'none', backgroundColor: '#f3f4f6', color: '#880C09', borderRadius: '4px', padding: '6px 9px', fontWeight: '700', cursor: 'pointer' },
  button: { backgroundColor: '#880C09', color: '#fff', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', marginBottom: '10px', fontWeight: '700' },
  link: { backgroundColor: '#FFD700', border: 'none', padding: '8px', borderRadius: '5px', cursor: 'pointer', marginBottom: '10px' },
  help: { margin: '0 0 12px', color: '#555', fontSize: '13px', lineHeight: 1.4 },
  alert: { backgroundColor: '#fff1f1', color: '#880C09', border: '1px solid #f3c4c4', borderRadius: '6px', padding: '10px', marginBottom: '14px', fontWeight: '700' },
  footer: { marginTop: '20px', fontSize: '12px', color: '#555' }
};

export default Login;
