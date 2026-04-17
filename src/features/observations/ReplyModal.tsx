// @ts-nocheck
import React from "react";
import AutoGrowTextarea from "../../components/AutoGrowTextarea";
export function ReplyModal({ replyDialog, closeReplyDialog, replyInputs, setReplyInputs, answerObservation }: any) {
  return (
    <>
      {/* MODAL: Responder Duda (Información) */}
{replyDialog.open && (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Responder duda</h3>
          <p className="text-sm text-neutral-400">
            Escribí la respuesta de Información. Al confirmar, Sueldos podrá marcarla como “Procesada”.
          </p>
        </div>

        <button
          onClick={closeReplyDialog}
          className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800"
        >
          Cerrar
        </button>
      </div>

      <div className="mt-3">
        <AutoGrowTextarea
          value={replyDialog.key ? (replyInputs[replyDialog.key] || "") : ""}
          onChange={(v) => {
            const k = replyDialog.key;
            if (!k) return;
            setReplyInputs((s: any) => ({ ...s, [k]: v }));
          }}
          placeholder="Escribí tu respuesta…"
          className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none min-h-[180px]"
        />
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={closeReplyDialog}
          className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800"
        >
          Cancelar
        </button>

        <button
          onClick={() => {
            if (!replyDialog.fileId || !replyDialog.threadId || !replyDialog.rowId) return;
            answerObservation(replyDialog.fileId, replyDialog.threadId, replyDialog.rowId);
            closeReplyDialog();
          }}
          className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"
        >
          Confirmar respuesta
        </button>
      </div>
    </div>
  </div>
)}
    </>
  );
}
