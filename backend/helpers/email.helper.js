/*
 * Servicio generico de correo.
 *
 * MAIL_MODE=test:
 * - No usa SMTP ni servicios externos.
 * - Siempre imprime el correo, enlace, token o codigo en la consola local.
 *
 * MAIL_MODE=production:
 * - Exige SMTP real configurado por variables de entorno.
 * - La institucion debe definir SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER,
 *   SMTP_PASS y SMTP_FROM cuando tenga correo institucional o proveedor SMTP.
 */

let nodemailer = null;
let testTransporter = null;
let productionTransporter = null;

try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

const mailMode = () => String(process.env.MAIL_MODE || 'test').toLowerCase();
const smtpSecure = () => String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

const smtpConfigCompleta = () => (
  Boolean(process.env.SMTP_HOST) &&
  Boolean(process.env.SMTP_USER) &&
  Boolean(process.env.SMTP_PASS)
);

const crearTransporterProduccion = () => {
  if (!nodemailer) {
    throw new Error('Nodemailer no esta instalado. Ejecute: npm install nodemailer');
  }

  if (!smtpConfigCompleta()) {
    throw new Error('SMTP de produccion incompleto. Revise SMTP_HOST, SMTP_USER y SMTP_PASS en .env.');
  }

  if (!productionTransporter) {
    productionTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: smtpSecure(),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return productionTransporter;
};

const crearTransporterPrueba = async () => {
  if (!nodemailer) return null;

  if (!testTransporter) {
    const cuenta = await nodemailer.createTestAccount();

    testTransporter = nodemailer.createTransport({
      host: cuenta.smtp.host,
      port: cuenta.smtp.port,
      secure: cuenta.smtp.secure,
      auth: {
        user: cuenta.user,
        pass: cuenta.pass
      }
    });

    testTransporter.__etherealAccount = cuenta;
  }

  return testTransporter;
};

const imprimirCorreoSimulado = ({ to, subject, html, text, datosPrueba = {}, motivo }) => {
  const esActivacion = Boolean(datosPrueba.enlace);
  console.log(esActivacion
    ? '================ CORREO DE ACTIVACIÓN ================'
    : '================ CORREO EN MODO PRUEBA ================');
  console.log('Para:', to);
  console.log('Asunto:', subject);
  if (datosPrueba.tipo) console.log('Tipo:', datosPrueba.tipo);
  if (datosPrueba.enlace) console.log('Enlace de activación:', datosPrueba.enlace);
  if (datosPrueba.codigo) console.log('Codigo:', datosPrueba.codigo);
  if (datosPrueba.token) console.log('Token:', datosPrueba.token);
  if (!esActivacion) {
    console.log('Modo:', mailMode());
    console.log('Motivo:', motivo || 'Consola local');
    console.log('Contenido:');
    console.log(text || limpiarHtml(html));
  }
  console.log('======================================================');
};

const enviarCorreo = async ({ to, subject, html, text, datosPrueba = {} }) => {
  const modo = mailMode();

  if (modo === 'test') {
    imprimirCorreoSimulado({
      to,
      subject,
      html,
      text,
      datosPrueba,
      motivo: 'MAIL_MODE=test; no se utiliza SMTP.'
    });

    return { enviado: false, simulado: true, modo: 'console' };
  }

  if (modo === 'production') {
    const transporter = crearTransporterProduccion();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text
    });

    return { enviado: true, simulado: false, messageId: info.messageId };
  }

  if (modo !== 'ethereal') {
    throw new Error(`MAIL_MODE no valido: ${modo}. Use test, ethereal o production.`);
  }

  const transporter = await crearTransporterPrueba();

  if (!transporter) {
    imprimirCorreoSimulado({
      to,
      subject,
      html,
      text,
      datosPrueba,
      motivo: 'Nodemailer no esta instalado; se muestra en consola.'
    });

    return { enviado: false, simulado: true, modo: 'console' };
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Clinica Universitaria" <no-reply@unicaes.test>',
    to,
    subject,
    html,
    text
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log('================ CORREO ETHEREAL ================');
  console.log('Para:', to);
  console.log('Asunto:', subject);
  console.log('Vista previa:', previewUrl);
  console.log('Usuario Ethereal:', transporter.__etherealAccount?.user);
  console.log('==================================================');

  return {
    enviado: true,
    simulado: true,
    modo: 'ethereal',
    previewUrl,
    messageId: info.messageId
  };
};

const limpiarHtml = (html = '') => String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

module.exports = { enviarCorreo };
