// stuff/draw/entities.js
// Render block/entities placed at runtime (e.g., via /setblock).

export function drawPlacedEntities(ctx, entities, camX, camY, scale, timeOfDay = 0) {
  if (!Array.isArray(entities) || entities.length === 0) return;

  for (const e of entities) {
    if (!e) continue;
    const sx = Math.round((e.x - camX) * scale);
    const sy = Math.round((e.y - camY) * scale);
    const sw = Math.round((e.w || 16) * scale);
    const sh = Math.round((e.h || 16) * scale);

    try {
      if (typeof e.draw === 'function') {
        // Many of our block draw fns accept (ctx, x, y, scale, timeOfDay)
        e.draw(ctx, sx, sy, scale, timeOfDay);
      } else if (e.def?.texture) {
        // Fallback: draw using the block’s texture
        if (!e._img) {
          e._img = new Image();
          e._img.src = e.def.texture;
          e._img.onerror = () => console.warn('Failed to load texture:', e.def.texture);
        }
        if (e._img.complete && e._img.naturalWidth > 0) {
          ctx.drawImage(e._img, sx, sy, sw, sh);
        } else {
          // waiting for load — draw a placeholder
          ctx.fillStyle = 'orange';
          ctx.fillRect(sx, sy, sw, sh);
        }
      } else {
        // No renderer/texture — draw placeholder
        ctx.fillStyle = 'magenta';
        ctx.fillRect(sx, sy, sw, sh);
      }
    } catch (err) {
      console.warn('drawPlacedEntities error:', err);
      ctx.fillStyle = 'red';
      ctx.fillRect(sx, sy, sw, sh);
    }
  }
}
