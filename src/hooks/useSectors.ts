// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { uuid } from "../lib/ids";
import type { SectorConfig, SiteConfig } from "../types";
import { db } from '../services/db';

export function useSectors({ rrhhUsers, me }: any = {}) {

  const skipSaveSectors = useRef(true);
  const skipSaveSites   = useRef(true);

  const [sectors, setSectors] = useState<SectorConfig[]>(() => {
    const r = db.sectors.getAllSectors();
    if (Array.isArray(r)) { skipSaveSectors.current = false; return r; }
    return [];
  });
  const [sites, setSites] = useState<SiteConfig[]>(() => {
    const r = db.sectors.getAllSites();
    if (Array.isArray(r)) { skipSaveSites.current = false; return r; }
    return [];
  });

  // Carga async para modo API (cuando el usuario se loguea)
  useEffect(() => {
    if (!me?.id) return;
    const rs = db.sectors.getAllSectors();
    if (rs && typeof (rs as any).then === 'function') {
      (rs as any).then((s: any) => { if (Array.isArray(s)) { skipSaveSectors.current = false; setSectors(s); } }).catch(() => {});
    }
    const ri = db.sectors.getAllSites();
    if (ri && typeof (ri as any).then === 'function') {
      (ri as any).then((s: any) => { if (Array.isArray(s)) { skipSaveSites.current = false; setSites(s); } }).catch(() => {});
    }
  }, [me?.id]);

  useEffect(() => { if (!skipSaveSectors.current) db.sectors.saveSectors(sectors); }, [sectors]);
  useEffect(() => { if (!skipSaveSites.current) db.sectors.saveSites(sites); }, [sites]);

  // ── Sites CRUD ─────────────────────────────────────────────────

  function addSite(base: Omit<SiteConfig, "id">) {
    const nuevo: SiteConfig = { ...base, id: uuid() };
    setSites((prev) => [...prev, nuevo]);
  }

  function updateSite(key: string, changes: Partial<SiteConfig>) {
    const k = (key || "").trim();
    setSites((prev) =>
      prev.map((s) =>
        s.id === k || String(s.code || "").toUpperCase() === k.toUpperCase()
          ? ({ ...s, ...changes } as SiteConfig)
          : s
      )
    );
  }

  function deleteSite(key: string) {
    const k = (key || "").trim();
    if (!window.confirm("¿Seguro que querés borrar esta sede?")) return;
    setSites((prev) =>
      prev.filter(
        (s) => !(s.id === k || String(s.code || "").toUpperCase() === k.toUpperCase())
      )
    );
  }

  // ── Sectors CRUD ───────────────────────────────────────────────

  function addSector(base: Omit<SectorConfig, "id">) {
    const nuevo: SectorConfig = { ...base, id: uuid() };
    setSectors((prev) => [...prev, nuevo]);
  }

  function updateSector(id: string, changes: Partial<SectorConfig>) {
    setSectors((prev) =>
      prev.map((s) => (s.id === id ? ({ ...s, ...changes } as SectorConfig) : s))
    );
  }

  function deleteSector(id: string) {
    if (!window.confirm("¿Seguro que querés borrar este sector?")) return;
    setSectors((prev) => prev.filter((s) => s.id !== id));
  }

  // ── CSV helpers ────────────────────────────────────────────────

  function norm(s: string) {
    return (s || "").toLowerCase();
  }

  function parseBool(val: any, defaultValue = false): boolean {
    const s = String(val ?? "").trim().toLowerCase();
    if (!s) return defaultValue;
    return ["1","true","t","si","sí","s","yes","y","ok","activo","activa"].includes(s);
  }

  function parseNum(val: any): number {
    const n = parseInt(String(val ?? "").trim(), 10);
    return Number.isFinite(n) ? n : 0;
  }

  // ── Template downloads ─────────────────────────────────────────

  function downloadSectorsTemplateCSV() {
    const header = "sector,patrones,sede,responsable,requeridos,sin_novedades,activo,cc";
    const example = "Roperia,sg,SG,lmatondi,1,si,si,CC001";
    const content = header + "\n" + example + "\n";
    const blob = new Blob(['\uFEFF' + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "plantilla_sectores_sedes.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadSitesTemplateCSV() {
    const BOM = "\uFEFF";
    const header = ["code","name","patterns","active"].join(",");
    const example = ["SG","Sanatorio Galicia","SG|GALICIA","si"].join(",");
    const csv = BOM + header + "\n" + example + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "plantilla_sedes.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // ── CSV import: sedes ──────────────────────────────────────────

  function handleImportSitesCSV(file: File) {
    const detectDelimiter = (text: string) => {
      const firstLine = (text || "").split(/\r?\n/).find((l) => l.trim().length > 0) || "";
      const commas = (firstLine.match(/,/g) || []).length;
      const semis = (firstLine.match(/;/g) || []).length;
      return semis > commas ? ";" : ",";
    };

    const cleanHeader = (s: string) =>
      String(s ?? "").replace(/^\uFEFF/, "").trim().toLowerCase();

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

    const parseSiNo = (v: any, def = false) => {
      const s = String(v ?? "").trim().toLowerCase();
      if (!s) return def;
      if (["si","sí","s","1","true","activo","activa","yes","y"].includes(s)) return true;
      if (["no","n","0","false","inactivo","inactiva"].includes(s)) return false;
      return def;
    };

    file.text().then((raw) => {
      const rows = parseCSVSmart(raw);
      if (!rows || rows.length < 2) { alert("CSV vacío o inválido."); return; }
      const headers = rows[0].map(cleanHeader);
      const idx = (key: string) => headers.findIndex((h) => h === key);
      const iCode = idx("code"); const iName = idx("name");
      const iPatterns = idx("patterns"); const iActive = idx("active");
      if (iCode < 0 || iName < 0) {
        alert(`Encabezados inválidos. Obligatorios: code,name\nEncontré: ${rows[0].join(", ")}`);
        return;
      }
      const imported: any[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const code = String(row[iCode] ?? "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 8);
        const name = String(row[iName] ?? "").trim();
        if (!code || !name) continue;
        const patternsRaw = iPatterns >= 0 ? String(row[iPatterns] ?? "") : "";
        const patterns = patternsRaw.split(/[,;|]/).map((x) => x.trim()).filter(Boolean);
        const active = iActive >= 0 ? parseSiNo(row[iActive], true) : true;
        imported.push({ code, name, patterns, active });
      }
      if (imported.length === 0) { alert("No se importó nada. Revisá que existan filas con code y name."); return; }
      for (const si of imported) {
        const existing = (sites || []).find(
          (x: any) => String(x?.code || "").toUpperCase() === String(si.code).toUpperCase()
        );
        if (existing?.id) {
          updateSite(existing.id, { code: si.code, name: si.name, patterns: si.patterns, active: si.active } as any);
        } else {
          addSite({ code: si.code, name: si.name, patterns: si.patterns, active: si.active } as any);
        }
      }
      alert(`Importadas/actualizadas ${imported.length} sedes.`);
    }).catch((err) => {
      console.error(err);
      alert("No se pudo leer el CSV.");
    });
  }

  // ── CSV import: sectores ───────────────────────────────────────

  function handleImportSectorsCSV(e: any) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    const splitCSV = (text: string) => {
      const rawLines = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
        .split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      if (rawLines.length === 0) return { header: [], rows: [] as string[][] };
      const head = rawLines[0];
      const countChar = (s: string, ch: string) => (s.match(new RegExp(`\\${ch}`, "g")) || []).length;
      const delim = countChar(head, ";") > countChar(head, ",") ? ";" : ",";
      const parseLine = (line: string) => {
        const out: string[] = []; let cur = ""; let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else { inQ = !inQ; }
            continue;
          }
          if (!inQ && ch === delim) { out.push(cur); cur = ""; continue; }
          cur += ch;
        }
        out.push(cur);
        return out.map((x) => x.trim());
      };
      const header = parseLine(rawLines[0]).map((h) => h.trim());
      const rows = rawLines.slice(1).map(parseLine);
      return { header, rows };
    };

    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const { header, rows } = splitCSV(text);
        if (!header || header.length === 0) { alert("El CSV no tiene encabezados."); return; }
        const idx = (name: string) =>
          header.findIndex((h) => String(h || "").trim().toLowerCase() === name.toLowerCase());

        const iSector = idx("sector"); const iNombre = idx("nombre");
        const iPatrones = idx("patrones"); const iSede = idx("sede");
        const iResp = idx("responsable"); const iReq = idx("requeridos");
        const iNoNews = idx("sin novedades"); const iActivo = idx("activo");
        const iCC = idx("cc") !== -1 ? idx("cc") : idx("centro de costo") !== -1 ? idx("centro de costo") : idx("centro_de_costo");
        const sectorCol = iSector !== -1 ? iSector : iNombre;

        if (sectorCol === -1) { alert('El CSV debe tener la columna "Sector".'); return; }
        if (iPatrones === -1) { alert('El CSV debe tener la columna "Patrones".'); return; }
        if (iSede === -1) { alert('El CSV debe tener la columna "Sede".'); return; }

        const siteByCode = new Map<string, any>();
        const siteByName = new Map<string, any>();
        for (const si of sites || []) {
          if (!si) continue;
          if (si.code) siteByCode.set(String(si.code).trim().toUpperCase(), si);
          if (si.name) siteByName.set(String(si.name).trim().toLowerCase(), si);
        }

        const rrhhList: any[] = (rrhhUsers || []);
        const findRRHHUser = (raw: string) => {
          const t = raw.trim().toLowerCase();
          if (!t) return null;
          return rrhhList.find((u: any) => String(u.username || "").trim().toLowerCase() === t) ||
                 rrhhList.find((u: any) => String(u.displayName || "").trim().toLowerCase() === t) || null;
        };

        const makeRuleKey = (sectorName: string, siteId: string) =>
          `${sectorName.trim().toLowerCase()}__${String(siteId || "").trim()}`;

        const existing = (sectors || []) as any[];
        const existingKeyToId = new Map<string, string>();
        for (const r of existing) {
          if (!r) continue;
          const sName = String(r.name || "").trim();
          const sId = String(r.siteId || "").trim();
          if (sName && sId) existingKeyToId.set(makeRuleKey(sName, sId), String(r.id));
        }

        let imported2 = 0; let updated = 0; let skipped = 0;
        const nextRules: any[] = [...existing];

        for (const row of rows) {
          const sectorName = String(row[sectorCol] ?? "").trim();
          const rawPatterns = String(row[iPatrones] ?? "").trim();
          const rawSede = String(row[iSede] ?? "").trim();
          if (!sectorName || !rawSede) { skipped++; continue; }

          const si = siteByCode.get(rawSede.trim().toUpperCase()) ||
                     siteByName.get(rawSede.trim().toLowerCase()) || null;
          if (!si?.id) { skipped++; continue; }

          const siteId = String(si.id);
          const siteCode = String(si.code || rawSede || "").trim().toUpperCase();
          const patterns = rawPatterns.split(/[|;]+/).map((p) => p.trim()).filter(Boolean);
          const requiredCount = Math.max(0, parseNum(row[iReq]));
          const allowNoNews = parseBool(row[iNoNews], true);
          const active = parseBool(row[iActivo], true);
          const respRaw = String(row[iResp] ?? "").trim();
          const rr = respRaw ? findRRHHUser(respRaw) : null;

          const key = makeRuleKey(sectorName, siteId);
          const existingId = existingKeyToId.get(key) || null;
          const cc = iCC >= 0 ? String(row[iCC] ?? "").trim() : "";
          const ruleObj: any = {
            id: existingId || uuid(), name: sectorName, patterns, active,
            requiredCount, allowNoNews, siteId, siteCode,
            ownerUserId: rr?.id || null, ownerUsername: respRaw || rr?.username || null,
            cc: cc || null,
          };

          if (existingId) {
            const ix = nextRules.findIndex((x: any) => String(x.id) === String(existingId));
            if (ix >= 0) { nextRules[ix] = { ...nextRules[ix], ...ruleObj }; updated++; }
            else { nextRules.push(ruleObj); imported2++; }
          } else {
            nextRules.push(ruleObj); imported2++;
            existingKeyToId.set(key, ruleObj.id);
          }
        }

        setSectors(nextRules);
        alert(`Importación OK.\nNuevas: ${imported2}\nActualizadas: ${updated}\nSaltadas: ${skipped}`);
      } catch (err) {
        console.error(err);
        alert("No se pudo importar el CSV.");
      } finally {
        try { e.target.value = ""; } catch {}
      }
    };

    reader.readAsText(file, "utf-8");
  }

  // ── Guess functions ────────────────────────────────────────────

  function guessSectorForFileName(fileName: string) {
    const lowerName = (fileName || "").toLowerCase();
    for (const s of sectors) {
      if (!s?.active) continue;
      const pats = Array.isArray(s.patterns) ? s.patterns : [];
      if (pats.some((p) => p && lowerName.includes(p.toLowerCase()))) return s;
    }
    return null;
  }

  function detectSiteCodeFromName(fileName: string, sitesArr: any[]) {
    const upper = (fileName || "").toUpperCase();
    for (const si of sitesArr || []) {
      const code = (si?.code || "").toUpperCase().trim();
      if (!code) continue;
      const re = new RegExp(`(^|[^A-Z0-9])${code}([^A-Z0-9]|$)`, "i");
      if (re.test(upper)) return code;
    }
    const low = norm(fileName);
    for (const si of sitesArr || []) {
      const pats = (si?.patterns || []).map(norm).filter(Boolean);
      if (pats.some((p: string) => low.includes(p))) {
        return (si?.code || "").toUpperCase().trim() || null;
      }
    }
    return null;
  }

  function matchRuleForFileName(fileName: string, sectorsArr: any[], siteCode: string | null) {
    const low = norm(fileName);
    const upper = (fileName || "").toUpperCase();
    const sc = (siteCode || "").toUpperCase();
    const activeRules = (sectorsArr || []).filter((r: any) => r?.active);
    const pool = sc
      ? activeRules.filter((r: any) => (r?.siteCode || "").toUpperCase() === sc)
      : activeRules;
    let best: any = null; let bestScore = -1;
    for (const r of pool) {
      const rSite = (r?.siteCode || "").toUpperCase();
      const pats = (r?.patterns || []).map(norm).filter(Boolean);
      if (pats.length === 0) continue;
      let score = 0;
      for (const p of pats) { if (p && low.includes(p)) score += 1; }
      if (rSite) {
        const re = new RegExp(`(^|[^A-Z0-9])${rSite}([^A-Z0-9]|$)`, "i");
        if (re.test(upper)) score += 3;
      }
      if (score > bestScore) { bestScore = score; best = r; }
    }
    return bestScore > 0 ? best : null;
  }

  function guessSiteForFileName(fileName: string) {
    const name = (fileName || "").toLowerCase();
    const active = (sites || []).filter((s) => s?.active !== false);
    for (const s of active) {
      const code = String(s.code || "").trim().toLowerCase();
      if (!code) continue;
      const re = new RegExp(`(^|[^a-z0-9])${code}([^a-z0-9]|$)`, "i");
      if (re.test(fileName)) return s;
    }
    for (const s of active) {
      const pats = Array.isArray(s.patterns) ? s.patterns : [];
      for (const p of pats) {
        const pp = String(p || "").trim().toLowerCase();
        if (pp && name.includes(pp)) return s;
      }
    }
    return null;
  }

  // ── Return ─────────────────────────────────────────────────────

  return {
    sectors, setSectors,
    sites, setSites,
    addSite, updateSite, deleteSite,
    addSector, updateSector, deleteSector,
    downloadSectorsTemplateCSV, handleImportSitesCSV,
    downloadSitesTemplateCSV, handleImportSectorsCSV,
    guessSectorForFileName, norm, detectSiteCodeFromName,
    matchRuleForFileName, guessSiteForFileName,
  };
}
