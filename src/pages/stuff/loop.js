// stuff/loop.js
import { clamp, lerp } from './math.js';
import { drawWorld, drawPlayer, drawTrees } from './draw/world.js';
import { drawHotbar, getHotbarLayout } from './draw/hotbar.js';
import { drawEscapeMenu } from './draw/escapeMenu.js';
import { drawClock } from './dayNightClock.js';

export function createGameLoop(ctx, gameState, refs) {
  const {
    VIEW_W, VIEW_H, ZOOM_MAX, ZOOM_MIN, ZOOM_SPEED,
    CAM_EASE
  } = gameState.constants;

  const {
    worldImg, player, trees, dayNight,
    craftingMenu, inventory, hotbarImg, itemSprites, escapeOptions
  } = gameState;

  let zoom = 2.25;
  let camX = 0, camY = 0;

  function getViewSize() {
    return [Math.round(VIEW_W / zoom), Math.round(VIEW_H / zoom)];
  }

  function update(keys) {
    if (inventory.open) return;
    let dx = 0, dy = 0;

    if (keys['w'] || keys['ArrowUp']) dy -= 1;
    if (keys['s'] || keys['ArrowDown']) dy += 1;
    if (keys['a'] || keys['ArrowLeft']) dx -= 1;
    if (keys['d'] || keys['ArrowRight']) dx += 1;

    if (dx && dy) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
    }

    const newX = player.x + dx * player.speed;
    const newY = player.y + dy * player.speed;

    player.x = clamp(newX, 0, gameState.worldW);
    player.y = clamp(newY, 0, gameState.worldH);

    if (gameState.worldW && gameState.worldH) {
      const [viewW, viewH] = getViewSize();
      const desiredCamX = player.x - viewW / 2;
      const desiredCamY = player.y - viewH / 2;
      camX = lerp(camX, clamp(desiredCamX, 0, gameState.worldW - viewW), CAM_EASE);
      camY = lerp(camY, clamp(desiredCamY, 0, gameState.worldH - viewH), CAM_EASE);
    }
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const [viewW, viewH] = getViewSize();
    const scale = VIEW_W / viewW;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    drawWorld(ctx, worldImg, camX, camY, viewW, viewH);
    drawPlayer(ctx, player, camX, camY, scale);
    drawTrees(ctx, gameState.treeImg, trees, camX, camY, scale);

    craftingMenu.draw(ctx, VIEW_W, VIEW_H);
    inventory.draw(ctx, VIEW_W, VIEW_H, itemSprites);

    const hbLayout = getHotbarLayout(hotbarImg, VIEW_W, VIEW_H);
    drawHotbar(ctx, hotbarImg, hbLayout, gameState.selectedSlot, inventory.getHotbarItems(), itemSprites);

    drawEscapeMenu(ctx, VIEW_W, VIEW_H, gameState.escapeMenuOpen, escapeOptions, gameState.hoveredEscapeIndex);
    drawClock(ctx, dayNight, 870, 36);

    dayNight.render(ctx, VIEW_W, VIEW_H, { player, camX, camY, scale });
    dayNight.update(1);
  }

  function loop(keys) {
    update(keys);
    draw();
    requestAnimationFrame(() => loop(keys));
  }

  return { loop };
}
