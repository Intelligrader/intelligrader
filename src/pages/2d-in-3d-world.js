'use client';
import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { itemsData, generateInventorySlots } from './stuff/items';
import { VIEW_W, VIEW_H, TILE_SIZE, CAM_EASE, ZOOM_MIN, ZOOM_MAX, ZOOM_SPEED, TREE_COUNT, TREE_MIN_DISTANCE, TREE_SPACING, updateViewSize } from './stuff/constants';
import { clamp, lerp } from './stuff/math';
import { windowToCanvas } from './stuff/utils';
import { loadImage, loadItemSprites } from './stuff/assets';
import { checkTreeCollisions as _checkTreeCollisions } from './stuff/collisions';

import { drawWorld, drawPlayer, drawTrees } from './stuff/draw/world';
import { HOTBAR_SLOTS, getHotbarLayout, getHotbarSlotRects, drawHotbar } from './stuff/draw/hotbar';
import {
  INVENTORY_COLS, INVENTORY_ROWS, SLOT_SIZE, SLOT_MARGIN, INVENTORY_PAD,
  getInventoryLayout, getSlotIndexFromMouse, drawInventory, drawItemTooltip
} from './stuff/draw/inventory';
import { drawEscapeMenu } from './stuff/draw/escapeMenu';
import { createDayNight } from './stuff/dayNight';
import { drawClock } from './stuff/dayNightClock';

