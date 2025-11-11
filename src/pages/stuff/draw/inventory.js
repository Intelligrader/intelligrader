// stuff/draw/inventory.js
// Inventory with held-item ghost + source highlight, bottom-row-first add, and hotbar sync.

import { itemsData } from '../items.js';
import { getPlayerPosition } from '../state/playerState.js';
import { spawnDroppedItem } from './world.js';

export class Inventory {
  constructor(cols = 9, rows = 3, onHotbarUpdate = null) {
    this.cols = cols;
    this.rows = rows;
    this.slots = Array.from({ length: cols * rows }, () => null);

    this.open = false;
    this.hoveredSlot = -1;
    this.selectedSlot = -1;

    // New: moving item UX
    this.heldItem = null;   // { id, count }
    this.dragIndex = -1;    // slot where the held item came from
    this._mouseX = 0;       // for drawing ghost sprite
    this._mouseY = 0;

    this.SLOT_SIZE = 48;
    this.SLOT_MARGIN = 4;
    this.PAD = 24;

    this.onHotbarUpdate = onHotbarUpdate;
  }

  getMaxStackFor(id) {
    const item = itemsData.find(i => i.id === id);
    return item?.maxStack ?? 999; // fallback if not defined
  }

  toggle() { this.open = !this.open; }

