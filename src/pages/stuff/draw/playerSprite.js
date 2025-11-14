// stuff/draw/playerSprite.js
// Handles idle + walk animations using two sprite sheets.

const FRAME_W = 32;
const FRAME_H = 32;
const FPS = 8; // walking speed

let idleImg = null;
let walkImg = null;
let loaded = false;

export function loadPlayerSprites() {
  if (loaded) return;

  idleImg = new Image();
  walkImg = new Image();

  let count = 0;
  function done() {
    count++;
    if (count === 2) loaded = true;
  }

  idleImg.onload = done;
  walkImg.onload = done;

  idleImg.src = "/characters/Idle.png";  // <-- adjust if needed
  walkImg.src = "/characters/Walk.png";
}

/**
 * Draws the player using the correct animation based on movement.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} player - must contain x,y,dir,animFrame,animTimer,isMoving
 * @param {number} camX
 * @param {number} camY
 * @param {number} scale
 * @param {number} dt
 */
export function drawAnimatedPlayer(ctx, player, camX, camY, scale, dt) {
  if (!loaded) return;

  // Which sheet to use
  const sheet = player.isMoving ? walkImg : idleImg;

  // Animation update
  const maxFrames = 4;
  player.animTimer += dt;
  if (player.animTimer >= 60 / FPS) {
    player.animTimer = 0;
    player.animFrame = (player.animFrame + 1) % maxFrames;
  }

  // Directions (rows):
  // row 0 = down
  // row 1 = left
  // row 2 = right
  // row 3 = up
  const row = player.dir || 0; // default down

  const sx = player.animFrame * FRAME_W;
  const sy = row * FRAME_H;

  const dx = Math.round((player.x - camX) * scale - FRAME_W / 2);
  const dy = Math.round((player.y - camY) * scale - FRAME_H / 1.3);

  ctx.drawImage(
    sheet,
    sx, sy, FRAME_W, FRAME_H,
    dx, dy, FRAME_W * scale, FRAME_H * scale
  );
}