export default function TwoDIn3DWorld() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const dialogueRef = useRef(null);

  const dayNight = createDayNight({
    dayLengthSec: 100000,   // full cycle in seconds (change to taste)
    initialTime: 0.25,   // start around morning
    starsCount: 240
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // --- Canvas / DPR ---
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    const dpr = window.devicePixelRatio || 1;
    canvas.width = VIEW_W * dpr;
    canvas.height = VIEW_H * dpr;
    canvas.style.width = 'min(90vw, 90vh)';
    canvas.style.height = `${(VIEW_H / VIEW_W) * 100}vmin`;
    canvas.style.imageRendering = 'pixelated';
    ctx.imageSmoothingEnabled = false;

    function resizeCanvasToScreen() {
      const W = window.innerWidth;
      const H = window.innerHeight;

      // Fit (contain) while preserving aspect ratio
      const fit = Math.min(W / VIEW_W, H / VIEW_H);

      // Prefer integer upscales for crisp pixels; allow fractional when shrinking
      const scale = fit >= 1 ? Math.floor(fit) : fit;

      const cssW = Math.round(VIEW_W * scale);
      const cssH = Math.round(VIEW_H * scale);

      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
    }

    resizeCanvasToScreen();

    // --- World ---
    const worldImg = loadImage('/grass_field_73x55.png');
    let worldW = 0, worldH = 0;

    // --- Player ---
    const player = { x: 200, y: 200, speed: 1.1, size: 16 };

    // --- Zoom / Viewport ---
    let zoom = 2.25;
    const getViewSize = () => [Math.round(VIEW_W / zoom), Math.round(VIEW_H / zoom)];

    // --- Camera ---
    let camX = 0, camY = 0;

    // --- Input ---
    const keys = Object.create(null);

    // --- Escape menu ---
    let escapeMenuOpen = false;
    const escapeOptions = [
      { label: 'Resume Game', action: 'resume' },
      { label: 'Save Game', action: 'save' },
      { label: 'Quit to Home', action: 'quit' }
    ];
    let hoveredEscapeIndex = -1;

    // --- Hotbar ---
    const hotbarImg = loadImage('/hotbar.png');
    let selectedSlot = 0;

    // --- Inventory ---
    const inventoryImg = loadImage('/ui.png'); // (used as a decorative panel if you like)
    let inventoryOpen = false;
    let inventorySlots = generateInventorySlots(27).map((slot) =>
      slot.itemId ? { ...slot, item: itemsData.find((i) => i.id === slot.itemId) } : slot
    );
    let hoveredSlot = -1;
    let selectedInventorySlot = -1;

    // --- Items (sprites loaded on client) ---
    const itemSprites = loadItemSprites(itemsData);

    // --- Trees ---
    // --- Trees (procedural generation) ---
    const treeImg = loadImage('/tree.png');
    let trees = [];

    // Generate trees after world dimensions are known
    function generateTrees(worldW, worldH, playerSpawnX, playerSpawnY) {
      const TILE_SIZE = 16;
      const cols = Math.floor(worldW / TILE_SIZE);
      const rows = Math.floor(worldH / TILE_SIZE);
      const grid = Array.from({ length: rows }, () => Array(cols).fill(false));
      const trees = [];

      const toTile = (v) => Math.floor(v / TILE_SIZE);

      const playerTileX = toTile(playerSpawnX);
      const playerTileY = toTile(playerSpawnY);

      // function to mark surrounding tiles as blocked
      function markSurrounding(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) {
              grid[ny][nx] = true;
            }
          }
        }
      }

      // prevent tree spawn near player
      const SAFE_RADIUS = 4; // tiles around spawn
      for (let dy = -SAFE_RADIUS; dy <= SAFE_RADIUS; dy++) {
        for (let dx = -SAFE_RADIUS; dx <= SAFE_RADIUS; dx++) {
          const nx = playerTileX + dx;
          const ny = playerTileY + dy;
          if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) {
            grid[ny][nx] = true;
          }
        }
      }

      // place trees on available tiles
      for (let attempt = 0; attempt < 5000; attempt++) {
        if (trees.length >= TREE_COUNT) break;
        const tx = Math.floor(Math.random() * cols);
        const ty = Math.floor(Math.random() * rows);

        // skip used or adjacent tiles
        if (grid[ty][tx]) continue;

        // mark occupied + adjacent
        markSurrounding(tx, ty);

        // convert back to world coords
        const worldX = tx * TILE_SIZE;
        const worldY = ty * TILE_SIZE;

        trees.push({
          x: worldX,
          y: worldY - 5 * TILE_SIZE, // lift canopy visually
          w: 48,
          h: 96,
          collisionBoxes: [
            { x: TILE_SIZE, y: 5 * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE }
          ]
        });
      }

      return trees;
    }

    // --- Utils / State for tooltips ---
    let mouseX = 0, mouseY = 0;

    // --- Collision wrapper (binds to current lists) ---
    const checkTreeCollisions = (px, py) =>
      _checkTreeCollisions(px, py, player.size, trees);

    // --- Input handlers ---
    const onKeyDown = (e) => {
      keys[e.key] = true;

      // ESC behavior
      if (e.key === 'Escape') {
        if (inventoryOpen) { inventoryOpen = false; return; }
        escapeMenuOpen = !escapeMenuOpen;
        hoveredEscapeIndex = -1;
        return;
      }

      // Toggle inventory
      if (e.key.toLowerCase() === 'e') {
        if (escapeMenuOpen) return;
        inventoryOpen = !inventoryOpen;
        return;
      }

      // Block gameplay while in menus
      if (inventoryOpen || escapeMenuOpen) return;

      // Hotbar 1–9
      if (e.key >= '1' && e.key <= '9') selectedSlot = Number(e.key) - 1;

      // Zoom
      if (e.key === '.') zoom = Math.min(ZOOM_MAX, zoom * (1 + ZOOM_SPEED));
      if (e.key === ',') zoom = Math.max(ZOOM_MIN, zoom / (1 + ZOOM_SPEED));
    };

    const onKeyUp = (e) => (keys[e.key] = false);

    const onMouseMove = (e) => {
      const { mx, my } = windowToCanvas(canvas, e, VIEW_W, VIEW_H);
      mouseX = mx; mouseY = my;

      if (inventoryOpen) {
        hoveredSlot = getSlotIndexFromMouse(mx, my, getInventoryLayout(VIEW_W, VIEW_H));
        return;
      }
      if (escapeMenuOpen) {
        hoveredEscapeIndex = -1;
        const startY = VIEW_H / 2 - 60;
        const x1 = VIEW_W / 2 - 80, x2 = VIEW_W / 2 + 80;
        escapeOptions.forEach((opt, i) => {
          const y = startY + i * 40;
          if (mx >= x1 && mx <= x2 && my >= y - 20 && my <= y + 10) hoveredEscapeIndex = i;
        });
        return;
      }
    };

    const onMouseDown = (e) => {
      const { mx, my } = windowToCanvas(canvas, e, VIEW_W, VIEW_H);

      if (inventoryOpen) {
        const idx = getSlotIndexFromMouse(mx, my, getInventoryLayout(VIEW_W, VIEW_H));
        if (idx !== -1) selectedInventorySlot = idx;
        return;
      }

      if (escapeMenuOpen) {
        const startY = VIEW_H / 2 - 60;
        const x1 = VIEW_W / 2 - 80, x2 = VIEW_W / 2 + 80;
        escapeOptions.forEach((opt, i) => {
          const y = startY + i * 40;
          if (mx >= x1 && mx <= x2 && my >= y - 20 && my <= y + 10) {
            if (opt.action === 'resume') escapeMenuOpen = false;
            if (opt.action === 'quit') router.push('/');
            if (opt.action === 'save') {
              dialogueRef.current = { text: 'Game saved (not really 😄)', frame: 0, duration: 100 };
              escapeMenuOpen = false;
            }
          }
        });
        return;
      }

      // Hotbar click
      const layout = getHotbarLayout(hotbarImg, VIEW_W, VIEW_H);
      if (layout) {
        const rects = getHotbarSlotRects(layout);
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            selectedSlot = i;
            return;
          }
        }
      }

      // Dialogue bubble (slower)
      const type = e.button === 2 ? 'Right Click!' : 'Left Click!';
      dialogueRef.current = { text: type, frame: 0, duration: 180 };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', resizeCanvasToScreen);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // --- Update ---
    function update() {
      if (inventoryOpen || escapeMenuOpen) return;

      let dx = 0, dy = 0;
      if (keys['w'] || keys['ArrowUp']) dy -= 1;
      if (keys['s'] || keys['ArrowDown']) dy += 1;
      if (keys['a'] || keys['ArrowLeft']) dx -= 1;
      if (keys['d'] || keys['ArrowRight']) dx += 1;
      if (dx && dy) { const len = Math.hypot(dx, dy); dx /= len; dy /= len; }

      const newX = player.x + dx * player.speed;
      const newY = player.y + dy * player.speed;
      // --- World boundaries (hard edges) ---
      const half = player.size / 2;

      // Proposed new position
      let nextX = newX;
      let nextY = newY;

      // Prevent leaving world bounds
      nextX = clamp(nextX, half, worldW - half);
      nextY = clamp(nextY, half, worldH - half);

      // Apply tree collisions
      if (!checkTreeCollisions(nextX, nextY)) {
        player.x = nextX;
        player.y = nextY;
      }

      if (worldW && worldH) {
        const [viewW, viewH] = getViewSize();
        const desiredCamX = player.x - viewW / 2;
        const desiredCamY = player.y - viewH / 2;
        camX = lerp(camX, clamp(desiredCamX, 0, Math.max(0, worldW - viewW)), CAM_EASE);
        camY = lerp(camY, clamp(desiredCamY, 0, Math.max(0, worldH - viewH)), CAM_EASE);
      }
    }

    // --- Draw ---
    function draw() {
      const [viewW, viewH] = getViewSize();
      const scale = VIEW_W / viewW;

      // Reset each frame (keep DPR)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '12px monospace';
      ctx.clearRect(0, 0, VIEW_W, VIEW_H);

      // World & actors
      if (worldW && worldH) drawWorld(ctx, worldImg, camX, camY, viewW, viewH);
      drawPlayer(ctx, player, camX, camY, scale);
      drawTrees(ctx, treeImg, trees, camX, camY, scale);

      // HUD
      ctx.fillStyle = '#fff';
      ctx.fillText(`x:${Math.round(player.x)} y:${Math.round(player.y)} zoom:${zoom.toFixed(2)}x`, 10, 18);

      // UI layers
      const hbLayout = getHotbarLayout(hotbarImg, VIEW_W, VIEW_H);
      drawHotbar(ctx, hotbarImg, hbLayout, selectedSlot);

      drawInventory({
        ctx, VIEW_W, VIEW_H, inventoryOpen, inventorySlots,
        hoveredSlot, selectedInventorySlot, itemSprites
      });

      drawEscapeMenu(ctx, VIEW_W, VIEW_H, escapeMenuOpen, escapeOptions, hoveredEscapeIndex);

      // Dialogue bubble
      if (dialogueRef.current) {
        const d = dialogueRef.current;
        const life = d.duration;
        const alpha = Math.max(0, 1 - d.frame / life);
        const rise = (d.frame / life) * 10 * scale; // slower float
        const screenX = Math.round((player.x - camX) * scale);
        const screenY = Math.round((player.y - camY) * scale);
        const pSize = Math.round(player.size * scale);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.font = `${Math.round(12 * scale)}px monospace`;
        const padX = Math.round(6 * scale);
        const w = ctx.measureText(d.text).width + padX * 2;
        const h = Math.round(18 * scale);
        const bx = Math.round(screenX - w / 2);
        const by = Math.round(screenY - pSize / 2 - 24 * scale - rise);
        ctx.fillRect(bx, by, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, h - 1);
        ctx.fillStyle = '#fff';
        ctx.fillText(d.text, bx + padX, by + h - Math.round(6 * scale));
        ctx.restore();

        d.frame++;
        if (d.frame > d.duration) dialogueRef.current = null;
      }

      dayNight.render(ctx, VIEW_W, VIEW_H, { player, camX, camY, scale });
      dayNight.update(2);
      drawClock(ctx, dayNight, 870, 36); // top-left corner
    }

    function loop() {
      update();
      draw();
      requestAnimationFrame(loop);
    }

    worldImg.onload = () => {
      worldW = worldImg.naturalWidth;
      worldH = worldImg.naturalHeight;
      player.x = worldW / 2;
      player.y = worldH / 2;

      // Generate trees AFTER player spawn is defined
      trees = generateTrees(worldW, worldH, player.x, player.y);

      loop();
    };

    // Cleanup
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resizeCanvasToScreen);
      canvas.removeEventListener('mousedown', onMouseDown);
    };
  }, [dialogueRef, router]);

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center relative overflow-hidden">
      <canvas ref={canvasRef} className="border-2 border-gray-700 shadow-2xl" />
    </div>
  );
}
