// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { uuid } from "../lib/ids";
import type { SectorConfig, SiteConfig, Combination } from "../types";
import { db } from '../services/db';

// ─── normalización ──────────────────────────────────────────────────────────
// Quita tildes, pasa a minúsculas, colapsa espacios.
// Plural simple: quita 's' final solo si la palabra queda con >= 3 chars.
function normText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function stemWord(w: string): string {
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  return w;
}
function normStem(s: string): string {
  return normText(s).split(" ").map(stemWord).join(" ");
}

// ─── detectar código de sede en un nombre de archivo ────────────────────────
// Solo busca el código exacto como "palabra" (separado por caracteres no-alfanuméricos).
export function detectSiteCode(fileName: string, sites: SiteConfig[]): string | null {
  for (const s of (sites || [])) {
    if (!s.active) continue;
    const code = (s.code || "").toUpperCase().trim();
    if (!code) continue;
    const re = new RegExp(`(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`, "i");
    if (re.test(fileName)) return code;
  }
  return null;
}

export type DetectResult =
  | { ok: true;  combination: Combination; siteCode: string }
  | { ok: false; error: "no_site" | "no_combination"; siteCode: string | null };

// ─── detectar combinación para un nombre de archivo ─────────────────────────
export function detectCombination(
  fileName: string,
  sites: SiteConfig[],
  combinations: Combination[]
): DetectResult {
  // 1. Buscar sede por código
  const siteCode = detectSiteCode(fileName, sites);
  if (!siteCode) return { ok: false, error: "no_site", siteCode: null };

  // 2. Combinaciones activas de esa sede
  const pool = (combinations || []).filter(
    (c) => c.active && (c.siteCode || "").toUpperCase() === siteCode
  );

  if (pool.length === 0) return { ok: false, error: "no_combination", siteCode };

  // 3. Normalizar filename para comparar
  const normFile = normStem(fileName);

  // 4. Puntuar cada combinación candidata
  //    +2 si el sector aparece en el filename
  //    +1 si la subcategoría aparece en el filename (o si subcategoría es null/vacío y no hay más específica)
  //    Ganadora: mayor puntaje > 0
  let best: Combination | null = null;
  let bestScore = -1;

  for (const c of pool) {
    const normSector = normStem(c.sectorName || "");
    if (!normSector) continue;

    // Verificar que el sector esté en el filename
    if (!normFile.includes(normSector)) continue;

    let score = 2; // sector coincide

    if (c.subcategory) {
      const normSub = normStem(c.subcategory);
      if (normSub && normFile.includes(normSub)) {
        score += 2; // subcategoría coincide → más específico
      } else {
        continue; // tiene subcategoría definida pero no aparece en el filename → no aplica
      }
    }
    // subcategory null/vacío: la combinación aplica solo por sector (score=2)

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  if (!best) return { ok: false, error: "no_combination", siteCode };
  return { ok: true, combination: best, siteCode };
}

export function useSectors({ rrhhUsers, me }: any = {}) {

  // loadedRef: se pone en true cuando la carga inicial del API terminó.
  // Mientras sea false, los efectos de save no corren (evita sobrescribir con datos vacíos).
  const loadedSectors      = useRef(false);
  const loadedSites        = useRef(false);
  const loadedCombinations = useRef(false);

  const [sectors, setSectors] = useState<SectorConfig[]>(() => {
    const r = db.sectors.getAllSectors();
    if (Array.isArray(r)) { loadedSectors.current = true; return r; }
    return [];
  });
  const [sites, setSites] = useState<SiteConfig[]>(() => {
    const r = db.sectors.getAllSites();
    if (Array.isArray(r)) { loadedSites.current = true; return r; }
    return [];
  });
  const [combinations, setCombinations] = useState<Combination[]>(() => {
    const r = db.combinations.getAll();
    if (Array.isArray(r)) { loadedCombinations.current = true; return r; }
    return [];
  });

  // Carga async para modo API — se ejecuta al login (me.id cambia)
  useEffect(() => {
    if (!me?.id) return;
    // Resetear flags para la nueva sesión
    loadedSectors.current = false;
    loadedSites.current = false;
    loadedCombinations.current = false;

    const rs = db.sectors.getAllSectors();
    if (rs && typeof (rs as any).then === 'function') {
      (rs as any).then((s: any) => {
        if (Array.isArray(s)) { loadedSectors.current = true; setSectors(s); }
      }).catch(() => {});
    }
    const ri = db.sectors.getAllSites();
    if (ri && typeof (ri as any).then === 'function') {
      (ri as any).then((s: any) => {
        if (Array.isArray(s)) { loadedSites.current = true; setSites(s); }
      }).catch(() => {});
    }
    const rc = db.combinations.getAll();
    if (rc && typeof (rc as any).then === 'function') {
      (rc as any).then((c: any) => {
        if (Array.isArray(c)) { loadedCombinations.current = true; setCombinations(c); }
      }).catch(() => {});
    }
  }, [me?.id]);

  // Guardar solo cuando la carga ya terminó (loadedRef = true)
  // y solo cuando me está logueado (evita guardas en logout)
  useEffect(() => {
    if (!loadedSectors.current || !me?.id) return;
    db.sectors.saveSectors(sectors);
  }, [sectors]);

  useEffect(() => {
    if (!loadedSites.current || !me?.id) return;
    db.sectors.saveSites(sites);
  }, [sites]);

  useEffect(() => {
    if (!loadedCombinations.current || !me?.id) return;
    db.combinations.saveAll(combinations);
  }, [combinations]);

  // ── Sites CRUD ─────────────────────────────────────────────────

  function addSite(base: Omit<SiteConfig, "id">) {
    const code = (base.code || "").toUpperCase().trim();
    if (!code) return;
    if (sites.some((s) => s.code === code)) {
      alert(`Ya existe una sede con el código "${code}".`);
      return;
    }
    setSites((prev) => [...prev, { ...base, code, id: uuid() } as SiteConfig]);
  }

  function updateSite(id: string, changes: Partial<SiteConfig>) {
    setSites((prev) =>
      prev.map((s) => s.id === id ? { ...s, ...changes } as SiteConfig : s)
    );
  }

  function deleteSite(id: string) {
    if (!window.confirm("¿Borrar esta sede? Las combinaciones asociadas también se borrarán.")) return;
    const site = sites.find((s) => s.id === id);
    if (site) {
      setCombinations((prev) => prev.filter((c) => c.siteCode !== site.code));
    }
    setSites((prev) => prev.filter((s) => s.id !== id));
  }

  // ── Sectors CRUD ───────────────────────────────────────────────

  function addSector(name: string) {
    const n = (name || "").trim();
    if (!n) return;
    setSectors((prev) => [...prev, { id: uuid(), name: n, active: true } as SectorConfig]);
  }

  function updateSector(id: string, changes: Partial<SectorConfig>) {
    setSectors((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...changes } as SectorConfig : s))
    );
  }

  function deleteSector(id: string) {
    if (!window.confirm("¿Borrar este sector?")) return;
    setSectors((prev) => prev.filter((s) => s.id !== id));
  }

  // ── Combinations CRUD ──────────────────────────────────────────

  function addCombination(data: Omit<Combination, "id">) {
    const exists = combinations.some(
      (c) =>
        c.siteCode === data.siteCode &&
        normText(c.sectorName) === normText(data.sectorName) &&
        normText(c.subcategory || "") === normText(data.subcategory || "")
    );
    if (exists) {
      alert("Ya existe esa combinación (sede + sector + subcategoría).");
      return;
    }
    setCombinations((prev) => [...prev, { ...data, id: uuid() } as Combination]);
  }

  function updateCombination(id: string, changes: Partial<Combination>) {
    setCombinations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...changes } as Combination : c))
    );
  }

  function deleteCombination(id: string) {
    if (!window.confirm("¿Borrar esta combinación?")) return;
    setCombinations((prev) => prev.filter((c) => c.id !== id));
  }

  // ── Conteo de combinaciones para barra de progreso ─────────────
  const activeCombinations = combinations.filter((c) => c.active);

  // ── Detect helpers (exported para useFiles) ────────────────────

  function detectCombinationForFile(fileName: string): DetectResult {
    return detectCombination(fileName, sites, combinations);
  }

  // ── CSV helpers ────────────────────────────────────────────────

  function parseBool(val: any, defaultValue = false): boolean {
    const s = String(val ?? "").trim().toLowerCase();
    if (!s) return defaultValue;
    return ["1","true","t","si","sí","s","yes","y","ok","activo","activa"].includes(s);
  }

  function parseNum(val: any): number {
    const n = parseInt(String(val ?? "").trim(), 10);
    return Number.isFinite(n) ? n : 0;
  }

  // ── CSV import: sedes ──────────────────────────────────────────
  function handleImportSitesCSV(file: File) {
    const detectDelimiter = (text: string) => {
      const firstLine = (text || "").split(/\r?\n/).find((l) => l.trim().length > 0) || "";
      const commas = (firstLine.match(/,/g) || []).length;
      const semis = (firstLine.match(/;/g) || []).length;
      return semis > commas ? ";" : ",";
    };
    const cleanHeader = (s: string) => String(s ?? "").replace(/^\uFEFF/, "").trim().toLowerCase();
    const parseCSVSmart = (raw: string) => {
      const delim = detectDelimiter(raw);
      const lines = (raw || "").split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
      const out: string[][] = [];
      for (const line of lines) {
        const row: string[] = [];
        let cur = ""; let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
            else { inQuotes = !inQuotes; }
            continue;
          }
          if (!inQuotes && ch === delim) { row.push(cur); cur = ""; continue; }
          cur += ch;
        }
        row.push(cur);
        out.push(row.map((c) => c.trim()));
      }
      return out;
    };
    file.text().then((raw) => {
      const rows = parseCSVSmart(raw);
      if (!rows || rows.length < 2) { alert("CSV vacío o inválido."); return; }
      const headers = rows[0].map(cleanHeader);
      const idx = (key: string) => headers.findIndex((h) => h === key);
      const iCode = idx("code"); const iName = idx("name"); const iActive = idx("active");
      if (iCode < 0 || iName < 0) {
        alert(`Encabezados inválidos. Obligatorios: code,name\nEncontré: ${rows[0].join(", ")}`);
        return;
      }
      const parseSiNo = (v: any, def = false) => {
        const s = String(v ?? "").trim().toLowerCase();
        if (!s) return def;
        return ["si","sí","s","1","true","activo","activa","yes","y"].includes(s);
      };
      let imported2 = 0; let updated = 0;
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const code = String(row[iCode] ?? "").trim().toUpperCase().slice(0, 8);
        const name = String(row[iName] ?? "").trim();
        if (!code || !name) continue;
        const active = iActive >= 0 ? parseSiNo(row[iActive], true) : true;
        const existing = sites.find((x: any) => x.code === code);
        if (existing) {
          updateSite(existing.id, { name, active });
          updated++;
        } else {
          setSites((prev) => [...prev, { id: uuid(), code, name, active } as SiteConfig]);
          imported2++;
        }
      }
      alert(`Importadas/actualizadas: ${imported2 + updated} sedes.`);
    }).catch(() => alert("No se pudo leer el CSV."));
  }

  // ── CSV import: combinaciones ──────────────────────────────────
  function handleImportCombinationsCSV(e: any) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const lines = text.replace(/\r\n/g,"\n").replace(/\r/g,"\n").split("\n").map(l=>l.trim()).filter(Boolean);
        if (lines.length < 2) { alert("CSV vacío."); return; }
        const head = lines[0];
        const delim = (head.match(/;/g)||[]).length > (head.match(/,/g)||[]).length ? ";" : ",";
        const parse = (line: string) => {
          const out: string[] = []; let cur = ""; let inQ = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { if (inQ && line[i+1]==='"') { cur+='"'; i++; } else { inQ=!inQ; } continue; }
            if (!inQ && ch === delim) { out.push(cur); cur=""; continue; }
            cur += ch;
          }
          out.push(cur);
          return out.map(x=>x.trim());
        };
        const header = parse(lines[0]).map(h=>h.replace(/^\uFEFF/,"").trim().toLowerCase());
        const idx = (k: string) => header.findIndex(h=>h===k);
        const iSite = idx("sede"); const iSector = idx("sector");
        const iSub = idx("subcategoria"); const iResp = idx("responsable");
        const iNoNews = idx("sin_novedades"); const iActive = idx("activo");
        if (iSite < 0 || iSector < 0) { alert('Obligatorios: sede,sector'); return; }

        const rrhhList: any[] = rrhhUsers || [];
        let added = 0; let skipped = 0;
        for (let r = 1; r < lines.length; r++) {
          const row = parse(lines[r]);
          const siteCode = String(row[iSite]??'').trim().toUpperCase();
          const sectorName = String(row[iSector]??'').trim();
          if (!siteCode || !sectorName) { skipped++; continue; }
          const subcategory = iSub>=0 ? (String(row[iSub]??'').trim()||null) : null;
          const respRaw = iResp>=0 ? String(row[iResp]??'').trim() : '';
          const rr = respRaw ? (rrhhList.find(u=>u.username?.toLowerCase()===respRaw.toLowerCase())||null) : null;
          const allowNoNews = iNoNews>=0 ? parseBool(row[iNoNews], true) : true;
          const active = iActive>=0 ? parseBool(row[iActive], true) : true;
          const exists = combinations.some(c =>
            c.siteCode===siteCode &&
            normText(c.sectorName)===normText(sectorName) &&
            normText(c.subcategory||"")===normText(subcategory||"")
          );
          if (exists) { skipped++; continue; }
          setCombinations(prev => [...prev, {
            id: uuid(), siteCode, sectorName, subcategory,
            ownerUserId: rr?.id||null, ownerUsername: respRaw||rr?.username||null,
            allowNoNews, active,
          } as Combination]);
          added++;
        }
        alert(`Importadas: ${added} combinaciones. Saltadas: ${skipped}`);
      } catch(err) { alert("Error al importar CSV."); }
      finally { try { e.target.value = ""; } catch {} }
    };
    reader.readAsText(file, "utf-8");
  }

  function downloadCombinationsTemplateCSV() {
    const header = "sede,sector,subcategoria,responsable,sin_novedades,activo";
    const example = "SC,Farmacia,,jperez,si,si";
    const blob = new Blob(['\uFEFF' + header + "\n" + example + "\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="plantilla_combinaciones.csv";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function downloadSitesTemplateCSV() {
    const blob = new Blob(['\uFEFF' + "code,name,active\nSC,Sede Central,si\nSG,Sanatorio Galicia,si\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="plantilla_sedes.csv";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // ── Return ─────────────────────────────────────────────────────

  return {
    sectors, setSectors,
    sites, setSites,
    combinations, setCombinations,
    activeCombinations,
    addSite, updateSite, deleteSite,
    addSector, updateSector, deleteSector,
    addCombination, updateCombination, deleteCombination,
    detectCombinationForFile,
    handleImportSitesCSV,
    handleImportCombinationsCSV,
    downloadCombinationsTemplateCSV,
    downloadSitesTemplateCSV,
    // compat: estas ya no hacen nada real pero evitan errores si algo las llama
    guessSectorForFileName: (_: string) => null,
    guessSiteForFileName: (fn: string) => {
      const code = detectSiteCode(fn, sites);
      return code ? (sites.find(s => s.code === code) || null) : null;
    },
  };
}
