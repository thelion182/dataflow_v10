/**
 * mailer.js — envío de emails via SMTP (Zimbra o cualquier servidor compatible)
 *
 * Configurar en backend/.env:
 *   SMTP_HOST=mail.circulocatolico.com.uy
 *   SMTP_PORT=587
 *   SMTP_USER=dataflow@circulocatolico.com.uy
 *   SMTP_PASS=clave
 *
 * Si SMTP_HOST no está configurado, sendMail() no hace nada (no rompe la app).
 */
const nodemailer = require('nodemailer');

let transporter = null;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false }, // necesario en Zimbra interno sin cert público
  });
  console.log(`[mailer] SMTP configurado → ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`);
} else {
  console.log('[mailer] SMTP_HOST no configurado — emails desactivados');
}

/**
 * Envía un email. Fire-and-forget: los errores se loguean pero no propagan.
 * Si SMTP no está configurado, no hace nada.
 */
async function sendMail({ to, subject, html }) {
  if (!transporter) return;
  if (!to) return;
  try {
    await transporter.sendMail({
      from: `"Dataflow RRHH" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[mailer] Email enviado → ${to} | ${subject}`);
  } catch (err) {
    console.error(`[mailer] Error al enviar email → ${to}:`, err.message);
  }
}

/**
 * Genera el HTML del email de cambio de estado de reclamo.
 */
function htmlCambioEstado({ ticket, nombreFuncionario, estadoAnterior, nuevoEstado, nota, logoUrl }) {
  const colorEstado = {
    'Emitido':               '#f59e0b',
    'En proceso':            '#3b82f6',
    'Liquidado':             '#22c55e',
    'Rechazado/Duda de reclamo': '#ef4444',
  }[nuevoEstado] || '#6b7280';

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:24px 32px;text-align:center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="height:48px;margin-bottom:8px;"><br>` : ''}
            <span style="color:#ffffff;font-size:20px;font-weight:600;letter-spacing:-0.5px;">Dataflow</span>
            <span style="color:#71717a;font-size:14px;display:block;margin-top:4px;">Sistema de Gestión RRHH · Círculo Católico</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Actualización de reclamo</p>
            <h2 style="margin:0 0 24px;color:#18181b;font-size:22px;">${ticket}</h2>

            <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;">
              Estimado/a <strong>${nombreFuncionario}</strong>,<br>
              su reclamo cambió de estado.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td width="48%" style="background:#f4f4f5;border-radius:8px;padding:14px 16px;text-align:center;">
                  <span style="color:#71717a;font-size:11px;text-transform:uppercase;display:block;margin-bottom:4px;">Estado anterior</span>
                  <span style="color:#3f3f46;font-size:14px;font-weight:500;">${estadoAnterior}</span>
                </td>
                <td width="4%" style="text-align:center;color:#a1a1aa;font-size:18px;">→</td>
                <td width="48%" style="background:${colorEstado}18;border:1.5px solid ${colorEstado}44;border-radius:8px;padding:14px 16px;text-align:center;">
                  <span style="color:#71717a;font-size:11px;text-transform:uppercase;display:block;margin-bottom:4px;">Nuevo estado</span>
                  <span style="color:${colorEstado};font-size:14px;font-weight:700;">${nuevoEstado}</span>
                </td>
              </tr>
            </table>

            ${nota ? `
            <div style="background:#fafafa;border-left:3px solid #e4e4e7;border-radius:4px;padding:12px 16px;margin-bottom:24px;">
              <span style="color:#71717a;font-size:11px;text-transform:uppercase;display:block;margin-bottom:4px;">Nota</span>
              <p style="margin:0;color:#3f3f46;font-size:14px;">${nota}</p>
            </div>` : ''}

            <p style="margin:0;color:#a1a1aa;font-size:12px;">
              Para consultas, comuníquese con el área de RRHH de Círculo Católico.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f5;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#a1a1aa;font-size:11px;">Este es un mensaje automático generado por Dataflow. No responder a este email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { sendMail, htmlCambioEstado };
