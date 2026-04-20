// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from "react";
import Avatar from "../../components/Avatar";
import { changePassword, updateMyProfile } from "../../lib/auth";
import { ROLES } from "../../types";

export function ProfileModal({
  me,
  onClose,
  onSaved,
  forcePasswordChange = false,
  onPasswordChangedSuccess,
}: {
  me: any;
  onClose: () => void;
  onSaved: (u: any) => void;
  forcePasswordChange?: boolean;
  onPasswordChangedSuccess?: () => void;
}) {
  const [displayName, setDisplayName] = useState(me.displayName || me.username);
  const [title, setTitle] = useState(me.title || "");
  const [avatar, setAvatar] = useState<string>(me.avatarDataUrl || "");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);
  const [avatarMode, setAvatarMode] = useState<"none" | "upload" | "draw">("none");

  const roleKey = String(me?.role ?? me?.roleId ?? "");
  const roleLabel = ROLES.find((r) => String(r.key) === roleKey)?.label || roleKey || "Invitado";

  function isStrong(p: string) {
    return p.length >= 8 && /[a-zA-Z]/.test(p) && /\d/.test(p);
  }

  async function onPickAvatar(e: any) {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Subí una imagen válida (PNG/JPG)."); return; }
    const reader = new FileReader();
    reader.onload = () => { setAvatar(String(reader.result || "")); setAvatarMode("none"); };
    reader.readAsDataURL(file);
  }

  async function handleChangePassword() {
    const curr = currentPass.trim();
    const next = newPass.trim();
    const conf = confirmPass.trim();
    if (!forcePasswordChange && !curr) { alert("Completá todos los campos de contraseña."); return; }
    if (!next || !conf) { alert("Completá todos los campos de contraseña."); return; }
    if (next !== conf) { alert("La nueva contraseña y la confirmación no coinciden."); return; }
    if (!isStrong(next)) { alert("La nueva contraseña debe tener al menos 8 caracteres y combinar letras y números."); return; }
    setChangingPwd(true);
    try {
      const res: any = await changePassword(me.id, forcePasswordChange ? "" : curr, next);
      if (!res?.ok) { alert(res?.error || "No se pudo cambiar la contraseña."); return; }
      alert("Contraseña actualizada.");
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
      onPasswordChangedSuccess && onPasswordChangedSuccess();
    } catch (e) {
      console.error(e);
      alert("Error al cambiar la contraseña.");
    } finally {
      setChangingPwd(false);
    }
  }

  async function save() {
    const updated = { ...me, displayName: displayName.trim() || me.username, title: title.trim(), avatarDataUrl: avatar || "" };
    try {
      await updateMyProfile(me.id, {
        displayName: updated.displayName,
        title: updated.title,
        avatarDataUrl: updated.avatarDataUrl,
      });
    } catch (e) {
      console.error('[profile] save:', e);
    }
    onSaved(updated);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{forcePasswordChange ? "Cambiar contraseña" : "Mi perfil"}</h3>
          {!forcePasswordChange && (
            <button type="button" onClick={onClose} style={{ padding: '4px 10px' }} className="text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800">Cerrar</button>
          )}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Avatar src={avatar} name={displayName} size={48} />
          <div className="text-xs text-neutral-400">
            <div>Usuario: <span className="text-neutral-200">{me.username}</span></div>
            <div>Rol: <span className="text-neutral-200">{roleLabel}</span></div>
            {forcePasswordChange && <div className="text-amber-400 mt-1">Tenés una contraseña temporal. Definí una nueva para continuar.</div>}
          </div>
        </div>

        {!forcePasswordChange && (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-neutral-300">Nombre visible</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none" placeholder="Ej.: Juana Pérez" />
            </div>
            <div>
              <label className="text-sm text-neutral-300">Cargo</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none" placeholder="Ej.: Analista de Sueldos" />
            </div>

            {/* Avatar */}
            <div>
              <label className="text-sm text-neutral-300 block mb-2">Foto de perfil</label>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setAvatarMode(avatarMode === "upload" ? "none" : "upload")}
                  style={{ padding: '5px 12px' }}
                  className={`rounded-xl text-xs border transition-colors ${avatarMode === "upload" ? "border-blue-500/60 bg-blue-500/10 text-blue-300" : "border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300"}`}
                >
                  📎 Subir imagen
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarMode(avatarMode === "draw" ? "none" : "draw")}
                  style={{ padding: '5px 12px' }}
                  className={`rounded-xl text-xs border transition-colors ${avatarMode === "draw" ? "border-purple-500/60 bg-purple-500/10 text-purple-300" : "border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300"}`}
                >
                  🎨 Dibujar
                </button>
                {avatar && (
                  <button
                    type="button"
                    onClick={() => { setAvatar(""); setAvatarMode("none"); }}
                    style={{ padding: '5px 12px' }}
                    className="rounded-xl text-xs border border-neutral-700 bg-neutral-800 hover:bg-rose-900/40 hover:text-rose-300 hover:border-rose-800 text-neutral-400 transition-colors"
                  >
                    ✕ Quitar
                  </button>
                )}
              </div>

              {avatarMode === "upload" && (
                <input type="file" accept="image/*" onChange={onPickAvatar} className="text-sm text-neutral-400" />
              )}

              {avatarMode === "draw" && (
                <AvatarDrawer currentAvatar={avatar} onSave={(dataUrl) => { setAvatar(dataUrl); setAvatarMode("none"); }} />
              )}
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-neutral-800 space-y-2">
          <div className="text-sm font-medium text-neutral-200">
            Cambiar contraseña{" "}
            {forcePasswordChange && <span className="ml-1 text-xs text-amber-400">(obligatorio por contraseña temporal)</span>}
          </div>
          <p className="text-xs text-neutral-400">Debe tener al menos 8 caracteres e incluir letras y números.</p>
          <div className="space-y-2">
            {!forcePasswordChange && <input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none" placeholder="Contraseña actual" />}
            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none" placeholder="Nueva contraseña" />
            <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none" placeholder="Repetir nueva contraseña" />
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleChangePassword} disabled={changingPwd} style={{ padding: '8px 14px' }} className="rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm">
              {changingPwd ? "Guardando…" : "Actualizar contraseña"}
            </button>
          </div>
        </div>

        {!forcePasswordChange && (
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} style={{ padding: '8px 14px' }} className="rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-sm">Cancelar</button>
            <button type="button" onClick={save} style={{ padding: '8px 14px' }} className="rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm">Guardar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mini editor de avatar con canvas ──────────────────────────────────────────

const PALETTE = [
  "#ffffff","#e2e8f0","#94a3b8","#475569","#1e293b","#0f172a",
  "#f87171","#fb923c","#fbbf24","#a3e635","#34d399","#22d3ee",
  "#60a5fa","#a78bfa","#f472b6","#e11d48",
];
const CANVAS_SIZE = 160;
const PX = 10; // tamaño de cada "pixel" del editor
const GRID = CANVAS_SIZE / PX; // 16 celdas

function AvatarDrawer({ currentAvatar, onSave }: { currentAvatar: string; onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState("#60a5fa");
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const [drawing, setDrawing] = useState(false);

  // Inicializar con el avatar actual si es un dataURL (no SVG generado)
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (currentAvatar && currentAvatar.startsWith("data:image/")) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      };
      img.src = currentAvatar;
    }
  }, []);

  function getCell(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / PX);
    const y = Math.floor((e.clientY - rect.top) * scaleY / PX);
    return { x: Math.min(x, GRID - 1), y: Math.min(y, GRID - 1) };
  }

  function paint(e: React.MouseEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCell(e);
    ctx.fillStyle = tool === "erase" ? "#1a1a1a" : color;
    ctx.fillRect(x * PX, y * PX, PX, PX);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setDrawing(true);
    paint(e);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    paint(e);
  }

  function handleMouseUp() { setDrawing(false); }

  function limpiar() {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  function guardar() {
    const dataUrl = canvasRef.current?.toDataURL("image/png");
    if (dataUrl) onSave(dataUrl);
  }

  return (
    <div className="rounded-xl border border-neutral-700 bg-neutral-800/60 p-3 space-y-3">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: "block",
          width: "160px",
          height: "160px",
          imageRendering: "pixelated",
          borderRadius: "50%",
          cursor: tool === "erase" ? "cell" : "crosshair",
          border: "2px solid #404040",
        }}
      />

      {/* Paleta */}
      <div className="flex flex-wrap gap-1">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { setColor(c); setTool("draw"); }}
            style={{
              width: "18px",
              height: "18px",
              background: c,
              borderRadius: "4px",
              border: color === c && tool === "draw" ? "2px solid white" : "2px solid transparent",
              padding: 0,
            }}
            title={c}
          />
        ))}
      </div>

      {/* Herramientas + acciones */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setTool("draw")}
          style={{ padding: '4px 10px' }}
          className={`rounded-lg text-xs border transition-colors ${tool === "draw" ? "border-blue-500/60 bg-blue-500/10 text-blue-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}
        >
          ✏️ Pincel
        </button>
        <button
          type="button"
          onClick={() => setTool("erase")}
          style={{ padding: '4px 10px' }}
          className={`rounded-lg text-xs border transition-colors ${tool === "erase" ? "border-amber-500/60 bg-amber-500/10 text-amber-300" : "border-neutral-700 bg-neutral-800 text-neutral-400"}`}
        >
          ⬜ Borrar
        </button>
        <button
          type="button"
          onClick={limpiar}
          style={{ padding: '4px 10px' }}
          className="rounded-lg text-xs border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
        >
          🗑 Limpiar
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={guardar}
          style={{ padding: '4px 12px' }}
          className="rounded-lg text-xs border border-purple-500/60 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-medium"
        >
          Usar como avatar
        </button>
      </div>
    </div>
  );
}
