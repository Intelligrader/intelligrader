'use client'

import * as motion from "motion/react-client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';

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

/*
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
  */

export default function Home() {
  const router = useRouter();
  const [blocks, setBlocks] = useState([]);
  const [input, setInput] = useState("");
  const [questionType, setQuestionType] = useState("DBQ");
  const [fileName, setFileName] = useState(null);
const [fileMessage, setFileMessage] = useState(null);

async function run({ input, router, questionType = "DBQ" }) {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `Grade this APUSH ${questionType}: ${input}` }),
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
const handleFileChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setFileName(file.name);
  setFileMessage(null);

  const acceptTextTypes = [
    "text/",
    "application/json",
    "application/rtf",
    "application/xml",
  ];

  if (acceptTextTypes.some(t => file.type.startsWith(t)) || /\.(txt|md|json|csv|rtf|xml)$/i.test(file.name)) {
    try {
      const text = await file.text();
      setInput(prev => (prev ? prev + "\n\n" + text : text));
    } catch (err) {
      setFileMessage("Could not read file contents.");
      console.error(err);
    }
    return;
  }

  if (/\.(pdf|docx|doc|pages)$/i.test(file.name) || file.type === "application/pdf") {
    setFileMessage("File accepted but not extracted in-browser. Please paste text or upload a .txt/.md file.");
    return;
  }

  try {
    const text = await file.text();
    setInput(prev => (prev ? prev + "\n\n" + text : text));
  } catch {
    setFileMessage("Unsupported file type for extraction. Paste text instead.");
  }
};
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isBgSettingsOpen, setIsBgSettingsOpen] = useState(false);
  const [activeBgEffect, setActiveBgEffect] = useState(null);
  const [showPieces, setShowPieces] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [erasePieces, setErasePieces] = useState(false);
  const numberOfBlocks = 25;
  const [vh, setVh] = useState(0);

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
    await run({ input, router, questionType });
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
    {/* Heavy distortion band across screen center (Reflective only) */}
    {activeBgEffect === 'reflective' && (
      <div
        className="fixed left-0 w-full z-[5] pointer-events-none"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      >
        <motion.div
          className="relative w-full h-[12vh]"
          style={{
            // Strong refraction + blur of content behind
            filter: 'url(#mirrorDistort)',
            backdropFilter: 'blur(14px) saturate(160%) contrast(120%)',
            WebkitBackdropFilter: 'blur(14px) saturate(160%) contrast(120%)',
            // Feather top & bottom edges of the band
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.95) 20%, rgba(0,0,0,0.95) 80%, rgba(0,0,0,0))',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.95) 20%, rgba(0,0,0,0.95) 80%, rgba(0,0,0,0))',
            // A subtle internal sheen
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.10), rgba(255,255,255,0.02), rgba(255,255,255,0.10))',
            boxShadow:
              'inset 0 0 24px rgba(14, 13, 13, 0.18), 0 0 60px rgba(2, 2, 2, 0.1)',
            transform: 'translateZ(0)', // avoid flicker
          }}
          animate={{ y: [0, -2, 0, 2, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Top glint */}
          <motion.div
            className="absolute top-0 left-0 w-full h-[2px]"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(255,255,255,0.9), transparent)',
              opacity: 0.6,
              filter: 'blur(0.5px)',
            }}
            animate={{ opacity: [0.25, 0.7, 0.25] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Bottom glint */}
          <motion.div
            className="absolute bottom-0 left-0 w-full h-[2px]"
            style={{
              background:
                'linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent)',
              opacity: 0.55,
              filter: 'blur(0.5px)',
            }}
            animate={{ opacity: [0.2, 0.65, 0.2] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    )}

      {/* Hidden SVG filters for Reflective mode */}
      {activeBgEffect === 'reflective' && (
        <svg className="absolute w-0 h-0">
          <defs>
            {/* Existing mild ripple used on reflections */}
            <filter id="rippleFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="2" seed="2" result="noise">
                <animate attributeName="baseFrequency" dur="6s" values="0.008;0.012;0.008" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G">
                <animate attributeName="scale" dur="6s" values="6;10;6" repeatCount="indefinite" />
              </feDisplacementMap>
            </filter>

            {/* NEW: very strong distortion for the center mirror band */}
            <filter
              id="mirrorDistort"
              x="-20%" y="-100%" width="140%" height="300%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.015"
                numOctaves="2"
                seed="8"
                result="noise"
              >
                <animate attributeName="baseFrequency" dur="8s" values="0.005;0.02;0.005" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="60"
                xChannelSelector="R"
                yChannelSelector="G"
              >
                <animate attributeName="scale" dur="8s" values="45;0;45" repeatCount="indefinite" />
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
            {activeBgEffect === "reflective" && (
              <motion.div
                className="absolute left-0 right-0 pointer-events-none z-[41]"
                style={{
                  top: "calc(100% + 5px)",
                  transformOrigin: "top",
                  maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0))",
                  WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0))",
                  opacity: 1,
                  filter:
                    "url(#rippleFilter) blur(3px) brightness(1.05) contrast(1.05)",
                }}
                animate={{
                  y: [0, 1.5, -1.5, 0],
                }}
                transition={{
                  duration: 12, // slower movement
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                aria-hidden
              >
                {/* Calm, right-side-up reflection */}
                <motion.div
                  className="w-full h-full flex flex-col items-center justify-center backdrop-blur-md bg-white/75 rounded-3xl shadow-xl p-8"
                >
                  {/* Simplified reflection content */}
                 <button
                  type="submit"
                  className="w-full py-3 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:scale-105 transition-transform"
                  style={{
                    transform: "translateY(35px)", // drop it slightly below
                  }}
                >
                  ʍou ǝpɐɹꓨ
                </button>
                </motion.div>
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

            {/* actual form card */}
            <motion.div
              className={`relative z-[42] w-full h-full flex flex-col items-center justify-center backdrop-blur-md rounded-3xl p-8 transition-all duration-500 bg-white/0`}
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
                              <div className="w-full flex items-center justify-start gap-4">
  <label className="text-sm text-gray-600">Question Type</label>
  <select
    value={questionType}
    onChange={(e) => setQuestionType(e.target.value)}
    className="p-2 border rounded-lg bg-white text-sm"
    aria-label="Select question type"
  >
    <option value="DBQ">DBQ (Document-Based Question)</option>
    <option value="SAQ">SAQ (Short Answer Question)</option>
    <option value="LEQ">LEQ (Long Essay Question)</option>
  </select>
</div>
                <div className="flex gap-4 items-start">
                  <label className="flex flex-col items-center justify-center w-28 p-3 bg-white/30 border border-gray-200 rounded-xl cursor-pointer text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 16v1a2 2 0 002 2h14a2 2 0 002-2v-1M16 8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-sm">Upload</span>
                    <input
                      type="file"
                      accept="text/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,.pages,.txt,.md,.doc,.docx,.pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
              
                  <div className="flex-1">
                    <textarea
                      rows={6}
                      placeholder="Paste your DBQ response here..."
                      className="w-full p-4 border rounded-xl shadow-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-none"
                      value={input}
                      onChange={(e) => { setInput(e.target.value); }}
                    />
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <div>{fileName ? `Loaded: ${fileName}` : "No file loaded"}</div>
                      <div className="text-red-500">{fileMessage}</div>
                    </div>
                  </div>
                </div>
              
                <button
                  type="submit"
                  className="px-6 py-3 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:scale-105 transition-transform"
                  style={{ transform: "translateY(35px)" }}
                >
                  Grade Now
                </button>
              </form>
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

      {/* --- Tiny Easter Egg: 2D in a 3D World --- */}
      <div className="fixed right-3 bottom-[4.5rem] z-[90] group">
        <button
          aria-label="2D in a 3D World"
          onClick={() => router.push('/2d-in-3d-world')}
          className="w-8 h-8 rounded-full bg-white/30 border border-white/20
              flex items-center justify-center opacity-40 hover:opacity-100
              transition-all duration-300 hover:scale-110 shadow-[0_0_8px_rgba(0,0,0,0.25)]"
          title="2D in a 3D World"
        >
          {/* Minimalistic “2D cube” icon */}
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <rect x="5" y="5" width="10" height="10" rx="2" />
            <path d="M5 15l4 4h10v-10l-4-4" />
          </svg>
        </button>

        {/* Hover tooltip */}
        <div className="pointer-events-none absolute right-0 mr-1 -translate-y-2 hidden group-hover:block">
          <div className="px-2 py-1 -translate-y-12 text-[10px] rounded bg-black/70 text-white shadow whitespace-nowrap">
            2D in a 3D World
          </div>
        </div>
      </div>


      <footer className="w-full py-6 bg-purple-700 text-white z-[50] text-center text-sm absolute bottom-0">
        © 2025 Intelligrader. All rights reserved. | <a href="https://policies.google.com/privacy" className="text-blue-300 hover:underline">Privacy Policy</a> | <button onClick={handleTOS} className="text-blue-300 hover:underline">Terms of Service</button>
      </footer>
    </div>
  );
}








