// @ts-nocheck
import React from "react";
import { createPortal } from "react-dom";

export function HelpModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Guía rápida — Dataflow</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-5 text-sm text-neutral-300">

          <section>
            <h4 className="font-semibold text-neutral-100 mb-2">Roles</h4>
            <ul className="list-disc ml-5 space-y-1">
              <li><b>Información (RRHH):</b> sube archivos, responde dudas, crea arreglos, emite reclamos.</li>
              <li><b>Sueldos:</b> descarga archivos, registra dudas sobre funcionarios, procesa dudas respondidas.</li>
              <li><b>Admin:</b> gestiona usuarios, roles, períodos, sectores y sedes.</li>
              <li><b>Superadmin:</b> acceso total, auditoría, reset de liquidaciones.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-semibold text-neutral-100 mb-2">Flujo de trabajo</h4>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Información sube los archivos del período.</li>
              <li>Sueldos descarga y, si tiene dudas, las registra.</li>
              <li>Información ve las dudas y las responde desde el detalle del archivo.</li>
              <li>Sueldos procesa las dudas respondidas (individualmente o en lote desde <b>Procesar dudas / arreglos</b>).</li>
              <li>Cuando todas las dudas están procesadas, el archivo pasa a <b>Procesado ✓</b>.</li>
            </ol>
          </section>

          <section>
            <h4 className="font-semibold text-neutral-100 mb-2">Estados automáticos de archivos</h4>
            <ul className="space-y-1">
              <li><span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 text-xs">Enviado</span> — subido por Información, sin dudas.</li>
              <li><span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 text-xs">Con dudas</span> — hay al menos una duda sin responder.</li>
              <li><span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-xs">Pend. de procesar</span> — todas las dudas respondidas pero aún no procesadas por Sueldos.</li>
              <li><span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs">Procesado ✓</span> — todas las dudas respondidas y procesadas.</li>
              <li><span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs">Descargado</span> — Sueldos descargó el archivo.</li>
              <li><span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs">Actualizado</span> — se subió una versión nueva.</li>
            </ul>
            <p className="text-xs text-neutral-500 mt-1">Los estados se calculan automáticamente según las dudas y arreglos del archivo.</p>
          </section>

          <section>
            <h4 className="font-semibold text-neutral-100 mb-2">Dudas y Arreglos</h4>
            <p>
              Las <b>dudas</b> son consultas registradas por Sueldos sobre funcionarios específicos.
              Información las responde; luego Sueldos las procesa.
            </p>
            <p className="mt-1">
              Los <b>arreglos</b> son solicitudes de Información hacia Sueldos (altas, bajas, modificaciones de códigos, etc.).
              También siguen el ciclo respondido → procesado.
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-neutral-100 mb-2">Herramientas clave</h4>
            <ul className="list-disc ml-5 space-y-1">
              <li><b>Procesar dudas / arreglos</b> (botón en filtros, solo Sueldos): procesa en lote todas las dudas y arreglos respondidos.</li>
              <li><b>Ver por sector</b> (botón en filtros, todos los roles): vista agrupada por sede y sector con indicadores de estado.</li>
              <li><b>Campana</b> (arriba a la derecha): historial de notificaciones en tiempo real.</li>
              <li><b>⚙️ Configuración</b> (en el menú de usuario): activar/desactivar notificaciones por categoría.</li>
            </ul>
          </section>

          <section>
            <h4 className="font-semibold text-neutral-100 mb-2">Reclamos</h4>
            <p>El módulo de Reclamos permite gestionar reclamos de haberes de funcionarios, con historial de estados, notas internas y notificaciones.</p>
          </section>

        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
