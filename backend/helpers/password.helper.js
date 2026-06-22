const crypto = require('crypto');

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const MENSAJE_PASSWORD = 'La contraseña debe tener mínimo 8 caracteres, al menos una letra mayúscula y al menos un número.';

const validarPassword = (password, confirmacion) => {
  if (!password) throw new Error('La contraseña es obligatoria.');
  if (!confirmacion) throw new Error('La confirmación de contraseña es obligatoria.');
  if (password !== confirmacion) throw new Error('La contraseña y la confirmación deben coincidir.');
  if (!PASSWORD_REGEX.test(password)) throw new Error(MENSAJE_PASSWORD);
};

const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      return resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
};

const compararPassword = (password, hashGuardado) => {
  return new Promise((resolve, reject) => {
    if (!hashGuardado) return resolve(false);

    const partes = String(hashGuardado).split('$');
    if (partes[0] !== 'scrypt' || partes.length !== 3) {
      return resolve(password === hashGuardado);
    }

    const [, salt, hash] = partes;
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      return resolve(crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derivedKey));
    });
  });
};

const necesitaRehash = (hashGuardado) => !String(hashGuardado || '').startsWith('scrypt$');

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const generarTokenPlano = () => crypto.randomBytes(32).toString('hex');

const generarCodigo = () => String(crypto.randomInt(100000, 999999));

module.exports = {
  MENSAJE_PASSWORD,
  compararPassword,
  generarCodigo,
  generarTokenPlano,
  hashPassword,
  hashToken,
  necesitaRehash,
  validarPassword
};
