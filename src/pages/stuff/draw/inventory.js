// stuff/draw/inventory.js
import { itemsData } from '../items.js';
import { getPlayerPosition } from '../state/playerState.js';
import { spawnDroppedItem } from './world.js';
import { SLOT_RECTS, SLOT_SCALE } from './slotLayout.js';

const UI_W = 162;
const UI_H = 101;

const SLOT_SIZE = 12;
const CLOSE_X = 148;
const CLOSE_Y = 4;
const CLOSE_W = 10;
const CLOSE_H = 10;

export class Inventory {
  constructor(onHotbarUpdate = null) {
    this.cols = 12;
    this.rows = 5;
    this.totalSlots = SLOT_RECTS.length;

    this.slots = Array.from({ length: this.totalSlots }, () => null);

    this.open = false;
    this.hoveredSlot = -1;

    this.heldItem = null;
    this.dragIndex = -1;

    this.mouseX = 0;
    this.mouseY = 0;

    this.uiImage = new Image();
    this.uiImage.src = "/ui/inventory.png";

    this.onHotbarUpdate = onHotbarUpdate;
  }

  toggle() { this.open = !this.open; }

  getUiRect(VIEW_W, VIEW_H) {
    return {
      uiX: (VIEW_W - UI_W * SLOT_SCALE) / 2,
      uiY: (VIEW_H - UI_H * SLOT_SCALE) / 2
    };
  }

  // HOTBAR is last 12 slots
  getHotbarItems() {
    return this.slots.slice(-9).map(s => s || { id: null, count: 0 });
  }

  syncHotbar() {
    if (typeof this.onHotbarUpdate === "function") {
      this.onHotbarUpdate(this.getHotbarItems());
    }
  }

  isInsideInventory(mx, my, VIEW_W, VIEW_H) {
    const { uiX, uiY } = this.getUiRect(VIEW_W, VIEW_H);

    const panelW = UI_W * SLOT_SCALE;
    const panelH = UI_H * SLOT_SCALE;

    return (
      mx >= uiX &&
      mx <= uiX + panelW &&
      my >= uiY &&
      my <= uiY + panelH
    );
  }

  getSlotRect(index, VIEW_W, VIEW_H) {
    const { uiX, uiY } = this.getUiRect(VIEW_W, VIEW_H);
    const def = SLOT_RECTS[index];

    return {
      x: uiX + def.x * SLOT_SCALE,
      y: uiY + def.y * SLOT_SCALE,
      w: SLOT_SIZE * SLOT_SCALE,
      h: SLOT_SIZE * SLOT_SCALE
    };
  }

  getSlotAt(mx, my, VIEW_W, VIEW_H) {
    for (let i = 0; i < this.totalSlots; i++) {
      const r = this.getSlotRect(i, VIEW_W, VIEW_H);
      if (mx >= r.x && mx <= r.x + r.w &&
          my >= r.y && my <= r.y + r.h) return i;
    }
    return -1;
  }
  
  getMaxStack(id) {
    return itemsData.find(i => i.id === id)?.maxStack ?? 999;
  }

  addItem(item) {
  const id = item.id;
  let count = item.count ?? 1;
  const maxStack = this.getMaxStack(id);

  // ---- Step 1: try stacking in hotbar first ----
  const hotbarStart = this.totalSlots - 9;
  const hotbarIndices = Array.from({length: 9}, (_, i) => hotbarStart + i);

  for (let i of hotbarIndices) {
    const s = this.slots[i];
    if (s && s.id === id && s.count < maxStack) {
      const add = Math.min(maxStack - s.count, count);
      s.count += add;
      count -= add;
      if (count <= 0) {
        this.syncHotbar();
        return true;
      }
    }
  }

  // ---- Step 2: try stacking in rest of inventory ----
  for (let i = 0; i < hotbarStart; i++) {
    const s = this.slots[i];
    if (s && s.id === id && s.count < maxStack) {
      const add = Math.min(maxStack - s.count, count);
      s.count += add;
      count -= add;
      if (count <= 0) {
        this.syncHotbar();
        return true;
      }
    }
  }

  // ---- Step 3: place in empty hotbar slots ----
  for (let i of hotbarIndices) {
    if (!this.slots[i]) {
      const add = Math.min(maxStack, count);
      this.slots[i] = { id, count: add };
      count -= add;
      if (count <= 0) {
        this.syncHotbar();
        return true;
      }
    }
  }

  // ---- Step 4: place in empty inventory slots ----
  for (let i = 0; i < hotbarStart; i++) {
    if (!this.slots[i]) {
      const add = Math.min(maxStack, count);
      this.slots[i] = { id, count: add };
      count -= add;
      if (count <= 0) {
        this.syncHotbar();
        return true;
      }
    }
  }

  this.syncHotbar();
  return count <= 0;
}

  handleMouseMove(mx, my, VIEW_W, VIEW_H) {
    this.mouseX = mx;
    this.mouseY = my;
    this.hoveredSlot = this.getSlotAt(mx, my, VIEW_W, VIEW_H);
  }

