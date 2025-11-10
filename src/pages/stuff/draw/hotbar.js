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

export function drawHotbar(ctx, hotbarImg, layout, selectedSlot) {
  if (!layout) return;
  ctx.drawImage(hotbarImg, layout.x, layout.y, layout.w, layout.h);
  const rects = getHotbarSlotRects(layout);
  const r = rects[selectedSlot];
  if (!r) return;
  ctx.lineWidth = Math.max(1, Math.floor(layout.scale));
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
}
