import React, { useEffect, useState } from 'react';
import LoadingScreen from './stuff/loadingScreen';
import Game from './stuff/game';

export default function TwoDIn3DWorld() {
  const [loaded, setLoaded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  // Remove default margins/padding
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.overflow = 'hidden';
  }, []);

  // Load mute setting on client
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('bgmMuted') === '1';
      setMuted(saved);
    }
  }, []);

  // Apply mute to soundtrack
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.__bgm) {
      window.__bgm.setMuted(muted);
      if (!muted) window.__bgm.resume?.();
    }
    if (window.localStorage)
      localStorage.setItem('bgmMuted', muted ? '1' : '0');
  }, [muted]);

  // Styles
  const pageStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'black',
    color: '#d1d5db',
    fontFamily: 'monospace',
    overflow: 'hidden',
    position: 'relative',
  };

  const contentStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  };

  const footerStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    textAlign: 'center',
    padding: '8px 0',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#d1d5db',
    fontSize: '14px',
    borderTop: '1px solid #374151',
    lineHeight: '1.4',
    zIndex: 100,
  };

  const highlightStyle = { color: '#facc15', fontWeight: 'bold' };

  const musicBtnWrap = {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 200,
  };

  const musicBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid #374151',
    background: 'rgba(0,0,0,0.6)',
    color: '#d1d5db',
    cursor: 'pointer',
  };

  const iconStyle = { width: 18, height: 18 };

  // Credits dropdown styles
  const creditsWrap = {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 200,
  };

  const creditsBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid #374151',
    background: 'rgba(0,0,0,0.6)',
    color: '#d1d5db',
    fontSize: 14,
    cursor: 'pointer',
    userSelect: 'none',
  };

  const dropdown = {
    position: 'absolute',
    top: '44px',
    left: 0,
    width: 220,
    background: 'rgba(20,20,20,0.95)',
    border: '1px solid #374151',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    padding: '10px',
    fontSize: 13,
    color: '#d1d5db',
  };

  return (
    <div style={pageStyle}>
      {/* Credits dropdown */}
      <div style={creditsWrap}>
        <button style={creditsBtn} onClick={() => setShowCredits(v => !v)}>
          Credits ▾
        </button>
        {showCredits && (
          <div style={dropdown}>
            <strong>2D in a 3D World</strong>
            <br />
            Created by <span style={highlightStyle}>Satya Lakkaraju</span>
            <br />
            <br />
            <br />
            <strong>Art & Assets</strong>
            <br />
            • Trees, tiles & icons from Stardew Valley & Minecraft - TO BE REPLACED!<br />
            <br />
            • UI & sprites from Stardew Valley & Minecraft - TO BE REPLACED!<br />
            <br />
            <br />
            <strong>Music</strong>
            <br />
            • Stardew Valley OST - Spring (The Valley Comes Alive) by <i>Eric "ConcernedApe" Barone</i><br />
          </div>
        )}
      </div>

      {/* Music button */}
      <div style={musicBtnWrap}>
        <button
          aria-label={muted ? 'Unmute music' : 'Mute music'}
          title={muted ? 'Unmute music' : 'Mute music'}
          style={musicBtn}
          onClick={() => setMuted(m => !m)}
        >
          {muted ? (
            <svg
              viewBox="0 0 24 24"
              style={iconStyle}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 5L6 9H3v6h3l5 4V5z" />
              <path d="M23 9l-6 6" />
              <path d="M17 9l6 6" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              style={iconStyle}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 5L6 9H3v6h3l5 4V5z" />
              <path d="M15 9a4 4 0 010 6" />
              <path d="M17 5a8 8 0 010 14" />
            </svg>
          )}
        </button>
      </div>

      {/* Game area */}
      <div style={contentStyle}>
        {!loaded && <LoadingScreen onFinish={() => setLoaded(true)} />}
        {loaded && <Game />}
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        2D in a 3D World — Development Build | Press{' '}
        <span style={highlightStyle}>Shift + "="</span> to skip time,{' '}
        <span style={highlightStyle}>E</span> to open inventory,{' '}
        <span style={highlightStyle}>WASD/Arrow Keys</span> to move,{' '}
        <span style={highlightStyle}>.</span> to zoom in,{' '}
        <span style={highlightStyle}>,</span> to zoom out, and{' '}
        <span style={highlightStyle}>ESC</span> to pause.
      </div>
    </div>
  );
}
