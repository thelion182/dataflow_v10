import React from "react";
export default function Logo({ className = "", alt = "Dataflow", forceVisible = true }:{ className?:string; alt?:string; forceVisible?:boolean }){
  const [broken, setBroken] = React.useState(false);
  if(broken){
    return <div className={`h-9 w-9 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] text-neutral-300 ${className}`} title="Logo no encontrado">{alt?.[0] ?? "?"}</div>;
  }
  return (
    <img
      src={`/dataflow-logo.svg?v=1`}
      alt={alt}
      className={`w-auto ${className}`}
      style={forceVisible ? { filter: "invert(1) brightness(1.05) contrast(0.95)" } : undefined}
      onError={() => setBroken(true)}
    />
  );
}
