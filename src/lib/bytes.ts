export function prettyBytes(n?: number){
  const num = Number(n);
  if(!Number.isFinite(num) || num < 0) return "–";
  const u = ["B","KB","MB","GB","TB"]; let i=0; let x = num;
  while(x >= 1024 && i < u.length-1){ x/=1024; i++; }
  return `${x.toFixed(x<10 && i>0 ? 1 : 0)} ${u[i]}`;
}
