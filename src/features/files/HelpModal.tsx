// @ts-nocheck
import React from "react";

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        <h3 className="text-xl font-semibold mb-3">Guía rápida</h3>

        <p className="text-neutral-300 text-sm mb-4">
          Esta guía resume cómo funciona Dataflow según cada rol y los estados disponibles.
        </p>

        <div className="space-y-4 text-sm text-neutral-300">
          <div>
            <h4 className="font-semibold text-neutral-100 mb-1">Roles</h4>
            <ul className="list-disc ml-5 space-y-1">
              <li><b>Información (RRHH):</b> sube archivos, marca estados, responde dudas y crea arreglos.</li>
              <li><b>Sueldos:</b> descarga archivos, marca observado/descargado, responde dudas.</li>
              <li><b>Admin:</b> gestiona usuarios, roles y permisos.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-neutral-100 mb-1">Estados de archivos</h4>
            <ul className="list-disc ml-5 space-y-1">
              <li><b>Cargado:</b> archivo subido por Información.</li>
              <li><b>Actualizado:</b> se subió una nueva versión.</li>
              <li><b>Listo para descargar:</b> Información lo preparó.</li>
              <li><b>Descargado:</b> Sueldos lo descargó.</li>
              <li><b>Observado:</b> Sueldos dejó una duda o pedido.</li>
              <li><b>Duda pendiente / respondida:</b> comunicación entre Sueldos e Información.</li>
              <li><b>Sustituido:</b> se reemplazó por otra versión.</li>
              <li><b>Eliminado:</b> no debe descargarse.</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-neutral-100 mb-1">Dudas & Arreglos</h4>
            <p>
              Las <b>dudas</b> son consultas de Sueldos.<br />
              Los <b>arreglos</b> son solicitudes de RRHH hacia Sueldos con detalles de códigos, actividades o cantidades.
            </p>
          </div>
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
    </div>
  );
}
