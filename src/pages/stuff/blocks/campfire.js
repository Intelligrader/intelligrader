// stuff/blocks/Campfire.js
export default {
  id: 'campfire',
  name: 'Campfire',
  texture: '/blocks/campfire.png', // ✅ not /public/blocks/ — public folder is implicit
  width: 16,
  height: 16,
  solid: true,
  lightLevel: 0.8,
  animationSpeed: 0.05,
  flickerRange: 0.2,
  collisionBox: {
    x: 4,
    y: 8,
    w: 8,
    h: 8,
  },


  onInteract(player, world) {
    console.log(`${player.name || 'Player'} warms up by the fire 🔥`);
    if (world?.dialogueRef) {
      world.dialogueRef.current = { text: 'The fire crackles softly...', frame: 0, duration: 120 };
    }
  },

  draw(ctx, x = 0, y = 0, scale = 1, timeOfDay = 0) {
    // lazy-load the sprite only once
    if (!this._img) {
      this._img = new Image();
      this._img.src = this.texture; // ✅ guaranteed to exist now
      this._img.onload = () => console.log('✅ Campfire texture loaded');
      this._img.onerror = () => console.warn('⚠️ Campfire texture failed to load:', this.texture);
    }

    // Wait until loaded before drawing
    if (!this._img.complete || this._img.naturalWidth === 0) return;

    const safeX = Number.isFinite(x) ? x : 0;
    const safeY = Number.isFinite(y) ? y : 0;
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const size = (this.width || 16) * safeScale;

    // Flickering effect
    const baseAlpha = 0.8;
    const flicker =
      baseAlpha + Math.sin(Date.now() * this.animationSpeed) * (this.flickerRange || 0.2);

    ctx.save();
    ctx.globalAlpha = Math.max(0.3, Math.min(1, flicker));
    ctx.drawImage(this._img, safeX, safeY, size, size);
    ctx.restore();

    // Nighttime glow
    if (timeOfDay >= 0.7 || timeOfDay <= 0.3) {
      const glowRadius = Math.max(10, 50 * safeScale);
      const gx = safeX + size / 2;
      const gy = safeY + size / 2;

      if (
        Number.isFinite(gx) &&
        Number.isFinite(gy) &&
        Number.isFinite(glowRadius) &&
        glowRadius > 0
      ) {
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, glowRadius);
        grad.addColorStop(0, 'rgba(255, 180, 100, 0.3)');
        grad.addColorStop(1, 'rgba(255, 180, 100, 0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.fillRect(gx - glowRadius, gy - glowRadius, glowRadius * 2, glowRadius * 2);
        ctx.restore();
      }
    }
  },
};
