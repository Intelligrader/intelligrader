// stuff/dayNightClock.js
// Simple in-game clock synced with the day/night cycle

/**
 * Draws a digital clock (HH:MM) using the day/night cycle's current time.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {object} dayNight  instance from createDayNight()
 * @param {number} x         top-left x position
 * @param {number} y         top-left y position
 */
export function drawClock(ctx, dayNight, x = 20, y = 36) {
  if (!dayNight || !dayNight.getCycle) return;
  const { t } = dayNight.getCycle();

  // convert 0–1 day fraction into hours and minutes
  const totalMinutes = t * 24 * 60;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = Math.floor(totalMinutes % 60);

  // format HH:MM
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const text = `${hh}:${mm}`;

  // background box
  const pad = 8;
  const width = 80;
  const height = 28;
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#000';
  ctx.fillRect(x - pad, y - height + 8, width, height);
  ctx.restore();

  // text
  ctx.font = '16px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x, y - 6);

  // optional AM/PM indicator
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(hours < 12 ? 'AM' : 'PM', x + 60, y - 4);
}
