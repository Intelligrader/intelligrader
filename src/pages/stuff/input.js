// stuff/input.js
// Attaches all keyboard/mouse input, chat prompts, and returns key states + cleanup.

import { windowToCanvas } from './utils';
import { getHotbarLayout, getHotbarSlotRects, handleHotbarKeys } from './draw/hotbar';
import { TILE_SIZE, VIEW_W, VIEW_H } from './constants';
import { saveToCookies, loadFromCookies, restoreFromSave } from './storage/saveUtils.js';
import { handleNPCRightClick } from './npcs/npcManager.js';

/**
 * Creates and attaches input handlers.
 */
export function createInput(canvas, {
  player,
  trees,
  inventory,
  craftingMenu,
  escapeMenuState,
  dayNight,
  dialogueRef,
  onSelectHotbar,
  onCraft,
  onQuit,
  commands,
  state,
  placeBlock,
  getCamera,                 // ✅ add this
}) {
  const keys = Object.create(null);
  let mouseX = 0, mouseY = 0;
  // ---- Command autocomplete setup ----
  const KNOWN_COMMANDS = ['setblock', 'tp', 'give', 'help'];
  let tabMatches = [];
  let tabIndex = 0;

  // ---- Chat / Command state ----
  let chatOpen = false;
  let chatBuffer = '';
  let chatMode = null; // "command" or "text"
  const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  let historyIndex = -1;

  // ---- Helper ----
  function say(msg) {
    if (!dialogueRef) return;
    dialogueRef.current = { text: msg, frame: 0, duration: 120 };
  }

  function pushHistory(entry) {
    if (!entry) return;
    if (chatHistory[0] !== entry) {
      chatHistory.unshift(entry);
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory.slice(0, 50))); // keep last 50
    }
    historyIndex = -1;
  }


  // ---- Keyboard ----
  function onKeyDown(e) {
    // Capture input if chat is open
    if (chatOpen) {
      if (e.key === 'Enter') {
        const text = chatBuffer.trim();
        if (text.length > 0) {
          pushHistory(text);

          if (chatMode === 'command' && commands) {
            commands.runCommand(text);
          } else {
            say(text);
          }
        }
        chatBuffer = '';
        chatMode = null;
        chatOpen = false;
        e.preventDefault();
        return;
      }
      // --- TAB auto-complete (Minecraft-style) ---
      if (e.key === 'Tab') {
        e.preventDefault();

        if (chatMode === 'command' && chatBuffer.startsWith('/')) {
          const parts = chatBuffer.slice(1).split(/\s+/);
          const base = parts[0] || '';

          // If we haven't built a match list yet, find all matches
          if (tabMatches.length === 0) {
            tabMatches = KNOWN_COMMANDS.filter(cmd => cmd.startsWith(base.toLowerCase()));
            tabIndex = 0;
          } else {
            // Cycle through existing matches
            tabIndex = (tabIndex + 1) % tabMatches.length;
          }

          const match = tabMatches[tabIndex];
          if (match) {
            parts[0] = match;
            chatBuffer = '/' + parts.join(' ');
          }
        }

        return;
      }

      if (e.key === 'Escape') {
        chatBuffer = '';
        chatMode = null;
        chatOpen = false;
        e.preventDefault();
        return;
      }

      // ⬆ history backward
      if (e.key === 'ArrowUp' && chatHistory.length > 0) {
        if (historyIndex < chatHistory.length - 1) historyIndex++;
        chatBuffer = chatHistory[historyIndex] || '';
        e.preventDefault();
        return;
      }

      // ⬇ history forward
      if (e.key === 'ArrowDown' && chatHistory.length > 0) {
        if (historyIndex > 0) historyIndex--;
        else historyIndex = -1;
        chatBuffer = historyIndex >= 0 ? chatHistory[historyIndex] : '';
        e.preventDefault();
        return;
      }

      // Backspace / typing
      if (e.key === 'Backspace') {
        chatBuffer = chatBuffer.slice(0, -1);
        e.preventDefault();
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        chatBuffer += e.key;
        e.preventDefault();
      }

      if (e.key === 'Enter') {
        tabMatches = [];
        tabIndex = 0;
        return;
      }

      if (e.key === 'Escape') {
        tabMatches = [];
        tabIndex = 0;
        return;
      }
      return;
    }

    // ---- Open chat ----
    if (e.key === '/' || e.key.toLowerCase() === 't') {
      chatOpen = true;
      chatBuffer = e.key === '/' ? '/' : '';
      chatMode = e.key === '/' ? 'command' : 'text';
      e.preventDefault();
      return;
    }


    // ---- Normal gameplay ----
    keys[e.key] = true;

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // stop browser menu
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { camX, camY, scale } = getCamera();

      handleNPCRightClick(mx, my, camX, camY, scale, dialogueRef);
    });

    if (e.key === 'Escape' && state.placingBlock) {
      state.placingBlock = null;
      dialogueRef.current = { text: 'Placement cancelled', frame: 0, duration: 60 };
      return;
    }

    // Crafting menu
    if (e.key.toLowerCase() === 'c') {
      craftingMenu.toggle();
      return;
    }

    // Skip time (+10m)
    if (
      (e.shiftKey && (e.key === '=' || e.code === 'Equal')) ||
      e.key === '+' ||
      e.code === 'NumpadAdd'
    ) {
      dayNight?.skipMinutes?.(10);
      dialogueRef.current = { text: '+10 min', frame: 0, duration: 60 };
      e.preventDefault();
      return;
    }

    // ESC
    if (e.key === 'Escape') {
      if (inventory.open) { inventory.toggle(); return; }
      escapeMenuState.open = !escapeMenuState.open;
      escapeMenuState.hovered = -1;
      return;
    }

    // Inventory
    if (e.key.toLowerCase() === 'e') {
      if (!escapeMenuState.open) inventory.toggle();
      return;
    }

    // Block gameplay if a menu is open
    if (craftingMenu.open || inventory.open || escapeMenuState.open) return;

    // Hotbar 1–9
    const prevSlot = escapeMenuState.selectedSlot ?? 0;
    const newSlot = handleHotbarKeys(e, prevSlot);
    if (newSlot !== prevSlot) onSelectHotbar?.(newSlot);
  }

  function onKeyUp(e) {
    keys[e.key] = false;
  }

  function onMouseMove(e) {
    const { mx, my } = windowToCanvas(canvas, e, canvas.width, canvas.height);
    mouseX = mx;
    mouseY = my;

    if (state?.placingBlock && getCamera) {
      const { camX, camY, scale } = getCamera();
      // screen -> world
      const worldX = camX + mx / scale;
      const worldY = camY + my / scale;
      // snap to tile (top-left of tile under cursor)
      const gx = Math.floor(worldX / TILE_SIZE) * TILE_SIZE;
      const gy = Math.floor(worldY / TILE_SIZE) * TILE_SIZE;
      state.placingBlock.x = gx;
      state.placingBlock.y = gy;
    }

    craftingMenu.handleMouseMove(mx, my, canvas.width, canvas.height);
    inventory.handleMouseMove(mx, my, VIEW_W, VIEW_H, e);

    if (escapeMenuState.open) {
      escapeMenuState.hovered = -1;
      const startY = canvas.height / 2 - 60;
      const x1 = canvas.width / 2 - 80, x2 = canvas.width / 2 + 80;
      escapeMenuState.options.forEach((opt, i) => {
        const y = startY + i * 40;
        if (mx >= x1 && mx <= x2 && my >= y - 20 && my <= y + 10)
          escapeMenuState.hovered = i;
      });
    }
  }

  function onMouseDown(e) {
    // Ignore clicks while chat is open
    if (chatOpen) return;

    const { mx, my } = windowToCanvas(canvas, e, VIEW_W, VIEW_H);

    if (state?.placingBlock) {
      const { id, x, y } = state.placingBlock; // x,y already in WORLD coords
      placeBlock?.(id, x, y);
      state.placingBlock = null;
      return;
    }

    // Crafting click
    const crafted = craftingMenu.handleMouseClick(inventory.slots);
    if (crafted) onCraft?.(crafted);

    // Inventory drag/drop
    inventory.handleMouseDown(mx, my, canvas.width, canvas.height);

    // Escape menu buttons
    if (escapeMenuState.open) {
      const startY = canvas.height / 2 - 60;
      const x1 = canvas.width / 2 - 80, x2 = canvas.width / 2 + 80;
      escapeMenuState.options.forEach((opt, i) => {
        const y = startY + i * 40;
        if (mx >= x1 && mx <= x2 && my >= y - 20 && my <= y + 10) {
          if (opt.action === 'resume') escapeMenuState.open = false;
          if (opt.action === 'quit') onQuit?.();
          if (opt.action === 'save') {
            // Save everything
            const saveData = {
              player: { x: player.x, y: player.y, speed: player.speed, size: player.size },
              inventory: inventory.slots,
              timeOfDay: dayNight.getTime?.() ?? 0,
              trees,
            };
            saveToCookies('gameSave', saveData, 30);

            // Immediately reload and refresh
            const loaded = loadFromCookies('gameSave');
            if (loaded) {
              restoreFromSave(loaded, { player, inventory, dayNight, trees });
            }

            dialogueRef.current = { text: 'Game saved & synced!', frame: 0, duration: 120 };
            escapeMenuState.open = false;
          }
        }
      });
      return;
    }

    // Hotbar click
    const layout = getHotbarLayout(null, canvas.width, canvas.height);
    if (layout) {
      const rects = getHotbarSlotRects(layout);
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
          onSelectHotbar?.(i);
          return;
        }
      }
    }

    // Click dialogue
    const type = e.button === 2 ? 'Right Click!' : 'Left Click!';
    dialogueRef.current = { text: type, frame: 0, duration: 180 };
  }

  // ---- Chat Overlay Renderer ----
  function drawChatPrompt(ctx, VIEW_W, VIEW_H) {
    if (!chatOpen) return;
    const text = chatBuffer || '';
    const boxW = 400, boxH = 28;
    const x = (VIEW_W - boxW) / 2;
    const y = VIEW_H - boxH - 20;

    ctx.save();
    // ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeStyle = '#888';
    ctx.strokeRect(x, y, boxW, boxH);
    ctx.font = '14px monospace';

    ctx.fillStyle = chatMode === 'command' ? '#6cf' : '#fff';
    ctx.fillText(text, x + 8, y + 18);

    // --- Show suggestion (ghost text) ---
    if (chatMode === 'command' && chatBuffer.startsWith('/')) {
      const parts = chatBuffer.slice(1).split(/\s+/);
      const base = parts[0] || '';
      let suggestion = '';

      if (tabMatches.length > 0) {
        suggestion = tabMatches[tabIndex];
      } else {
        const found = KNOWN_COMMANDS.find(cmd => cmd.startsWith(base.toLowerCase()));
        if (found && found !== base) suggestion = found;
      }

      if (suggestion && suggestion !== base) {
        // ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#fff';
        ctx.fillText('/' + suggestion, x + 8, y + 18);
      }
    }
  }

  // ---- Attach listeners ----
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---- Cleanup ----
  return {
    keys,
    cleanup() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
    },
    drawChatPrompt,
  };
}
