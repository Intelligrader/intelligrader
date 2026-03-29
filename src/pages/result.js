'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { marked } from "marked";
import * as motion from "motion/react-client";

const getHTMLFromMarkdown = (markdown) => {
  if (!markdown) return "<p>No content available</p>";
  return marked(markdown);
};

export default function Result() {
  const router = useRouter();
  const { response, input, questionType } = router.query;
  const responseAsString = Array.isArray(response) ? response[0] : response;
  const typedInput = Array.isArray(input) ? input[0] : input;
  const typedQuestionType = Array.isArray(questionType) ? questionType[0] : (questionType || 'DBQ');

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const gradients = [
      "gradient-purple",
      "gradient-yellow",
      "gradient-pink"
    ];

    const initialBlocks = Array.from({ length: 20 }).map(() => {
      const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
      return {
        top: Math.random() * windowHeight - 75,
        left: Math.random() * windowWidth - 75,
        size: Math.random() * 60 + 20,
        delay: Math.random() * 3,
        gradientClass: randomGradient,
      };
    });

    setBlocks(initialBlocks);
  }, []);

  const run = async () => {
    setIsPopupOpen(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionType: typedQuestionType,
          studentAnswer: typedInput,
        }),
      });
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      router.push(
        `/result?response=${encodeURIComponent(data.response)}&input=${encodeURIComponent(typedInput)}&questionType=${encodeURIComponent(typedQuestionType)}`
      );
      setIsPopupOpen(false);
    } catch (err) {
      console.error('Error during retry:', err);
    }
  };

  const handleHomeButtonClick = () => router.push('/');
  const openPopup = () => run();
  const closePopup = () => setIsPopupOpen(false);

  return (
    <div className="container">

      {/* Floating background blocks */}
      {blocks.map((block, idx) => (
        <motion.div
          key={idx}
          className={`block ${block.gradientClass}`}
          style={{
            top: `${block.top}px`,
            left: `${block.left}px`,
            width: `${block.size}px`,
            height: `${block.size}px`,
          }}
          initial={{ scale: 0, opacity: 0, rotate: 0 }}
          animate={{
            scale: [0, 1, 1.1, 1],
            opacity: [0, 0.3, 0.3, 0.05],
            rotate: [0, 5, -5, 0],
            y: [0, 10, -10, 0]
          }}
          transition={{ duration: 12, delay: block.delay, repeat: Infinity, repeatType: "reverse" }}
        />
      ))}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <h2 className="toggle-button" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</h2>
        <ul>
          <li>
            <button className="sidebar-button" onClick={handleHomeButtonClick}>
              Home
            </button>
          </li>
          <li>
            <button className="sidebar-button" onClick={openPopup}>
              Retry
            </button>
          </li>
        </ul>
      </aside>

      {/* Main Chat Content */}
      <main className="chat-container">
        <h1 className="chat-title">Results</h1>
        <div
          className="chat-message"
          dangerouslySetInnerHTML={{ __html: getHTMLFromMarkdown(responseAsString) }}
        />
      </main>

      {/* Popup */}
      {isPopupOpen && (
        <motion.div className="popup-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="popup-modal" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            <h2>Regrading in progress...</h2>
            <p>This may take a moment.</p>
            <p>Grab a cookie while you wait 🍪</p>
            <button onClick={closePopup}>Close</button>
          </motion.div>
        </motion.div>
      )}

      {/* Footer */}
      <footer className="page-footer">
        © 2025 Intelligrader. All rights reserved. | 
        <a href="https://policies.google.com/privacy">Privacy Policy</a> | 
        <button onClick={() => router.push('/tos')}>Terms of Service</button>
      </footer>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }

        .container {
          display: flex;
          height: 100vh;
          background: radial-gradient(circle, #ffffff, #fff1ff);
          color: #333;
          overflow: hidden;
          position: relative;
        }

        /* Floating blocks */
        .floating-block {
          position: absolute;
          border-radius: 8px;
          box-shadow: 0 4px 15px rgba(255,255,255,0.1);
        }

        /* Sidebar Styling */
        .sidebar {
            display: flex;
            flex-direction: column;
            width: 200px;
            background: rgba(255, 255, 255, 0.4);
            padding: 10px;
            backdrop-filter: blur(10px);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            transition: width 0.3s ease-in-out;
            position: relative;
            opacity: 0.95;
        }

        .sidebar.closed {
            width: 60px;
            align-items: center;
        }

        .toggle-button {
            font-size: 2rem;
            margin-bottom: 20px;
            color: #333;
            cursor: pointer;
            transition: transform 0.2s ease-in-out;
            align-self: center;
        }

        .toggle-button:hover {
            transform: scale(1.1);
        }

        .sidebar ul {
            list-style: none;
            padding: 0;
            width: 100%;
        }

        .sidebar li {
            display: flex;
            align-items: center;
            padding: 12px;
            cursor: pointer;
            font-size: 1.2rem;
            border-radius: 8px;
            transition: background 0.3s, transform 0.2s ease-in-out;
        }

        .sidebar li:hover {
            background: rgba(0, 0, 0, 0.05);
            transform: scale(1.05);
        }

        .sidebar-button {
            font-size: 1.2rem;
            padding: 12px;
            background: transparent;
            color: #333;
            border: none;
            cursor: pointer;
            text-align: left;
            width: 100%;
            border-radius: 8px;
            transition: background 0.3s, transform 0.2s ease-in-out;
        }

        .sidebar.closed .sidebar-button {
            display: none;
        }

        .sidebar-button:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: scale(1.05);
        }

        /* Chat Container */
        .chat-container {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 20px;
          padding-top: 10px;
          text-align: center;
          overflow-y: auto;
          width: calc(100% - 200px);
        }
        .chat-title {
          font-size: 2.5rem;
          background: linear-gradient(to right, #F9A906, #B616E9);
          -webkit-background-clip: text;
          color: transparent;
          margin-bottom: 20px;
          text-shadow: 2px 2px 5px rgba(0,0,0,0.3);
        }
        .chat-message {
          background: rgba(255,255,255,0.1);
          padding: 0.5in;
          border-radius: 12px;
          width: 95%;
          max-width: 95%;
          font-size: 1.3rem;
          text-align: left;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 15px rgba(255,255,255,0.1);
          border: 1px solid rgba(0,0,0,0.2);
          white-space: normal;
          overflow-wrap: break-word;
          margin: 0 auto;
        }

        /* Popup */
        .popup-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
        }
        .popup-modal {
          background: white;
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          text-align: center;
        }
        .popup-modal h2 { font-size: 1.5rem; margin-bottom: 10px; color: #1f2937; }
        .popup-modal p { color: #4b5563; margin: 5px 0; }
        .popup-modal button {
          margin-top: 15px;
          padding: 10px 20px;
          background: #7c3aed;
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.3s, transform 0.2s;
        }
        .popup-modal button:hover { background: #5b21b6; transform: scale(1.05); }

        /* Footer */
        .page-footer {
          width: 100%;
          background: #7c3aed;
          color: white;
          padding: 12px 0;
          text-align: center;
          font-size: 0.9rem;
          position: fixed;
          bottom: 0;
          left: 0;
          z-index: 50;
        }
        .page-footer a, .page-footer button {
          color: #93c5fd;
          background: none;
          border: none;
          cursor: pointer;
          margin: 0 4px;
          text-decoration: underline;
        }

        /* Floating blocks */
        .block {
          position: absolute;
          border-radius: 0.5rem;
        }
        .gradient-purple { background: linear-gradient(135deg, #a78bfa, #7c3aed); }
        .gradient-yellow { background: linear-gradient(135deg, #fcd34d, #f59e0b); }
        .gradient-pink { background: linear-gradient(135deg, #f472b6, #ec4899); }
      `}</style>
    </div>
  );
};
