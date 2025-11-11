// stuff/initGame.js
// Central initializer: sets up state, inputs, update/draw loop, and cleanup.

import { VIEW_W, VIEW_H, TILE_SIZE, CAM_EASE, ZOOM_MIN, ZOOM_MAX, ZOOM_SPEED } from './constants';
import { clamp, lerp } from './math';
import { loadImage, loadItemSprites } from './assets';
import { checkTreeCollisions as _checkTreeCollisions, checkBlockCollisions as _checkBlockCollisions } from './collisions';
import { drawWorld, drawPlayer, drawTrees, generateTreesByRow, updateDroppedItems, drawDroppedItems, tryPickupItems } from './draw/world';
import { drawHotbar, getHotbarLayout } from './draw/hotbar';
import { Inventory } from './draw/inventory';
import { drawEscapeMenu } from './draw/escapeMenu';
import { createDayNight } from './dayNight';
import { drawClock } from './dayNightClock';
import { loadAllBlocks, allBlocks } from './blocks/blocks';
import { CraftingMenu } from './draw/craftingMenu';
import { createInput } from './input';
import { createCommandRunner } from './commands';
import { itemsData } from './items';
import { loadFromCookies, restoreFromSave } from './storage/saveUtils.js';
import { setPlayerRef } from './state/playerState.js';
import { spawnTestNPCs, checkNPCCollisions, updateNPCs, drawNPCs, autoAttachSchedules, removeAllNPCs } from './npcs/npcManager.js';
import { Soundtrack } from './audio/soundtrack.js';

const player = { x: 200, y: 200, speed: 1.1, size: 8 };

