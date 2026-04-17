// @ts-nocheck
import { useCallback } from 'react';
import { db } from '../../../services/db';
import type { Reclamo, NotificacionSimulada, EstadoReclamo } from '../types/reclamo.types';

function ahora() {
  return new Date().toISOString();
}

function formatFecha(iso: string) {
  return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '-';
}

// Base HTML para emails al funcionario (estilo notificación amigable)
function htmlFuncionario(titulo: string, cuerpo: string, logoDataUrl?: string) {
  const logoHtml = logoDataUrl
    ? `<div style="margin-bottom:10px"><img src="${logoDataUrl}" alt="Logo" style="max-height:52px;max-width:180px;object-fit:contain" /></div>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:auto;padding:24px;background:#f9f9f9">
<div style="background:#262626;color:#e2e8f0;padding:18px 24px;border-radius:10px 10px 0 0">
  ${logoHtml}
  <h2 style="margin:0;font-size:17px;font-weight:600">${titulo}</h2>
</div>
<div style="background:#fff;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;padding:24px">
  ${cuerpo}
</div>
<p style="color:#aaa;font-size:11px;margin-top:14px;text-align:center">
  Este es un mensaje automático del sistema Dataflow. No responder a este correo.
</p>
</body></html>`;
}

// Base HTML para email a Sueldos (respaldo operacional, estilo más sobrio/funcional)
function htmlSueldos(titulo: string, cuerpo: string, logoDataUrl?: string) {
  const logoHtml = logoDataUrl
    ? `<div style="margin-bottom:8px"><img src="${logoDataUrl}" alt="Logo" style="max-height:40px;max-width:140px;object-fit:contain" /></div>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:'Courier New',monospace;color:#1a1a1a;max-width:680px;margin:auto;padding:20px;background:#f4f4f4">
<div style="background:#2d2d2d;color:#f0f0f0;padding:12px 20px;border-radius:6px 6px 0 0;display:flex;align-items:center;gap:12px">
  ${logoHtml}
  <div>
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:0.6;font-family:Arial,sans-serif">RESPALDO SISTEMA DATAFLOW</div>
    <div style="font-size:15px;font-weight:700;font-family:Arial,sans-serif">${titulo}</div>
  </div>
</div>
<div style="background:#fff;border:1px solid #ccc;border-top:3px solid #2d2d2d;padding:20px">
  ${cuerpo}
</div>
<p style="color:#999;font-size:10px;margin-top:10px;font-family:Arial,sans-serif">
  Mensaje automático generado por Dataflow · Solo para uso interno · No responder
</p>
</body></html>`;
}

// Tabla de datos del reclamo (para el email al funcionario en la primera notificación)
function tablaDetallesFuncionario(r: Reclamo) {
  return `<table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;font-family:Arial,sans-serif">
  <tr><td style="padding:7px 10px;background:#f7f7f7;width:38%;font-weight:600;border-bottom:1px solid #eee">Nro. de ticket</td><td style="padding:7px 10px;border-bottom:1px solid #eee;font-family:monospace">${r.ticket}</td></tr>
  <tr><td style="padding:7px 10px;background:#f7f7f7;font-weight:600;border-bottom:1px solid #eee">Liquidación</td><td style="padding:7px 10px;border-bottom:1px solid #eee">${r.liquidacion || '—'}</td></tr>
  <tr><td style="padding:7px 10px;background:#f7f7f7;font-weight:600;border-bottom:1px solid #eee">Tipo de reclamo</td><td style="padding:7px 10px;border-bottom:1px solid #eee">${r.tipoReclamo || '—'}</td></tr>
  <tr><td style="padding:7px 10px;background:#f7f7f7;font-weight:600;border-bottom:1px solid #eee">Causal</td><td style="padding:7px 10px;border-bottom:1px solid #eee">${r.causal || '—'}</td></tr>
  <tr><td style="padding:7px 10px;background:#f7f7f7;font-weight:600;border-bottom:1px solid #eee">Descripción</td><td style="padding:7px 10px;border-bottom:1px solid #eee">${r.descripcion || '—'}</td></tr>
  <tr><td style="padding:7px 10px;background:#f7f7f7;font-weight:600;border-bottom:1px solid #eee">Fecha de emisión</td><td style="padding:7px 10px;border-bottom:1px solid #eee">${formatFecha(r.fechaEmision)}</td></tr>
</table>`;
}

