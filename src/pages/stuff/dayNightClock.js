// stuff/dayNightClock.js
// Deluxe animated day/night clock with sky-themed gradient background,
// smooth transitions, icon rotation, glow effects, and improved text styling.

function roundRect(ctx, x, y, w, h, r = 7) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/**
 * Lerp between two colors [r,g,b]
 */
function lerpColor(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {*} dayNight  - output of createDayNight()
 * @param {*} x
 * @param {*} y
 */
export function drawClock(ctx, dayNight, x = 20, y = 20) {
  if (!dayNight?.getCycle) return;
  const cyc = dayNight.getCycle();

  x -= 32;
  y -= 24;

  // cyc.t normalized 0..1, where 0=noon, 0.25=sunset, .5=midnight, .75=sunrise
  const t = cyc.t;

  // ===========================================================
  // TIME FORMAT
  // ===========================================================
  const mins = Math.floor((t * 1440) % 1440);
  let h24 = Math.floor(mins / 60);
  const m = mins % 60;

  const ampm = h24 >= 12 ? "PM" : "AM";
  const hh = (h24 % 12 || 12).toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  const text = `${hh}:${mm} ${ampm}`;

  // ===========================================================
  // BACKGROUND SKY COLOR (SMOOTH INTERPOLATION)
  // ===========================================================
  // define four key colors at phase points
  const dawn   = [255, 180, 120]; // warm rose
  const day    = [120, 200, 255]; // clear sky blue
  const dusk   = [250, 150, 110]; // orange/pink
  const night  = [10, 20, 40];    // deep blue

  let sky;

  if (t < 0.25) {
    sky = lerpColor(day, dusk, t / 0.25);
  } else if (t < 0.5) {
    sky = lerpColor(dusk, night, (t - 0.25) / 0.25);
  } else if (t < 0.75) {
    sky = lerpColor(night, dawn, (t - 0.5) / 0.25);
  } else {
    sky = lerpColor(dawn, day, (t - 0.75) / 0.25);
  }

  const [r, g, b] = sky;

  // panel sizing
  ctx.save();
  ctx.font = "16px monospace";
  const pad = 10;
  const textW = ctx.measureText(text).width;
  const boxW = textW + pad * 2 + 20;
  const boxH = 40;

  // ===========================================================
  // PANEL BACKGROUND + GLOW
  // ===========================================================
  // gradient
  const grad = ctx.createLinearGradient(x, y, x, y + boxH);
  grad.addColorStop(0, `rgba(${r|0},${g|0},${b|0},0.95)`);
  grad.addColorStop(1, `rgba(${(r*0.6)|0},${(g*0.6)|0},${(b*0.6)|0},0.9)`);

  ctx.shadowColor = `rgba(${r|0},${g|0},${b|0},0.55)`;
  ctx.shadowBlur = cyc.darkness * 20; // glows more at night

  roundRect(ctx, x, y, boxW, boxH, 9);
  ctx.fillStyle = grad;
  ctx.fill();

  // inner border
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(255,255,255,${0.10 + cyc.darkness * 0.1})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // ===========================================================
  // SUN/MOON ICON
  // ===========================================================
  const iconX = x + 6;
  const iconY = y + 8;
  const iconR = 7;

  ctx.save();
  ctx.translate(iconX + iconR, iconY + iconR);
  ctx.rotate((t * Math.PI * 2) % (Math.PI * 2)); // rotates with time
  ctx.translate(-(iconX + iconR), -(iconY + iconR));

  if (cyc.darkness > 0.4) {
    // moon
    ctx.fillStyle = "#d8e2ff";
    ctx.beginPath();
    ctx.arc(iconX + iconR, iconY + iconR, iconR, 0, Math.PI * 2);
    ctx.fill();

    // crescent cutout
    ctx.fillStyle = `rgba(${(r*0.5)|0},${(g*0.5)|0},${(b*0.5)|0},1)`;
    ctx.beginPath();
    ctx.arc(iconX + iconR + 4, iconY + iconR - 2, iconR, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // sun
    ctx.fillStyle = "#ffe48f";
    ctx.beginPath();
    ctx.arc(iconX + iconR, iconY + iconR, iconR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // ===========================================================
  // TEXT (with outline + shadow)
  // ===========================================================
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 3;

  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  ctx.fillText(text, x + pad + 20, y + boxH / 2);

  // ===========================================================
  // DAY PROGRESS BAR
  // ===========================================================
  const barW = boxW - 20;
  const barH = 4;
  const barX = x + 10;
  const barY = y + boxH - 10;

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(barX, barY, barW, barH);

  ctx.fillStyle = "#fff";
  ctx.fillRect(barX, barY, barW * t, barH);

  ctx.restore();
}