  handleMouseDown(mx, my, VIEW_W, VIEW_H) {
    if (this.heldItem && !this.isInsideInventory(mx, my, VIEW_W, VIEW_H)) {
      const { x, y } = getPlayerPosition(); // world coords
      spawnDroppedItem(this.heldItem.id, this.heldItem.count, x, y);
      this.heldItem = null;
      this.dragIndex = -1;
      this.syncHotbar();
      return;
    }
    
    if (!this.open) return;

    const { uiX, uiY } = this.getUiRect(VIEW_W, VIEW_H);

    // Close button
    if (mx >= uiX + CLOSE_X * SLOT_SCALE &&
        mx <= uiX + (CLOSE_X + CLOSE_W) * SLOT_SCALE &&
        my >= uiY + CLOSE_Y * SLOT_SCALE &&
        my <= uiY + (CLOSE_Y + CLOSE_H) * SLOT_SCALE) {
      this.toggle();
      return;
    }

    const index = this.getSlotAt(mx, my, VIEW_W, VIEW_H);
    if (index === -1) return;

    const slot = this.slots[index];

    if (this.heldItem) {
      if (!slot) {
        this.slots[index] = this.heldItem;
        this.heldItem = null;
      } else if (slot.id === this.heldItem.id) {
        const max = itemsData.find(i => i.id === slot.id)?.maxStack ?? 999;
        const total = slot.count + this.heldItem.count;
        slot.count = Math.min(max, total);
        const leftover = total - max;
        if (leftover > 0) this.heldItem.count = leftover;
        else this.heldItem = null;
      } else {
        this.slots[index] = this.heldItem;
        this.heldItem = slot;
      }
      this.syncHotbar();
      return;
    }

    if (slot) {
      this.heldItem = slot;
      this.slots[index] = null;
      this.dragIndex = index;
      this.syncHotbar();
    }
  }

  draw(ctx, VIEW_W, VIEW_H, itemSprites) {
    if (!this.open) return;

    const { uiX, uiY } = this.getUiRect(VIEW_W, VIEW_H);

    if (!this.uiImage.complete || this.uiImage.naturalWidth === 0) return;

    // UI
    ctx.drawImage(this.uiImage, uiX, uiY, UI_W * SLOT_SCALE, UI_H * SLOT_SCALE);

    // Items
    for (let i = 0; i < this.totalSlots; i++) {
      const slot = this.slots[i];
      if (!slot) continue;

      const r = this.getSlotRect(i, VIEW_W, VIEW_H);
      const img = itemSprites?.[slot.id];

      if (img) {
        ctx.drawImage(img, r.x + 4, r.y + 4, r.w - 8, r.h - 8);
      }

      if (slot.count > 1) {
        ctx.fillStyle = "white";
        ctx.font = "14px monospace";
        ctx.textAlign = "right";
        ctx.fillText(slot.count, r.x + r.w - 2, r.y + r.h - 2);
      }
    }

    // Drag ghost
    if (this.heldItem) {
      const img = itemSprites?.[this.heldItem.id];
      if (img) {
        ctx.globalAlpha = 0.9;
        ctx.drawImage(img, this.mouseX - 16, this.mouseY - 16, 32, 32);
        ctx.globalAlpha = 1;
      }
    }
    // Tooltip
    drawItemTooltip(
      ctx,
      VIEW_W,
      VIEW_H,
      this.open,
      this.hoveredSlot,
      this.slots,
      this.mouseX,
      this.mouseY
    );
  }
}

export function drawItemTooltip(
  ctx,
  VIEW_W,
  VIEW_H,
  inventoryOpen,
  hoveredSlot,
  inventorySlots,
  mx,
  my
) {
  if (!inventoryOpen || hoveredSlot === -1) return;

  const slot = inventorySlots[hoveredSlot];
  if (!slot) return;

  const itemInfo = itemsData.find(i => i.id === slot.id);
  if (!itemInfo) return;

  // ---- Extract fields ----
  const name = itemInfo.name || "";
  const description = itemInfo.description || "";

  ctx.save();
  ctx.font = "12px monospace";

  // ---- SETTINGS ----
  const padding = 8;
  const maxTextWidth = 220;   // max width before wrapping
  const lineHeight = 14;

  // ---- WRAP DESCRIPTION ----
  const words = description.split(" ");
  const lines = [];
  let current = "";

  for (let w of words) {
    const test = current ? current + " " + w : w;
    if (ctx.measureText(test).width > maxTextWidth) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  // Name is always one line
  const nameWidth = ctx.measureText(name).width;
  const wrappedWidth = Math.max(
    nameWidth,
    ...lines.map(l => ctx.measureText(l).width)
  );

  const boxW = wrappedWidth + padding * 2;
  const boxH = padding * 2 + lineHeight * (1 + lines.length);

  // ---- POSITION ----
  let x = mx + 16;
  let y = my - boxH - 12;

  // Keep inside screen
  if (x + boxW > VIEW_W - 4) x = VIEW_W - boxW - 4;
  if (x < 4) x = 4;
  if (y < 4) y = my + 24; // flip downward if no room above

  // ---- DRAW BG ----
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  roundRect(ctx, x, y, boxW, boxH, 6);
  ctx.fill();
  ctx.stroke();

  // ---- TEXT ----
  ctx.fillStyle = "#fff";

  // name
  ctx.font = "bold 12px monospace";
  ctx.fillText(name, x + padding + 200, y + padding + 5);

  // description
  ctx.font = "11px monospace";
  let ty = y + padding + lineHeight + 10;
  for (let line of lines) {
    ctx.fillText(line, x + padding + 200, ty);
    ty += lineHeight;
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}