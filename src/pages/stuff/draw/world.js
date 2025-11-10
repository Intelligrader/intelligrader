import { VIEW_W, VIEW_H } from '../constants.js';


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
