export class DroppedItem {
  constructor(id, count, x, y, vx = 0, vy = 0) {
    this.id = id;
    this.count = count;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;

    // vertical motion
    this.z = 0;
    this.vz = 4 + Math.random() * 1.5;
    this.gravity = 0.4;

    this.groundZ = 0;
    this.radius = 10; // pickup radius
    this.age = 0;
    this.pickupDelay = 30; // frames (~0.5s if 60fps)
    this.lifeTime = 60 * 30; // 30s
  }

  update(deltaTime) {
    this.age += deltaTime;
    if (this.age > this.lifeTime) {
      this._despawn = true;
      return;
    }

    // --- horizontal drift
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.94;
    this.vy *= 0.94;

    // --- vertical arc
    this.vz -= this.gravity;
    this.z += this.vz;

    if (this.z <= 0) {
      this.z = 0;
      this.vz *= -0.4;
      if (Math.abs(this.vz) < 0.5) this.vz = 0;
    }
  }

  // can only pick up if delay elapsed and on ground
  canBePickedUp() {
    return this.age > this.pickupDelay && this.z <= 0;
  }

  draw(ctx, camX, camY, scale, itemSprites) {
    const img = itemSprites?.[this.id];
    if (!img || !img.complete || img.naturalWidth <= 0) return;

    const sx = Math.round((this.x - camX) * scale);
    const sy = Math.round((this.y - camY) * scale);
    const size = Math.round(8 * scale);
    const screenZ = this.z * scale;

    // shadow
    const shadowScale = 1 - Math.min(0.6, this.z / 20);
    ctx.save();
    ctx.globalAlpha = 0.25 * shadowScale;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(sx, sy + size / 2, (size / 2) * shadowScale, (size / 4) * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // sprite
    ctx.drawImage(img, sx - size / 2, sy - size / 2 - screenZ, size, size);
  }
}