// Tabla operacional completa (para el respaldo a Sueldos)
function tablaOperacionalSueldos(r: Reclamo) {
  return `<table style="width:100%;border-collapse:collapse;font-size:12px;font-family:Arial,sans-serif;border:1px solid #ccc">
  <tr style="background:#2d2d2d;color:#fff">
    <td colspan="2" style="padding:8px 12px;font-weight:700;letter-spacing:0.5px">DATOS DEL RECLAMO</td>
  </tr>
  <tr><td style="padding:6px 10px;background:#f0f0f0;width:35%;font-weight:600;border-bottom:1px solid #ddd">Ticket</td><td style="padding:6px 10px;border-bottom:1px solid #ddd;font-family:monospace;font-weight:700">${r.ticket}</td></tr>
  <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Nro. Funcionario</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${r.nroFuncionario}</td></tr>
  <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Nombre</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${r.nombreFuncionario}</td></tr>
  <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Email funcionario</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${r.emailFuncionario}</td></tr>
  <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Cargo</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${r.cargo || '—'}</td></tr>
  <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Centro de costo</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${r.centroCosto || '—'}</td></tr>
  <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Liquidación origen</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${r.liquidacion || '—'}</td></tr>
  ${r.paraLiquidacion ? `<tr><td style="padding:6px 10px;background:#fffbe6;font-weight:600;border-bottom:1px solid #ddd">Para liquidación</td><td style="padding:6px 10px;border-bottom:1px solid #ddd;font-weight:700">${r.paraLiquidacion}</td></tr>` : ''}
  <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Tipo de reclamo</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${r.tipoReclamo || '—'}</td></tr>
  <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Causal</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${r.causal || '—'}</td></tr>
  <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Estado inicial</td><td style="padding:6px 10px;border-bottom:1px solid #ddd"><strong>${r.estado}</strong></td></tr>
  <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Fecha emisión</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${formatFecha(r.fechaEmision)}</td></tr>
  <tr><td style="padding:6px 10px;background:#f0f0f0;font-weight:600;border-bottom:1px solid #ddd">Emisor (RRHH)</td><td style="padding:6px 10px;border-bottom:1px solid #ddd">${r.emisorNombre}</td></tr>
  <tr style="background:#fffbe6">
    <td style="padding:6px 10px;font-weight:600;border-bottom:1px solid #ddd;vertical-align:top">Descripción</td>
    <td style="padding:6px 10px;border-bottom:1px solid #ddd;white-space:pre-wrap">${r.descripcion || '—'}</td>
  </tr>
</table>`;
}

