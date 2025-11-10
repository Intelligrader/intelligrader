import React, { useEffect, useState } from 'react';
import LoadingScreen from './stuff/loadingScreen';
import Game from './stuff/game';

export default function TwoDIn3DWorld() {
  const [loaded, setLoaded] = useState(false);

  // Remove default margins/padding from browser
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.overflow = 'hidden';
  }, []);

  const pageStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'black',
    color: '#d1d5db', // gray-300
    fontFamily: 'monospace',
    overflow: 'hidden',
    position: 'relative', // for absolute footer
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

  const highlightStyle = {
    color: '#facc15',
    fontWeight: 'bold',
  };

  return (
    <div style={pageStyle}>
      <div style={contentStyle}>
        {!loaded && <LoadingScreen onFinish={() => setLoaded(true)} />}
        {loaded && <Game />}
      </div>

      {/* Fixed overlay footer */}
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
