'use client';
import React, { useEffect, useState } from 'react';

export default function LoadingScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 3000; // 3 seconds for demo
    const start = performance.now();

    function animate(now) {
      const pct = Math.min(1, (now - start) / duration);
      setProgress(pct * 100);
      if (pct < 1) requestAnimationFrame(animate);
      else setTimeout(() => onFinish?.(), 400);
    }

    requestAnimationFrame(animate);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black font-mono text-yellow-400 z-[9999]">
      {/* Logo */}
      <img
        src="/Title.png"
        alt="2D In A 3D World"
        className="w-[60vw] max-w-[600px] mb-12 drop-shadow-[0_0_15px_rgba(255,200,80,0.7)]"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Loading Bar (Tailwind-free, always visible) */}
      <div style={{position: 'relative', width: '70%', maxWidth: 480, height: 24, background: '#1f2937', border: '1px solid #a16207', borderRadius: 6, overflow: 'hidden', boxShadow: '0 0 12px rgba(255,200,80,.25)', marginTop: 8}}
      >
        <div style={{position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#F59E0B 0%, #FBBF24 50%, #FDE68A 100%)', transition: 'width .15s linear', willChange: 'width'}}
        />
        <span style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#111', pointerEvents: 'none'}}
        >
          {Math.floor(progress)}%
        </span>
      </div>

      {/* Text Below */}
      <p className="mt-5 text-sm text-gray-300 tracking-widest">
        {progress < 100 ? 'Loading assets...' : 'Ready!'}
      </p>
    </div>
  );
}
