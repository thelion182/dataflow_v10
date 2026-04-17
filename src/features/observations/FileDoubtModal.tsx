// @ts-nocheck
import React, { useRef } from "react";
import AutoGrowTextarea from "../../components/AutoGrowTextarea";

export function FileDoubtModal({
  fileDoubtDialog, setFileDoubtDialog,
  cancelFileDoubt, confirmFileDoubt, fileForDoubt,
}: any) {
  const imgInputRef = useRef<HTMLInputElement>(null);

  if (!fileDoubtDialog.open) return null;

  const imageDataUrl = fileDoubtDialog.imageDataUrl || "";

  function handleImageChange(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Solo se admiten imágenes (JPG, PNG, GIF, WEBP)."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("La imagen no puede superar 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileDoubtDialog((s: any) => ({ ...s, imageDataUrl: ev.target?.result || "" }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeImage() {
    setFileDoubtDialog((s: any) => ({ ...s, imageDataUrl: "" }));
    if (imgInputRef.current) imgInputRef.current.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-neutral-800">
          <h3 className="font-semibold text-neutral-100">Duda de archivo</h3>
          {fileForDoubt && (
            <p className="text-xs text-neutral-400 mt-1">
              <span className="text-neutral-200 font-medium">{fileForDoubt.name}</span>
            </p>
          )}
          <p className="text-xs text-neutral-500 mt-1">
            Duda general del archivo, sin asociar a un funcionario específico.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Texto */}
          <div>
            <label className="block text-[11px] text-neutral-500 mb-1">Descripción de la duda</label>
            <AutoGrowTextarea
              value={fileDoubtDialog.text}
              onChange={(v) => setFileDoubtDialog((s: any) => ({ ...s, text: v }))}
              placeholder="Ej.: El archivo .txt da error al cargar en contacto…"
              className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-neutral-100 outline-none focus:border-neutral-500 placeholder:text-neutral-600 resize-none min-h-[120px]"
            />
          </div>

          {/* Imagen adjunta */}
          <div>
            <label className="block text-[11px] text-neutral-500 mb-2">
              Imagen adjunta <span className="text-neutral-600">(opcional · JPG, PNG, GIF, WEBP · máx. 5 MB)</span>
            </label>

            {imageDataUrl ? (
              /* Preview */
              <div className="relative inline-block">
                <img
                  src={imageDataUrl}
                  alt="Adjunto"
                  className="max-h-48 rounded-xl border border-neutral-700 object-contain bg-neutral-950"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-neutral-900/90 border border-neutral-700 text-neutral-400 hover:text-rose-400 hover:border-rose-800 text-xs transition-colors"
                  title="Quitar imagen"
                >
                  ✕
                </button>
              </div>
            ) : (
              /* Zona de carga */
              <button
                type="button"
                onClick={() => imgInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 bg-neutral-800/50 hover:bg-neutral-800 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 20M2 6a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                Adjuntar imagen
              </button>
            )}

            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-neutral-800 flex justify-end gap-2">
          <button
            onClick={cancelFileDoubt}
            className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-sm text-neutral-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmFileDoubt}
            className="px-4 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-600 border border-amber-500/60 text-sm text-white font-medium transition-colors"
          >
            Confirmar duda
          </button>
        </div>
      </div>
    </div>
  );
}
