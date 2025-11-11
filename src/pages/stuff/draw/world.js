import { VIEW_W, VIEW_H, TILE_SIZE } from '../constants.js';
import { DroppedItem } from '../world/droppedItem.js';

const droppedItems = [];

export function drawWorld(ctx, worldImg, camX, camY, viewW, viewH) {
  ctx.drawImage(worldImg, camX, camY, viewW, viewH, 0, 0, VIEW_W, VIEW_H);
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

export function drawTrees(ctx, treeImg, trees, camX, camY, scale) {
  for (const t of trees) {
    const sx = Math.round((t.x - camX) * scale);
    const sy = Math.round((t.y - camY) * scale);
    const sw = Math.round(t.w * scale);
    const sh = Math.round(t.h * scale);

    // check if player is behind

    ctx.drawImage(treeImg, sx, sy, sw, sh);
  }

  // reset alpha for everything else
  ctx.globalAlpha = 1;
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
