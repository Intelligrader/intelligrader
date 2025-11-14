// stuff/draw/hud.js
// Uses real pixel bars from the character HUD image and crops them by value.

let hudImg = null;
let hudLoaded = false;

function ensureHUDLoaded() {
  if (hudImg) return;
  hudImg = new Image();
  hudImg.onload = () => (hudLoaded = true);
  hudImg.onerror = () => console.error("Failed to load /ui/character_panel.png");
  hudImg.src = "/ui/character_panel.png";
}

/**
 * Draws a cropped bar from the HUD sprite sheet.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Image} img   - HUD spritesheet
 * @param {number} sx   - sprite x
 * @param {number} sy   - sprite y
 * @param {number} sw   - sprite width
 * @param {number} sh   - sprite height
 * @param {number} dx   - draw x
 * @param {number} dy   - draw y
 * @param {number} scale
 * @param {number} pct  - 0..1 (bar fill)
 */
function drawBar(ctx, img, sx, sy, sw, sh, dx, dy, scale, pct) {
  pct = Math.max(0, Math.min(1, pct));
  const crop = sw * pct;

  ctx.drawImage(
    img,
    sx, sy,              // src
    crop, sh,            // src width cropped
    dx, dy,              // dst
    crop * scale, sh * scale
  );
}

/**
 * Draws the bottom-left HUD including portrait panel & animated bars.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} player - must contain hp/maxHp, stamina/maxStamina, mana/maxMana
 * @param {number} VIEW_W
 * @param {number} VIEW_H
 */
export function drawHUD(ctx, player, VIEW_W, VIEW_H) {
  ensureHUDLoaded();
  if (!hudLoaded) return;

  // === PANEL BACKGROUND SECTION ===
  const panelSX = 0;
  const panelSY = 64;
  const panelSW = 96;
  const panelSH = 32;

  const scale = 3;
  const dx = 10;
  const dy = VIEW_H - panelSH * scale - 10;
  const dw = panelSW * scale;
  const dh = panelSH * scale;

  ctx.drawImage(hudImg, panelSX, panelSY, panelSW, panelSH, dx, dy, dw, dh);

  // --------------------------
  // BAR DRAW POSITIONS (in world space)
  // --------------------------
  const barX = dx + 30 * scale;
  const barY = dy + 10 * scale;
  const barGap = 5 * scale;

  const hpPct   = (player.hp ?? 1) / (player.maxHp ?? 1);
  const staPct  = (player.stamina ?? 1) / (player.maxStamina ?? 1);
  const manaPct = (player.mana ?? 1) / (player.maxMana ?? 1);

  // --- RED HP ---
  drawBar(ctx, hudImg, 14, 138, 51, 2, barX, barY, scale * 1.02, hpPct);

  // --- GREEN STA ---
  drawBar(ctx, hudImg, 16, 143, 40, 2,
          barX + 4, barY + barGap - 1, scale * 1.095, staPct);

  // --- BLUE MANA ---
  drawBar(ctx, hudImg, 15, 148, 37, 2,
          barX, barY + barGap * 2, scale * 1.05, manaPct);
}