  // --- bottom row → middle → top (for auto-add & hotbar mirroring)
  bottomRowStart() { return (this.rows - 1) * this.cols; }
  getHotbarItems() {
    const start = this.bottomRowStart();
    return this.slots.slice(start, start + this.cols);
  }
  syncHotbar() {
    if (typeof this.onHotbarUpdate === 'function') {
      this.onHotbarUpdate(this.getHotbarItems());
    }
  }
  *slotOrderBottomToTop() {
    for (let r = this.rows - 1; r >= 0; r--) {
      for (let c = 0; c < this.cols; c++) {
        yield r * this.cols + c;
      }
    }
  }
  // Prefer stacking; else first empty (bottom→top)
  addItem(item) {
    const id = item.id;
    let count = item.count ?? 1;
    const maxStack = this.getMaxStackFor(id);

    // try stack
    for (const idx of this.slotOrderBottomToTop()) {
      const s = this.slots[idx];
      if (s && s.id === id && s.count < maxStack) {
        const space = maxStack - s.count;
        const add = Math.min(space, count);
        s.count += add;
        count -= add;
        if (count <= 0) {
          this.syncHotbar();
          return true;
        }
      }
    }

    // place new
    for (const idx of this.slotOrderBottomToTop()) {
      if (!this.slots[idx]) {
        const add = Math.min(maxStack, count);
        this.slots[idx] = { id, count: add };
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


  getSlotAt(mx, my, VIEW_W, VIEW_H) {
    const iw = this.cols * this.SLOT_SIZE + (this.cols - 1) * this.SLOT_MARGIN;
    const ih = this.rows * this.SLOT_SIZE + (this.rows - 1) * this.SLOT_MARGIN;
    const startX = (VIEW_W - iw) / 2;
    const startY = (VIEW_H - ih) / 2;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const sx = startX + col * (this.SLOT_SIZE + this.SLOT_MARGIN);
        const sy = startY + row * (this.SLOT_SIZE + this.SLOT_MARGIN);
        if (mx >= sx && mx <= sx + this.SLOT_SIZE && my >= sy && my <= sy + this.SLOT_SIZE) {
          return row * this.cols + col;
        }
      }
    }
    return -1;
  }

  handleMouseMove(mx, my, VIEW_W, VIEW_H) {
    this._mouseX = mx;
    this._mouseY = my;
    this.hoveredSlot = this.getSlotAt(mx, my, VIEW_W, VIEW_H);
  }

  isInsideInventory(mx, my, VIEW_W, VIEW_H) {
    const iw = this.cols * this.SLOT_SIZE + (this.cols - 1) * this.SLOT_MARGIN;
    const ih = this.rows * this.SLOT_SIZE + (this.rows - 1) * this.SLOT_MARGIN;
    const startX = (VIEW_W - iw) / 2 - this.PAD;
    const startY = (VIEW_H - ih) / 2 - this.PAD;
    const panelW = iw + this.PAD * 2;
    const panelH = ih + this.PAD * 2;

    return (
      mx >= startX && mx <= startX + panelW &&
      my >= startY && my <= startY + panelH
    );
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

    const idx = this.getSlotAt(mx, my, VIEW_W, VIEW_H);
    if (idx === -1) return;

    // If already carrying something → place/swap
    if (this.heldItem) {
      const target = this.slots[idx];
      if (!target) {
        this.slots[idx] = this.heldItem;
        this.heldItem = null;
        this.dragIndex = -1;
      } else if (target.id === this.heldItem.id) {
        const maxStack = this.getMaxStackFor(target.id);
        const total = target.count + this.heldItem.count;
        if (total <= maxStack) {
          target.count = total;
          this.heldItem = null;
        } else {
          target.count = maxStack;
          this.heldItem.count = total - maxStack;
        }
        this.dragIndex = -1;
      } else {
        // swap
        this.slots[idx] = this.heldItem;
        this.heldItem = target;
        this.dragIndex = idx;
      }
      this.syncHotbar();
      return;
    }


    // Not holding anything → pick up if slot has item
    const slot = this.slots[idx];
    if (slot) {
      this.heldItem = slot;
      this.dragIndex = idx;
      this.slots[idx] = null;
      this.syncHotbar();
    }
  }

  moveItem(fromIndex, toIndex) {
    const temp = this.slots[toIndex];
    this.slots[toIndex] = this.slots[fromIndex];
    this.slots[fromIndex] = temp;
    this.syncHotbar();
  }

  draw(ctx, VIEW_W, VIEW_H, itemSprites) {
    if (!this.open) return;

    const iw = this.cols * this.SLOT_SIZE + (this.cols - 1) * this.SLOT_MARGIN;
    const ih = this.rows * this.SLOT_SIZE + (this.rows - 1) * this.SLOT_MARGIN;
    const startX = (VIEW_W - iw) / 2;
    const startY = (VIEW_H - ih) / 2;

    const panelX = Math.floor(startX - this.PAD);
    const panelY = Math.floor(startY - this.PAD);
    const panelW = Math.floor(iw + this.PAD * 2);
    const panelH = Math.floor(ih + this.PAD * 2);
    const radius = 10;

    // Panel
    ctx.save();
    ctx.fillStyle = '#888';
    ctx.globalAlpha = 0.9;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, radius);
    ctx.fill();
    ctx.restore();

    // Slots
    for (let i = 0; i < this.slots.length; i++) {
      const row = Math.floor(i / this.cols);
      const col = i % this.cols;
      const sx = startX + col * (this.SLOT_SIZE + this.SLOT_MARGIN);
      const sy = startY + row * (this.SLOT_SIZE + this.SLOT_MARGIN);

      ctx.fillStyle = 'rgba(40,40,40,0.9)';
      ctx.fillRect(sx, sy, this.SLOT_SIZE, this.SLOT_SIZE);

      // Highlight: hovered & source slot
      if (i === this.dragIndex) {
        ctx.strokeStyle = 'rgba(255,215,0,0.95)'; // gold for the picked slot
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, this.SLOT_SIZE - 2, this.SLOT_SIZE - 2);
      } else if (i === this.hoveredSlot) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, this.SLOT_SIZE - 2, this.SLOT_SIZE - 2);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, this.SLOT_SIZE, this.SLOT_SIZE);
      }

      const slot = this.slots[i];
      if (slot) {
        const img = itemSprites?.[slot.id] || itemSprites?.[slot.itemId];
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, sx + 8, sy + 8, 32, 32);
        }
        const count = slot.count ?? 0;
        if (count > 1) {
          ctx.font = '12px monospace';
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(count, sx + this.SLOT_SIZE - 6, sy + this.SLOT_SIZE - 6);
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
        }
      }
    }

    // Title
    ctx.font = '20px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('Inventory', panelX + 10, panelY + 20);

    // Held item ghost (follows cursor)
    if (this.heldItem) {
      const img = itemSprites?.[this.heldItem.id] || itemSprites?.[this.heldItem.itemId];
      const mx = this._mouseX, my = this._mouseY;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(img, mx - 16, my - 16, 32, 32);
        ctx.restore();
      }
      const count = this.heldItem.count ?? 0;
      if (count > 1) {
        ctx.font = '12px monospace';
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(count, mx + 18, my + 18);
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
      }
    }
  }

  roundRect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }
}
