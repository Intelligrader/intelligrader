// stuff/initGame.js
// Central initializer: sets up state, inputs, update/draw loop, and cleanup.

import {
  VIEW_W, VIEW_H, TILE_SIZE,
  TREE_TILE_WIDTH, TREE_TILE_HEIGHT,
} from './constants.js';
import { clamp } from './math.js';
import { loadImage, loadItemSprites } from './assets.js';
import {
  checkTreeCollisions as _checkTreeCollisions,
  checkBlockCollisions as _checkBlockCollisions,
} from './collisions.js';
import {
  drawWorld, drawPlayer, drawTrees,
  updateDroppedItems, drawDroppedItems, tryPickupItems,
} from './draw/world.js';
import { loadTiledMap } from './world/loadMap.js';
import { drawHotbar, getHotbarLayout } from './draw/hotbar.js';
import { Inventory } from './draw/inventory.js';
import { drawEscapeMenu } from './draw/escapeMenu.js';
import { createDayNight } from './dayNight.js';
import { drawClock } from './dayNightClock.js';
import { loadAllBlocks, allBlocks } from './blocks/blocks.js';
import { CraftingMenu } from './draw/craftingMenu.js';
import { createInput } from './input.js';
import { createCommandRunner } from './commands.js';
import { itemsData, getItemID } from './items.js';
import { loadFromCookies, restoreFromSave } from './storage/saveUtils.js';
import { setPlayerRef } from './state/playerState.js';
import {
  spawnTestNPCs, checkNPCCollisions, updateNPCs, drawNPCs,
  autoAttachSchedules, removeAllNPCs,
} from './npcs/npcManager.js';
import { Soundtrack } from './audio/soundtrack.js';
import { updateTreeFade } from './world/treeFade.js';
import { drawDialogueBubble } from './draw/dialogueBubble.js';
import { drawHUD } from './draw/hud.js';
import { loadPlayerSprites, drawAnimatedPlayer } from './draw/playerSprite.js';

// Single player instance for the module (used by getPlayerPosition at bottom)
const player = {
  x: 200,
  y: 200,
  speed: 1.1,
  size: 12,
  hp: 100,
  maxHp: 100,
  stamina: 80,
  maxStamina: 80,
  mana: 50,
  maxMana: 50,

  // animation state:
  dir: 0,
  animFrame: 0,
  animTimer: 0,
  isMoving: false,
};