export function initGame({ canvas, router, dialogueRef }) {
  let rafId = 0;
  // ---- canvas / ctx / DPR ----
  const ctx = canvas.getContext('2d', { alpha: false });
  const dpr = window.devicePixelRatio || 1;
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  canvas.style.imageRendering = 'pixelated';
  ctx.imageSmoothingEnabled = false;
  let dt = 0;
  let isGamePaused = false;

  function checkPause() {
    isGamePaused = escapeMenuState.open || inventory.open || craftingMenu.open;
    return isGamePaused;
  }

  const soundtrack = new Soundtrack([
    { id: 'spring', src: '/audio/Stardew Valley OST - Spring (The Valley Comes Alive).mp3', volume: 0.5 },
  ]);
  soundtrack.play('spring');
  window.__bgm = soundtrack;
  const savedMute = localStorage.getItem('bgmMuted') === '1';
  soundtrack.setMuted(savedMute);

  // ---- loop ----
  rafId = 0;
  function loop(now = performance.now()) {
    const elapsedMs = now - lastTime;
    lastTime = now;

    // Convert to “frames at 60fps”. Clamp to avoid big spikes.
    const dt = Math.min(3, elapsedMs / (1000 / 60));

    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  // Fit canvas to screen (keeps internal buffer fixed)
  function resizeCanvasToScreen() {
    const fit = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    const scale = fit >= 1 ? Math.floor(fit) : fit;
    canvas.style.width = Math.round(VIEW_W * scale) + 'px';
    canvas.style.height = Math.round(VIEW_H * scale) + 'px';
  }
  resizeCanvasToScreen();
  window.addEventListener('resize', resizeCanvasToScreen);

  // ---- world / images ----
  const worldImg = loadImage('/grass_field_73x55.png');
  const hotbarImg = loadImage('/hotbar.png');
  const treeImg = loadImage('/tree.png');

  // ---- player / camera ----
  const player = { x: 200, y: 200, speed: 1.1, size: 8 };
  setPlayerRef(player);
  let camX = 0, camY = 0;

  // ---- zoom ----
  let zoom = 2.25;
  const getViewSize = () => [Math.round(VIEW_W / zoom), Math.round(VIEW_H / zoom)];
  const getCamera = () => ({ camX, camY, scale: zoom });

  // ---- Menus ----
  const escapeMenuState = {
    open: false,
    hovered: -1,
    selectedSlot: 0,
    options: [
      { label: 'Resume Game', action: 'resume' },
      { label: 'Save Game', action: 'save' },
      { label: 'Quit to Home', action: 'quit' },
    ],
  };

  // ---- inventory & hotbar ----
  let hotbarItems = [];
  const inventory = new Inventory(9, 3, (items) => {
    hotbarItems = items; // sync bottom row to hotbar
  });

  // ---- items ----
  const itemSprites = loadItemSprites(itemsData);
  let lastTime = performance.now();

  // ---- trees ----
  let trees = [];
  const checkTreeCollisions = (px, py) => _checkTreeCollisions(px, py, player.size, trees);

  // --- Placed Blocks ---
  let worldObjects = [];
  const state = { placingBlock: null };

  // ---- day/night ----
  const dayNight = createDayNight({
    dayLengthSec: 100000,
    initialTime: 0.25,
    starsCount: 240,
  });

  // --- Placed Blocks ---
  const placedEntities = [];
  const commands = createCommandRunner({ placeBlock, player, inventory, dialogueRef, state });

  const craftingMenu = new CraftingMenu();
  loadAllBlocks().then(() => {
    craftingMenu.loadRecipes(); // ✅ now that blocks are registered, load recipes

    worldImg.onload = () => {
      player.x = Math.floor(worldImg.width / 2);
      player.y = Math.floor(worldImg.height / 2);
      trees = generateTreesByRow(worldImg.width, worldImg.height, player.x, player.y);

      removeAllNPCs();
      spawnTestNPCs();
      autoAttachSchedules();

      loop();
    };

    if (worldImg.complete && worldImg.naturalWidth) worldImg.onload?.();
  }).catch(err => console.error('Failed to load blocks:', err));

  // ---- input setup ----
  const { keys, cleanup: cleanupInput, drawChatPrompt } = createInput(canvas, {
    player,
    trees,
    inventory,
    craftingMenu,
    escapeMenuState,
    dayNight,
    dialogueRef,
    onSelectHotbar: (slot) => (escapeMenuState.selectedSlot = slot),
    onCraft: (crafted) => {
      if (crafted === 'campfire') {
        inventory.addItem({ id: 'campfire', count: 1 });
        dialogueRef.current = { text: 'Crafted Campfire', frame: 0, duration: 120 };
      }
    },
    onQuit: () => router.push('/'),
    commands,
    state,
    placeBlock,   // used to confirm placement
    getCamera,
  });

  // ---- update ----
  function update() {
    if (checkPause()) return;
    if (inventory.open || escapeMenuState.open) return;

    let dx = 0, dy = 0;
    if (keys['w'] || keys['ArrowUp']) dy -= 1;
    if (keys['s'] || keys['ArrowDown']) dy += 1;
    if (keys['a'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['ArrowRight']) dx += 1;
    if (dx && dy) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    const newX = clamp(player.x + dx * player.speed, player.size / 2, worldImg.width - player.size / 2);
    const newY = clamp(player.y + dy * player.speed, player.size / 2, worldImg.height - player.size / 2);

    if (
      !(_checkTreeCollisions(newX, newY, player.size, trees)) &&
      !(_checkBlockCollisions(newX, newY, player.size, worldObjects, TILE_SIZE))
    ) {
      // apply npc collision
      const resolved = checkNPCCollisions(newX, newY, player.size);
      player.x = resolved.x;
      player.y = resolved.y;
    }


    if (worldImg.width && worldImg.height) {
      const [viewW, viewH] = getViewSize();
      const desiredCamX = player.x - viewW / 2;
      const desiredCamY = player.y - viewH / 2;
      camX = lerp(camX, clamp(desiredCamX, 0, Math.max(0, worldImg.width - viewW)), CAM_EASE);
      camY = lerp(camY, clamp(desiredCamY, 0, Math.max(0, worldImg.height - viewH)), CAM_EASE);
    }

    updateDroppedItems(dt, worldImg.height);
    tryPickupItems(player, inventory);
    updateNPCs(dt);
  }

  function placeBlock(id, x, y) {
    const def = allBlocks.find(b => b.id === id);
    if (!def) {
      dialogueRef.current = { text: `Block "${id}" not found.`, frame: 0, duration: 100 };
      return;
    }

    // Snap to grid
    const snappedX = Math.floor(x / TILE_SIZE) * TILE_SIZE;
    const snappedY = Math.floor(y / TILE_SIZE) * TILE_SIZE;

    // Prevent overlapping blocks
    if (worldObjects.some(obj => obj.x === snappedX && obj.y === snappedY)) {
      dialogueRef.current = { text: 'Block already exists here.', frame: 0, duration: 80 };
      return;
    }

    worldObjects.push({ id, x: snappedX, y: snappedY, def });
    dialogueRef.current = { text: `${id} placed`, frame: 0, duration: 100 };
  }

  // ---- draw ----
  function draw() {
    const [viewW, viewH] = getViewSize();
    const scale = VIEW_W / viewW;

    // reset frame
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';   // <-- CHANGE THIS
    ctx.font = '12px monospace';

    // world & actors
    if (worldImg.width && worldImg.height) drawWorld(ctx, worldImg, camX, camY, viewW, viewH);
    drawPlayer(ctx, player, camX, camY, scale);
    drawNPCs(ctx, camX, camY, scale);
    drawDroppedItems(ctx, camX, camY, scale, itemSprites);
    drawTrees(ctx, treeImg, trees, camX, camY, scale);
    const tOfDay = dayNight.getCycle().t;
    for (const obj of worldObjects) {
      obj.def.draw(ctx, (obj.x - camX) * scale, (obj.y - camY) * scale, scale, dayNight.timeOfDay);
    }

    const lights = worldObjects
    .filter(o => o.def.lightLevel)
    .map(o => ({
      x: (o.x - camX + TILE_SIZE / 2) * scale,
      y: (o.y - camY + TILE_SIZE / 2) * scale,
      radius: 80 * o.def.lightLevel * scale,
      intensity: o.def.lightLevel,
    }));

    if (state.placingBlock) {
      const { def, x, y } = state.placingBlock;
      const img = def._img || (def._img = new Image());
      if (!def._img.src) def._img.src = def.texture;

      const size = (def.width || TILE_SIZE) * scale;
      const sx = (x - camX) * scale;
      const sy = (y - camY) * scale;

      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(img, sx, sy, size, size);
      ctx.restore();
    }

    // HUD info
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`x:${Math.round(player.x)} y:${Math.round(player.y)} zoom:${zoom.toFixed(2)}x`, 10, 18);

    // UI layers
    craftingMenu.draw(ctx, VIEW_W, VIEW_H);
    const hbLayout = getHotbarLayout(hotbarImg, VIEW_W, VIEW_H);
    drawHotbar(ctx, hotbarImg, hbLayout, escapeMenuState.selectedSlot, hotbarItems, itemSprites);
    inventory.draw(ctx, VIEW_W, VIEW_H, itemSprites);
    drawEscapeMenu(ctx, VIEW_W, VIEW_H, escapeMenuState.open, escapeMenuState.options, escapeMenuState.hovered);
    drawChatPrompt(ctx, VIEW_W, VIEW_H);

    // Dialogue bubble
    if (dialogueRef.current) {
      const d = dialogueRef.current;
      const life = d.duration;
      const alpha = Math.max(0, 1 - d.frame / life);
      const rise = (d.frame / life) * 10 * scale;
      const sx = Math.round((player.x - camX) * scale);
      const sy = Math.round((player.y - camY) * scale);
      const ps = Math.round(player.size * scale);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.font = `${Math.round(12 * scale)}px monospace`;
      const padX = Math.round(6 * scale);
      const w = ctx.measureText(d.text).width + padX * 2;
      const h = Math.round(18 * scale);
      const bx = Math.round(sx - w / 2);
      const by = Math.round(sy - ps / 2 - 24 * scale - rise);
      ctx.fillRect(bx, by, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
      ctx.fillStyle = '#fff';
      ctx.fillText(d.text, bx + padX, by + h - Math.round(6 * scale));
      ctx.restore();

      d.frame++;
      if (d.frame > d.duration) dialogueRef.current = null;
    }

    for (const e of placedEntities) {
      const sx = Math.round((e.x - camX) * scale);
      const sy = Math.round((e.y - camY) * scale);
      const sw = Math.round((e.w || 16) * scale);
      const sh = Math.round((e.h || 16) * scale);
      if (e.draw) e.draw(ctx, sx, sy, scale);
      else ctx.fillRect(sx, sy, sw, sh); // fallback
    }
    drawChatPrompt(ctx, VIEW_W, VIEW_H);

    // Day/night shaders + clock
    dayNight.render(ctx, VIEW_W, VIEW_H, { player, camX, camY, scale }, lights);
    if (!isGamePaused) {
      dayNight.update(1);
    }
    drawClock(ctx, dayNight, VIEW_W - 90, 36);
  }

  const saved = loadFromCookies('gameSave');
  if (saved) {
    restoreFromSave(saved, { player, inventory, dayNight, trees });
    console.log('Loaded save and synced all state.');
  }

  // ---- cleanup ----
  return function destroy() {
    cancelAnimationFrame(rafId);
    cleanupInput();
    window.removeEventListener('resize', resizeCanvasToScreen);
  };
}

export function getPlayerPosition() {
  return { x: player.x, y: player.y };
}