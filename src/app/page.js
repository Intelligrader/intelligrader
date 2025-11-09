'use client'

import * as motion from "motion/react-client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { delay } from "framer-motion";

// >>> Cookies helpers
function setCookie(name, value, days = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}
function getCookie(name) {
  return document.cookie
    .split("; ")
    .find(row => row.startsWith(name + "="))
    ?.split("=")[1];
}

async function run({ input, router }) {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `Grade this APUSH DBQ: ${input}` }),
    });

    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    router.push(
      `/result?response=${encodeURIComponent(data.response)}&input=${encodeURIComponent(input)}`
    );
  } catch (error) {
    console.error('Error during chat session:', error);
  }
}

export default function Home() {
  const router = useRouter();
  const [blocks, setBlocks] = useState([]);
  const [input, setInput] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isBgSettingsOpen, setIsBgSettingsOpen] = useState(false);
  const [activeBgEffect, setActiveBgEffect] = useState(null);
  const [showPieces, setShowPieces] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [erasePieces, setErasePieces] = useState(false);
  const numberOfBlocks = 25;
  const [vh, setVh] = useState(0);

  // --- Typing reactivity for Techno mode ---
  const [intensity, setIntensity] = useState(1);
  const intensityTimer = useRef(null);
  function bumpIntensity(value) {
    setIntensity(value); // temporary "boost" multiplier
    if (intensityTimer.current) {
      clearTimeout(intensityTimer.current);
    }
    intensityTimer.current = setTimeout(() => setIntensity(1), 1000); // back to calm
  }


  // Responsive viewport height for accurate mirroring
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // >>> Load & save effect in cookies
  useEffect(() => {
    const saved = getCookie("activeBgEffect");
    if (saved) setActiveBgEffect(decodeURIComponent(saved));
  }, []);
  useEffect(() => {
    if (activeBgEffect) setCookie("activeBgEffect", activeBgEffect);
  }, [activeBgEffect]);

  useEffect(() => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const gradients = [
      "bg-gradient-to-br from-purple-400 to-purple-600",
      "bg-gradient-to-br from-yellow-400 to-yellow-600",
      "bg-gradient-to-br from-pink-400 to-red-500"
    ];

    const initialBlocks = Array.from({ length: numberOfBlocks }).map(() => {
      const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
      return {
        top: Math.random() * windowHeight - 75,
        left: Math.random() * windowWidth - 75,
        size: Math.random() * 60 + 20,
        delay: Math.random() * 3,
        gradient: randomGradient,
      };
    });

    setBlocks(initialBlocks);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsPopupOpen(true);
    await run({ input, router });
  };

  const togglePopup = () => setIsPopupOpen(!isPopupOpen);
  const toggleBgSettings = () => setIsBgSettingsOpen(!isBgSettingsOpen);
  const handleTOS = () => router.push('/tos');

  const puzzleBounds = {
    top: '10%',
    left: '25%',
    width: '50%',
    height: '70%',
  };

  const pieces = [
    { name: 'top-left', initial: { x: -500, y: -300 }, style: { top: puzzleBounds.top, left: puzzleBounds.left, width: '25%', height: '35%' }, delay: 0 },
    { name: 'top-right', initial: { x: 500, y: -300 }, style: { top: puzzleBounds.top, left: '50%', width: '25%', height: '35%' }, delay: 0.2 },
    { name: 'bottom-left', initial: { x: -500, y: 300 }, style: { top: '45%', left: puzzleBounds.left, width: '25%', height: '35%' }, delay: 0.4 },
    { name: 'bottom-right', initial: { x: 500, y: 300 }, style: { top: '45%', left: '50%', width: '25%', height: '35%' }, delay: 0.6 },
  ];

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-white to-purple-50 overflow-hidden">
      {/* Mirror-like glassy edge across screen center */}
      {activeBgEffect === 'reflective' && (
        <div
          className="absolute left-0 w-full z-[5] pointer-events-none"
          style={{
            top: `50%`,
            height: '3px',
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0.2), rgba(255,255,255,0.5))',
            boxShadow:
              '0 0 30px rgba(255,255,255,0.25), inset 0 0 8px rgba(255,255,255,0.25)',
            backdropFilter: 'blur(6px) brightness(1.2)',
            WebkitBackdropFilter: 'blur(6px) brightness(1.2)',
          }}
        />
      )}

      {/* Hidden SVG filter for ripple (used on bottom reflections) */}
      {activeBgEffect === 'reflective' && (
        <svg className="absolute w-0 h-0">
          <defs>
            <filter id="rippleFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="2" seed="2" result="noise">
                <animate attributeName="baseFrequency" dur="6s" values="0.008;0.012;0.008" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G">
                <animate attributeName="scale" dur="6s" values="6;10;6" repeatCount="indefinite" />
              </feDisplacementMap>
            </filter>
          </defs>
        </svg>
      )}

      {/* SETTINGS ICON TOP RIGHT */}
      <div className="absolute top-4 right-4 z-[60] flex flex-col items-center group">
        {/* Main icon */}
        <button
          className="p-3 text-gray-700 rounded-full transition-transform duration-300 group-hover:rotate-180 group-hover:scale-110"
          onClick={toggleBgSettings}
          aria-label="Background Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="#d1d5db" viewBox="0 0 24 24" stroke="#4b5563" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.89 3.31.877 2.42 2.42a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.89 1.543-.877 3.31-2.42 2.42a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.89-3.31-.877-2.42-2.42a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.89-1.543.877-3.31 2.42-2.42.996.575 2.273.12 2.573-1.065z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>

        {/* Mirrored reflection that rotates in place on hover */}
        {activeBgEffect === 'reflective' && (
          <div
            className="mt-[-12.5px] pointer-events-none [mask-image:linear-gradient(to_bottom,rgba(0,0,0,1),rgba(0,0,0,0))] [transform-origin:top]"
            aria-hidden
          >
            {/* Outer wrapper: ONLY the mirror flip */}
            <div className="transform-gpu scale-y-[-1]">
              {/* Inner element: gets the hover rotation/scale */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 opacity-40 blur-[1px] transition-transform duration-300 group-hover:rotate-180 group-hover:scale-110"
                fill="#d1d5db"
                viewBox="0 0 24 24"
                stroke="#4b5563"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.89 3.31.877 2.42 2.42a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.89 1.543-.877 3.31-2.42 2.42a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.89-3.31-.877-2.42-2.42a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.89-1.543.877-3.31 2.42-2.42.996.575 2.273.12 2.573-1.065z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Background Settings Popup */}
      {isBgSettingsOpen && (
        <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center"
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Background Settings</h2>
            <p className="text-gray-700 mb-4">Select one background effect:</p>
            <div className="flex flex-col gap-4">
              <button onClick={() => setActiveBgEffect(null)} className={`px-4 py-2 rounded-lg border ${activeBgEffect === null ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-800"}`}>Normal</button>
              <button onClick={() => setActiveBgEffect('reflective')} className={`px-4 py-2 rounded-lg border ${activeBgEffect === 'reflective' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800'}`}>Reflective Glass</button>
              <button onClick={() => setActiveBgEffect('waves')} className={`px-4 py-2 rounded-lg border ${activeBgEffect === 'waves' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800'}`}>Waves</button>
              <button onClick={() => setActiveBgEffect('techno')} className={`px-4 py-2 rounded-lg border ${activeBgEffect === 'techno' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800'}`}>Techno</button>
            </div>
            <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors" onClick={toggleBgSettings}>Close</button>
          </motion.div>
        </motion.div>
      )}

      {/* Floating background blocks + MIRROR ACROSS MID-SCREEN */}
      {(() => {
        const mid = vh / 2;
        const blockInitial = { scale: 0, opacity: 0, rotate: 0 };
        const mkAnimate = (invertY = false) => ({
          scale: [0, 1, 1.1, 1],
          opacity: [0, 0.3, 0.3, 0.05],
          rotate: [0, 5, -5, 0],
          y: invertY ? [0, -10, 10, 0] : [0, 10, -10, 0],
        });
        const baseTransition = (delay) => ({
          duration: 12,
          delay,
          repeat: Infinity,
          repeatType: "reverse",
        });

        // MAIN BLOCKS
        const mainBlocks = blocks.map((block, index) => (
          <motion.div
            key={`main-${index}`}
            className={`absolute ${block.gradient} rounded-lg shadow-lg`}
            style={{
              top: `${block.top}px`,
              left: `${block.left}px`,
              width: `${block.size}px`,
              height: `${block.size}px`,
            }}
            initial={blockInitial}
            animate={mkAnimate(false)}
            transition={baseTransition(block.delay)}
          />
        ));

        if (activeBgEffect !== "reflective") return mainBlocks;

        // REFLECTIONS
        const reflections = blocks.map((block, index) => {
          const mirroredTop = (2 * mid) - (block.top + block.size);

          return (
            <motion.div
              key={`mirror-${index}`}
              className={`absolute ${block.gradient} rounded-lg pointer-events-none`}
              style={{
                top: `${mirroredTop}px`,
                left: `${block.left}px`,
                width: `${block.size}px`,
                height: `${block.size}px`,
                transform: "scaleY(-1)",
                transformOrigin: "top",
                opacity: 0.45,
                filter: "blur(2px) brightness(1.15) contrast(1.2)",
                maskImage: "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0))",
                WebkitMaskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0))",
                mixBlendMode: "lighten",
              }}
              initial={blockInitial}
              animate={mkAnimate(true)}
              transition={baseTransition(block.delay)}
              aria-hidden
            />
          );
        });

        return (
          <>
            {mainBlocks}
            {/* RIPPLING REFLECTION LAYER */}
            <div
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                filter: "url(#rippleFilter)",
                transform: "translateZ(0)", // prevent flicker on Safari
              }}
            >
              {reflections}
            </div>
          </>
        );
      })()}

      <div className="absolute w-full h-full max-w-5xl">
        {showPieces && pieces.map((piece, idx) => (
          <motion.div
            key={piece.name}
            className="absolute flex items-center justify-center backdrop-blur-md bg-white/30 rounded-lg shadow-2xl p-4"
            style={piece.style}
            initial={piece.initial}
            animate={{ x: 0, y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: piece.delay, ease: "easeOut" }}
            onAnimationComplete={() => { if (idx === pieces.length - 1) { setTimeout(() => setErasePieces(true), 50); setTimeout(() => { setShowPieces(false); setShowForm(true); }, 250); } }}
            {...(erasePieces ? { animate: { x: 0, y: 0, opacity: 0 }, transition: { duration: 0.2, ease: "easeIn" } } : {})}
          />
        ))}

        {showForm && (
          // raised wrapper so reflection sits above background layers
          <div className="absolute rounded-3xl shadow-2xl relative z-[40]" style={puzzleBounds}>
            {/* REFLECTION (Reflective Glass only) */}
            {activeBgEffect === 'reflective' && (
              <motion.div
                className="pointer-events-none absolute left-0 right-0 z-[41]"
                style={{
                  top: 'calc(100% + 10px)',
                  height: '100%',
                  transform: 'scaleY(-1)',
                  transformOrigin: 'top',
                  maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0))',
                  WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0))',
                  opacity: 1,
                  filter: 'blur(3px)',
                }}
                animate={{ y: [0, 3, -2, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden
              >
                {/* mirrored silhouette of the card */}
                <div className="w-full h-full backdrop-blur-md bg-white/90 rounded-3xl shadow-2xl" />
              </motion.div>
            )}

            {activeBgEffect === "waves" && (
            <>
              {/* --- VIDEO BACKGROUND (shifted up to accommodate footer) --- */}
              <video
                className="fixed inset-0 w-full h-[110vh] object-cover pointer-events-none"
                src="/waves-bg.mp4"
                autoPlay
                loop
                muted
                playsInline
                style={{
                  top: "-17.6vh", // moves video upward
                  zIndex: 0,
                  filter: "brightness(1.05) contrast(1.1)",
                }}
              />

              {/* --- OPTIONAL OVERLAY for warmth/depth --- */}
              <div
                className="fixed inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to top, rgba(255,150,100,0.1), rgba(255,200,200,0.1), rgba(255,255,255,0.05))",
                  mixBlendMode: "overlay",
                  zIndex: 1,
                }}
              />
              
              {/* --- CREDITS BUTTON WITH TOOLTIP --- */}
              <div className="fixed bottom-[8vh] left-4 z-10 group">
                {/* The Button */}
                <button
                  onClick={() =>
                    window.open(
                      "https://www.reddit.com/r/Terraria/comments/14s9pr2/drew_a_terraria_ocean_biome_pixel_art_animation/",
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/30 rounded-lg shadow-md transition-all duration-300"
                >
                  Credits
                </button>

                {/* Cool Hover Tooltip */}
                <div
                  className="absolute bottom-full left-0 mb-2 hidden group-hover:flex items-center justify-center"
                  style={{
                    animation: "fadeIn 0.3s ease forwards",
                  }}
                >
                  <div className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-black text-xs border border-white/30 shadow-lg whitespace-nowrap">
                    reddit.com/r/Terraria/comments/14s9pr2/...
                  </div>
                </div>
              </div>

              {/* Tooltip fade-in animation */}
              <style jsx>{`
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                    transform: translateY(8px) scale(0.98);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                  }
                }
              `}</style>
            </>
          )}

          {activeBgEffect === "techno" && (
          <>
            {/* --- BLACK BACKGROUND --- */}
            <div className="fixed inset-0 bg-black z-0" />
            {/* --- PULSING GRID --- */}
            <div
              className="fixed inset-0 pointer-events-none z-[1]"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 30% 40%, rgba(255,255,255,0.04) 0%, transparent 60%)
                `,
                backgroundSize: "100% 100%",
              }}
            >
              {[...Array(2)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      i === 0
                        ? "linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)"
                        : "linear-gradient(0deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                    mixBlendMode: "screen",
                  }}
                  animate={{
                    opacity: [0.2, 0.5, 0.2],
                    filter: [
                      "drop-shadow(0 0 1px rgba(255,255,255,0.2))",
                      "drop-shadow(0 0 6px rgba(168,85,247,0.8))",
                      "drop-shadow(0 0 1px rgba(255,255,255,0.2))",
                    ],
                  }}
                  transition={{
                    duration: 0.8 / intensity + Math.random(),
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                    delay: Math.random(),
                  }}
                />
              ))}
            </div>

            {/* --- CENTER EXPLOSIVE BEAT --- */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[2]">
              {/* Core explosion pulse */}
              <motion.div
                className="rounded-full"
                style={{
                  width: 180,
                  height: 180,
                  background: `
                    radial-gradient(
                      circle,
                      rgba(168,85,247,1) 0%,
                      rgba(168,85,247,0.4) 30%,
                      rgba(168,85,247,0.1) 60%,
                      rgba(168,85,247,0) 90%
                    )
                  `,
                  mixBlendMode: "screen",
                  filter: "blur(10px)",
                }}
                animate={{
                  scale: [0, 2 * intensity],
                  opacity: [0.9, 0],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.5
                }}
              />

              {/* Outer shockwave ring */}
              <motion.div
                className="absolute rounded-full border-2 border-purple-400/80"
                style={{
                  width: 220,
                  height: 220,
                  mixBlendMode: "screen",
                  filter: "blur(2px)",
                }}
                animate={{
                  scale: [1, 9 * intensity],
                  opacity: [0.8, 0.2],
                  borderColor: [
                    "rgba(168,85,247,0.8)",
                    "rgba(255,255,255,0.9)",
                    "rgba(168,85,247,0)",
                  ],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.2,
                }}
              />
            </div>
          </>
        )}

            {/* actual form card */}
            <motion.div
              className={`relative z-[42] w-full h-full flex flex-col items-center justify-center backdrop-blur-md rounded-3xl p-8 transition-all duration-500
                ${
                  activeBgEffect === "techno"
                    ? "bg-gray-black border border-gray-700 shadow-[0_0_25px_rgba(255,255,255,0.08)]"
                    : "bg-white/0"
                }`}
              initial={{ clipPath: "polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)" }}
              animate={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              whileHover={{
                y: [0, -5, 5, 0],
                transition: { repeat: Infinity, duration: 3, ease: "easeInOut" },
              }}
            >
              <h1 className="text-5xl md:text-6xl font-serif font-bold bg-gradient-to-r from-yellow-500 to-purple-600 text-transparent bg-clip-text drop-shadow-lg mb-4 text-center">
                Intelligrader
              </h1>
              <h2 className="text-lg md:text-xl font-medium text-gray-400 mb-6 text-center">
                The APUSH DBQ Grader
              </h2>

              <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
                <textarea
                  rows={6}
                  placeholder="Paste your DBQ response here..."
                  className="w-full p-4 border rounded-xl shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-none"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    bumpIntensity(1.25); // triggers the visual multiplier
                  }}
                />
                <button
                  type="submit"
                  className="px-6 py-3 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:scale-105 transition-transform"
                >
                  Grade Now
                </button>
              </form>

              {/* Animated border pulse for Techno mode */}
              {activeBgEffect === "techno" && (
                <motion.div
                  className="absolute inset-0 rounded-3xl pointer-events-none border-2 border-gray-700"
                  style={{
                    boxShadow: "0 0 25px rgba(120,120,120,0.2)",
                  }}
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    boxShadow: [
                      "0 0 20px rgba(255,255,255,0.05)",
                      "0 0 30px rgba(255,255,255,0.15)",
                      "0 0 20px rgba(255,255,255,0.05)",
                    ],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}
            </motion.div>
          </div>
        )}
      </div>

      {isPopupOpen && (
        <motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            <h2 className="text-xl font-semibold mb-2 text-gray-800">Grading in progress...</h2>
            <p className="text-gray-700">This may take a moment.</p>
            <p className="text-gray-700 mt-2">Grab a cookie while you wait 🍪</p>
            <button className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors" onClick={togglePopup}>Close</button>
          </motion.div>
        </motion.div>
      )}

      <footer className="w-full py-6 bg-purple-700 text-white z-[50] text-center text-sm absolute bottom-0">
        © 2025 Intelligrader. All rights reserved. | <a href="https://policies.google.com/privacy" className="text-blue-300 hover:underline">Privacy Policy</a> | <button onClick={handleTOS} className="text-blue-300 hover:underline">Terms of Service</button>
      </footer>
    </div>
  );
}
