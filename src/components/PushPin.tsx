import React from 'react';

export const PushPin = ({ color = "#FF6321", className = "" }: { color?: string; className?: string }) => (
  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 z-20 drop-shadow-md pointer-events-none ${className}`}>
    <div className="w-4 h-4 rounded-full relative" style={{ backgroundColor: color }}>
      <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white/40 rounded-full" />
    </div>
    <div className="w-1 h-4 bg-zinc-400/50 mx-auto -mt-1 rounded-full" />
  </div>
);
