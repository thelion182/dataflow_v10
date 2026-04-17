export const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Setiembre","Octubre","Noviembre","Diciembre",
  ];
  export const monthName = (m: number) => MONTHS_ES[(m - 1 + 12) % 12] || "Mes";
  export const nowISO = () => new Date().toISOString();
  export function formatDate(iso?: string){ if(!iso) return ""; return new Date(iso).toLocaleString(); }
  