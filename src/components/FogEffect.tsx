import React, { useState } from 'react';
import { motion } from 'motion/react';

export const FogEffect = () => {
  const [isHovered, setIsHovered] = useState(false);

  // Animation duration decreases (speed increases) on hover
  const duration = isHovered ? 2 : 6;

  return (
    <div 
      className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[150%] h-48 pointer-events-auto z-10 overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Layer 1: Base Smoke */}
      <motion.div
        animate={{ 
          x: [-50, 50, -50],
          y: [0, -20, 0],
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.3, 1]
        }}
        transition={{ 
          duration: duration, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute inset-0 bg-gradient-to-t from-white/30 via-white/10 to-transparent blur-3xl rounded-full"
      />
      
      {/* Layer 2: Wispy Smoke */}
      <motion.div
        animate={{ 
          x: [50, -50, 50],
          y: [-10, 10, -10],
          opacity: [0.1, 0.3, 0.1],
          scale: [1.2, 0.8, 1.2]
        }}
        transition={{ 
          duration: duration * 1.5, 
          repeat: Infinity, 
          ease: "linear",
          delay: 0.5
        }}
        className="absolute inset-0 bg-gradient-to-t from-neon-blue/10 via-white/5 to-transparent blur-2xl rounded-full"
      />

      {/* Layer 3: Dynamic Smoke Particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            y: [0, -100, -150],
            x: [Math.sin(i) * 50, Math.cos(i) * 50, Math.sin(i) * 50],
            opacity: [0, 0.5, 0],
            scale: [0.5, 2, 3],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: duration * (0.8 + ((i * 0.13) % 0.4)), 
            repeat: Infinity, 
            ease: "easeOut",
            delay: i * 0.3
          }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-white/20 blur-2xl rounded-full"
        />
      ))}
    </div>
  );
};
