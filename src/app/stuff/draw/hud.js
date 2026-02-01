// stuff/draw/hud.js
// Brighter HUD using brightness filter on draw calls.

let hudImg = null;
let hudLoaded = false;

function ensureHUDLoaded() {
  if (hudImg) return;
  hudImg = new Image();
  hudImg.onload = () => (hudLoaded = true);
  hudImg.onerror = () => console.error("Failed to load /ui/character_panel.png");
  hudImg.src = "/ui/character_panel.png";
}

// --- Brightened Draw ---
function brightnessDraw(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh, brightness = 1.35) {
  ctx.save();
  ctx.filter = `brightness(${brightness})`;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();
}

function drawBar(ctx, img, sx, sy, sw, sh, dx, dy, scale, pct) {
  pct = Math.max(0, Math.min(1, pct));
  const crop = sw * pct;

  brightnessDraw(
    ctx, img,
    sx, sy,
    crop, sh,
    dx, dy,
    crop * scale, sh * scale,
    1.40 // ⬅ slightly more bright than background
  );
}

export function drawHUD(ctx, player, VIEW_W, VIEW_H) {
  ensureHUDLoaded();
  if (!hudLoaded) return;

  const panelSX = 0;
  const panelSY = 64;
  const panelSW = 96;
  const panelSH = 32;

  const scale = 3;
  const dx = 10;
  const dy = VIEW_H - panelSH * scale - 10;

  // --- panel background (brightened)
  brightnessDraw(
    ctx, hudImg,
    panelSX, panelSY,
    panelSW, panelSH,
    dx, dy,
    panelSW * scale, panelSH * scale,
    1.32
  );

  const barX = dx + 30 * scale;
  const barY = dy + 10 * scale;
  const barGap = 5 * scale;

  const hpPct   = (player.hp ?? 1) / (player.maxHp ?? 1);
  const staPct  = (player.stamina ?? 1) / (player.maxStamina ?? 1);
  const manaPct = (player.mana ?? 1) / (player.maxMana ?? 1);

  // RED HP
  drawBar(ctx, hudImg, 14, 138, 51, 2, barX, barY, scale * 1.02, hpPct);

  // GREEN STAMINA
  drawBar(ctx, hudImg, 16, 143, 40, 2,
          barX + 4, barY + barGap - 1, scale * 1.095, staPct);

  // BLUE MANA
  drawBar(ctx, hudImg, 15, 148, 37, 2,
          barX, barY + barGap * 2, scale * 1.05, manaPct);
}