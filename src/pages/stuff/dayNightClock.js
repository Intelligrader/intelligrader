// stuff/dayNightClock.js
// Simple in-game clock synced with the day/night cycle in 12-hour format (AM/PM)

/**
 * Draws a digital clock (HH:MM AM/PM) using the day/night cycle's current time.
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
  let hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = Math.floor(totalMinutes % 60);

  // convert to 12-hour time
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  // format HH:MM
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  const text = `${hh}:${mm} ${ampm}`;

  // background box
  const pad = 8;
  const width = 90;
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
}