export function initGame({ canvas, router, dialogueRef }) {
  // ---------- canvas ----------
  const ctx = canvas.getContext('2d', { alpha: false });
  const dpr = window.devicePixelRatio || 1;
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  canvas.style.imageRendering = 'pixelated';
  ctx.imageSmoothingEnabled = false;

  let rafId = 0;
  let lastTime = performance.now();
  let isGamePaused = false;

  const resizeCanvasToScreen = () => {
    const fit = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    const scale = fit >= 1 ? Math.floor(fit) : fit;
    canvas.style.width = Math.round(VIEW_W * scale) + 'px';
    canvas.style.height = Math.round(VIEW_H * scale) + 'px';
  };
  resizeCanvasToScreen();
  window.addEventListener('resize', resizeCanvasToScreen);

  // ---------- audio ----------
  const soundtrack = new Soundtrack([
    {
      id: 'spring',
      src: '/audio/Stardew Valley OST - Spring (The Valley Comes Alive).mp3',
      volume: 0.5,
    },
  ]);
  soundtrack.play('spring');
  window.__bgm = soundtrack;
  soundtrack.setMuted(localStorage.getItem('bgmMuted') === '1');

  // ---------- world state ----------
  let worldMap = null;
  let tilesetImg = null;
  let worldWidth = 0;
  let worldHeight = 0;

  // trees
  let trees = [];

  // placed blocks/entities
  let worldObjects = [];
  const placedEntities = [];
  const state = { placingBlock: null };

  // camera / zoom
  let camX = 0, camY = 0;
  let zoom = 2.25;
  const getViewSize = () => [Math.round(VIEW_W / zoom), Math.round(VIEW_H / zoom)];
  const getCamera   = () => ({ camX, camY, scale: zoom });

  // UI / systems
  const escapeMenuState = {
    open: false,
    hovered: -1,
    selectedSlot: 0,
    options: [
      { label: 'Resume Game', action: 'resume' },
      { label: 'Save Game',   action: 'save' },
      { label: 'Quit to Home',action: 'quit' },
    ],
  };

  let hotbarItems = [];
  const inventory = new Inventory(items => (hotbarItems = items));
  const itemSprites = loadItemSprites(itemsData);
  const dayNight    = createDayNight({
    dayLengthSec: 100000,
    initialTime: 0.25,
    starsCount: 240,
  });
  const craftingMenu = new CraftingMenu();

  setPlayerRef(player);

  // images (lazy)
  const hotbarImg = loadImage('/hotbar.png');
  const treeImg   = loadImage('/tree.png');
  const fenceAtlasImg = loadImage('/tilesets/fence.png');

  // ---------- helpers ----------
  function placeBlock(id, x, y) {
    const def = allBlocks.find(b => b.id === id);
    if (!def) {
      // dialogueRef.current = { text: `Block "${id}" not found.`, frame: 0, duration: 100 };
      return;
    }

    const sx = Math.floor(x / TILE_SIZE) * TILE_SIZE;
    const sy = Math.floor(y / TILE_SIZE) * TILE_SIZE;

    if (worldObjects.some(o => o.x === sx && o.y === sy)) {
      // dialogueRef.current = { text: 'Block already exists here.', frame: 0, duration: 80 };
      return;
    }

    if (typeof def.canPlace === 'function') {
      if (!def.canPlace(worldObjects, sx, sy, TILE_SIZE)) {
        dialogueRef.current = {
          text: "Too close to another campfire.",
          frame: 0,
          duration: 100
        };
        return;
      }
    }

    // --- Place it in the world ---
    worldObjects.push({ id, x: sx, y: sy, def });
    // dialogueRef.current = { text: `${id} placed`, frame: 0, duration: 100 };

    // --- Consume item from inventory/hotbar ---
    const slotIndex = state.placingBlock?.slotIndex;
    if (typeof slotIndex === 'number') {
      const slot = hotbarItems[slotIndex];

      if (slot && slot.id === id && slot.count > 0) {
        slot.count--;

        // If that stack is empty → clear slot
        if (slot.count <= 0) {
          slot.id = null;
          slot.itemId = null;
          slot.count = 0;

          // stop placement because item is gone
          state.placingBlock = null;
        }
      }

      // Update inventory+hotbar
      inventory.syncHotbar();
    }
  }

  // commands / input
  const commands = createCommandRunner({ placeBlock, player, inventory, dialogueRef, state });

  const { keys, cleanup: cleanupInput, drawChatPrompt } = createInput(canvas, {
    player,
    trees,
    inventory,
    craftingMenu,
    escapeMenuState,
    dayNight,
    dialogueRef,
    onSelectHotbar: (slotIndex) => {
      escapeMenuState.selectedSlot = slotIndex;

      const slot = hotbarItems?.[slotIndex];
      const itemId = getItemID(slot);

      // Slot empty or unrecognized
      if (!itemId) {
        state.placingBlock = null;
        return;
      }

      // Find item definition
      const itemDef = itemsData.find(i => i.id === itemId);
      if (!itemDef) {
        console.warn('Unknown item in hotbar:', itemId);
        state.placingBlock = null;
        return;
      }

      // Must be placeable
      const blockId = itemDef.placeBlock;
      if (!blockId) {
        // Not a placeable item (tools, food, etc.)
        state.placingBlock = null;
        return;
      }

      // Look up the block
      const def = allBlocks.find(b => b.id === blockId);
      if (!def) {
        console.warn('Hotbar wants to place unknown block:', blockId);
        state.placingBlock = null;
        return;
      }

      // Enter “placement” mode (ghost preview)
      state.placingBlock = {
        id: blockId,
        def,
        slotIndex,
        x: player.x,
        y: player.y,
        fromCommand: false,
      };
    },
    onCraft: craftedId => {
      if (!craftedId) return;
      // Simple generic behaviour: add one of the crafted output to inventory
      inventory.addItem({ id: craftedId, count: 1 });
      // dialogueRef.current = {
      //   text: `Crafted ${craftedId}!`,
      //   frame: 0,
      //   duration: 120,
      // };
    },
    onQuit: () => router.push('/'),
    commands,
    state,
    placeBlock,
    getCamera,
  });

  // ---------- asset load ----------
  Promise.all([
    loadImage('/tilesets/Tileset Spring.png'),
    loadTiledMap('/maps/spring_map.json'),
    loadAllBlocks(),
  ])
    .then(([img, map]) => {
      tilesetImg = img;
      worldMap   = map;

      worldWidth  = map.width  * map.tilewidth;
      worldHeight = map.height * map.tileheight;

      // center player
      player.x = worldWidth  / 2;
      player.y = worldHeight / 2;

      // build trees from object layer
      const treeLayer = map.layers.find(l => l.type === 'objectgroup' && l.name === 'trees');
      if (treeLayer) {
        const width  = TREE_TILE_WIDTH  * TILE_SIZE;   // 48
        const height = TREE_TILE_HEIGHT * TILE_SIZE;   // 96
        trees = treeLayer.objects.map(o => {
          const x = Math.round(o.x);
          const y = Math.round(o.y - o.height);
          const collisionBoxes = [{
            x: TILE_SIZE,                 // center on trunk
            y: height - TILE_SIZE * 5 - 16,
            w: TILE_SIZE,
            h: TILE_SIZE,
          }];
          return { x, y, width, height, collidable: true, collisionBoxes, alpha: 1 };
        });
        console.log(`🌳 Loaded ${trees.length} trees with collision boxes`);
      }

      craftingMenu.loadRecipes();
      removeAllNPCs();
      spawnTestNPCs();
      autoAttachSchedules();
      loadPlayerSprites();

      // start game loop
      rafId = requestAnimationFrame(loop);
    })
    .catch(err => console.error('Init load failed:', err));

  // ---------- update / draw ----------
  function checkPause() {
    isGamePaused = escapeMenuState.open || inventory.open || craftingMenu.open;
    return isGamePaused;
  }

  function update(dt) {
    if (checkPause()) return;

    // tree fade
    updateTreeFade(player, trees);

    // movement
    let dx = 0, dy = 0;
    player.isMoving = false;
    if (dx !== 0 || dy !== 0) {
      player.isMoving = true;

      if (Math.abs(dx) > Math.abs(dy)) {
        player.dir = dx > 0 ? 2 : 1; // right : left
      } else if (dy !== 0) {
        player.dir = dy > 0 ? 0 : 3; // down : up
      }
    }
    if (keys['w'] || keys['ArrowUp'])    dy -= 1;
    if (keys['s'] || keys['ArrowDown'])  dy += 1;
    if (keys['a'] || keys['ArrowLeft'])  dx -= 1;
    if (keys['d'] || keys['ArrowRight']) dx += 1;

    // Player position with collision
    const nx = clamp(
      player.x + dx * player.speed,
      player.size / 2,
      worldWidth  - player.size / 2,
    );
    const ny = clamp(
      player.y + dy * player.speed,
      player.size / 2,
      worldHeight - player.size / 2,
    );

    if (
      !_checkTreeCollisions(nx, ny, player.size, trees) &&
      !_checkBlockCollisions(nx, ny, player.size, worldObjects, TILE_SIZE)
    ) {
      const resolved = checkNPCCollisions(nx, ny, player.size);
      player.x = resolved.x;
      player.y = resolved.y;
    }

    // camera update
    if (worldWidth && worldHeight) {
      const [vw, vh] = getViewSize();

      const targetX = clamp(player.x - vw / 2, 0, worldWidth  - vw);
      const targetY = clamp(player.y - vh / 2, 0, worldHeight - vh);

      camX += (targetX - camX) * 0.12;
      camY += (targetY - camY) * 0.12;

      camX = Math.round(camX);
      camY = Math.round(camY);
    }

    updateDroppedItems(dt, worldHeight);
    tryPickupItems(player, inventory);
    updateNPCs(dt);
  }

  function draw(dt) {
    const [vw, vh] = getViewSize();
    const scale = VIEW_W / vw;

    const ax = Math.floor(camX);
    const ay = Math.floor(camY);

    // clear
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '12px monospace';

    // world & actors
    if (worldMap && tilesetImg) {
      drawWorld(ctx, worldMap, tilesetImg, ax, ay, vw, vh, zoom);
    }
    drawAnimatedPlayer(ctx, player, ax, ay, scale);
    drawNPCs(ctx, ax, ay, scale);
    drawDroppedItems(ctx, ax, ay, scale, itemSprites);
    drawTrees(ctx, treeImg, trees, ax, ay, scale);
    drawHUD(ctx, player, VIEW_W, VIEW_H);

    // --- draw selected hotbar item above player ---
    const selectedSlot = escapeMenuState.selectedSlot;
    const selectedItem = hotbarItems[selectedSlot];

    if (selectedItem && selectedItem.id) {

      const screenX = Math.round((player.x - camX) * scale);
      const screenY = Math.round((player.y - camY) * scale);
      const itemSize = 24;

      // Special case for fence: draw atlas [1,4]
      if (selectedItem.id === 'fence') {
        if (fenceAtlasImg.complete && fenceAtlasImg.naturalWidth > 0) {
          const ts = TILE_SIZE;
          const col = 1;
          const row = 4;
          const sx = col * ts;
          const sy = row * ts;
          ctx.drawImage(
            fenceAtlasImg,
            sx, sy, ts, ts,
            screenX - itemSize/2,
            screenY - player.size - itemSize - 2,
            itemSize, itemSize
          );
        }
      } else {

        // normal item icon behavior
        const img = itemSprites[selectedItem.id];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(
            img,
            screenX - itemSize/2,
            screenY - player.size - itemSize - 2,
            itemSize, itemSize
          );
        }
      }
    }


    // blocks
    for (const obj of worldObjects) {
      const def = obj.def;
      if (!def?.draw) continue;
      def.draw(ctx, obj.x, obj.y, scale, dayNight, worldObjects, ax, ay);
    }

    // placement preview
    if (state.placingBlock) {
      const { def, x, y } = state.placingBlock;

      if (def.ensureImageLoaded) def.ensureImageLoaded();
      else if (!def._img) {
        def._img = new Image();
        def._img.src = def.texture;
      }

      const img    = def._img;
      const loaded = img && img.complete && img.naturalWidth > 0;

      const screenX = Math.round((x - camX) * scale);
      const screenY = Math.round((y - camY) * scale);

      ctx.save();
      ctx.globalAlpha = 0.55;

      if (loaded) {
        if (typeof def.ghostSprite === 'function') {
          const g = def.ghostSprite(scale);
          ctx.drawImage(
            img,
            g.sx, g.sy, g.sw, g.sh,
            screenX, screenY, g.dw, g.dh,
          );

          const sx = Math.floor(x / TILE_SIZE) * TILE_SIZE;
          const sy = Math.floor(y / TILE_SIZE) * TILE_SIZE;
          const slot = typeof slotIndex === 'number' ? inventory?.slots?.[slotIndex] : null;
          const itemDef = slot?.itemId ? itemsData.find(i => i.id === slot.itemId) : null;
          const allowOnPlayer = itemDef?.placeOnPlayer ?? false;

          // --- Player collision check ---
          if (!allowOnPlayer) {
            const PLAYER_WIDTH  = 0.85 * TILE_SIZE;
            const PLAYER_HEIGHT = 0.85 * TILE_SIZE;
            const blockLeft   = x;
            const blockRight  = x + TILE_SIZE;
            const blockTop    = y;
            const blockBottom = y + TILE_SIZE;
            const playerLeft  = player.x - PLAYER_WIDTH / 2;
            const playerRight = player.x + PLAYER_WIDTH / 2;
            const playerTop   = player.y - PLAYER_HEIGHT / 2;
            const playerBottom= player.y + PLAYER_HEIGHT / 2;

            const overlapsPlayer = blockRight > playerLeft && blockLeft < playerRight && blockBottom > playerTop && blockTop < playerBottom;

            if(overlapsPlayer) {
              ctx.fillStyle = 'red';           // color of the rectangle
              ctx.fillRect(screenX + 1.5, screenY + 10, TILE_SIZE * 2, TILE_SIZE * 2);
            } 
          }

          // --- Distance check ---
          const MAX_PLACE_DIST = 48;
          const dx = x + TILE_SIZE / 2 - player.x;
          const dy = y + TILE_SIZE / 2 - player.y;
          if ((dx*dx + dy*dy) > MAX_PLACE_DIST * MAX_PLACE_DIST) {
            ctx.fillStyle = 'red';           // color of the rectangle
            ctx.fillRect(screenX + 1.5, screenY + 10, TILE_SIZE * 2, TILE_SIZE * 2);
          }

          if (worldObjects.some(o => o.x === sx && o.y === sy)) {
            ctx.fillStyle = 'red';           // color of the rectangle
            ctx.fillRect(screenX + 1.5, screenY + 10, TILE_SIZE * 2, TILE_SIZE * 2);
          } else {
            ctx.fillStyle = 'green';           // color of the rectangle
            ctx.fillRect(screenX + 1.5, screenY + 10, TILE_SIZE * 2, TILE_SIZE * 2);
          }
        } else {
          const size = (def.width || TILE_SIZE) * scale;
          ctx.drawImage(img, screenX, screenY, size, size);
        }
      } else {
        const size = (def.width || TILE_SIZE) * scale;
        ctx.strokeRect(screenX, screenY, size, size);
      }

      ctx.restore();
    }

    // HUD / UI
    ctx.fillText(
      `x:${Math.round(player.x)} y:${Math.round(player.y)}  zoom:${zoom.toFixed(2)}x`,
      85,
      18,
    );

    craftingMenu.draw(ctx, VIEW_W, VIEW_H);
    const hbLayout = getHotbarLayout(hotbarImg, VIEW_W, VIEW_H);
    drawHotbar(ctx, hotbarImg, hbLayout, escapeMenuState.selectedSlot, hotbarItems, itemSprites);
    inventory.draw(ctx, VIEW_W, VIEW_H, itemSprites);
    drawEscapeMenu(
      ctx,
      VIEW_W,
      VIEW_H,
      escapeMenuState.open,
      escapeMenuState.options,
      escapeMenuState.hovered,
    );

    // dialogue bubble
    drawDialogueBubble(ctx, dialogueRef, player, ax, ay, scale);

    // placed entities (legacy)
    for (const e of placedEntities) {
      const sx = Math.round((e.x - ax) * scale);
      const sy = Math.round((e.y - ay) * scale);
      const sw = Math.round((e.w || 16) * scale);
      const sh = Math.round((e.h || 16) * scale);
      if (e.draw) e.draw(ctx, sx, sy, scale);
      else ctx.fillRect(sx, sy, sw, sh);
    }

    // Lighting + overlays
    const lights = worldObjects
      .filter(o => o.def?.lightLevel)
      .map(o => ({
        x: (o.x - ax + TILE_SIZE / 2) * scale,
        y: (o.y - ay + TILE_SIZE / 2) * scale,
        radius: 80 * o.def.lightLevel * scale,
        intensity: o.def.lightLevel,
      }));

    dayNight.render(ctx, VIEW_W, VIEW_H, { player, camX: ax, camY: ay, scale }, lights);
    if (!isGamePaused) dayNight.update(1);

    // chat overlay & clock
    drawChatPrompt(ctx, VIEW_W, VIEW_H);
    drawClock(ctx, dayNight, VIEW_W - 90, 36);
  }

  function loop(now = performance.now()) {
    const dt = Math.min(3, (now - lastTime) / (1000 / 60));
    lastTime = now;
    update(dt);
    draw(dt);
    rafId = requestAnimationFrame(loop);
  }

  // restore save after systems are ready
  const saved = loadFromCookies('gameSave');
  if (saved) {
    restoreFromSave(saved, { player, inventory, dayNight, trees });
    console.log('Loaded save and synced all state.');
  }

  // cleanup
  return () => {
    cancelAnimationFrame(rafId);
    cleanupInput();
    window.removeEventListener('resize', resizeCanvasToScreen);
  };
}

// kept for callers that still import it (no behavior change)
export function getPlayerPosition() {
  return { x: player.x, y: player.y };
}