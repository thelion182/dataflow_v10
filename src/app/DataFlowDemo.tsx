// @ts-nocheck
import React, { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";


// 1) Estados de animación (NUEVO)
type User = { id: string; name: string; role: string }; // ajustá a tu forma real si querés

/* =========================
   IMPORTS (ajustá rutas)
   ========================= */

// Tipos / constantes de dominio
import { STATUS, ROLES } from "../types";
import { db } from "../services/db";
import Splash from "../components/Splash";
// Helpers base
import { cls } from "../lib/cls";
import { uuid } from "../lib/ids";
import { nowISO, formatDate, monthName } from "../lib/time";
import { prettyBytes } from "../lib/bytes";
import type { DownloadLogEntry, SectorConfig, SiteConfig } from "../types";

// ==== Arreglos de Información (tipos + helper) ====
type AjusteAccion = "alta" | "modificar" | "baja";

type AjusteFila = {
  id: string;
  nro: string;
  nombre: string;
  cargo: string;
  accion: AjusteAccion;

  // Campos actuales
  codigo?: string;        // máx 5 caracteres
  codDesc?: string;       // descripción del código
  dhc?: string;           // Días / Horas / Cantidades
  actividad?: string;
  cc?: string;              // 👈 NUEVO: Centro de costo
  nota?: string;

  // ✅ NUEVOS CAMPOS SOLO PARA "modificar"
  modCampo?: "codigo" | "dhc" | "actividad";  // qué se modifica
  modDe?: string;                              // valor actual
  modA?: string;                               // valor nuevo

  // Respuesta de Sueldos
  answered?: boolean;
  answerText?: string;
  answeredByUsername?: string;
  answeredByUserId?: string;
  answeredAt?: string;
};

type AjusteThread = {
  id: string;
  createdAt: string;
  byUsername: string;
  byUserId: string;
  tipo: "arreglo";
  rows: AjusteFila[];
};

function blankAdjRow(): AjusteFila {
  return {
    id: uuid(),
    nro: "",
    nombre: "",
    cargo: "",
    accion: "alta",
    codigo: "",
    codDesc: "",
    dhc: "",
    actividad: "",
    cc: "",       // 👈 NUEVO
    nota: "",
    // 🔹 Defaults para el caso "modificar"
    modCampo: "codigo",
    modDe: "",
    modA: "",
  };
}
// Storage keys
import {
  STORAGE_KEY_FILES,
  STORAGE_KEY_PERIODS,
  STORAGE_KEY_PERIOD_SELECTED,
  STORAGE_KEY_SECTORS,
  STORAGE_KEY_SITES,            // 👈 NUEVO (Sedes)
} from "../lib/storage";


// Auth / usuarios
import {
  attemptLogin,
  changePassword,
  logout,
  adminCreateUser,
  adminResetPassword,
  adminSetRole,
  adminSetActive,
  adminSetPermissions,
  getUserById,
  getSession,
  setSession,
  upsertUser,
  replaceUsers,
  ensureDefaultAdminSync,
  loadUsers,
  saveUsers,
  sha256,
} from "../lib/auth";

// Permisos
import { getUserEffectivePermissions, ROLE_DEFAULT_PERMISSIONS } from "../lib/perms";

// Componentes presentacionales
import Logo from "../components/Logo";
import ToastsFragment from "../components/ToastsFragment";
import Avatar from "../components/Avatar";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import StatusSelect from "../components/StatusSelect";
import PeriodPicker from "../components/PeriodPicker";
import UserBadge from "../components/UserBadge";
import { HelpModal } from "../features/files/HelpModal";
import { DetailModal } from "../features/files/DetailModal";
import { FileTable } from "../features/files/FileTable";
import { RowMenuPortal } from "../features/files/RowMenuPortal";
import { NoNewsModal } from "../features/files/NoNewsModal";
import { SectorsModal } from "../features/sectors/SectorsModal";
import { SitesManageModal } from "../features/sectors/SitesManageModal";
import { SectorsCsvHelpModal } from "../features/sectors/SectorsCsvHelpModal";
import { SectorSummaryModal } from "../features/sectors/SectorSummaryModal";
import { ObserveModal } from "../features/observations/ObserveModal";
import { FileDoubtModal } from "../features/observations/FileDoubtModal";
import { AdjustModal } from "../features/observations/AdjustModal";
import { ReplyModal } from "../features/observations/ReplyModal";
import { AddPeriodModal } from "../features/periods/AddPeriodModal";
import { ManagePeriodsModal } from "../features/periods/ManagePeriodsModal";
import { ExportRespModal } from "../features/reports/ExportRespModal";
import { ProcessRespModal } from "../features/reports/ProcessRespModal";
import { useObservations } from "../hooks/useObservations";
import { useFiles } from "../hooks/useFiles";
import { useDownloads } from "../hooks/useDownloads";
import { useReports } from "../hooks/useReports";
import { useSectors } from "../hooks/useSectors";
import { useSSE } from "../hooks/useSSE";
import {
  blankObsRow, getAllObservationRows,
  pendingDudasCount, answeredDudasCount,
  answeredFuncionarioDoubtsCount, answeredArchivoDoubtsCount,
  pendingArreglosCount, answeredArreglosCount,
  pendingCount, answeredCount, hasPendingDoubts, matchesDoubtFilter,
  respondidaNoProcessadaCount, hasRespondidaNoProcessada,
} from "../features/observations/observationHelpers";

import { UserAdminModal } from "../features/users/UserAdminModal";
import { PermissionEditorModal } from "../features/users/PermissionEditorModal";
import { ProfileModal } from "../features/users/ProfileModal";
import { SuperadminDashboard } from "../features/users/SuperadminDashboard";
import { UserConfigModal } from "../features/users/UserConfigModal";
import { ReclamosPanel } from "../features/reclamos/components/ReclamosPanel";
import { NotificationBell } from "../components/NotificationBell";
import { ProcesarDudasModal } from "../features/observations/ProcesarDudasModal";
import { VerPorSectorPanel } from "../features/files/VerPorSectorPanel";

import { APP, ROLE_LABELS } from "../features/shared/constants";
import {
  sclone, userNameOr, typeBadge, statusBadgeClasses,
  pendingChipClasses, Th,
} from "../features/shared/uiHelpers";
import type { AppEvent } from "../features/shared/uiHelpers";
// RowMenuPortal: src/features/files/RowMenuPortal.tsx


/* =========================
   COMPONENTE PRINCIPAL
   ========================= */

   export default function DataFlowDemo() {
    // Favicon + título
    useEffect(() => {
      const prevTitle = document.title;
      document.title = `${APP.NAME} — RRHH · Sueldos`;
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      const prevHref = link?.href;
      if (link && APP.FAVICON_SRC) link.href = APP.FAVICON_SRC;
      return () => {
        document.title = prevTitle;
        if (link && typeof prevHref === "string") link.href = prevHref!;
      };
    }, []);
// ===== Verificar contraseña (modo API: via login backend; modo localStorage: sha256) =====
const _apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')
  .replace(/^(https?:\/\/)localhost(:\d+)?/, `$1${window.location.hostname}$2`);
async function verifyPassword(username: string, password: string): Promise<boolean> {
  if (import.meta.env.VITE_USE_API === 'true') {
    try {
      const res = await fetch(`${_apiBase}/auth/login`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      return res.ok;
    } catch { return false; }
  }
  const users = loadUsers();
  const u = users.find((x: any) => x.username === username);
  if (!u) return false;
  return (await sha256(password)) === u.passwordHash;
}

// ===== Boot status =====
const [bootReady, setBootReady] = useState(false);
// ===== Snapshot de usuarios (para combos, asignaciones, etc.) =====
const [usersSnap, setUsersSnap] = useState<any[]>([]);

function refreshUsersSnap() {
  try {
    setUsersSnap(loadUsers?.() || []);
  } catch {
    setUsersSnap([]);
  }
}

// ===== RRHH disponibles para asignar responsable =====
const rrhhUsers = useMemo(() => {
  return (usersSnap || []).filter(
    (u: any) => u?.role === "rrhh" && u?.active !== false
  );
}, [usersSnap]);


// Inicializa admin demo y habilita el login cuando esté listo
useEffect(() => {
  (async () => {
    try {
      await ensureDefaultAdminSync();           // ⟵ crea/asegura admin
    } catch (err) {
      console.error("No se pudo inicializar el admin demo:", err);
    }
    // En modo API: sincronizar mustChangePassword desde el backend al recargar
    if (import.meta.env.VITE_USE_API === 'true') {
      try {
        const res = await fetch(`${_apiBase}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const apiUser = await res.json();
          const users = loadUsers();
          const idx = users.findIndex((u: any) => u.id === apiUser.id);
          if (idx >= 0) {
            users[idx].mustChangePassword = !!apiUser.mustChangePassword;
            saveUsers(users);
          }
          setSessionState(getSession());
        }
      } catch {}
    }
    setBootReady(true);                         // ⟵ habilita el botón
    refreshUsersSnap();                         // ⟵ carga usuarios para rrhhUsers
  })();
}, []);

// Sesión actual
const [session, setSessionState] = useState(getSession());

// Usuario logueado (derivado de la sesión)
const me = useMemo(() => {
  if (!session?.userId) return null;
  return getUserById(session.userId);
}, [session]);

// Permisos efectivos del usuario
const myPerms = useMemo(() => getUserEffectivePermissions(me), [me]);

// Rol y flag de admin (disponible en TODO el componente)
const meRole = me?.role || "";
const isAdmin = meRole === "admin";
const isSuperAdmin = meRole === "superadmin";
const isAdminOrSuper = isAdmin || isSuperAdmin;

// ===== Login UI State =====
const [loginForm, setLoginForm] = useState({ username: "", password: "" });
const [loginError, setLoginError] = useState("");
const [changingPwd, setChangingPwd] = useState(false);
const [newPwd, setNewPwd] = useState("");

// ===== NUEVO: Estados para animación de bienvenida (Splash) =====
const [showSplash, setShowSplash] = useState(false);
const [pendingUser, setPendingUser] = useState<null | {
  id?: string;
  name?: string;
  role?: string;
}>(null);

// ===== Modo activo: Información / Reclamos =====
const [modoActivo, setModoActivo] = useState<"informacion" | "reclamos">(() => {
  try {
    const v = localStorage.getItem("dataflow_modo_activo");
    return v === "reclamos" ? "reclamos" : "informacion";
  } catch { return "informacion"; }
});

function toggleModo(modo: "informacion" | "reclamos") {
  setModoActivo(modo);
  try { localStorage.setItem("dataflow_modo_activo", modo); } catch {}
}

// === [ANCLA-2CLEANUP] LIMPIEZA DE TIMER DEL SPLASH ===
const splashTimerRef = useRef(null);
useEffect(() => {
  return () => {
    if (splashTimerRef.current) {
      clearTimeout(splashTimerRef.current);
    }
  };
}, []);

  // ===== Periodos =====
  const [periods, setPeriods] = useState<any[]>([]);
  // derived early so hooks can use it
  const periodNameById = periods.reduce((acc: any, p: any) => { acc[p.id] = p.name; return acc; }, {} as Record<string, string>);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [addPeriodOpen, setAddPeriodOpen] = useState(false);
  const [newPeriodYM, setNewPeriodYM] = useState("");
  const [managePeriodsOpen, setManagePeriodsOpen] = useState(false);

  // ===== Sectores (NUEVO) =====
  // useSectors hook
  const {
    sectors, setSectors,
    sites, setSites,
    addSite, updateSite, deleteSite,
    addSector, updateSector, deleteSector,
    downloadSectorsTemplateCSV, handleImportSitesCSV,
    downloadSitesTemplateCSV, handleImportSectorsCSV,
    guessSectorForFileName, norm, detectSiteCodeFromName,
    matchRuleForFileName, guessSiteForFileName,
  } = useSectors({ rrhhUsers, me });

  // Notificaciones en tiempo real via SSE (activo solo con VITE_USE_API=true)
  useSSE({ meId: me?.id });

const [sectorsOpen, setSectorsOpen] = useState(false);
const [sectorsCsvHelpOpen, setSectorsCsvHelpOpen] = useState(false);
const [noNewsOpen, setNoNewsOpen] = useState(false);
const [isDraggingOver, setIsDraggingOver] = useState(false);
const [selectedKeyForNoNews, setSelectedKeyForNoNews] = useState("");
const [sitesManageOpen, setSitesManageOpen] = useState(false);
  


  // ── Report & download state (needed by hooks) ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [exportRespOpen, setExportRespOpen] = useState(false);
const [exportFrom, setExportFrom] = useState(""); // desde Nº (string para input)
const [exportTo, setExportTo] = useState("");     // hasta Nº
const [exportKind, setExportKind] = useState<"all" | "dudas" | "arreglos">("all");
const [exportRespKind, setExportRespKind] = useState<"all" | "con_sueldos" | "sin_sueldos">("all");
const [exportDateFrom, setExportDateFrom] = useState(""); // YYYY-MM-DD
const [exportDateTo, setExportDateTo] = useState("");     // YYYY-MM-DD
const [processRespOpen, setProcessRespOpen] = useState(false);
const [processFrom, setProcessFrom] = useState("");
const [processTo, setProcessTo] = useState("");
const [processDateFrom, setProcessDateFrom] = useState("");
const [processDateTo, setProcessDateTo] = useState("");
const [processIncludeFileDoubts, setProcessIncludeFileDoubts] = useState(false);

  // ===== Archivos y filtros =====
  const [lastPicked, setLastPicked] = useState<string[]>([]);
  // useFiles hook
  const {
    files, setFiles,
    effectiveStatus, addHistoryEntry, displayStatusForRole,
    updateFile, setStatus, markDownloaded, bumpVersion, setNote,
    guessTypeFromName, safeObjectURL, isUploadAllowedForRole,
    deleteFile, hardResetPeriod, handleUpload, createNewFile, clearAll, handleStatusChange,
  } = useFiles({ me, periods, selectedPeriodId, periodNameById, sectors, sites, publishEvent, pushToast, myPerms, setLastPicked, onOpenObserve: null, guessSectorForFileName, guessSiteForFileName });
  // useDownloads hook
  const {
    downloadCounters, setDownloadCounters,
    downloadedFiles, setDownloadedFiles,
    downloadLogs,
    archivoYaDescargadoEnPeriodo, getNextNumberForUserInPeriod,
    consumeNumberForUserInPeriod, getUserSubRangesForDownloads,
    buildUsedNumbersForUserInPeriod, findNextFreeNumberInRange,
    registrarDescarga, doDownload, downloadSelectedAsZip,
  } = useDownloads({ files, setFiles, me, meRole, myPerms, selectedPeriodId, addHistoryEntry, markDownloaded, updateFile, publishEvent, pushToast, selectedIds });
  // useReports hook
  const {
    exportCSV, exportDownloadsCSV, exportRespondedCSV, processRespondedBatch,
  } = useReports({
    files, me, myPerms, selectedPeriodId, periodNameById,
    exportFrom, setExportFrom, exportTo, setExportTo,
    exportKind, setExportKind, exportRespKind, setExportRespKind,
    exportDateFrom, setExportDateFrom, exportDateTo, setExportDateTo,
    processFrom, setProcessFrom, processTo, setProcessTo,
    processDateFrom, setProcessDateFrom, processDateTo, setProcessDateTo,
    processIncludeFileDoubts, setProcessIncludeFileDoubts,
    exportRespOpen, setExportRespOpen,
    processRespOpen, setProcessRespOpen,
    updateFile, addHistoryEntry, pushToast, publishEvent,
  });


  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // NUEVO: filtro por usuario que subió el archivo
  const [uploaderFilter, setUploaderFilter] = useState("all");

  const [selected, setSelected] = useState<string | null>(null);

// ===== Vista por sector (NUEVO) =====
const [sectorSummaryOpen, setSectorSummaryOpen] = useState(false);
const [sectorSummarySelectedKey, setSectorSummarySelectedKey] = useState<string | null>(null);
const [sectorSummaryExpanded, setSectorSummaryExpanded] = useState<Record<string, boolean>>({});

// ✅ NUEVO: filtros del modal "Vista por sector"
const [sectorViewQ, setSectorViewQ] = useState("");                 // filtra por nombre de sector
const [sectorViewSiteQ, setSectorViewSiteQ] = useState("");         // filtra por sede (texto)
const [sectorViewUploaderQ, setSectorViewUploaderQ] = useState(""); // filtra por usuario (texto)
const [sectorViewOnlyPending, setSectorViewOnlyPending] = useState(false); // solo pendientes

  // ===== Reset liquidación (solo superadmin) =====
  const [resetPeriodOpen, setResetPeriodOpen] = useState(false);
  const [resetPeriodPass, setResetPeriodPass] = useState("");
  const [resetPeriodError, setResetPeriodError] = useState("");
  const [dashboardOpen, setDashboardOpen] = useState(false);

  // ===== Menús del header (dropdowns) =====
  const [menuOpen, setMenuOpen] = useState<null | "gestion" | "reportes" | "user">(null);
  const [rowMenuOpen, setRowMenuOpen] = useState<string | null>(null);

  const [rowMenuAnchor, setRowMenuAnchor] = useState<DOMRect | null>(null);

  // ===== Numeración por usuario de sueldos / liquidación =====

  // Para cerrar al hacer clic fuera / ESC
  const headerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
        setRowMenuOpen(null);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") { setMenuOpen(null); setRowMenuOpen(null); }
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  useEffect(() => {
    if (!rowMenuOpen) return;
  
    const close = () => {
      setRowMenuOpen(null);
      setRowMenuAnchor(null);
    };
  
    // OJO: SIN capture => no cierra cuando scrolleás dentro del menú (ni dentro de un div)
    window.addEventListener("scroll", close);
    window.addEventListener("resize", close);
  
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [rowMenuOpen]);
  
  

  // ===== Filtro de dudas (debe existir ANTES de 'filtered') =====
  const [doubtMode, setDoubtMode] = useState<
  "all" | "con" | "sin" | "nro" | "sector" | "cc" | "texto" | "arreglo" | "arreglo_pend" | "resp_no_proc"
>("all");
  const [doubtValue, setDoubtValue] = useState("");

/* ========= Helpers necesarios por 'filtered' ========= */


  // === FILTRADO (ÚNICO) ===
  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();

    return files.filter((f) => {
      // 1) Liquidación seleccionada
      if (selectedPeriodId && f.periodId !== selectedPeriodId) return false;
    
      // Estado efectivo (toma statusOverride)
      const eff = effectiveStatus(f);
    
      // Solo Admin y SuperAdmin ven anulados/eliminados
      if (!isAdminOrSuper && eff === "eliminado") return false;
    
      // 2) Estado (usar el efectivo)
      if (statusFilter !== "all" && eff !== statusFilter) return false;

      // 3) Usuario que subió
      if (uploaderFilter !== "all" && f.byUserId !== uploaderFilter) return false;

      // 4) Texto (nombre, tipo, notas y usuario)
      if (qLower) {
        const haystack = `${f.name || ""} ${f.type || ""} ${f.notes || ""} ${
          f.byUsername || ""
        }`.toLowerCase();

        if (!haystack.includes(qLower)) return false;
      }

      // 5) Filtro de dudas / arreglos
      if (!matchesDoubtFilter(f, doubtMode, doubtValue)) return false;

      return true;
    });
  }, [files, q, statusFilter, uploaderFilter, selectedPeriodId, doubtMode, doubtValue, isAdminOrSuper]);

// ===============================
// Helpers: clave sector|sede (ÚNICOS)
// ===============================
const keyFor = (sectorId?: string | null, siteId?: string | null) =>
  `${sectorId || "__no_sector__"}|${siteId || "__no_site__"}`;

const parseKeyFor = (key: string) => {
  const [rawSector, rawSite] = (key || "").split("|");
  const sectorId = rawSector && rawSector !== "__no_sector__" ? rawSector : null;
  const siteId = rawSite && rawSite !== "__no_site__" ? rawSite : null;
  return { sectorId, siteId };
};

// ===============================
// Índices de sedes (ÚNICOS)
// ===============================
const siteById = useMemo(() => {
  const m = new Map<string, any>();
  for (const si of sites || []) m.set(String(si.id), si);
  return m;
}, [sites]);

const siteByCode = useMemo(() => {
  const m = new Map<string, any>();
  for (const si of sites || []) {
    const code = String(si?.code || "").toUpperCase().trim();
    if (code) m.set(code, si);
  }
  return m;
}, [sites]);

// ===============================
// Reglas activas (ÚNICO)
// ===============================
const activeRules = useMemo(
  () => (sectors || []).filter((r: any) => !!r?.active),
  [sectors]
);

const activeNoNewsRules = useMemo(
  () => activeRules.filter((r: any) => !!r?.allowNoNews),
  [activeRules]
);


// ===== Resumen por sector + sede (NUEVO) =====
const sectorSummary = useMemo(() => {
  if (!selectedPeriodId) return [];

  const periodFiles = files.filter((f: any) => f.periodId === selectedPeriodId);

  // Index
  const sectorById = new Map<string, any>();
  for (const s of sectors) sectorById.set(s.id, s);

  const siteById = new Map<string, any>();
  for (const si of sites) siteById.set(si.id, si);

  const activeSectors = (sectors || []).filter((s: any) => s?.active);
  const activeSites = (sites || []).filter((s: any) => s?.active !== false);

  const keyFor = (sectorId?: string | null, siteId?: string | null) =>
    `${sectorId || "__no_sector__"}|${siteId || "__no_site__"}`;

  const map = new Map<string, any>();

  // 1) Creamos filas para TODOS los pares sector+sede (aunque no tengan archivos)
  // 1) Pre-cargar SOLO reglas reales (sector+sede)
  const siteByCode = new Map<string, any>();
  for (const si of sites || []) siteByCode.set(String(si.code || "").toUpperCase(), si);

  const activeRules = (sectors || []).filter((s: any) => s?.active);

  for (const rule of activeRules) {
    // Regla => tiene que tener sede asignada por code o id (según tu modelo actual)
    const ruleSiteId =
      rule.siteId ||
      (rule.siteCode
        ? siteByCode.get(String(rule.siteCode).toUpperCase())?.id
        : null) ||
      null;
  
    // ✅ A) Si la regla no tiene sede, NO la pre-cargamos como par "real"
    //    (esto evita "Ropería / Sin sede" y la tercera fila fantasma)
    if (!ruleSiteId) continue;
  
    const secId = rule.id;
    const siId = ruleSiteId;
  
    const key = keyFor(secId, siId);
  
    const si = siId ? siteById.get(siId) : null;
  
    map.set(key, {
      key,
      sectorId: secId,
      sectorName: rule?.name || "Sin sector",
      siteId: siId,
      siteName: si?.name || "Sin sede",
  
      requiredCount: Number.isFinite(rule.requiredCount) ? rule.requiredCount : 0,
      allowNoNews: !!rule.allowNoNews,
  
      receivedReal: 0,
      noNewsCount: 0,
      effectiveReceived: 0,
      missing: 0,
      completed: false,
      lastUpdatedAt: null,
      files: [],
      uploadedBy: {},
    });
  }
  // Bucket “sin sector” (si querés, lo dejamos solo para mirar errores)
  if (!map.has(keyFor(null, null))) {
    map.set(keyFor(null, null), {
      key: keyFor(null, null),
      sectorId: null,
      sectorName: "Sin sector asignado",
      siteId: null,
      siteName: "Sin sede",
      requiredCount: 0,
      allowNoNews: false,
      receivedReal: 0,
      noNewsCount: 0,
      effectiveReceived: 0,
      missing: 0,
      completed: false,
      lastUpdatedAt: null,
      files: [],
      uploadedBy: {},
    });
  }

// 2) Acumular archivos
for (const f of periodFiles) {
  // Resolver sectorId desde nombre si falta (archivos que vienen del backend)
  let secId = f.sectorId || null;
  if (!secId && (f.sectorName || f.sector)) {
    const name = (f.sectorName || f.sector || '').toLowerCase().trim();
    const found = sectors.find((s: any) => (s.name || '').toLowerCase().trim() === name);
    secId = found?.id || null;
  }

  // --- FIX: resolver siteId desde siteCode si falta ---
  let siteIdResolved = f.siteId || null;

  if (!siteIdResolved && f.siteCode) {
    const si = siteByCode.get(String(f.siteCode).toUpperCase());
    siteIdResolved = si?.id || null;
  }

  // ✅ B) Si no tengo sector o no tengo sede resuelta, NO genero par "sector+sede"
  //     (evita la fila fantasma tipo "Ropería / Sin sede")
  if (!secId || !siteIdResolved) {
    // Si querés, lo mandamos al bucket "sin sector" solo para diagnóstico (no cuenta en progreso)
    const diagKey = keyFor(null, null);
    if (!map.has(diagKey)) {
      map.set(diagKey, {
        key: diagKey,
        sectorId: null,
        sectorName: "Sin sector asignado",
        siteId: null,
        siteName: "Sin sede",
        requiredCount: 0,
        allowNoNews: false,
        receivedReal: 0,
        noNewsCount: 0,
        effectiveReceived: 0,
        missing: 0,
        completed: false,
        lastUpdatedAt: null,
        files: [],
        uploadedBy: {},
      });
    }

    const diag = map.get(diagKey);
    if (diag) {
      diag.files.push(f);
      const u = (f.byUsername || "sistema").toString();
      diag.uploadedBy[u] = (diag.uploadedBy[u] || 0) + 1;

      const isNoNews = !!f.noNews;
      if (isNoNews) diag.noNewsCount += 1;
      else diag.receivedReal += 1;

      const at = f.at || null;
      if (at && (!diag.lastUpdatedAt || at > diag.lastUpdatedAt)) diag.lastUpdatedAt = at;
    }

    continue;
  }

  // ⚠️ clave SIEMPRE con secId + siteIdResolved
  const key = keyFor(secId, siteIdResolved);

  // Si vino un par que no estaba (ej: regla no creada), lo creamos:
  // PERO con requeridos=0 para que no infle el progreso.
  if (!map.has(key)) {
    const sec = sectorById.get(secId);
    const si = siteById.get(siteIdResolved);

    map.set(key, {
      key,
      sectorId: secId,
      sectorName: sec?.name || "Sin sector asignado",
      siteId: siteIdResolved,
      siteName: si?.name || (f.siteName || "Sin sede"),

      requiredCount: 0,     // 👈 clave: si no hay regla cargada, no cuenta como requerido
      allowNoNews: false,   // 👈 idem

      receivedReal: 0,
      noNewsCount: 0,
      effectiveReceived: 0,
      missing: 0,
      completed: false,
      lastUpdatedAt: null,
      files: [],
      uploadedBy: {},
    });
  }

  const entry = map.get(key);
  if (!entry) continue;

  entry.files.push(f);

  const u = (f.byUsername || "sistema").toString();
  entry.uploadedBy[u] = (entry.uploadedBy[u] || 0) + 1;

  const isNoNews = !!f.noNews;
  if (isNoNews) entry.noNewsCount += 1;
  else entry.receivedReal += 1;

  const at = f.at || null;
  if (at && (!entry.lastUpdatedAt || at > entry.lastUpdatedAt)) entry.lastUpdatedAt = at;
}
  // 3) Calcular effective/missing/completed
  for (const entry of map.values()) {
    const req = Number.isFinite(entry.requiredCount) ? entry.requiredCount : 0;

    // Si allowNoNews y hay al menos una marca noNews, lo damos por cumplido (1 “entrega”)
    const effective = entry.receivedReal + (entry.allowNoNews ? entry.noNewsCount : 0);

    entry.effectiveReceived = effective;

    if (req <= 0) {
      entry.missing = 0;
      entry.completed = true;
    } else {
      entry.missing = Math.max(0, req - effective);
      entry.completed = entry.missing === 0;
    }
  }

  // 4) Orden: solo reglas reales (sector + sede), primero incompletos
return Array.from(map.values())
.filter((r: any) =>
  r.sectorId !== null &&
  r.siteId !== null &&
  Number(r.requiredCount) > 0 // 👈 solo lo que realmente exige algo
)
.sort((a: any, b: any) => {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  const sa = `${a.siteName} ${a.sectorName}`.toLowerCase();
  const sb = `${b.siteName} ${b.sectorName}`.toLowerCase();
  return sa.localeCompare(sb);
});
}, [selectedPeriodId, files, sectors, sites]);

// ===== Progreso de entrega global (para la barra de progreso) =====
const deliveryProgress = useMemo(() => {
  const total = sectorSummary.length;
  if (total === 0) return null;
  const done = sectorSummary.filter((r: any) => r.completed).length;
  const pct = Math.round((done / total) * 100);
  return { total, done, pct, allDone: done === total };
}, [sectorSummary]);

// ===== sectorSummary agrupado por nombre de sector (para Vista por sector) =====
const sectorSummaryGrouped = useMemo(() => {
  const byName = new Map<
    string,
    {
      sectorName: string;
      requiredTotal: number;
      receivedTotal: number; // suma de min(req, effective)
      missingTotal: number;
      completed: boolean;
      lastUpdatedAt: any;
      uploadedBy: Record<string, number>;
      rows: any[];
    }
  >();

  for (const r of sectorSummary || []) {
    const name = String(r?.sectorName || "Sin sector").trim();

    const req = Math.max(0, Number(r?.requiredCount) || 0);
    const eff = Math.max(0, Number(r?.effectiveReceived) || 0);
    const rec = Math.min(req, eff); // no pasarse de los requeridos

    if (!byName.has(name)) {
      byName.set(name, {
        sectorName: name,
        requiredTotal: 0,
        receivedTotal: 0,
        missingTotal: 0,
        completed: false,
        lastUpdatedAt: null,
        uploadedBy: {},
        rows: [],
      });
    }

    const g = byName.get(name)!;

    g.requiredTotal += req;
    g.receivedTotal += rec;
    g.missingTotal += Math.max(0, req - eff);

    // última actualización = max
    const at = r?.lastUpdatedAt || null;
    if (at && (!g.lastUpdatedAt || at > g.lastUpdatedAt)) g.lastUpdatedAt = at;

    // sumar "subido por" (agregado)
    const up = r?.uploadedBy || {};
    for (const k of Object.keys(up)) {
      g.uploadedBy[k] = (g.uploadedBy[k] || 0) + (Number(up[k]) || 0);
    }

    g.rows.push(r);
  }

  // marcar completed
  for (const g of byName.values()) {
    g.completed = g.missingTotal <= 0;
  }

  // orden: incompletos primero, luego alfabético
  return Array.from(byName.values()).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.sectorName.toLowerCase().localeCompare(b.sectorName.toLowerCase());
  });
}, [sectorSummary]);

// ===== Vista por sector: aplicar filtros sin romper totales =====
const sectorSummaryGroupedFiltered = useMemo(() => {
  const q = sectorViewQ.trim().toLowerCase();
  const sq = sectorViewSiteQ.trim().toLowerCase();
  const uq = sectorViewUploaderQ.trim().toLowerCase();
  const onlyPend = !!sectorViewOnlyPending;

  const out: any[] = [];

  for (const g of sectorSummaryGrouped || []) {
    const sectorName = String(g.sectorName || "").toLowerCase();

    // Filtro por nombre de sector (padre)
    if (q && !sectorName.includes(q)) continue;

    // Filtramos filas hijas (sedes)
    const rows = (g.rows || []).filter((r: any) => {
      const siteName = String(r?.siteName || "").toLowerCase();

      if (sq && !siteName.includes(sq)) return false;

      // Filtro por "Subido por" (busca en keys de uploadedBy)
      if (uq) {
        const up = r?.uploadedBy || {};
        const hit = Object.keys(up).some((u) => String(u).toLowerCase().includes(uq));
        if (!hit) return false;
      }

      // Solo pendientes (por fila)
      if (onlyPend && (Number(r?.missing) || 0) <= 0) return false;

      return true;
    });

    // Si el grupo quedó sin filas, no lo mostramos
    if (rows.length === 0) continue;

    // Recalcular totales del grupo en base a las filas visibles
    let requiredTotal = 0;
    let receivedTotal = 0;
    let missingTotal = 0;
    let lastUpdatedAt: any = null;
    const uploadedBy: Record<string, number> = {};

    for (const r of rows) {
      const req = Math.max(0, Number(r?.requiredCount) || 0);
      const eff = Math.max(0, Number(r?.effectiveReceived) || 0);
      const rec = Math.min(req, eff);

      requiredTotal += req;
      receivedTotal += rec;
      missingTotal += Math.max(0, req - eff);

      const at = r?.lastUpdatedAt || null;
      if (at && (!lastUpdatedAt || at > lastUpdatedAt)) lastUpdatedAt = at;

      const up = r?.uploadedBy || {};
      for (const k of Object.keys(up)) {
        uploadedBy[k] = (uploadedBy[k] || 0) + (Number(up[k]) || 0);
      }
    }

    // Si elegís "solo pendientes" a nivel grupo, esto ya cae solo con filas pendientes.
    // Aun así, lo dejamos consistente:
    const completed = missingTotal <= 0;

    // Si estás filtrando "solo pendientes" y el grupo da completo (por alguna razón), lo ocultamos:
    if (onlyPend && completed) continue;

    out.push({
      sectorName: g.sectorName,
      requiredTotal,
      receivedTotal,
      missingTotal,
      completed,
      lastUpdatedAt,
      uploadedBy,
      rows,
    });
  }

  // orden: incompletos primero, luego alfabético
  return out.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return String(a.sectorName).toLowerCase().localeCompare(String(b.sectorName).toLowerCase());
  });
}, [sectorSummaryGrouped, sectorViewQ, sectorViewSiteQ, sectorViewUploaderQ, sectorViewOnlyPending]);


// ===== IDs de sedes asignadas a mí (para progreso personal) =====
const mySiteIds = useMemo(() => {
  const id = me?.id || null;
  if (!id) return new Set<string>();
  return new Set(
    (sites || [])
      .filter((s: any) => s?.active !== false && s?.ownerUserId === id)
      .map((s: any) => s.id)
  );
}, [sites, me?.id]);

// ===== Progreso global vs personal (POR REQUERIDOS) =====
const sectorStats = useMemo(() => {
  const evaluables = (sectorSummary || []).filter(
    (r: any) => (Number(r.requiredCount) || 0) > 0 && !!r.sectorId && !!r.siteId
  );

  let totalReq = 0;
  let doneReq = 0;

  for (const r of evaluables) {
    const req = Math.max(0, Number(r.requiredCount) || 0);
    const rec = Math.max(0, Number(r.effectiveReceived) || 0);
    totalReq += req;
    doneReq += Math.min(req, rec);
  }

  const pct = totalReq <= 0 ? 100 : Math.round((doneReq / totalReq) * 100);

  const mine = evaluables.filter((r: any) => mySiteIds.has(r.siteId));

  let myTotalReq = 0;
  let myDoneReq = 0;

  for (const r of mine) {
    const req = Math.max(0, Number(r.requiredCount) || 0);
    const rec = Math.max(0, Number(r.effectiveReceived) || 0);
    myTotalReq += req;
    myDoneReq += Math.min(req, rec);
  }

  const myPct = myTotalReq <= 0 ? 100 : Math.round((myDoneReq / myTotalReq) * 100);

  return { totalReq, doneReq, pct, myTotalReq, myDoneReq, myPct };
}, [sectorSummary, mySiteIds]);

// ===== UI: opciones "Sin novedades" (Sector – Sede por NOMBRE) =====
const noNewsOptions = useMemo(() => {
  const sitesArr = (sites || []) as any[];
  const rules = (sectors || []).filter((r: any) => !!r?.active && !!r?.allowNoNews);

  // índice por code corto (SC, SG, etc.)
  const siteByCodeLocal = new Map<string, any>();
  for (const si of sitesArr) {
    const code = String(si?.code || "").toUpperCase().trim();
    if (code) siteByCodeLocal.set(code, si);
  }

  // armamos opciones sin depender de siteById/siteByCode externos
  const metaByKey = new Map<string, { sectorId: string; siteId: string | null; sectorName: string; siteName: string }>();
  const options: Array<{ key: string; label: string }> = [];

  for (const r of rules) {
    const resolvedSiteId =
      r.siteId ||
      (r.siteCode ? siteByCodeLocal.get(String(r.siteCode).toUpperCase().trim())?.id : null) ||
      null;

    const siteObj =
      resolvedSiteId
        ? sitesArr.find((s: any) => String(s.id) === String(resolvedSiteId))
        : (r.siteCode ? siteByCodeLocal.get(String(r.siteCode).toUpperCase().trim()) : null);

    const sectorName = (r?.name || "Sin sector").toString();
    const siteName = (siteObj?.name || "Sin sede").toString();

    const key = keyFor(r.id, resolvedSiteId); // MISMA key que tu progreso

    // evitamos duplicados por si alguna vez aparecen
    if (!metaByKey.has(key)) {
      metaByKey.set(key, { sectorId: String(r.id), siteId: resolvedSiteId ? String(resolvedSiteId) : null, sectorName, siteName });
      options.push({ key, label: `${sectorName} – ${siteName}` });
    }
  }

  // orden alfabético por label para que sea cómodo
  options.sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));

  return { options, metaByKey };
}, [sectors, sites]);

  /* ========= SELECCIÓN MÚLTIPLE + ZIP necesita que 'filtered' ya exista ========= */


  const visibleIds = useMemo(() => filtered.map((f) => f.id), [filtered]);

  function isSelected(id: string) {
    return selectedIds.has(id);
  }
  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectNone() {
    setSelectedIds(new Set());
  }
  function selectAllVisible(ids: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }
  function deselectAllVisible(ids: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  function redetectSectorSede() {
    if (selectedIds.size === 0) return;
    let changed = 0;
    setFiles((prev: any[]) => prev.map((f: any) => {
      if (!selectedIds.has(f.id)) return f;
      const guessedSite = guessSiteForFileName(f.name || "");
      const guessedSector = guessSectorForFileName(f.name || "");
      const newSiteId = guessedSite?.id ?? f.siteId ?? null;
      const newSiteName = guessedSite?.name ?? f.siteName ?? null;
      const newSectorId = guessedSector?.id ?? f.sectorId ?? null;
      const newSectorName = guessedSector?.name ?? f.sectorName ?? null;
      const updated = newSiteId !== f.siteId || newSectorId !== f.sectorId;
      if (updated) changed++;
      return { ...f, siteId: newSiteId, siteName: newSiteName, sectorId: newSectorId, sectorName: newSectorName };
    }));
    setTimeout(() => {
      pushToast({ title: "Re-detección completada", message: `${changed} archivo(s) actualizados.` });
    }, 100);
  }

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;

  const selectAllRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (selectAllRef.current)
      selectAllRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  function selectByStateOnView(stateKey: string) {
    const ids = filtered.filter((f) => f.status === stateKey).map((f) => f.id);
    if (ids.length === 0) {
      alert("No hay archivos con ese estado en la vista actual.");
      return;
    }
    selectAllVisible(ids);
  }

  // ===== Reporte CSV (dudas respondidas por rango de funcionario) =====

// Nuevos filtros del reporte
// all = dudas + arreglos
// dudas = solo dudas clásicas
// arreglos = solo arreglos de RRHH

// all         = indiferente
// con_sueldos = solo registros con texto en answerText (respuesta o nota de sueldos)
// sin_sueldos = solo registros sin answerText





// Si lo dejás en false: el lote solo procesa filas con Nro de funcionario.

  // ===== Observado / Detalle / Respuestas =====
  const [detailOpen, setDetailOpen] = useState(false);

  // Modal de Ayuda
const [helpOpen, setHelpOpen] = useState(false);

  // useObservations hook — all observation state + handlers
  const {
    observeDialog, setObserveDialog,
    replyDialog, replyInputs, setReplyInputs,
    fileDoubtDialog, setFileDoubtDialog,
    adjustDialog, adjustReplyInputs, setAdjustReplyInputs,
    selectedThreadId, setSelectedThreadId,
    addRowInputs, setAddRowInputs,
    blankObsRow, blankAdjRow, blankAddRow,
    openReplyDialog, closeReplyDialog,
    setAdjCell, addAdjRow, removeAdjRow,
    setObsCell, addObsRow, removeObsRow,
    confirmObserve, cancelObserve,
    answerObservation, markObservationProcessed,
    addRowToThread, deleteThread,
    openFileDoubt, confirmFileDoubt, cancelFileDoubt,
    openAdjustForFile, confirmAdjust, cancelAdjust, answerAdjust,
  } = useObservations({ files, me, setFiles, pushToast, addHistoryEntry, publishEvent, selectedPeriodId });

  // Wrap handleStatusChange to open observe dialog when admin sets observado
  const handleStatusChangeWithObserve = (f: any, next: any) => {
    const nextKey = typeof next === "string" ? next : next?.key;
    if (nextKey === "observado") {
      setObserveDialog({ open: true, fileId: f.id, rows: [blankObsRow()] });
      return;
    }
    handleStatusChange(f, next);
  };

  // ===== Perfil =====
  const [profileOpen, setProfileOpen] = useState(false);
  const [userConfigOpen, setUserConfigOpen] = useState(false);
  const [procesarDudasOpen, setProcesarDudasOpen] = useState(false);
  const [verPorSectorOpen, setVerPorSectorOpen] = useState(false);

  // ===== Gestión Usuarios =====
  const [usersOpen, setUsersOpen] = useState(false);
  const [permEdit, setPermEdit] = useState<{ open: boolean, userId: string | null }>({ open: false, userId: null });

  // ===== Notificaciones =====
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message: string }>>([]);
  function pushToast(t: { title: string; message: string }) {
    const id = uuid();
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6000);
  }
  function dismissToast(id: string) { setToasts((prev) => prev.filter((x) => x.id !== id)); }

  // Escucha notificaciones SSE → convierte en toast
  useEffect(() => {
    const handler = (e: any) => pushToast(e.detail);
    window.addEventListener('dataflow:toast', handler);
    return () => window.removeEventListener('dataflow:toast', handler);
  }, []);

  const bcRef = useRef<BroadcastChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  function onIncomingEvent(evt: AppEvent) { pushToast({ title: evt.title, message: evt.message }); }

  useEffect(() => {
    // BroadcastChannel / storage
    if ("BroadcastChannel" in window) {
      bcRef.current = new BroadcastChannel("dataflow-events");
      bcRef.current.onmessage = (e) => onIncomingEvent(e.data as AppEvent);
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === "dataflow-event" && e.newValue) {
        try { onIncomingEvent(JSON.parse(e.newValue)); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    // WebSocket opcional
    const wsUrl = (import.meta as any).env?.VITE_WS_URL;
    if (wsUrl) {
      try {
        wsRef.current = new WebSocket(wsUrl);
        wsRef.current.onmessage = (m) => {
          try { onIncomingEvent(JSON.parse(m.data)); } catch {}
        };
      } catch {}
    }

    return () => {
      bcRef.current?.close();
      window.removeEventListener("storage", onStorage);
      wsRef.current?.close();
    };
  }, []);

  function publishEvent(evt: Omit<AppEvent, "id" | "at" | "byUserId" | "byUsername">) {
    const payload: AppEvent = {
      id: uuid(),
      at: nowISO(),
      byUserId: me?.id,
      byUsername: me?.username,
      ...evt,
    };
  
    // 👇 NUEVO: mostrar también en ESTA pestaña
    onIncomingEvent(payload);
  
    // 👉 Y además, avisar al resto de contextos
    if (bcRef.current) bcRef.current.postMessage(payload);
  
    try {
      localStorage.setItem("dataflow-event", JSON.stringify(payload));
      localStorage.removeItem("dataflow-event");
    } catch {}
  
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify(payload)); } catch {}
    }
  }
  

  // Bootstrap demo
  useEffect(() => {
    try {
      // Archivos: handled by useFiles hook (localStorage mode only)
      const pf = localStorage.getItem(STORAGE_KEY_FILES);
      if (pf) setFiles(JSON.parse(pf));

      // Periodos (localStorage mode)
      const r = db.periods.getAll();
      if (r && typeof (r as any).then === 'function') {
        // API mode: carga async — se dispara cuando me cambia (ver useEffect de me abajo)
      } else {
        const pp = localStorage.getItem(STORAGE_KEY_PERIODS);
        if (pp) {
          const arr = JSON.parse(pp);
          setPeriods(Array.isArray(arr) ? arr : []);
        } else {
          const t = new Date();
          const def = [{
            id: uuid(), year: t.getFullYear(), month: t.getMonth() + 1,
            name: `${monthName(t.getMonth() + 1)} ${t.getFullYear()}`,
            uploadFrom: "", uploadTo: ""
          }];
          setPeriods(def);
          localStorage.setItem(STORAGE_KEY_PERIODS, JSON.stringify(def));
          localStorage.setItem(STORAGE_KEY_PERIOD_SELECTED, def[0].id);
          setSelectedPeriodId(def[0].id);
        }
        const sel = localStorage.getItem(STORAGE_KEY_PERIOD_SELECTED);
        if (sel) setSelectedPeriodId(sel);
      }
    } catch {}
  }, []);

  // Carga períodos desde API cuando el usuario se loguea
  const periodsLoadedRef = useRef(false);
  useEffect(() => {
    if (!me?.id) return;
    const r = db.periods.getAll();
    if (r && typeof (r as any).then === 'function') {
      (r as any).then((arr: any) => {
        if (Array.isArray(arr) && arr.length > 0) {
          periodsLoadedRef.current = true;
          setPeriods(arr);
        }
      }).catch(() => {});
    }
    const rs = db.periods.getSelected();
    if (rs && typeof (rs as any).then === 'function') {
      (rs as any).then((id: any) => { if (id) setSelectedPeriodId(id); }).catch(() => {});
    }
  }, [me?.id]);


  // Persistencias mínimas
  // Files persist: handled by useFiles hook

  useEffect(() => {
    if (periodsLoadedRef.current) {
      db.periods.saveAll(periods);
    } else {
      try { localStorage.setItem(STORAGE_KEY_PERIODS, JSON.stringify(periods)); } catch {}
    }
  }, [periods]);

  useEffect(() => {
    if (periodsLoadedRef.current) {
      if (selectedPeriodId) db.periods.saveSelected(selectedPeriodId);
    } else {
      try { if (selectedPeriodId) localStorage.setItem(STORAGE_KEY_PERIOD_SELECTED, selectedPeriodId); } catch {}
    }
  }, [selectedPeriodId]);

  // 🔽 NUEVO: persistimos sectores
  // Sectors persist: handled by useSectors hook

  // Sites persist: handled by useSectors hook





  const sortedPeriods = useMemo(() => [...periods].sort((a, b) => b.year - a.year || b.month - a.month), [periods]);
  const selectedFile = useMemo(() => files.find((f) => f.id === selected) || null, [files, selected]);

  const filesCountByPeriod = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of files) m[f.periodId] = (m[f.periodId] || 0) + 1;
    return m;
  }, [files]);
  // Lista de usuarios que subieron archivos (para el filtro)
  const uploaderOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const f of files) {
      const id = f.byUserId || "";
      if (!id) continue; // archivos "sistema" sin usuario real

      if (!map.has(id)) {
        const label =
          f.byUsername ||
          f.byUserId ||
          "sistema";

        map.set(id, label);
      }
    }

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [files]);


    // === Resumen de la liquidación seleccionada (archivos / dudas / arreglos) ===
    const summaryCurrentPeriod = useMemo(() => {
      const inPeriod = files.filter(f =>
        !selectedPeriodId || f.periodId === selectedPeriodId
      );
  
      let totalFiles = inPeriod.length;
      let dudasPend = 0;
      let arreglosPend = 0;
      let totalPend = 0;
      let respNoProc = 0;
      let lastUpdated: string | null = null;

      for (const f of inPeriod) {
        const pd = pendingDudasCount(f);
        const pa = pendingArreglosCount(f);
        const pt = pendingCount(f);
        dudasPend += pd;
        arreglosPend += pa;
        totalPend += pt;
        respNoProc += respondidaNoProcessadaCount(f);
  
        // Intento tomar la fecha más reciente razonable
        const t =
          (f.history && f.history[0]?.t) ||
          f.downloadedAt ||
          f.at ||
          null;
  
        if (typeof t === "string") {
          if (!lastUpdated || t > lastUpdated) lastUpdated = t;
        }
      }
  
      return { totalFiles, dudasPend, arreglosPend, totalPend, respNoProc, lastUpdated };
    }, [files, selectedPeriodId]);
  

// === [ANCLA-3B] LOGOUT HANDLER (nuevo)
function handleLogout() {
  try { logout(); } catch {}
  setSessionState(null);
  setShowSplash(false);
  setPendingUser(null);
  setChangingPwd(false);
}

// Cambio de contraseña forzado (pantalla changingPwd)
async function handleChangePassword(e?: React.FormEvent) {
  e?.preventDefault?.();
  const next = (newPwd || "").trim();
  if (!next || next.length < 8) {
    setLoginError("La contraseña debe tener al menos 8 caracteres.");
    return;
  }
  if (!/[a-zA-Z]/.test(next) || !/\d/.test(next)) {
    setLoginError("Debe combinar letras y números.");
    return;
  }
  if (!me?.id) return;
  try {
    const res: any = await changePassword(me.id, "", next);
    if (!res?.ok) { setLoginError(res?.error || "No se pudo cambiar la contraseña."); return; }
    // Limpiar mustChangePassword localmente
    const users = loadUsers();
    const idx = users.findIndex((u: any) => u.id === me.id);
    if (idx >= 0) { users[idx].mustChangePassword = false; saveUsers(users); }
    setSessionState(getSession()); // fuerza re-derive de me con mustChangePassword=false
    setChangingPwd(false);
    setNewPwd("");
    setLoginError("");
    pushToast({ title: "Contraseña actualizada", message: "Podés seguir usando Dataflow." });
  } catch (err) {
    setLoginError("No se pudo cambiar la contraseña.");
  }
}

// === [ANCLA-3] LOGIN SUBMIT (reemplazo completo)
async function handleLoginSubmit(e?: React.FormEvent) {
  e?.preventDefault?.();
  setLoginError("");

  const { username, password } = loginForm;

  if (!bootReady) {
    setLoginError("Inicializando… probá en un segundo.");
    return;
  }

  // 1) Intento normal
  let res: any;
  try {
    res = await attemptLogin(username, password);
  } catch {
    res = { ok: false, error: "No se pudo conectar." };
  }

  // 2) Si falla y estás intentando con admin, aseguro admin y reintento
  if (!res?.ok && String(username).trim().toLowerCase() === "admin") {
    try { await ensureDefaultAdminSync(); } catch {}
    try { res = await attemptLogin(username, password); } catch {}
  }

  // 3) Si sigue fallando → mostramos error y no dejamos entrar
  if (!res?.ok) {
    setLoginError(res?.error || "Usuario/contraseña inválidos.");
    return;
  }

  // 4) Flujo normal con Splash
  setPendingUser({
    id: res.user?.id,
    name: res.user?.displayName || res.user?.username || "",
    role: res.user?.role || "",
  });
  setShowSplash(true);

  if (splashTimerRef?.current) clearTimeout(splashTimerRef.current as number);
  splashTimerRef.current = window.setTimeout(() => {
    setSession({ userId: res.user?.id });             // persistencia
    setSessionState({ userId: res.user?.id } as any); // memoria inmediata
    setShowSplash(false);
    setPendingUser(null);
  }, 900);
}
  /* ===== Helpers de estado (resto) ===== */









  





















  // === Ventana de carga por liquidación (solo limita a RRHH) ===




  // Intenta adivinar sector según el nombre del archivo y los patrones





  
  // Detecta sede por "código" como token (SG, SC, JPII)


  
// Devuelve la regla (sector) que matchea por (siteCode + patterns)
// Mejorado: si siteCode es null, busca en todas las reglas y elige la mejor por score.


  





  // ---------- NUMERACIÓN / DESCARGAS CONTROLADAS ----------

  // 1) ¿Este archivo ya se descargó en esta liquidación?



  // 2) Dame el próximo número que le corresponde a ESTE usuario de sueldos en ESTA liquidación



  // 3) Consumir ese número y actualizar estado


  // === Helpers de numeración por tipo de archivo (txt vs otros) ===











  
// Exporta descargas numeradas (1 fila por descarga real)


// === LOTE: Descargar ZIP (con numeración para Sueldos) ===
















  // Observado (dudas por funcionario)













// UI: inputs temporales para "Agregar fila" por hilo (threadId)








  


  
  // Duda Archivo






// ==== Arreglos de Información (RRHH) ====












  /* =========================
     RENDER: LOGIN / PASSWORD
     ========================= */


// Botón oscuro “trigger” de los menús (sin blanqueo ni hover fuerte)
const MENU_TRIGGER =
  "px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-sm " +
  "inline-flex items-center gap-1 hover:bg-neutral-900/80 " +
  "appearance-none focus:outline-none focus:ring-0 active:bg-neutral-900/70";

// Ítems del dropdown (base transparente, sin fondo blanco nativo)
const MENU_ITEM =
  "w-full text-left px-3 py-2 rounded-lg bg-transparent appearance-none " +
  "hover:bg-neutral-800/60 focus:bg-neutral-800/60 active:bg-neutral-800/70 " +
  "focus:outline-none focus:ring-0";

// =====================
// OVERLAY (sin returns)
// =====================
const overlay = (() => {
  if (showSplash) {
    return (
      <Splash
        displayName={pendingUser?.name || "Dataflow"}
        message={
          pendingUser?.role === "sueldos"
            ? "Sincronizando numeración y permisos..."
            : pendingUser?.role === "rrhh"
            ? "Preparando estados y trazabilidad..."
            : "Inicializando Dataflow..."
        }
      />
    );
  }

  if (!me) {
    return (
      <div className="fixed inset-0 z-[9999] overflow-auto bg-neutral-950/95 backdrop-blur-sm text-neutral-100">
        <div className="min-h-[100vh] grid place-items-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl">
            <div className="flex justify-center mb-3"><Logo className="h-20" /></div>
            <h1 className="font-bold mb-2 text-center leading-none select-none" aria-label={APP.NAME}>
              <span style={{ color:"#ffffff", letterSpacing:"-0.04em", fontWeight:300, fontSize:"2rem" }}>Dataflow</span>
            </h1>
            <p className="text-neutral-400 mb-4 text-center" style={{ fontSize: '0.75rem' }}>
              {APP.TAGLINE || "Iniciá sesión con tu usuario y contraseña."}
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-neutral-300">Usuario</label>
                <input
                  value={loginForm.username}
                  onChange={(e) => setLoginForm((s) => ({ ...s, username: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                  placeholder="ej: admin"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-neutral-300">Contraseña</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((s) => ({ ...s, password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                  placeholder="••••••••"
                />
              </div>

              {!!loginError && <div className="text-rose-300 text-sm">{loginError}</div>}

              <button
                type="submit"
                onClick={handleLoginSubmit}
                disabled={!bootReady}
                className="w-full px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bootReady ? "Entrar" : "Preparando…"}
              </button>

            </form>
          </div>
        </div>
        <ToastsFragment toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  if (changingPwd) {
    return (
      <div className="fixed inset-0 z-[9999] overflow-auto bg-neutral-950/95 backdrop-blur-sm text-neutral-100">
        <div className="min-h-[100vh] grid place-items-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl">
            <h2 className="text-xl font-semibold mb-2 text-center">Cambiar contraseña</h2>
            <p className="text-neutral-400 text-sm mb-4 text-center">
              Hola <span className="text-neutral-200 font-medium">{me?.username}</span>, necesitás establecer una contraseña nueva.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-neutral-300">Nueva contraseña</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              {!!loginError && <div className="text-rose-300 text-sm">{loginError}</div>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setChangingPwd(false); handleLogout(); }}
                  className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800"
                >
                  Cancelar
                </button>

                <button type="submit" className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700">
                  Guardar
                </button>
              </div>
            </form>

          </div>
        </div>
        <ToastsFragment toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return null; // sin overlay
})();

/* =========================
   RENDER: APP
   ========================= */

// Aliases SEGUROS (para no romper cuando me == null)
const meUsername = me?.username || "";
const meDisplay = me?.displayName?.trim() || me?.username || "—";

// Archivo asociado a los modales...
const fileForObserve = observeDialog.open
  ? files.find((f) => f.id === observeDialog.fileId)
  : null;

const fileForAdjust = adjustDialog.open
  ? files.find((f) => f.id === adjustDialog.fileId)
  : null;

const fileForDoubt = fileDoubtDialog.open
  ? files.find((f) => f.id === fileDoubtDialog.fileId)
  : null;

// 👇 NUEVO: mostrar cartelito solo si no hay liquidaciones creadas
const showFirstPeriodHint = periods.length === 0;

return (
  <div
    className="min-h-screen text-neutral-100 p-6 pb-32 overflow-x-hidden"
    style={{
      backgroundColor: modoActivo === 'reclamos' ? '#040d16' : '#0a0a0a',
      transition: 'background-color 0.5s ease',
    }}
  >
    {/* 👇 Mostramos el overlay arriba de todo */}
    {overlay}

    {/* Estilos de la animación del logo */}
    <style>
      {`
        @keyframes slowSpin {
          0%   { transform: rotate(0deg); }
          2%   { transform: rotate(360deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-slowspin {
          animation: slowSpin 12s linear infinite;
        }
      `}
    </style>

    <div
      className="w-full space-y-6 rounded-2xl p-6 shadow-2xl"
      style={{
        border: modoActivo === 'reclamos' ? '1px solid #3b82f655' : '1px solid #262626',
        background: modoActivo === 'reclamos' ? '#080f1a' : '#171717',
        boxShadow: modoActivo === 'reclamos' ? '0 0 30px #3b82f610' : 'none',
        transition: 'border-color 0.5s ease, background 0.5s ease, box-shadow 0.5s ease',
      }}
    >
        {/* Header */}
        <header
  ref={headerRef}
  className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between"
>
  <div className="flex items-center gap-3">

    {/* Logo con giro suave cada tanto */}
    <div className="relative">
      <Logo className="h-12 animate-slowspin" />
    </div>

    <div>
      <h1 className="leading-none select-none" aria-label={APP.NAME}>
        <span
          className="tracking-tight"
          style={{ color: "#ffffff", letterSpacing: "-0.04em", fontWeight: 300, fontSize: "clamp(2rem, 3.5vw, 2.6rem)" }}
        >
          Dataflow
        </span>
      </h1>
      <p className="text-neutral-400">
        {APP.TAGLINE || "Gestión de archivos entre RRHH (Información) y Sueldos."}
        {showFirstPeriodHint && (
          <span
            className="ml-2 text-white font-medium animate-pulse"
            style={{
              textShadow:
                "0 0 6px rgba(255,255,255,0.7), 0 0 10px rgba(255,255,255,0.5)"
            }}
          >
            Primero elegí la liquidación (mes/año).
          </span>
        )}
      </p>
    </div>
  </div>

  {/* Badge de modo activo */}
  {modoActivo === 'reclamos' && (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold"
      style={{ background: '#0f2035', color: '#93c5fd', border: '1px solid #3b82f6', letterSpacing: '0.06em' }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', boxShadow: '0 0 6px #60a5fa99' }} />
      RECLAMOS
    </div>
  )}

  <div className="flex flex-wrap items-center gap-2 ml-auto">
  <button
  onClick={() => setHelpOpen(true)}
  title="Ayuda"
  className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 text-neutral-200"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8.5h.01M11 10.75h1v5h1m-1-12.5a9.25 9.25 0 100 18.5 9.25 9.25 0 000-18.5z"
    />
  </svg>
</button>    
          {/* Selector de período */}
          <PeriodPicker
            role={meRole}
            canCreate={false}
            periods={sortedPeriods}
            selectedPeriodId={selectedPeriodId}
            setSelectedPeriodId={(id) => {
              setSelectedPeriodId(id);
              setSelected(null);
            }}
          />

          {/* Cartelito global de pendientes (dudas + arreglos) */}
          {selectedPeriodId && (
            <button
              type="button"
              onClick={() => {
                setDoubtMode("con");
                setDoubtValue("");
              }}
              className={cls(
                "hidden md:flex items-center gap-2 px-3 py-1 rounded-xl border text-xs",
                summaryCurrentPeriod.totalPend > 0
                  ? "border-amber-500/60 bg-amber-500/10 text-amber-100"
                  : "border-green-500/60 bg-green-500/10 text-green-200"
              )}
              title="Click para ver solo archivos con dudas pendientes"
            >
              <span>
                {summaryCurrentPeriod.totalPend > 0 ? "🟡 Pendientes" : "🟢 Sin pendientes"}
              </span>
              <span className="font-semibold">
                {summaryCurrentPeriod.dudasPend + summaryCurrentPeriod.arreglosPend}
              </span>
            </button>
          )}

          {/* ===== Menú: Gestión ===== */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((m) => (m === "gestion" ? null : "gestion"));
              }}
              className={MENU_TRIGGER}
              aria-haspopup="menu"
              aria-expanded={menuOpen === "gestion"}
              title="Opciones de gestión"
            >
              Gestión ▾
            </button>
            {menuOpen === "gestion" && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-72 rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-2 z-20"
              >
                <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-neutral-500">
                  Liquidaciones
                </div>

                {myPerms.actions.createPeriod && (
                  <button
                    onClick={() => {
                      setMenuOpen(null);
                      setAddPeriodOpen(true);
                      setNewPeriodYM("");
                    }}
                    className={MENU_ITEM}
                    title="Crear nueva liquidación (mes/año)"
                  >
                    ➕ Nueva liquidación
                  </button>
                )}

{isAdminOrSuper && (
                  <button
                    onClick={() => {
                      setMenuOpen(null);
                      setManagePeriodsOpen(true);
                    }}
                    className={MENU_ITEM}
                    title="Gestionar liquidaciones"
                  >
                    🗓️ Gestionar liquidaciones
                  </button>
                )}

                {isSuperAdmin && (
                  <button
                    onClick={() => { setMenuOpen(null); setDashboardOpen(true); }}
                    className={MENU_ITEM}
                  >
                    📊 Dashboard SA
                  </button>
                )}
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setMenuOpen(null);
                      try {
                        const data: Record<string, any> = {};
                        for (let i = 0; i < localStorage.length; i++) {
                          const key = localStorage.key(i);
                          if (key) {
                            try { data[key] = JSON.parse(localStorage.getItem(key) || "null"); }
                            catch { data[key] = localStorage.getItem(key); }
                          }
                        }
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `dataflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
                        document.body.appendChild(a); a.click(); a.remove();
                        URL.revokeObjectURL(url);
                      } catch (e) { alert("Error al exportar: " + e); }
                    }}
                    className={MENU_ITEM}
                  >
                    💾 Backup completo
                  </button>
                )}
                {isSuperAdmin && selectedPeriodId && (
                  <button
                    onClick={() => {
                      setMenuOpen(null);
                      setResetPeriodOpen(true);
                      setResetPeriodPass("");
                      setResetPeriodError("");
                    }}
                    className={`${MENU_ITEM} text-rose-300`}
                    title="Eliminar todos los archivos de la liquidación actual (requiere contraseña)"
                  >
                    🔥 Reset liquidación
                  </button>
                )}

                {/* ===== Sectores (NUEVO) ===== */}
                <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-wide text-neutral-500">
                  Sectores
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(null);
                    setSectorsOpen(true);
                  }}
                  className={MENU_ITEM}
                  title="Gestionar reglas Sector + Sede"
                >
                  🏷️ Sectores & Sedes
                </button>
                
                {/* ===== Fin Sectores ===== */}


                {/* ===== Resumen por sector (NUEVO) ===== */}
                <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-wide text-neutral-500">
                  Resumen
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(null);
                    setSectorSummaryOpen(true);
                    setSectorSummarySelectedKey(null);
                  }}
                  className={MENU_ITEM}
                  title="Ver archivos agrupados por sector"
                >
                  📊 Vista por sector
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(null);
                    const all = filtered.map((f: any) => f.id);
                    if (all.length === 0) { alert("No hay archivos visibles para re-detectar."); return; }
                    let changed = 0;
                    setFiles((prev: any[]) => prev.map((f: any) => {
                      if (!all.includes(f.id)) return f;
                      const gs = guessSiteForFileName(f.name || "");
                      const gsc = guessSectorForFileName(f.name || "");
                      const updated = (gs?.id ?? null) !== f.siteId || (gsc?.id ?? null) !== f.sectorId;
                      if (updated) changed++;
                      return { ...f,
                        siteId: gs?.id ?? f.siteId ?? null,
                        siteName: gs?.name ?? f.siteName ?? null,
                        sectorId: gsc?.id ?? f.sectorId ?? null,
                        sectorName: gsc?.name ?? f.sectorName ?? null,
                      };
                    }));
                    setTimeout(() => pushToast({ title: "Re-detección OK", message: `${changed} archivo(s) actualizados en la vista actual.` }), 100);
                  }}
                  className={MENU_ITEM}
                  title="Re-detecta sector y sede para todos los archivos de la vista actual, basándose en el nombre del archivo."
                >
                  🔄 Re-detectar sector/sede
                </button>
                {/* ===== Fin resumen ===== */}

                <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-wide text-neutral-500">
                  Avanzado
                </div>

                {import.meta.env.VITE_USE_API !== 'true' && (
                  <button
                    onClick={() => {
                      setMenuOpen(null);
                      clearAll();
                    }}
                    className={MENU_ITEM}
                    title="Reiniciar datos de la demo (localStorage)"
                  >
                    🔄 Reset demo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ===== Menú: Reportes ===== */}
          {myPerms.actions.exportCSV && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((m) => (m === "reportes" ? null : "reportes"));
                }}
                className={MENU_TRIGGER}
                aria-haspopup="menu"
                aria-expanded={menuOpen === "reportes"}
                title="Exportar reportes"
              >
                Reportes ▾
              </button>
              {menuOpen === "reportes" && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-80 rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-2 z-20"
                >
                  <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-neutral-500">
                    Exportar
                  </div>

                  <button
                    onClick={() => {
                      setMenuOpen(null);
                      exportCSV();
                    }}
                    className={MENU_ITEM}
                    title="Exportar inventario general de archivos (1 fila por archivo)"
                  >
                    📊 Exportar CSV (archivos)
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(null);
                      exportDownloadsCSV();
                    }}
                    className={MENU_ITEM}
                    title="Exportar descargas numeradas por usuario (1 fila por descarga)"
                  >
                    📥 Exportar CSV (descargas)
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(null);
                      setExportRespOpen(true);
                    }}
                    className={MENU_ITEM}
                    title="Exportar dudas respondidas por rango de funcionario"
                  >
                    📝 Reporte dudas respondidas (CSV)
                  </button>
                  <button
  onClick={() => {
    setMenuOpen(null);
    setProcessRespOpen(true);
  }}
  className={MENU_ITEM}
  title="Marcar como procesadas (batch) las dudas respondidas según filtros"
