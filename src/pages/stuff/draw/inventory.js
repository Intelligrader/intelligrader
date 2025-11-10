import { roundRect } from '../math.js';
import { clamp } from '../math.js';

// Layout constants
export const INVENTORY_COLS = 9;
export const INVENTORY_ROWS = 3;
export const SLOT_SIZE = 48;
export const SLOT_MARGIN = 4;
export const INVENTORY_PAD = 24;

export function getInventoryLayout(VIEW_W, VIEW_H) {
  const iw = INVENTORY_COLS * SLOT_SIZE + (INVENTORY_COLS - 1) * SLOT_MARGIN;
  const ih = INVENTORY_ROWS * SLOT_SIZE + (INVENTORY_ROWS - 1) * SLOT_MARGIN;
  const x = (VIEW_W - iw) / 2;
  const y = (VIEW_H - ih) / 2;
  return { x, y, iw, ih };
}

export function getSlotIndexFromMouse(mx, my, layout) {
  const { x, y } = layout;
  for (let row = 0; row < INVENTORY_ROWS; row++) {
    for (let col = 0; col < INVENTORY_COLS; col++) {
      const sx = x + col * (SLOT_SIZE + SLOT_MARGIN);
      const sy = y + row * (SLOT_SIZE + SLOT_MARGIN);
      if (mx >= sx && mx <= sx + SLOT_SIZE && my >= sy && my <= sy + SLOT_SIZE) {
        return row * INVENTORY_COLS + col;
      }
    }
  }
  return -1;
}

export function drawInventory({
  ctx, VIEW_W, VIEW_H, inventoryOpen, inventorySlots,
  hoveredSlot, selectedInventorySlot, itemSprites
}) {
  if (!inventoryOpen) return;

  ctx.save();

  // dim background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // panel
  const { x: gridX, y: gridY, iw, ih } = getInventoryLayout(VIEW_W, VIEW_H);
  const panelX = Math.floor(gridX - INVENTORY_PAD);
  const panelY = Math.floor(gridY - INVENTORY_PAD);
  const panelW = Math.floor(iw + INVENTORY_PAD * 2);
  const panelH = Math.floor(ih + INVENTORY_PAD * 2);
  const radius = 10;

  roundRect(ctx, panelX, panelY, panelW, panelH, radius);
  ctx.fillStyle = '#e6e6e6';
  ctx.fill();

  roundRect(ctx, panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1, radius);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // title (above the panel)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '20px monospace';
  ctx.fillStyle = '#111';
  ctx.fillText('Inventory', VIEW_W / 2, panelY - 12);

  // slots + items
  for (let i = 0; i < inventorySlots.length; i++) {
    const row = Math.floor(i / INVENTORY_COLS);
    const col = i % INVENTORY_COLS;
    const sx = gridX + col * (SLOT_SIZE + SLOT_MARGIN);
    const sy = gridY + row * (SLOT_SIZE + SLOT_MARGIN);

    // slot background & border
    ctx.fillStyle = 'rgba(40,40,40,0.85)';
    ctx.fillRect(sx, sy, SLOT_SIZE, SLOT_SIZE);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, SLOT_SIZE - 1, SLOT_SIZE - 1);

    // hover highlight
    if (i === hoveredSlot) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, SLOT_SIZE - 2, SLOT_SIZE - 2);
    }

    // selected highlight
    if (i === selectedInventorySlot) {
      ctx.strokeStyle = 'rgba(255,215,0,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeRect(sx + 1.5, sy + 1.5, SLOT_SIZE - 3, SLOT_SIZE - 3);
    }

    // draw item sprite
    const slot = inventorySlots[i];
    if (slot && slot.item) {
      const icon = itemSprites[slot.item.id];
      if (icon && icon.complete && icon.naturalWidth > 0) {
        const iconSize = 16;
        const scale = 2.5;
        const iconW = iconSize * scale;
        const iconH = iconSize * scale;
        const iconX = sx + (SLOT_SIZE - iconW) / 2;
        const iconY = sy + (SLOT_SIZE - iconH) / 2;
        ctx.drawImage(icon, iconX, iconY, iconW, iconH);
      }
    }
  }

  ctx.restore();
}

export function drawItemTooltip(ctx, VIEW_W, VIEW_H, inventoryOpen, hoveredSlot, inventorySlots, mx, my) {
  if (!inventoryOpen || hoveredSlot === -1) return;
  const slot = inventorySlots[hoveredSlot];
  if (!slot || !slot.item) return;

  const { name, description } = slot.item;

  ctx.save();
  ctx.font = '12px monospace';
  const padX = 8;
  const textW = Math.max(ctx.measureText(name).width, ctx.measureText(description).width);
  const boxW = textW + padX * 2;
  const boxH = 40;

  const x = clamp(mx + 12, 0, VIEW_W - boxW - 4);
  const y = clamp(my - boxH - 8, 0, VIEW_H - boxH - 4);

  roundRect(ctx, x, y, boxW, boxH, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(name, x + padX, y + 16);
  ctx.font = '11px monospace';
  ctx.fillText(description, x + padX, y + 32);
  ctx.restore();
}
