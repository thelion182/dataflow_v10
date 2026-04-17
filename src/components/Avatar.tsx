import React from "react";
export default function Avatar({ src, name, size=28 }:{ src?:string; name?:string; size?:number }){
  const initials = (name||"").trim().split(/\s+/).map(s=>s[0]).slice(0,2).join("").toUpperCase() || "U";
  if(src){ return <img src={src} alt={name||"avatar"} className="rounded-full object-cover" style={{width:size, height:size}}/>; }
  return <div className="rounded-full bg-neutral-700 text-neutral-100 grid place-items-center font-medium" style={{width:size, height:size}}>{initials}</div>;
}