>
  ✅ Procesar dudas respondidas (batch)
</button>  
                </div>
              )}
            </div>
          )}

          {/* Toggle Información / Reclamos */}
          <div
            className="flex items-center gap-0.5 rounded-xl p-0.5"
            style={{
              background: modoActivo === 'reclamos' ? '#0a1220' : '#262626',
              border: modoActivo === 'reclamos' ? '1px solid #3b82f666' : '1px solid #404040',
              transition: 'background 0.4s ease, border-color 0.4s ease',
            }}
          >
            <button
              onClick={() => toggleModo("informacion")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={modoActivo === "informacion"
                ? { background: '#404040', color: '#f5f5f5' }
                : { color: '#a3a3a3' }}
            >
              Información
            </button>
            <button
              onClick={() => toggleModo("reclamos")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={modoActivo === "reclamos"
                ? { background: '#1e3a5f', color: '#bfdbfe', boxShadow: '0 0 8px #3b82f633' }
                : { color: '#a3a3a3' }}
            >
              Reclamos
            </button>
          </div>

          {/* Campana de notificaciones */}
          <NotificationBell />

          {/* Menú del usuario (avatar + nombre + rol) */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((m) => (m === "user" ? null : "user"));
              }}
              className={MENU_TRIGGER}
              aria-haspopup="menu"
              aria-expanded={menuOpen === "user"}
              title={meUsername}
            >
              <Avatar src={me?.avatarDataUrl || undefined} name={meDisplay} size={20} />
              <span className="hidden sm:inline text-neutral-200">{meDisplay}</span>
              <span className="hidden md:inline px-2 py-0.5 rounded-lg text-[11px] bg-neutral-800 text-neutral-300">
                {ROLE_LABELS[meRole] || meRole}
              </span>
              ▾
            </button>

            {menuOpen === "user" && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-2 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setMenuOpen(null);
                    setProfileOpen(true);
                  }}
                  className={MENU_ITEM}
                >
                  👤 Mi perfil
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(null);
                    setUserConfigOpen(true);
                  }}
                  className={MENU_ITEM}
                >
                  ⚙️ Configuración
                </button>

                {myPerms?.actions?.manageUsers && (
                  <button
                    onClick={() => {
                      setMenuOpen(null);
                      setUsersOpen(true);
                    }}
                    className={MENU_ITEM}
                  >
                    👥 Gestionar usuarios
                  </button>
                )}

                <button
                  onClick={() => {
                    setMenuOpen(null);
                    handleLogout();
                  }}
                  className={MENU_ITEM}
                >
                  🚪 Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== Panel de Reclamos ===== */}
      {modoActivo === "reclamos" && me && (
        <div key="panel-reclamos" className="modo-panel rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
          <ReclamosPanel
            meRole={meRole}
            meId={me.id}
            meNombre={me.displayName || me.username || ""}
          />
        </div>
      )}

      {/* ===== Panel de Información (existente) ===== */}
      {modoActivo === "informacion" && (<div key="panel-informacion" className="modo-panel space-y-6"><>
      {/* Uploader / mensajes por rol */}
      {myPerms.actions.bumpVersion ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 relative">
          {/* Bloqueo visual si no hay liquidación seleccionada */}
          {!selectedPeriodId && (
            <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
              <div className="text-center">
                <div className="text-sm text-neutral-300">
                  Primero seleccioná una liquidación (mes/año) arriba.
                </div>
                <div className="text-xs text-neutral-500">
                  Así los archivos quedan asociados correctamente.
                </div>
              </div>
            </div>
          )}

          <h2 className="font-semibold mb-3">Subir archivos (CSV, TXT, Excel, ODS)</h2>

          <label
            className={cls(
              "block rounded-2xl p-6 text-center cursor-pointer border-2 border-dashed transition-colors shadow-sm",
              selectedPeriodId
                ? isDraggingOver
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-neutral-700 hover:border-neutral-500 bg-neutral-950/60 hover:bg-neutral-900/80"
                : "border-neutral-800 cursor-not-allowed opacity-60 bg-neutral-950/60"
            )}
            onDragOver={(e) => { e.preventDefault(); if (selectedPeriodId && myPerms.actions.bumpVersion) setIsDraggingOver(true); }}
            onDragEnter={(e) => { e.preventDefault(); if (selectedPeriodId && myPerms.actions.bumpVersion) setIsDraggingOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDraggingOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              if (!selectedPeriodId || !myPerms.actions.bumpVersion) return;
              const files = e.dataTransfer?.files;
              if (files?.length) handleUpload({ target: { files } });
            }}
          >
            <input
              type="file"
              accept=".csv,.txt,.xls,.xlsx,.ods"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={!selectedPeriodId || !myPerms.actions.bumpVersion}
            />
            <div className="flex flex-col items-center gap-1">
              <div className="text-2xl mb-1">{isDraggingOver ? '📂' : '📤'}</div>
              <div className="font-medium text-neutral-100">{isDraggingOver ? 'Soltá para subir' : 'Arrastrá y soltá archivos'}</div>
              <div className="text-xs text-neutral-400">CSV, TXT, Excel, ODS</div>
              <div className="text-[11px] text-neutral-500 mt-2">
                Liquidación actual:{" "}
                <span className="text-neutral-200 font-medium">
                  {periodNameById[selectedPeriodId] || "—"}
                </span>
              </div>
            </div>
          </label>



{/* Botón: marcar sector sin novedades */}
<div className="mt-3 flex justify-end">
  <button
    type="button"
    onClick={() => setNoNewsOpen(true)}
    disabled={!selectedPeriodId}
    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-700 text-xs text-neutral-100 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    🟢 Marcar sector sin novedades
  </button>
</div>
</div>

      ) : null}

      {/* === Barra de progreso de entrega por liquidación === */}
      {selectedPeriodId && deliveryProgress && (() => {
        const selPeriod = periods.find((p: any) => p.id === selectedPeriodId);
        const uploadFrom = selPeriod?.uploadFrom || null;
        const uploadTo   = selPeriod?.uploadTo   || null;
        const fmtDate = (iso: string) => {
          const [y, m, d] = iso.slice(0, 10).split("-");
          return `${d}/${m}/${y}`;
        };
        return (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs text-neutral-500 shrink-0">
                {uploadFrom ? (
                  <>Desde <span className="text-neutral-300 font-medium">{fmtDate(uploadFrom)}</span></>
                ) : (
                  <span className="text-neutral-600">Sin fecha inicio</span>
                )}
              </span>
              <span
                className={cls(
                  "text-xs font-semibold",
                  deliveryProgress.allDone ? "text-green-400" : "text-amber-400"
                )}
              >
                {deliveryProgress.done}/{deliveryProgress.total} sectores · {deliveryProgress.pct}%
              </span>
              <span className="text-xs text-neutral-500 shrink-0">
                {uploadTo ? (
                  <>Hasta <span className="text-neutral-300 font-medium">{fmtDate(uploadTo)}</span></>
                ) : (
                  <span className="text-neutral-600">Sin fecha límite</span>
                )}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
              <div
                className={cls(
                  "h-full rounded-full transition-all duration-500",
                  deliveryProgress.allDone ? "bg-green-500" : "bg-amber-500"
                )}
                style={{ width: `${deliveryProgress.pct}%` }}
              />
            </div>
          </div>
        );
      })()}

      {/* Filtros */}
      <div className="sticky top-0 z-10 rounded-2xl border border-neutral-800 bg-neutral-900 p-3">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <span className="text-xs text-neutral-400">
            Liquidación:{" "}
            <span className="text-neutral-200 font-medium">
              {periodNameById[selectedPeriodId] || "—"}
            </span>
          </span>
        </div>

        {/* Mini tablero resumen de la liquidación */}
        {selectedPeriodId && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
            {/* Total archivos */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              <div className="text-[11px] text-neutral-500">Archivos en esta liquidación</div>
              <div className="text-lg font-semibold text-neutral-100">
                {summaryCurrentPeriod.totalFiles}
              </div>
            </div>

            {/* Dudas pendientes */}
            <div
              className={cls(
                "rounded-xl px-3 py-2 border cursor-pointer hover:opacity-80",
                summaryCurrentPeriod.dudasPend > 0
                  ? "border-amber-500/60 bg-amber-500/10"
                  : "border-neutral-800 bg-neutral-950/40"
              )}
              title="Click para filtrar archivos con dudas pendientes"
              onClick={() => setDoubtMode(v => v === "con" ? "all" : "con")}
            >
              <div className="text-[11px] text-neutral-500">Dudas pendientes</div>
              <div className="text-lg font-semibold">
                {summaryCurrentPeriod.dudasPend}
              </div>
            </div>

            {/* Respondidas sin procesar */}
            <div
              className={cls(
                "rounded-xl px-3 py-2 border cursor-pointer hover:opacity-80",
                summaryCurrentPeriod.respNoProc > 0
                  ? "border-orange-500/60 bg-orange-500/10"
                  : "border-neutral-800 bg-neutral-950/40"
              )}
              title="Dudas respondidas por RRHH que Sueldos aún no procesó. Click para filtrar."
              onClick={() => setDoubtMode(v => v === "resp_no_proc" ? "all" : "resp_no_proc")}
            >
              <div className="text-[11px] text-neutral-500">Resp. sin procesar</div>
              <div className="text-lg font-semibold">
                {summaryCurrentPeriod.respNoProc}
              </div>
            </div>

            {/* Arreglos pendientes */}
            <div
              className={cls(
                "rounded-xl px-3 py-2 border cursor-pointer hover:opacity-80",
                summaryCurrentPeriod.arreglosPend > 0
                  ? "border-sky-500/60 bg-sky-500/10"
                  : "border-neutral-800 bg-neutral-950/40"
              )}
              title="Click para filtrar archivos con arreglos pendientes"
              onClick={() => setDoubtMode(v => v === "arreglo_pend" ? "all" : "arreglo_pend")}
            >
              <div className="text-[11px] text-neutral-500">Arreglos pendientes</div>
              <div className="text-lg font-semibold">
                {summaryCurrentPeriod.arreglosPend}
              </div>
            </div>

            {/* Última actualización */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-3 py-2">
              <div className="text-[11px] text-neutral-500">Última actualización</div>
              <div className="text-xs text-neutral-200">
                {summaryCurrentPeriod.lastUpdated
                  ? formatDate(summaryCurrentPeriod.lastUpdated)
                  : "—"}
              </div>
            </div>
          </div>
        )}

        {/* === Acciones por lote (aparece si hay selección) === */}
        {selectedIds.size > 0 && (
          <div className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-neutral-300">
              Seleccionados: <b>{selectedIds.size}</b>
            </span>

            <button
              onClick={downloadSelectedAsZip}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm"
              title="Descargar todos los seleccionados en un ZIP"
            >
              ⬇️ Descargar ZIP
            </button>


            {myPerms.actions.markDownloaded && (
              <button
                onClick={() => {
                  Array.from(selectedIds).forEach((id) => markDownloaded(id));
                  publishEvent({
                    type: "download_marked",
                    title: "Marcados como descargados (lote)",
                    message: `${me?.username || "sistema"} marcó ${selectedIds.size} archivo(s) como descargado.`,
                  });
                }}
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-sm"
              >
                ✅ Marcar descargado
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <select
                onChange={(e) => {
                  const key = e.target.value;
                  if (!key) return;
                  selectByStateOnView(key);
                  e.target.value = "";
                }}
                defaultValue=""
                className="px-3 py-2 rounded-xl bg-neutral-800 outline-none text-sm"
                title="Selecciona por estado (sobre la vista actual)"
              >
                <option value="" disabled>
                  Seleccionar por estado…
                </option>
                {STATUS.map((s) => (
                  <option value={s.key} key={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>

              <button
                onClick={selectNone}
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-sm"
              >
                ⨉ Limpiar selección
              </button>
            </div>
          </div>
        )}

        {/* Fila principal de filtros */}
        <div className="flex w-full md:w-auto items-center gap-2 mt-3">
          {/* Búsqueda por texto */}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, nota o usuario…"
            className="w-full md:w-72 px-3 py-2 rounded-xl bg-neutral-800 outline-none"
            aria-label="Buscar archivos"
          />

          {/* Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-800 outline-none"
            aria-label="Filtrar por estado"
            title="Filtrar por estado"
          >
            <option value="all">Todos los estados</option>
            {STATUS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.key === "cargado" && me?.role === "sueldos"
                  ? "Pendiente de descarga"
                  : s.label}
              </option>
            ))}
          </select>

          {/* NUEVO: filtro por usuario que subió */}
          <select
            value={uploaderFilter}
            onChange={(e) => setUploaderFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-800 outline-none"
            aria-label="Filtrar por usuario que subió"
            title="Filtrar por usuario que subió"
          >
            <option value="all">Todos los usuarios</option>
            {uploaderOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>

          {/* Filtros de dudas / arreglos */}
          <div className="flex items-center gap-2">
            <select
              value={doubtMode}
              onChange={(e) => {
                setDoubtMode(e.target.value as any);
                setDoubtValue("");
              }}
              className="px-3 py-2 rounded-xl bg-neutral-800 outline-none"
              aria-label="Filtrar dudas"
              title="Filtrar por dudas"
            >
              <option value="all">Dudas: Todos</option>
              <option value="con">Dudas: Con pendientes</option>
              <option value="sin">Dudas: Sin pendientes</option>
              <option value="nro">Dudas: Nº funcionario</option>
              <option value="sector">Dudas: Sector</option>
              <option value="cc">Dudas: Centro de Costo</option>
              <option value="texto">Dudas: Texto en la duda</option>
              <option value="arreglo">Solo archivos con arreglos</option>
              <option value="arreglo_pend">Arreglos pendientes</option>
              <option value="resp_no_proc">Respondidas sin procesar</option>
            </select>

            {["nro", "sector", "cc", "texto"].includes(doubtMode) && (
              <input
                value={doubtValue}
                onChange={(e) => setDoubtValue(e.target.value)}
                placeholder={
                  doubtMode === "nro"
                    ? "Ej: 1234"
                    : doubtMode === "sector"
                    ? "Ej: Emergencia"
                    : doubtMode === "cc"
                    ? "Ej: 101/100.00-"
                    : "Buscar en el texto de la duda…"
                }
                className="w-[220px] px-3 py-2 rounded-xl bg-neutral-800 outline-none"
                aria-label="Valor del filtro de dudas"
              />
            )}
          </div>

          {(q ||
            statusFilter !== "all" ||
            uploaderFilter !== "all" || // incluye el filtro nuevo
            doubtMode !== "all" ||
            doubtValue) && (
            <button
              onClick={() => {
                setQ("");
                setStatusFilter("all");
                setUploaderFilter("all"); // resetea usuario
                setDoubtMode("all");
                setDoubtValue("");
              }}
              className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-sm"
              aria-label="Limpiar filtros"
            >
              Limpiar
            </button>
          )}
        </div>


        {/* Texto de ayuda + atajos rápidos para dudas */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
          <span>Buscás en nombre, tipo y notas. Atajos:</span>

          <button
            type="button"
            onClick={() => {
              setDoubtMode("con");
              setDoubtValue("");
            }}
            className="px-2 py-1 rounded-lg bg-neutral-800/60 border border-neutral-700/80 hover:bg-neutral-700/80"
          >
            Solo con dudas pendientes
          </button>

          <button
            type="button"
            onClick={() => {
              setDoubtMode("sin");
              setDoubtValue("");
            }}
            className="px-2 py-1 rounded-lg bg-neutral-800/60 border border-neutral-700/80 hover:bg-neutral-700/80"
          >
            Sin dudas
          </button>

          <button
            type="button"
            onClick={() => {
              setDoubtMode("arreglo_pend");
              setDoubtValue("");
            }}
            className="px-2 py-1 rounded-lg bg-neutral-800/60 border border-neutral-700/80 hover:bg-neutral-700/80"
          >
            Arreglos pendientes
          </button>

          <button
            type="button"
            onClick={() => {
              setDoubtMode("resp_no_proc");
              setDoubtValue("");
            }}
            className="px-2 py-1 rounded-lg bg-neutral-800/60 border border-orange-700/60 hover:bg-orange-900/30 text-orange-300"
          >
            Respondidas sin procesar
          </button>

          {/* Ver por Sector — todos los roles */}
          <button
            type="button"
            onClick={() => setVerPorSectorOpen(true)}
            className="px-2 py-1 rounded-lg bg-neutral-800/60 border border-neutral-700/80 hover:bg-neutral-700/80 text-neutral-300"
          >
            🏢 Ver por sector
          </button>

          {/* Procesar Dudas — solo Sueldos */}
          {meRole === 'sueldos' && (
            <button
              type="button"
              onClick={() => setProcesarDudasOpen(true)}
              className="px-2 py-1 rounded-lg bg-emerald-900/40 border border-emerald-700/60 hover:bg-emerald-800/50 text-emerald-300"
            >
              ✅ Procesar dudas / arreglos
            </button>
          )}
        </div>
      </div>

      <FileTable
        filtered={filtered} periodNameById={periodNameById} selectedPeriodId={selectedPeriodId}
        effectiveStatus={effectiveStatus} displayStatusForRole={displayStatusForRole}
        meRole={meRole} myPerms={myPerms} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin}
        selectAllRef={selectAllRef} allVisibleSelected={allVisibleSelected}
        visibleIds={visibleIds} selectedIds={selectedIds}
        selectAllVisible={selectAllVisible} deselectAllVisible={deselectAllVisible}
        isSelected={isSelected} toggleSelectOne={toggleSelectOne}
        setSelected={setSelected} setDetailOpen={setDetailOpen}
        setSelectedThreadId={setSelectedThreadId}
        handleStatusChange={handleStatusChangeWithObserve}
        setObserveDialog={setObserveDialog} blankObsRow={blankObsRow}
        openFileDoubt={openFileDoubt} openAdjustForFile={openAdjustForFile}
        deleteFile={deleteFile} doDownload={doDownload}
        markDownloaded={markDownloaded} bumpVersion={bumpVersion}
        rowMenuOpen={rowMenuOpen} setRowMenuOpen={setRowMenuOpen}
        rowMenuAnchor={rowMenuAnchor} setRowMenuAnchor={setRowMenuAnchor}
        MENU_TRIGGER={MENU_TRIGGER} MENU_ITEM={MENU_ITEM} me={me}
      />


      </></div>)}

      {/* Footer — visible en ambos modos */}
      <footer className="text-xs text-neutral-500 pt-2 pb-6 text-center">
        Versión beta · Desarrollado por{" "}
        <span className="font-semibold text-neutral-300">Leonel Figuera</span>{" "}
        para la <span className="font-semibold text-neutral-300">Gerencia de RRHH</span>.
      </footer>
    </div>
            {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

{sectorsOpen && <SectorsModal sectorsOpen={sectorsOpen} setSectorsOpen={setSectorsOpen} sectors={sectors} sites={sites} isAdmin={isAdminOrSuper} rrhhUsers={rrhhUsers} addSector={addSector} updateSector={updateSector} deleteSector={deleteSector} updateSite={updateSite} handleImportSectorsCSV={handleImportSectorsCSV} downloadSectorsTemplateCSV={downloadSectorsTemplateCSV} setSectorsCsvHelpOpen={setSectorsCsvHelpOpen} setSitesManageOpen={setSitesManageOpen} />}
{sitesManageOpen && <SitesManageModal sitesManageOpen={sitesManageOpen} setSitesManageOpen={setSitesManageOpen} sites={sites} addSite={addSite} updateSite={updateSite} deleteSite={deleteSite} handleImportSitesCSV={handleImportSitesCSV} downloadSitesTemplateCSV={downloadSitesTemplateCSV} />}
{sectorsCsvHelpOpen && <SectorsCsvHelpModal sectorsCsvHelpOpen={sectorsCsvHelpOpen} setSectorsCsvHelpOpen={setSectorsCsvHelpOpen} downloadSectorsTemplateCSV={downloadSectorsTemplateCSV} />}
{noNewsOpen && <NoNewsModal noNewsOpen={noNewsOpen} setNoNewsOpen={setNoNewsOpen} selectedKeyForNoNews={selectedKeyForNoNews} setSelectedKeyForNoNews={setSelectedKeyForNoNews} noNewsOptions={noNewsOptions} selectedPeriodId={selectedPeriodId} createNewFile={createNewFile} periodNameById={periodNameById} />}
{sectorSummaryOpen && <SectorSummaryModal sectorSummaryOpen={sectorSummaryOpen} setSectorSummaryOpen={setSectorSummaryOpen} setSectorSummarySelectedKey={setSectorSummarySelectedKey} setSectorViewQ={setSectorViewQ} setSectorViewSiteQ={setSectorViewSiteQ} setSectorViewUploaderQ={setSectorViewUploaderQ} setSectorViewOnlyPending={setSectorViewOnlyPending} selectedPeriodId={selectedPeriodId} sectorSummary={sectorSummary} sectorSummaryGroupedFiltered={sectorSummaryGroupedFiltered} sectorSummaryExpanded={sectorSummaryExpanded} setSectorSummaryExpanded={setSectorSummaryExpanded} sectorSummarySelectedKey={sectorSummarySelectedKey} sectorViewQ={sectorViewQ} sectorViewSiteQ={sectorViewSiteQ} sectorViewUploaderQ={sectorViewUploaderQ} sectorViewOnlyPending={sectorViewOnlyPending} formatDate={formatDate} userNameOr={userNameOr} />}
{detailOpen && selectedFile && <DetailModal detailOpen={detailOpen} setDetailOpen={setDetailOpen} selectedFile={selectedFile} setSelected={setSelected} setSelectedThreadId={setSelectedThreadId} selectedThreadId={selectedThreadId} periodNameById={periodNameById} prettyBytes={prettyBytes} formatDate={formatDate} userNameOr={userNameOr} meRole={meRole} me={me} setNote={setNote} openReplyDialog={openReplyDialog} addRowToThread={addRowToThread} addRowInputs={addRowInputs} setAddRowInputs={setAddRowInputs} blankAddRow={blankAddRow} markObservationProcessed={markObservationProcessed} deleteThread={deleteThread} adjustReplyInputs={adjustReplyInputs} setAdjustReplyInputs={setAdjustReplyInputs} answerAdjust={answerAdjust} replyInputs={replyInputs} setReplyInputs={setReplyInputs} answerObservation={answerObservation} />}
{observeDialog.open && <ObserveModal observeDialog={observeDialog} fileForObserve={fileForObserve} periodNameById={periodNameById} prettyBytes={prettyBytes} setObsCell={setObsCell} addObsRow={addObsRow} removeObsRow={removeObsRow} cancelObserve={cancelObserve} confirmObserve={confirmObserve} sectors={sectors} />}
{fileDoubtDialog.open && <FileDoubtModal fileDoubtDialog={fileDoubtDialog} setFileDoubtDialog={setFileDoubtDialog} cancelFileDoubt={cancelFileDoubt} confirmFileDoubt={confirmFileDoubt} fileForDoubt={fileForDoubt} />}
{adjustDialog.open && <AdjustModal adjustDialog={adjustDialog} fileForAdjust={fileForAdjust} periodNameById={periodNameById} prettyBytes={prettyBytes} setAdjCell={setAdjCell} addAdjRow={addAdjRow} removeAdjRow={removeAdjRow} cancelAdjust={cancelAdjust} confirmAdjust={confirmAdjust} />}
{replyDialog.open && <ReplyModal replyDialog={replyDialog} closeReplyDialog={closeReplyDialog} replyInputs={replyInputs} setReplyInputs={setReplyInputs} answerObservation={answerObservation} />}
{addPeriodOpen && <AddPeriodModal addPeriodOpen={addPeriodOpen} setAddPeriodOpen={setAddPeriodOpen} newPeriodYM={newPeriodYM} setNewPeriodYM={setNewPeriodYM} myPerms={myPerms} periods={periods} setPeriods={setPeriods} setSelectedPeriodId={setSelectedPeriodId} />}
{managePeriodsOpen && <ManagePeriodsModal managePeriodsOpen={managePeriodsOpen} setManagePeriodsOpen={setManagePeriodsOpen} sortedPeriods={sortedPeriods} filesCountByPeriod={filesCountByPeriod} selectedPeriodId={selectedPeriodId} setSelectedPeriodId={setSelectedPeriodId} periods={periods} setPeriods={setPeriods} isAdmin={isAdminOrSuper} isSuperAdmin={isSuperAdmin} cls={cls} />}
{exportRespOpen && <ExportRespModal exportRespOpen={exportRespOpen} setExportRespOpen={setExportRespOpen} exportFrom={exportFrom} setExportFrom={setExportFrom} exportTo={exportTo} setExportTo={setExportTo} exportKind={exportKind} setExportKind={setExportKind} exportRespKind={exportRespKind} setExportRespKind={setExportRespKind} exportDateFrom={exportDateFrom} setExportDateFrom={setExportDateFrom} exportDateTo={exportDateTo} setExportDateTo={setExportDateTo} exportRespondedCSV={exportRespondedCSV} selectedPeriodId={selectedPeriodId} periodNameById={periodNameById} />}
{processRespOpen && <ProcessRespModal processRespOpen={processRespOpen} setProcessRespOpen={setProcessRespOpen} processFrom={processFrom} setProcessFrom={setProcessFrom} processTo={processTo} setProcessTo={setProcessTo} processDateFrom={processDateFrom} setProcessDateFrom={setProcessDateFrom} processDateTo={processDateTo} setProcessDateTo={setProcessDateTo} processIncludeFileDoubts={processIncludeFileDoubts} setProcessIncludeFileDoubts={setProcessIncludeFileDoubts} processRespondedBatch={processRespondedBatch} />}
{/* MODAL: Mi perfil */}
      {me && (profileOpen || me?.mustChangePassword) && (
        <ProfileModal
          me={me}
          forcePasswordChange={!!me.mustChangePassword}
          onClose={() => {
            if (me?.mustChangePassword) return;
            setProfileOpen(false);
          }}
          onSaved={(updated) => {
            upsertUser(updated);
            setSessionState(getSession());
            if (!me?.mustChangePassword) {
              setProfileOpen(false);
              pushToast({
                title: "Perfil actualizado",
                message: "Se guardaron tus datos de perfil.",
              });
            } else {
              pushToast({
                title: "Perfil actualizado",
                message:
                  "Se guardaron tus datos. Actualizá también tu contraseña para continuar.",
              });
            }
          }}
          onPasswordChangedSuccess={() => {
            const users = loadUsers();
            const idx = users.findIndex((u: any) => u.id === me.id);
            if (idx >= 0) { users[idx].mustChangePassword = false; saveUsers(users); }
            setSessionState(getSession());
            setProfileOpen(false);
            pushToast({
              title: "Contraseña actualizada",
              message:
                "Se cambió tu contraseña. Podés seguir usando Dataflow.",
            });
          }}
        />
      )}

      {/* MODAL: Dashboard superadmin */}
      {dashboardOpen && isSuperAdmin && (
        <SuperadminDashboard
          onClose={() => setDashboardOpen(false)}
          files={files}
          downloadLogs={downloadLogs}
          usersSnap={usersSnap}
          periods={periods}
          periodNameById={periodNameById}
        />
      )}

      {/* MODAL: Reset liquidación (solo superadmin) */}
      {resetPeriodOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-900 bg-neutral-900 p-5">
            <h3 className="font-semibold text-rose-300 mb-1">🔥 Reset de liquidación</h3>
            <p className="text-sm text-neutral-400 mb-1">
              Vas a eliminar <span className="text-neutral-200 font-medium">todos los archivos</span> de la liquidación:
            </p>
            <p className="text-sm font-semibold text-neutral-100 mb-4">
              {periodNameById[selectedPeriodId] || selectedPeriodId}
            </p>
            <p className="text-xs text-rose-400 mb-4">
              Esta acción es irreversible. No queda trazabilidad de los archivos eliminados.
            </p>
            <label className="block text-xs text-neutral-400 mb-1">
              Ingresá tu contraseña de Super Administrador para confirmar:
            </label>
            <input
              type="password"
              autoFocus
              value={resetPeriodPass}
              onChange={(e) => { setResetPeriodPass(e.target.value); setResetPeriodError(""); }}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  const ok = await verifyPassword(me?.username, resetPeriodPass);
                  if (!ok) { setResetPeriodError("Contraseña incorrecta."); return; }
                  hardResetPeriod(selectedPeriodId);
                  setResetPeriodOpen(false);
                  setResetPeriodPass("");
                  setResetPeriodError("");
                  pushToast({ title: "Liquidación reseteada", message: `Todos los archivos de ${periodNameById[selectedPeriodId] || selectedPeriodId} fueron eliminados.` });
                }
              }}
              placeholder="Contraseña"
              className="w-full px-3 py-2 rounded-xl bg-neutral-800 outline-none border border-neutral-700 text-sm mb-2"
            />
            {resetPeriodError && (
              <p className="text-xs text-rose-400 mb-2">{resetPeriodError}</p>
            )}
            <div className="flex gap-2 justify-end mt-3">
              <button
                onClick={() => { setResetPeriodOpen(false); setResetPeriodPass(""); setResetPeriodError(""); }}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const ok = await verifyPassword(me?.username, resetPeriodPass);
                  if (!ok) { setResetPeriodError("Contraseña incorrecta."); return; }
                  hardResetPeriod(selectedPeriodId);
                  setResetPeriodOpen(false);
                  setResetPeriodPass("");
                  setResetPeriodError("");
                  pushToast({ title: "Liquidación reseteada", message: `Todos los archivos de ${periodNameById[selectedPeriodId] || selectedPeriodId} fueron eliminados.` });
                }}
                className="px-3 py-2 rounded-xl bg-rose-900/60 border border-rose-700 hover:bg-rose-900/80 text-sm text-rose-200"
              >
                Confirmar reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Gestión de usuarios */}
      {usersOpen && myPerms.actions.manageUsers && (
        <UserAdminModal
          onClose={() => setUsersOpen(false)}
          onOpenPermissions={(userId: string) =>
            setPermEdit({ open: true, userId })
          }
          meRole={meRole}
          onBorrarArchivosLiquidacion={() => hardResetPeriod(selectedPeriodId)}
        />
      )}

      {/* MODAL: Editor de permisos */}
      {permEdit.open && permEdit.userId && (
        <PermissionEditorModal
          userId={permEdit.userId}
          onClose={() => setPermEdit({ open: false, userId: null })}
        />
      )}

      {/* MODAL: Configuración de usuario */}
      {userConfigOpen && (
        <UserConfigModal onClose={() => setUserConfigOpen(false)} />
      )}

      {/* MODAL: Procesar dudas / arreglos (Sueldos) */}
      {procesarDudasOpen && meRole === 'sueldos' && (
        <ProcesarDudasModal
          files={files.filter(f => !f.eliminated && f.periodId === selectedPeriodId)}
          meId={me?.id || ''}
          meNombre={me?.displayName || me?.username || ''}
          onClose={() => setProcesarDudasOpen(false)}
          onProcess={async (rows, byId, byName) => {
            for (const { fileId, threadId, rowId } of rows) {
              markObservationProcessed(fileId, threadId, rowId);
            }
            // pequeña pausa para que los updates de estado se propaguen
            await new Promise(r => setTimeout(r, 200));
          }}
        />
      )}

      {/* PANEL: Ver por Sector */}
      {verPorSectorOpen && (
        <VerPorSectorPanel
          files={files.filter(f => !f.eliminated && f.periodId === selectedPeriodId)}
          sectors={sectors}
          sites={sites}
          onClose={() => setVerPorSectorOpen(false)}
        />
      )}

      {/* Toasts */}
      <ToastsFragment toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

