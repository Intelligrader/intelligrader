// stuff/draw/dialogueBubble.js

/**
 * Draws the current dialogue bubble (player or NPC) with the squash / rise animation.
 */
export function drawDialogueBubble(ctx, dialogueRef, player, camX, camY, scale) {
  if (!dialogueRef?.current) return;

  const d = dialogueRef.current;
  d.frame++;

  if (d.frame > d.duration) {
    dialogueRef.current = null;
    return;
  }

  const ax = camX;
  const ay = camY;

  const life       = d.duration;
  const t         = d.frame / life;
  const appearT   = 0.15;
  const disappearT = 0.15;

  let sAnim = 1;
  if (t < appearT) {
    const p = t / appearT;
    sAnim = 0.6 + 0.4 * Math.sin((p * Math.PI) / 2);
  } else if (t > 1 - disappearT) {
    const p = (1 - t) / disappearT;
    sAnim = Math.max(0, p);
  }

  const rise = t * 10 * scale;
  const srcX = d.npcX ?? player.x;
  const srcY = d.npcY ?? player.y;
  const sx   = Math.round((srcX - ax) * scale);
  const sy   = Math.round((srcY - ay) * scale + 20);
  const ps   = Math.round(player.size * scale);

  ctx.save();
  ctx.font = `${Math.round(12 * scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const padX  = Math.round(10 * scale);
  const textW = ctx.measureText(d.text).width;
  const w     = textW + padX * 2;
  const h     = Math.round(26 * scale);
  const r     = Math.round(h / 2);
  const bx    = Math.round(sx - w / 2);
  const by    = Math.round(sy - ps - h - 18 * scale - rise);
  const tailH = Math.round(10 * scale);
  const tailW = Math.round(16 * scale);
  const tailC = Math.round(6 * scale);

  ctx.translate(sx, by + h / 2);
  ctx.scale(sAnim, sAnim);
  ctx.translate(-sx, -(by + h / 2));

  ctx.lineWidth = Math.max(1.5, scale);

  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.quadraticCurveTo(bx, by, bx, by + r);
  ctx.lineTo(bx, by + h - r);
  ctx.quadraticCurveTo(bx, by + h, bx + r, by + h);

  const tx    = sx;
  const tBase = by + h;
  ctx.lineTo(tx - tailW / 2, tBase);
  ctx.quadraticCurveTo(tx - tailC, tBase + tailH / 2, tx, tBase + tailH);
  ctx.quadraticCurveTo(tx + tailC, tBase + tailH / 2, tx + tailW / 2, tBase);

  ctx.lineTo(bx + w - r, by + h);
  ctx.quadraticCurveTo(bx + w, by + h, bx + w, by + h - r);
  ctx.lineTo(bx + w, by + r);
  ctx.quadraticCurveTo(bx + w, by, bx + w - r, by);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.fillText(d.text, bx + w / 2, by + h / 2);
  ctx.restore();
}
