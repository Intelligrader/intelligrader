// stuff/blocks/fence.js
import { TILE_SIZE } from '../constants.js';

/*
Tilesheet: 64 × 80 px => 4 cols × 5 rows, each cell 16×16.
Indexing we’ll use: col = 0..3 (left→right), row = 0..4 (top→bottom).

IMPORTANT:
- Only ONE entry (single post) is certainly correct for your sheet: [1,4].
- Everything else is configurable below in ATLAS.
Turn on DEBUG to see the (col,row) label drawn on each fence so you can
adjust the pairs in a few seconds if anything is misaligned on your sheet.
*/

const DEBUG = false; // set true to see atlas cell indices on the tile

// ---- Atlas map (edit these pairs to match your sheet) ----
// We index sprites by a 4-bit mask: U(1) R(2) D(4) L(8).
// e.g. up+down => 1|4 = 5, left+right => 2|8 = 10, cross => 1|2|4|8 = 15, etc.
const ATLAS = {
  // single post (verified)
  0:  [2, 4], // no neighbors

  // ends (just one neighbor)
  1:  [1, 4], // U
  2:  [1, 3], // R
  4:  [0, 3], // D
  8:  [2, 3], // L

  // lines
  5:  [0, 1], // U + D  (vertical mid)
 10:  [1, 2], // L + R  (horizontal mid)

  // corners
  3:  [0, 2], // U + R   (top-right)
  9:  [2, 2], // U + L   (top-left)
  6:  [0, 0], // R + D   (bottom-right)
 12:  [2, 0], // L + D   (bottom-left)

  // T’s
 11:  [3, 1], // U + L + R  (T-up)
  7:  [0, 0], // U + R + D  (T-right)
 14:  [3, 0], // R + D + L  (T-down)
 13:  [2, 0], // D + L + U  (T-left)

  // cross
 15:  [3, 0], // U + R + D + L (center)
};

export default {
  id: 'fence',
  name: 'Wood Fence',
  solid: true,
  texture: '/tilesets/fence.png',

  recipe: { requires: [{ id: 'stone', count: 2 }], time: 1 },

  _ensureImageLoaded() {
    if (this._img) return;
    this._img = new Image();
    this._imgLoaded = false; 
    this._img.onload = () => (this._imgLoaded = true);
    this._img.onerror = () => console.error('[Fence] failed to load', this.texture);
    this._img.src = this.texture;
  },

  getCollisionBox(x, y) {
    const size = TILE_SIZE;
    const w = size * 0.33; // about one-third width
    const h = size * 0.9;  // post height
    return {
      x: x + (size - w) / 2,
      y: y + (size - h),
      w,
      h,
    };
  },

  // draw using WORLD coords (x,y) and camera (camX,camY). worldObjects is needed for adjacency.
  draw(ctx, x, y, scale, _dayNight, worldObjects = [], camX = 0, camY = 0) {
    this._ensureImageLoaded();

    const ts = TILE_SIZE;
    const up    = worldObjects.some(o => o.id === 'fence' && o.x === x && o.y === y - ts) ? 1 : 0;
    const right = worldObjects.some(o => o.id === 'fence' && o.x === x + ts && o.y === y) ? 1 : 0;
    const down  = worldObjects.some(o => o.id === 'fence' && o.x === x && o.y === y + ts) ? 1 : 0;
    const left  = worldObjects.some(o => o.id === 'fence' && o.x === x - ts && o.y === y) ? 1 : 0;

    // U=1, R=2, D=4, L=8
    const mask = (up ? 1 : 0) | (right ? 2 : 0) | (down ? 4 : 0) | (left ? 8 : 0);

    // pick atlas cell; fallback to single-post if undefined
    const [col, row] = ATLAS.hasOwnProperty(mask) ? ATLAS[mask] : ATLAS[0];

    const sx = col * ts;
    const sy = row * ts;

    const dx = Math.round((x - camX) * scale);
    const dy = Math.round((y - camY) * scale);
    const dw = ts * scale, dh = ts * scale;
    ctx.drawImage(this._img, sx, sy, ts, ts, dx, dy, dw, dh);

    if (DEBUG) {
      ctx.save();
      ctx.font = `${Math.max(8, Math.floor(8 * scale))}px monospace`;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(dx, dy, 18, 12);
      ctx.fillStyle = '#fff';
      ctx.fillText(`${col},${row}`, dx + 2, dy + 10);
      ctx.restore();
    }
  },

  ghostSprite(scale) {
    const ts = TILE_SIZE;
    const col = 2;
    const row = 4;

    return {
      sx: col * ts,
      sy: row * ts,
      sw: ts,
      sh: ts,
      dw: ts * scale,
      dh: ts * scale,
    };

    
  }
};