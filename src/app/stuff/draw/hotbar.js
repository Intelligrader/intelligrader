// stuff/draw/hotbar.js
// Dynamic hotbar linked to inventory (draws items, counts, selection, number keys)

export const HOTBAR_SLOTS = 9;
export const HB_OUTER = 2;
export const HB_DIV = 2;
export const HOTBAR_SCALE = 2;

export function getHotbarLayout(hotbarImg, VIEW_W, VIEW_H) {
  if (!hotbarImg || !hotbarImg.naturalWidth) return null;
  const hbW = hotbarImg.naturalWidth;
  const hbH = hotbarImg.naturalHeight;
  const scale = HOTBAR_SCALE;
  const w = hbW * scale;
  const h = hbH * scale;
  const x = Math.floor((VIEW_W - w) / 2);
  const y = VIEW_H - h - 8;
  return { x, y, w, h, scale, hbW, hbH };
}

export function getHotbarSlotRects(layout) {
  if (!layout) return [];
  const { x, y, scale, hbW, hbH } = layout;
  const innerW = hbW - 2 * HB_OUTER - (HOTBAR_SLOTS - 1) * HB_DIV;
  const baseSlotW = Math.floor(innerW / HOTBAR_SLOTS);
  let remainder = innerW - baseSlotW * HOTBAR_SLOTS;

  let nx = HB_OUTER;
  const rects = [];
  for (let i = 0; i < HOTBAR_SLOTS; i++) {
    const extra = remainder > 0 ? 1 : 0;
    const sw = baseSlotW + extra;
    remainder -= extra;

    const rx = x + Math.round(nx * scale);
    const ry = y + Math.round(HB_OUTER * scale);
    const rw = Math.round(sw * scale);
    const rh = Math.round((hbH - 2 * HB_OUTER) * scale);

    rects.push({ x: rx, y: ry, w: rw, h: rh });
    nx += sw + HB_DIV;
  }
  return rects;
}

/**
 * Draws the hotbar + items + stack counts.
 * Accepts either slot shape {id,count} or {itemId,count}.
 */
export function drawHotbar(ctx, hotbarImg, layout, selectedSlot, hotbarItems = [], itemSprites = {}) {
  if (!layout) return;

  ctx.drawImage(hotbarImg, layout.x, layout.y, layout.w, layout.h);
  const rects = getHotbarSlotRects(layout);
  const pad = Math.max(2, Math.floor(layout.scale * 2));

  rects.forEach((r, i) => {
    const slot = hotbarItems[i];
    const key = slot?.id ?? slot?.itemId;
    if (!key) return;

    const img = itemSprites[key];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, r.x + pad, r.y + pad, r.w - pad * 2, r.h - pad * 2);
    }

    const count = slot?.count ?? 0;
    if (count > 1) {
      const tx = r.x + r.w - 3;
      const ty = r.y + r.h - 4;
      ctx.font = `12px monospace`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';

      // shadow for readability
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          ctx.fillText(String(count), tx + ox, ty + oy);
        }
      }
      ctx.fillStyle = '#fff';
      ctx.fillText(String(count), tx, ty);

      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }
  });

  const sel = rects[selectedSlot];
  if (sel) {
    ctx.lineWidth = Math.max(1, Math.floor(layout.scale));
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.strokeRect(sel.x + 1, sel.y + 1, sel.w - 2, sel.h - 2);
  }
}

export function handleHotbarKeys(e, currentSelected) {
  if (e.key >= '1' && e.key <= '9') {
    const n = parseInt(e.key, 10) - 1;
    return Math.max(0, Math.min(n, HOTBAR_SLOTS - 1));
  }
  return currentSelected;
}
