// stuff/ui/craftingMenu.js
// Robust crafting menu system that dynamically loads block recipes

import { getAllBlockRecipes } from '../blocks/blocks.js';

export class CraftingMenu {
  constructor() {
    this.open = false;
    this.hoveredIndex = -1;
    this.recipes = [];
  }

  /** Loads all recipes from registered blocks */
  loadRecipes() {
    this.recipes = getAllBlockRecipes();
    console.log(`[CraftingMenu] Loaded ${this.recipes.length} recipes.`);
  }

  toggle() {
    this.open = !this.open;
  }

  draw(ctx, VIEW_W, VIEW_H) {
    if (!this.open) return;

    const menuW = 320;
    const menuH = 240;
    const x = (VIEW_W - menuW) / 2;
    const y = (VIEW_H - menuH) / 2;

    // --- background ---
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, menuW, menuH);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, menuW, menuH);
    ctx.restore();

    ctx.font = '16px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('Crafting Menu', x + 16, y + 20);

    // --- recipes ---
    const startY = y + 50;
    const slotH = 50;

    this.recipes.forEach((recipe, i) => {
      const ry = startY + i * slotH;
      ctx.fillStyle = i === this.hoveredIndex ? '#333' : '#222';
      ctx.fillRect(x + 16, ry, menuW - 32, slotH - 8);

      if (recipe.texture) {
        const img = new Image();
        img.src = recipe.texture;
        ctx.drawImage(img, x + 24, ry + 8, 32, 32);
      }

      ctx.fillStyle = '#fff';
      ctx.fillText(recipe.name || recipe.id, x + 70, ry + 24);

      // ingredient list
      if (Array.isArray(recipe.ingredients)) {
        ctx.fillStyle = '#aaa';
        const ingText = recipe.ingredients
          .map(r => `${r.count}x ${r.id}`)
          .join(', ');
        ctx.fillText(ingText, x + 180, ry + 24);
      }
    });
  }

  handleMouseMove(mx, my, VIEW_W, VIEW_H) {
    if (!this.open) return;
    const menuW = 320;
    const menuH = 240;
    const x = (VIEW_W - menuW) / 2;
    const y = (VIEW_H - menuH) / 2;
    const startY = y + 50;
    const slotH = 50;

    this.hoveredIndex = -1;
    for (let i = 0; i < this.recipes.length; i++) {
      const ry = startY + i * slotH;
      if (mx >= x + 16 && mx <= x + menuW - 16 && my >= ry && my <= ry + slotH - 8) {
        this.hoveredIndex = i;
        break;
      }
    }
  }

  /** Called when a recipe is clicked; consumes ingredients & adds output */
  handleMouseClick(inventorySlots) {
    if (!this.open || this.hoveredIndex === -1) return null;
    const recipe = this.recipes[this.hoveredIndex];
    if (!Array.isArray(inventorySlots)) {
      console.error('CraftingMenu.handleMouseClick expected an array of slots.');
      return null;
    }

    // --- check materials ---
    const canCraft = recipe.ingredients?.every(ing => {
      let need = ing.count;
      for (const slot of inventorySlots) {
        if (!slot || !slot.itemId) continue;
        if (slot.itemId === ing.id) {
          need -= slot.count ?? 1;
          if (need <= 0) break;
        }
      }
      return need <= 0;
    });

    if (!canCraft) {
      console.log('Not enough materials!');
      return null;
    }

    // --- consume items ---
    recipe.ingredients.forEach(ing => {
      let need = ing.count;
      for (const slot of inventorySlots) {
        if (!slot || !slot.itemId || slot.itemId !== ing.id) continue;
        const take = Math.min(need, slot.count ?? 1);
        slot.count -= take;
        need -= take;
        if (slot.count <= 0) {
          slot.itemId = null;
          slot.item = null;
        }
        if (need <= 0) break;
      }
    });

    // --- add crafted output ---
    const { id: outId, count: outCount } = recipe.output || {};
    if (!outId) return null;

    let remaining = outCount ?? 1;

    // stack with existing
    for (const slot of inventorySlots) {
      if (slot && slot.itemId === outId) {
        slot.count = (slot.count ?? 0) + remaining;
        remaining = 0;
        break;
      }
    }

    // add to empty slot
    if (remaining > 0) {
      const empty = inventorySlots.find(s => s && !s.itemId);
      if (empty) {
        empty.itemId = outId;
        empty.count = remaining;
        empty.item = null;
      } else {
        console.warn('Inventory full! Crafted item dropped.');
      }
    }

    console.log(`Crafted: ${recipe.name || outId}`);
    return outId;
  }
}
