import { TILE_SIZE } from "../constants";

// stuff/blocks/Campfire.js
export default {
  id: 'campfire',
  name: 'Campfire',

  // Sprites
  fireTexture: '/blocks/campfire_fire.png',  // 4 frames vertically (16x16 each)
  baseTexture: '/blocks/campfire_base.png',  // static 16x16

  width: 16,
  height: 16,
  solid: true,

  lightLevel: 0.8,
  animationSpeed: 6,      // frames per second
  flickerRange: 0.25,

  collisionBox: { x: 4, y: 8, w: 8, h: 8 },

  recipe: {
    requires: [{ id: 'stone', count: 2 }],
    time: 1,
  },

  onInteract(player, world) {
    if (world?.dialogueRef) {
      world.dialogueRef.current = {
        text: "The fire crackles softly...",
        frame: 0,
        duration: 120
      };
    }
  },

  ensureImages() {
    if (!this._baseImg) {
      this._baseImg = new Image();
      this._baseImg.src = this.baseTexture;
    }
    if (!this._fireImg) {
      this._fireImg = new Image();
      this._fireImg.src = this.fireTexture;
    }
  },

  canPlace(worldObjects, x, y, TILE_SIZE) {
    const minDist = 5 * TILE_SIZE;     // 5 tiles
    const minDistSq = minDist * minDist;

    for (const obj of worldObjects) {
      if (obj.id === 'campfire') {
        const dx = obj.x - x;
        const dy = obj.y - y;
        const distSq = dx*dx + dy*dy;
        if (distSq < minDistSq) return false;
      }
    }

    return true;
  },

  draw(ctx, worldX, worldY, scale, dayNight, worldObjects, camX, camY) {
    this.ensureImages();
    if (!this._baseImg.complete || !this._fireImg.complete) return;

    // Convert world → screen
    const dx = Math.round((worldX - camX) * scale);
    const dy = Math.round((worldY - camY) * scale);
    const size = this.width * scale;

    // ---------------------------
    //   1. Draw BASE (no flicker)
    // ---------------------------
    ctx.drawImage(this._baseImg, dx, dy, size, size);
    const frames = 4;
    const frame = Math.floor((performance.now() / 1000) * this.animationSpeed) % frames;

    const sy = frame * 9; // crop the correct vertical frame

    // Fire flicker (ONLY fire, NOT base)
    const alpha =
      0.9 + Math.sin(performance.now() * 0.01) * this.flickerRange;
    const fireSizeX = size * 0.5
    const fireSizeY = size * 0.75

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.drawImage(this._fireImg,
      0, sy,      // src
      5, 9,     // src size
      dx + 8.5, dy - 8,     // dest
      fireSizeX, fireSizeY  // <-- THIS IS CORRECT
    );

    ctx.restore();

    // ---------------------------
    //   3. Glow (optional)
    // ---------------------------
    const glowRadius = 55 * scale;
    const gx = dx + size / 2;
    const gy = dy + size / 2;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, glowRadius);
    grad.addColorStop(0, "rgba(255,170,80,0.35)");
    grad.addColorStop(1, "rgba(255,170,80,0)");

    ctx.fillStyle = grad;
    ctx.fillRect(gx - glowRadius, gy - glowRadius, glowRadius * 2, glowRadius * 2);

    ctx.restore();
  }
};