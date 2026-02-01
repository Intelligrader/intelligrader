// stuff/draw/playerSprite.js
// Fully working Idle + Walk animation system for your 32×32 characters.

const IDLE_SRC = "/characters/Idle.png";
const WALK_SRC = "/characters/Walk.png";

const FRAME_W = 32;
const FRAME_H = 32;

const DIR_DOWN  = 0;
const DIR_LEFT  = 3;
const DIR_RIGHT = 2;
const DIR_UP    = 1;

const IDLE_COLS = 4;
const WALK_COLS = 6;

const IDLE_FPS = 4;    // 4 fps
const WALK_FPS = 10;   // 10 fps

export function createPlayerSprite() {
  // ---------- LOAD IMAGES ----------
  const IdleImage = globalThis.Image || class {
    constructor() { console.warn("Image() not available — running server-side"); }
  };

  const idleImg = new IdleImage();
  const walkImg = new IdleImage();


  let idleLoaded = false;
  let walkLoaded = false;

  idleImg.onload = () => (idleLoaded = true);
  walkImg.onload = () => (walkLoaded = true);

  idleImg.src = IDLE_SRC;
  walkImg.src = WALK_SRC;

  // ---------- STATE ----------
  let facing = DIR_DOWN;
  let frame = 0;
  let timer = 0;
  let moving = false;

  function updateDirection(dx, dy) {
    // prioritize horizontal movement ALWAYS
    if (dx !== 0) {
      facing = dx > 0 ? DIR_RIGHT : DIR_LEFT;
    } else if (dy !== 0) {
      facing = dy > 0 ? DIR_DOWN : DIR_UP;
    }
  }

  return {
    update(dx, dy, dt) {
      const wasMoving = moving;
      moving = dx !== 0 || dy !== 0;

      // --- Prioritize left/right ---
      if (moving) updateDirection(dx, dy);

      // --- Reset frame when animation set changes ---
      if (moving !== wasMoving) {
        frame = 0;
        timer = 0;
      }

      timer += dt;

      if (moving) {
        const frameTime = 60 / WALK_FPS;
        if (timer >= frameTime) {
          timer -= frameTime;
          frame = (frame + 1) % WALK_COLS;
        }
      } else {
        const frameTime = 60 / IDLE_FPS;
        if (timer >= frameTime) {
          timer -= frameTime;
          frame = (frame + 1) % IDLE_COLS;
        }
      }
    },

    draw(ctx, player, camX, camY, scale) {
      const img = moving ? walkImg : idleImg;
      const loaded = moving ? walkLoaded : idleLoaded;

      if (!loaded) return;

      const col = frame;
      const row = facing;

      const sx = col * FRAME_W;
      const sy = row * FRAME_H;

      const dx = Math.round((player.x - camX) * scale) - FRAME_W * scale / 2;
      const dy = Math.round((player.y - camY) * scale) - FRAME_H * scale + player.size * scale * 0.5;

      ctx.drawImage(img, sx, sy, FRAME_W, FRAME_H, dx, dy + 20, FRAME_W * scale, FRAME_H * scale);
    },
  };
}