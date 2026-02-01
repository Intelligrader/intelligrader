// stuff/ui/craftingMenu.js
import { getAllBlockRecipes } from '../blocks/blocks.js';
import { itemsData } from '../items.js';

export class CraftingMenu {
  constructor() {
    this.open = false;
    this.hoveredIndex = -1;
    this.recipes = [];
    this._imageCache = {};
  }

  loadRecipes() {
    const defs = getAllBlockRecipes();
    this.recipes = defs.map(r => ({
      id: r.id,
      name: r.name || r.id,
      texture: r.texture,
      ingredients: r.requires || [],
      output: { id: r.id, count: 1 }
    }));
    console.log(`[CraftingMenu] Loaded ${this.recipes.length} recipes.`);
  }

  toggle() { this.open = !this.open; }

  getImage(src) {
    if (!src) return null;
    if (!this._imageCache[src]) {
      const img = new Image();
      img.src = src;
      this._imageCache[src] = img;
    }
    return this._imageCache[src];
  }

  draw(ctx, VIEW_W, VIEW_H) {
    if (!this.open) return;

    const menuW = 320, menuH = 260;
    const x = (VIEW_W - menuW) / 2;
    const y = (VIEW_H - menuH) / 2;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#111";
    ctx.fillRect(x, y, menuW, menuH);
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, menuW, menuH);
    ctx.restore();

    ctx.font = "18px monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("Crafting Menu", x + 85, y + 28);

    const startY = y + 50;
    const slotH = 50;

    this.recipes.forEach((recipe, i) => {
      const ry = startY + i * slotH;

      ctx.fillStyle = i === this.hoveredIndex ? "#333" : "#222";
      ctx.fillRect(x + 12, ry, menuW - 24, slotH - 6);

      const img = this.getImage(recipe.texture);
      if (img?.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x + 20, ry + 8, 32, 32);
      } else {
        ctx.fillStyle = "#555";
        ctx.fillRect(x + 20, ry + 8, 32, 32);
      }

      ctx.fillStyle = "#fff";
      ctx.fillText(recipe.name, x + 65, ry + 28);

      if (Array.isArray(recipe.ingredients)) {
        ctx.fillStyle = "#aaa";
        const txt = recipe.ingredients.map(i => `${i.count}× ${i.id}`).join(", ");
        ctx.fillText(txt, x + 160, ry + 28);
      }
    });
  }

  handleMouseMove(mx, my, VIEW_W, VIEW_H) {
    if (!this.open) return;
    const menuW = 320, menuH = 260;
    const x = (VIEW_W - menuW) / 2;
    const y = (VIEW_H - menuH) / 2;
    const startY = y + 50;
    const slotH = 50;

    this.hoveredIndex = -1;

    for (let i = 0; i < this.recipes.length; i++) {
      const ry = startY + i * slotH;
      const rx = x + 12;
      const rw = menuW - 24;
      const rh = slotH - 6;

      if (mx >= rx && mx <= rx + rw && my >= ry && my <= ry + rh) {
        this.hoveredIndex = i;
        break;
      }
    }
  }

  /** inventorySlots: new-style [{id,count}] or old-style [{itemId,count}] */
  handleMouseClick(inventorySlots) {
    if (!this.open || this.hoveredIndex === -1) return null;
    const slots = Array.isArray(inventorySlots) ? inventorySlots : [];

    const recipe = this.recipes[this.hoveredIndex];
    const ingredients = recipe.ingredients || [];

    // Helper: get ID from either slot format
    const getID = slot => slot?.id || slot?.itemId || null;

    // ===== CHECK MATERIALS =====
    const canCraft = ingredients.every(ing => {
      let need = ing.count;
      for (const slot of slots) {
        if (!slot) continue;
        if (getID(slot) === ing.id) {
          need -= slot.count || 0;
          if (need <= 0) return true;
        }
      }
      return need <= 0;
    });

    if (!canCraft) {
      console.log("Not enough materials");
      return null;
    }

    // ===== REMOVE MATERIALS =====
    ingredients.forEach(ing => {
      let need = ing.count;
      for (const slot of slots) {
        if (!slot) continue;
        if (getID(slot) === ing.id) {
          const take = Math.min(slot.count || 0, need);
          slot.count -= take;
          need -= take;

          if (slot.count <= 0) {
            slot.id = null;
            slot.itemId = null;
            slot.count = 0;
          }
          if (need <= 0) break;
        }
      }
    });

    // ===== GIVE CRAFTED ITEM (with maxStack) =====
    const output = recipe.output;
    let remaining = output.count;

    // Get item definition
    const itemDef = itemsData.find(i => i.id === output.id);
    const maxStack = itemDef?.maxStack ?? 999;

    // 1. Try stacking into existing slots
    for (const slot of slots) {
      if (!slot) continue;
      if (getID(slot) !== output.id) continue;

      const space = maxStack - (slot.count || 0);
      if (space <= 0) continue;

      const take = Math.min(space, remaining);
      slot.count += take;
      remaining -= take;

      if (remaining <= 0) break;
    }

    // 2. Put in empty slots (splitting if needed)
    while (remaining > 0) {
      const empty = slots.find(s => !s || !getID(s));
      if (!empty) {
        console.warn("Inventory full — dropping crafted item!");
        break;
      }

      // If slot is null, replace it with a new object
      if (!empty || typeof empty !== "object") {
        const idx = slots.indexOf(empty);
        slots[idx] = { id: output.id, count: 0 };
      }

      const put = Math.min(maxStack, remaining);
      empty.id = output.id;
      empty.itemId = output.id;
      empty.count = (empty.count || 0) + put;

      remaining -= put;
    }

    console.log(`✅ Crafted: ${output.id}`);
    return output.id;
  }
}
