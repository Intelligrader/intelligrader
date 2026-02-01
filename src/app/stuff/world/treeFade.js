// stuff/world/treeFade.js
import { TILE_SIZE } from '../constants.js';

/**
 * Smoothly fades trees when the player walks behind the trunk.
 */
export function updateTreeFade(player, trees) {
  if (!trees || !trees.length) return;

  const pxL = player.x - player.size / 2;
  const pxR = player.x + player.size / 2;

  for (const t of trees) {
    const box = t.collisionBoxes && t.collisionBoxes[0];
    if (!box) continue;

    const trunkLeft   = t.x + box.x;
    const trunkRight  = trunkLeft + box.w;
    const trunkBottom = t.y + box.y + box.h;

    const horiz  = pxR > trunkLeft && pxL < trunkRight;
    const behind = (player.y + player.size / 2) < (trunkBottom - TILE_SIZE * 0.5);

    const target = horiz && behind ? 0.25 : 1.0;
    t.alpha += (target - t.alpha) * 0.1;
  }
}
