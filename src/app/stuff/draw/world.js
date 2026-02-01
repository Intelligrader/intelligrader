import { VIEW_W, VIEW_H, TILE_SIZE } from '../constants.js';
import { DroppedItem } from '../world/droppedItem.js';

const droppedItems = [];
let cachedTileset = null;

export function drawWorld(ctx, map, tilesetImg, camX, camY, viewW, viewH, scale = 1) {
  if (!map || !map.layers) return;

  const tileW = map.tilewidth;
  const tileH = map.tileheight;
  const mapW = map.width;
  const mapH = map.height;

  const tilesPerRow = Math.floor(tilesetImg.width / tileW);

  // draw each visible tile layer
  for (const layer of map.layers) {
    if (layer.type !== 'tilelayer' || !layer.visible) continue;
    const data = layer.data;

    for (let i = 0; i < data.length; i++) {
      const gid = data[i];
      if (gid === 0) continue; // empty

      const tileX = i % mapW;
      const tileY = Math.floor(i / mapW);

      const sx = ((gid - 1) % tilesPerRow) * tileW;
      const sy = Math.floor((gid - 1) / tilesPerRow) * tileH;

      const dx = tileX * tileW - camX;
      const dy = tileY * tileH - camY;

      // skip tiles off-screen for performance
      if (dx + tileW < 0 || dy + tileH < 0 || dx > viewW || dy > viewH) continue;

      const dxInt = Math.floor(dx * scale);
      const dyInt = Math.floor(dy * scale);
      ctx.drawImage(
        tilesetImg,
        sx, sy, tileW, tileH,
        dxInt, dyInt,
        Math.ceil(tileW * scale), Math.ceil(tileH * scale)
      );
    }
  }
}

export function drawPlayer(ctx, player, camX, camY, scale) {
  const screenX = Math.round((player.x - camX) * scale);
  const screenY = Math.round((player.y - camY) * scale);
  const pSize = Math.round(player.size * scale);

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(screenX, screenY + Math.round(10 * scale), Math.round(8 * scale), Math.round(4 * scale), 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = '#ffd54a';
  ctx.fillRect(screenX - pSize / 2, screenY - pSize / 2, pSize, pSize);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(screenX - pSize / 2, screenY - pSize / 2, pSize / 2, pSize / 2);
}

// draw/world.js

export function drawTrees(ctx, treeImg, trees, camX, camY, scale) {
  if (!treeImg || !trees?.length) return;

  for (const t of trees) {
    const sx = Math.floor((t.x - camX) * scale);
    const sy = Math.floor((t.y - camY - t.height + 16) * scale);
    const drawW = t.width * scale;
    const drawH = t.height * scale;

    ctx.save();
    ctx.globalAlpha = t.alpha ?? 1;
    ctx.drawImage(treeImg, sx, sy, drawW, drawH);
    ctx.restore();
  }
}

// stuff/draw/world.js

export function generateTreesByRow(worldW, worldH, playerX, playerY) {
  const rows = Math.floor(worldH / TILE_SIZE);
  const cols = Math.floor(worldW / TILE_SIZE);
  const TREE_DENSITY = 0.02; // sparser
  const CLEAR_RADIUS = 5;    // tiles around spawn

  const px = Math.floor(playerX / TILE_SIZE);
  const py = Math.floor(playerY / TILE_SIZE);

  const trees = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (Math.abs(col - px) <= CLEAR_RADIUS && Math.abs(row - py) <= CLEAR_RADIUS) continue;
      if (Math.random() < TREE_DENSITY) {
        trees.push({
          x: col * TILE_SIZE,
          y: row * TILE_SIZE - 5 * TILE_SIZE,
          w: 48,
          h: 96,
          collisionBoxes: [{ x: TILE_SIZE, y: 5 * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE }],
        });
      }
    }
  }
  return trees;
}

export function spawnDroppedItem(id, count, x, y) {
  const vx = (Math.random() - 0.5) * 1.5;
  const vy = (Math.random() - 0.5) * 1.5;
  const item = new DroppedItem(id, count, x, y, vx, vy);
  droppedItems.push(item);
}

export function updateDroppedItems(deltaTime, worldHeight) {
  for (const item of droppedItems) item.update(deltaTime, /*gravity*/0.4, /*groundY*/worldHeight);
  // remove expired ones
  for (let i = droppedItems.length - 1; i >= 0; i--) {
    if (droppedItems[i]._despawn) droppedItems.splice(i, 1);
  }
}

export function drawDroppedItems(ctx, camX, camY, scale, itemSprites) {
  for (const item of droppedItems) item.draw(ctx, camX, camY, scale, itemSprites);
}

export function getDroppedItems() {
  return droppedItems;
}

export function tryPickupItems(player, inventory) {
  for (let i = droppedItems.length - 1; i >= 0; i--) {
    const item = droppedItems[i];
    const dx = player.x - item.x;
    const dy = player.y - item.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If player close enough & delay passed
    if (dist < 24 && item.canBePickedUp()) {
      const added = inventory.addItem({ id: item.id, count: item.count });
      if (added) {
        console.log(`✅ Picked up ${item.count}x ${item.id}`);
        droppedItems.splice(i, 1);
      }
    }
  }
}


export function buildTreesFromObjectLayer(map) {
  const layer = map.layers.find(l => l.type === 'objectgroup' && l.name === 'trees');
  if (!layer) return [];

  const width  = TILE_SIZE * 3; // 3x6 tiles
  const height = TILE_SIZE * 6;

  return layer.objects.map(o => {
    // Tiled object x is left, y is baseline for tile objects; width/height are 16 in your JSON.
    const baseX = Math.round(o.x + o.width / 2); // center of 1-tile base
    const baseY = Math.round(o.y);               // baseline (ground contact)

    // top-left position to draw the sprite
    const drawX = baseX - (width  / 2);
    const drawY = baseY - height + 16; // +16 because your trunk sits one tile above baseline

    // absolute hitbox near the trunk (1x1 tile)
    const hitbox = {
      x: baseX - TILE_SIZE / 2,
      y: baseY - TILE_SIZE,        // one tile tall above the ground
      w: TILE_SIZE,
      h: TILE_SIZE
    };

    return {
      x: drawX,
      y: drawY,
      width, height,
      baseX, baseY,                // keep base for layering & transparency test
      hitbox,
      alpha: 1
    };
  });
}

export function makeTreeQueue(allTrees, player) {
  const dist2 = (t) => (t.baseX - player.x) ** 2 + (t.baseY - player.y) ** 2;
  return allTrees.slice().sort((a, b) => dist2(a) - dist2(b));
}

export function pumpTreeQueue(queue, liveArray, budget = 64) {
  for (let i = 0; i < budget && queue.length; i++) {
    liveArray.push(queue.shift());
  }
}