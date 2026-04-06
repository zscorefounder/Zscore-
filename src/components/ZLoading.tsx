import React from 'react';
import { motion } from 'motion/react';

export const ZSpinner = ({ size = 40, className = "" }: { size?: number; className?: string }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* Outer Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 border-2 border-zinc-100 border-t-blue-600 rounded-full"
      />
      {/* Inner Pulsing Dot */}
      <motion.div
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)]"
      />
    </div>
  );
};

export const ZSkeleton = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`relative overflow-hidden bg-zinc-100 rounded-2xl ${className}`}>
      <motion.div
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />
    </div>
  );
};

export const ZPageLoader = () => {
  return (
    <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center gap-6">
      <ZSpinner size={60} />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-1"
      >
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-[0.3em]">Z Score Design</span>
        <span className="text-[10px] font-medium text-zinc-300 uppercase tracking-widest">Loading Experience...</span>
      </motion.div>
    </div>
  );
};