export function useNotificaciones() {

  // 1. Al crear el reclamo: email al funcionario (con detalles) + email a Sueldos (respaldo, una sola vez)
  const generarNotificacionCreacion = useCallback((reclamo: Reclamo) => {
    const config = db.reclamosConfig.get();
    const fechaHoy = formatFecha(ahora());

    // — Email al funcionario: confirmación amigable con detalles del reclamo —
    const notifFuncionario: NotificacionSimulada = {
      tipo: 'email',
      destinatario: reclamo.emailFuncionario,
      fecha: ahora(),
      asunto: `Reclamo registrado — ${reclamo.ticket}`,
      cuerpo: htmlFuncionario(
        `Tu reclamo fue registrado`,
        `<p style="font-size:14px;font-family:Arial,sans-serif">Estimado/a <strong>${reclamo.nombreFuncionario}</strong>,</p>
        <p style="font-family:Arial,sans-serif;color:#444">Tu reclamo ha sido registrado exitosamente el <strong>${fechaHoy}</strong> y fue enviado al área de <strong>Sueldos</strong> para su procesamiento.</p>
        ${tablaDetallesFuncionario(reclamo)}
        <p style="font-family:Arial,sans-serif;color:#666;font-size:13px">Te avisaremos cuando haya novedades sobre tu reclamo.</p>`,
        config.logoDataUrl
      ),
    };
    db.reclamos.addNotificacion(reclamo.id, notifFuncionario);

    // — Email a Sueldos: respaldo operacional (una sola vez) —
    const emailDestino = config.emailSueldos || 'sueldos@empresa.com.uy';
    const notifSueldos: NotificacionSimulada = {
      tipo: 'email',
      destinatario: emailDestino,
      fecha: ahora(),
      asunto: `[RESPALDO] ${reclamo.ticket} — ${reclamo.nombreFuncionario} — ${reclamo.tipoReclamo || 'Reclamo'}`,
      cuerpo: htmlSueldos(
        `Nuevo reclamo: ${reclamo.ticket}`,
        `<p style="font-family:Arial,sans-serif;font-size:13px;color:#333;margin-bottom:16px">
          Se generó un nuevo reclamo en el sistema Dataflow el <strong>${fechaHoy}</strong>. Este es el registro completo para archivos de Sueldos.
        </p>
        ${tablaOperacionalSueldos(reclamo)}`,
        config.logoDataUrl
      ),
    };
    db.reclamos.addNotificacion(reclamo.id, notifSueldos);
  }, []);

  // 2. Cuando Sueldos visualiza el reclamo por primera vez (estado "Emitido"):
  //    email al funcionario avisando que llegó a Sueldos — sin detalles/motivos
  const generarNotificacionVistaEnSueldos = useCallback((reclamo: Reclamo) => {
    const config = db.reclamosConfig.get();
    const notif: NotificacionSimulada = {
      tipo: 'email',
      destinatario: reclamo.emailFuncionario,
      fecha: ahora(),
      asunto: `Reclamo ${reclamo.ticket} — Recibido por Sueldos`,
      cuerpo: htmlFuncionario(
        `Tu reclamo llegó a Sueldos`,
        `<p style="font-size:14px;font-family:Arial,sans-serif">Estimado/a <strong>${reclamo.nombreFuncionario}</strong>,</p>
        <p style="font-family:Arial,sans-serif;color:#444">Te informamos que tu reclamo <strong style="font-family:monospace">${reclamo.ticket}</strong> fue recibido por el área de <strong>Sueldos</strong> y está siendo revisado.</p>
        <p style="font-family:Arial,sans-serif;color:#666;font-size:13px">Te avisaremos cuando haya novedades.</p>`,
        config.logoDataUrl
      ),
    };
    db.reclamos.addNotificacion(reclamo.id, notif);
  }, []);

  // 3. Cuando cambia el estado (En proceso, Liquidado, Rechazado/Duda):
  //    email al funcionario con el nuevo estado.
  //    Si el nuevo estado es 'Liquidado' y config.notificarLiquidado === false, no se envía.
  const generarNotificacionCambioEstado = useCallback(
    (reclamo: Reclamo, estadoAnterior: EstadoReclamo, nota?: string) => {
      const config = db.reclamosConfig.get();

      // Si pasa a Liquidado y el toggle está desactivado → no generar notificación
      if (reclamo.estado === 'Liquidado' && !config.notificarLiquidado) return;

      const fechaHoy = formatFecha(ahora());
      const notaHtml = nota
        ? `<p style="font-family:Arial,sans-serif;color:#444;margin-top:12px"><strong>Nota de Sueldos:</strong> ${nota}</p>`
        : '';

      let mensaje = '';
      if (reclamo.estado === 'Liquidado') {
        const paraLiq = reclamo.paraLiquidacion
          ? ` Se acreditará en la liquidación <strong>${reclamo.paraLiquidacion}</strong>.`
          : '';
        mensaje = `Tu reclamo fue procesado y <strong>liquidado</strong> exitosamente.${paraLiq}`;
      } else if (reclamo.estado === 'Rechazado/Duda de reclamo') {
        mensaje = `Tu reclamo fue <strong>rechazado o marcado con duda</strong> por el área de Sueldos.`;
      } else {
        mensaje = `El estado de tu reclamo fue actualizado a <strong>${reclamo.estado}</strong>.`;
      }

      // Bloque adicional con para-liquidación (solo en Liquidado)
      const paraLiqHtml = reclamo.estado === 'Liquidado' && reclamo.paraLiquidacion
        ? `<div style="margin:12px 0;padding:10px 16px;background:#f0fdf4;border-left:3px solid #22c55e;border-radius:4px;font-family:Arial,sans-serif;font-size:13px">
            <strong style="color:#166534">Para liquidación:</strong>
            <span style="color:#14532d;font-weight:700;margin-left:6px">${reclamo.paraLiquidacion}</span>
           </div>`
        : '';

      const notif: NotificacionSimulada = {
        tipo: 'email',
        destinatario: reclamo.emailFuncionario,
        fecha: ahora(),
        asunto: `Reclamo ${reclamo.ticket} — ${reclamo.estado}`,
        cuerpo: htmlFuncionario(
          `Actualización de tu reclamo`,
          `<p style="font-size:14px;font-family:Arial,sans-serif">Estimado/a <strong>${reclamo.nombreFuncionario}</strong>,</p>
          <p style="font-family:Arial,sans-serif;color:#444">${mensaje}</p>
          ${paraLiqHtml}
          <div style="display:inline-block;margin:12px 0;padding:10px 18px;background:#f5f5f5;border-radius:6px;font-family:Arial,sans-serif;font-size:13px">
            Ticket: <strong style="font-family:monospace">${reclamo.ticket}</strong>
            &nbsp;·&nbsp;
            <span style="color:#888">${estadoAnterior}</span>
            &nbsp;→&nbsp;
            <strong style="color:#1a1a2e">${reclamo.estado}</strong>
          </div>
          ${notaHtml}
          <p style="font-family:Arial,sans-serif;color:#999;font-size:12px;margin-top:12px">Fecha: ${fechaHoy}</p>`,
          config.logoDataUrl
        ),
      };
      db.reclamos.addNotificacion(reclamo.id, notif);
    },
    []
  );

  return {
    generarNotificacionCreacion,
    generarNotificacionVistaEnSueldos,
    generarNotificacionCambioEstado,
  };
}
