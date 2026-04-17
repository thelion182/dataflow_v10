// src/components/Splash.tsx
import React from "react";

export default function Splash({
  displayName = "Dataflow",
  message = "Inicializando Dataflow...",
}: {
  displayName?: string;
  message?: string;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Luces blancas (sin tinte azul) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-10 -left-10 w-[85%] h-[85%] bg-gradient-to-br from-white/10 via-transparent to-transparent animate-pulse" />
        <div className="absolute -bottom-10 -right-10 w-[65%] h-[65%] bg-gradient-to-tl from-white/10 via-transparent to-transparent animate-pulse [animation-delay:1s]" />
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex flex-col items-center">
        {/* 👇 Logo del public */}
        <img
          src="/dataflow-logo.svg"
          alt="Dataflow logo"
          className="h-24 animate-[spin_10s_linear_infinite]"
        />
        <h2 className="text-2xl font-bold mt-6">{displayName}</h2>
        <p className="text-neutral-400 mt-2 text-sm">{message}</p>
      </div>

      {/* Fade-out sincronizado (4s) */}
      <div className="absolute inset-0 bg-neutral-950 transition-opacity opacity-0 animate-[fadeout_4s_ease-in-out_forwards]" />
    </div>
  );
}