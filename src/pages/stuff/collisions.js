export function collides(a, b) {
  return !(
    a.x + a.size / 2 < b.x ||
    a.x - a.size / 2 > b.x + b.w ||
    a.y + a.size / 2 < b.y ||
    a.y - a.size / 2 > b.y + b.h
  );
}

export function checkTreeCollisions(px, py, playerSize, trees) {
  for (const t of trees) {
    for (const box of t.collisionBoxes) {
      const bx = t.x + box.x;
      const by = t.y + box.y;
      if (collides({ x: px, y: py, size: playerSize }, { x: bx, y: by, w: box.w, h: box.h })) {
        return true;
      }
    }
  }
  return false;
}
