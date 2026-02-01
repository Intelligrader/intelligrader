// stuff/blocks/blocks.js
// Centralized block registry for all interactive world blocks.

import Campfire from './campfire.js';
import Fence from './fence.js';

const blockRegistry = {};

/**
 * Register a new block definition
 * @param {object} def - Block definition module
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} blocks - Array of block objects with { x, y, id, draw }
 * @param {number} camX
 * @param {number} camY
 * @param {number} scale
 */
export function registerBlock(def) {
  if (!def?.id) throw new Error('Block must have an id');
  if (blockRegistry[def.id]) {
    console.warn(`[Blocks] Duplicate ID "${def.id}" ignored.`);
    return;
  }
  blockRegistry[def.id] = def;
}

/** Get a single block by ID */
export function getBlock(id) {
  return blockRegistry[id];
}

/** Get all blocks */
export function getAllBlocks() {
  return Object.values(blockRegistry);
}

/** Load all blocks (manual import for Next.js instead of require.context) */
export async function loadAllBlocks() {
  // manually import all block files — add new ones here as you create them
  const blockModules = [Campfire, Fence];

  for (const mod of blockModules) {
    if (mod && mod.id) registerBlock(mod);
  }

  console.log(`[Blocks] Registered ${Object.keys(blockRegistry).length} block(s).`);
  return blockRegistry;
}

/**
 * Get all craftable recipes from registered blocks.
 * Blocks that define a "recipe" property are considered craftable.
 */
export function getAllBlockRecipes() {
  const recipes = [];
  for (const id in blockRegistry) {
    const block = blockRegistry[id];
    if (block.recipe) {
      recipes.push({
        id: block.id,
        name: block.name,
        texture: block.texture,
        ...block.recipe,
      });
    }
  }
  return recipes;
}

export function drawBlocks(ctx, blocks, camX, camY, scale) {
  if (!Array.isArray(blocks) || blocks.length === 0) return;

  for (const block of blocks) {
    if (!block) continue;

    const screenX = Math.round((block.x - camX) * scale);
    const screenY = Math.round((block.y - camY) * scale);
    const size = (block.w || 16) * scale;

    ctx.save();

    // use block’s draw() if available
    if (typeof block.draw === 'function') {
      block.draw(ctx, screenX, screenY, scale);
    } else if (block.texture) {
      const img = block._img || (block._img = new Image());
      if (!block._img.src) block._img.src = block.texture;
      ctx.drawImage(img, screenX, screenY, size, size);
    } else {
      // fallback if texture missing
      ctx.fillStyle = '#888';
      ctx.fillRect(screenX, screenY, size, size);
    }

    ctx.restore();
  }
}

function startTextureUpdater() {
  if (textureUpdateTimer) clearInterval(textureUpdateTimer);

  textureUpdateTimer = setInterval(() => {
    for (const def of Object.values(blockRegistry)) {
      if (!def.texture) continue;

      // Skip if custom draw() handles animation
      if (typeof def.draw === 'function' && def.id !== 'campfire') continue;

      // Reload broken or unloaded images
      if (!def._img || !def._img.src || def._img.naturalWidth === 0) {
        def._img = new Image();
        def._img.src = def.texture;
        continue;
      }

      // For animated textures: cycle frames via timestamp (optional)
      if (def.frames && def.frames.length > 1) {
        const frame = Math.floor(Date.now() / (def.frameDelay || 150)) % def.frames.length;
        def._img.src = def.frames[frame];
      }
    }
  }, 500); // updates every 0.5s — safe for canvas
}

export function stopTextureUpdater() {
  if (textureUpdateTimer) {
    clearInterval(textureUpdateTimer);
    textureUpdateTimer = null;
  }
}

export const allBlocks = [Campfire, Fence];
