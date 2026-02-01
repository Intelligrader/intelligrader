// =============================
// RECTANGLE → RECTANGLE COLLISION
// =============================
export function rectsOverlap(a, b) {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  );
}

// Convert player center + hitbox settings into rectangle
function getPlayerRect(px, py, hitbox) {
  return {
    x: px - hitbox.w / 2,
    y: py - hitbox.h + hitbox.offY,
    w: hitbox.w,
    h: hitbox.h
  };
}

// =============================
// TREE COLLISIONS
// =============================
export function checkTreeCollisions(px, py, hitbox, trees) {
  const playerRect = getPlayerRect(px, py, hitbox);

  for (const t of trees) {
    if (!t.collisionBoxes) continue;

    for (const box of t.collisionBoxes) {
      const treeRect = {
        x: t.x + box.x,
        y: t.y + box.y,
        w: box.w,
        h: box.h
      };

      if (rectsOverlap(playerRect, treeRect)) {
        return true;
      }
    }
  }
  return false;
}

// =============================
// BLOCK COLLISIONS
// =============================
export function checkBlockCollisions(px, py, hitbox, worldObjects, tileSize = 8) {
  const playerRect = getPlayerRect(px, py, hitbox);

  for (const obj of worldObjects) {
    const def = obj.def;
    if (!def?.solid) continue;

    let bx, by, bw, bh;

    // Custom collision box (fence, campfire, etc)
    if (typeof def.getCollisionBox === "function") {
      const box = def.getCollisionBox(obj.x, obj.y);
      if (!box) continue;
      bx = box.x;
      by = box.y;
      bw = box.w;
      bh = box.h;

    } else {
      // Default: full tile
      bx = obj.x;
      by = obj.y;
      bw = def.width || tileSize;
      bh = def.height || tileSize;
    }

    const blockRect = { x: bx, y: by, w: bw, h: bh };

    if (rectsOverlap(playerRect, blockRect)) {
      return true;
    }
  }

  return false;
}
