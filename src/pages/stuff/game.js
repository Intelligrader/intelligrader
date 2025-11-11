// stuff/game.js
'use client';
import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { initGame } from './initGame';

export default function TwoDIn3DWorld() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const dialogueRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const destroy = initGame({ canvas: canvasRef.current, router, dialogueRef });
    return () => destroy && destroy();
  }, [router]);

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        backgroundColor: 'black',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Title Image */}
      <img
        src="/Title.png"
        alt="2D in a 3D World"
        style={{
          width: '60vw',
          maxWidth: '600px',
          marginBottom: '12px',
          imageRendering: 'pixelated',
          filter: 'drop-shadow(0 0 10px rgba(255,200,80,0.5))',
        }}
      />

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          border: '2px solid #374151',
          boxShadow: '0 0 20px rgba(0,0,0,0.7)',
        }}
      />
    </div>
  );
}