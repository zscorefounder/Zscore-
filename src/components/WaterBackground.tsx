import React, { useEffect, useRef } from 'react';

export const WaterBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const rippleSettings = {
      size: 20,
      speed: 0.1,
      maxRipples: 10,
    };

    interface Ripple {
      x: number;
      y: number;
      r: number;
      opacity: number;
    }

    interface Leaf {
      x: number;
      y: number;
      size: number;
      rotation: number;
      rotationSpeed: number;
      vx: number;
      vy: number;
      type: 'emerald' | 'blue';
    }

    let ripples: Ripple[] = [];
    let leaves: Leaf[] = [];
    let animationFrameId: number;

    // Initialize leaves
    for (let i = 0; i < 15; i++) {
      leaves.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 15 + Math.random() * 30,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        type: Math.random() > 0.5 ? 'emerald' : 'blue'
      });
    }

    // Pre-calculate noise to avoid expensive Math.random() in the loop
    const noisePoints = Array.from({ length: 50 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 2
    }));

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      // Re-initialize leaves on resize to keep them distributed
      leaves = [];
      for (let i = 0; i < 15; i++) {
        leaves.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: 15 + Math.random() * 30,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.01,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          type: Math.random() > 0.5 ? 'emerald' : 'blue'
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (ripples.length < rippleSettings.maxRipples) {
        ripples.push({
          x: e.clientX,
          y: e.clientY,
          r: 0,
          opacity: 0.5,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw water base color (Deep blue to light blue gradient)
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#e0f2fe'); // Light blue top
      gradient.addColorStop(1, '#bae6fd'); // Slightly darker blue bottom
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw subtle water texture (noise) - Optimized
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = '#ffffff';
      noisePoints.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // Draw ripples
      for (let i = 0; i < ripples.length; i++) {
        const r = ripples[i];
        
        // Multiple rings for realism
        for (let j = 0; j < 3; j++) {
          const ringRadius = r.r - (j * 10);
          if (ringRadius > 0) {
            ctx.beginPath();
            ctx.arc(r.x, r.y, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(49, 168, 255, ${r.opacity / (j + 1)})`;
            ctx.lineWidth = 2 / (j + 1);
            ctx.stroke();
          }
        }

        r.r += 2.5;
        r.opacity -= 0.008;

        if (r.opacity <= 0) {
          ripples.splice(i, 1);
          i--;
        }
      }

      // Draw and animate leaves
      leaves.forEach(leaf => {
        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rotation);
        
        // Draw leaf shape
        ctx.beginPath();
        ctx.moveTo(0, -leaf.size / 2);
        ctx.quadraticCurveTo(leaf.size / 2, 0, 0, leaf.size / 2);
        ctx.quadraticCurveTo(-leaf.size / 2, 0, 0, -leaf.size / 2);
        
        const color = leaf.type === 'emerald' ? '16, 185, 129' : '59, 130, 246';
        ctx.fillStyle = `rgba(${color}, 0.15)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${color}, 0.3)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw leaf vein
        ctx.beginPath();
        ctx.moveTo(0, -leaf.size / 2);
        ctx.lineTo(0, leaf.size / 2);
        ctx.stroke();
        
        ctx.restore();

        // Animate leaf
        leaf.x += leaf.vx;
        leaf.y += leaf.vy;
        leaf.rotation += leaf.rotationSpeed;

        // Wrap around screen
        if (leaf.x < -leaf.size) leaf.x = width + leaf.size;
        if (leaf.x > width + leaf.size) leaf.x = -leaf.size;
        if (leaf.y < -leaf.size) leaf.y = height + leaf.size;
        if (leaf.y > height + leaf.size) leaf.y = -leaf.size;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ filter: 'blur(2px)' }}
    />
  );
};
