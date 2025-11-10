// stuff/dayNight.js
// Fully self-contained day/night cycle for Canvas 2D (no window refs in module).

// Small helpers
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function mix(a, b, t) { return a + (b - a) * t; }

/**
 * Create a day/night controller.
 * @param {object} opts
 *  - dayLengthSec: seconds per full cycle
 *  - initialTime:  0..1 (0=sunrise, .25=noon, .5=sunset, .75=midnight)
 *  - starsCount:   number of stars to render at night
 */
export function createDayNight({
  dayLengthSec = 180,
  initialTime = 0.20,
  starsCount = 220,
} = {}) {
  let t = ((initialTime % 1) + 1) % 1;     // time of day [0..1)
  let stars = [];
  let lastW = 0, lastH = 0;

  function regenStars(w, h) {
    stars = Array.from({ length: starsCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.4,
      a: 0.5 + Math.random() * 0.5,
      tw: 0.5 + Math.random() * 1.5, // twinkle speed
      ph: Math.random() * Math.PI * 2,
    }));
    lastW = w; lastH = h;
  }

  function getCycle() {
    // Noon at t=0.25, Midnight at t=0.75
    const dayLight = clamp01(0.5 * (Math.cos(2 * Math.PI * (t - 0.25)) + 1)); // 1 at noon, 0 at midnight
    const darkness = 1 - dayLight;

    // Warmth around sunrise/sunset (~0.25 width total around 0.0/0.5)
    const warmBand = 0.12;
    const dawnWarm = clamp01(1 - Math.abs(t - 0.00) / warmBand);
    const duskWarm = clamp01(1 - Math.abs(t - 0.50) / warmBand);
    const warm = Math.max(dawnWarm, duskWarm) * (0.65 + 0.35 * dayLight); // brighter when not full night

    return { t, dayLight, darkness, warm };
  }

  function update(dtSec) {
    if (!Number.isFinite(dtSec) || dtSec <= 0) dtSec = 1 / 60;
    t = (t + dtSec / dayLengthSec) % 1;
  }

  /**
   * Render all day/night effects on top of the world & entities (before HUD).
   * Pass your player & camera for night glow.
   * scene = { player, camX, camY, scale }
   */
  function render(ctx, w, h, scene) {
    if (w !== lastW || h !== lastH || stars.length === 0) regenStars(w, h);

    const { dayLight, darkness, warm } = getCycle();

    // 1) Ambient multiply (darker at night) with subtle vertical gradient
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    const topA = mix(0.10, 0.45, darkness);   // alpha scales with night
    const botA = mix(0.15, 0.60, darkness);
    g.addColorStop(0, `rgba(0, 8, 22, ${topA})`);
    g.addColorStop(1, `rgba(0, 12, 28, ${botA})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // 2) Golden hour tint near sunrise/sunset (screen blend)
    if (warm > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const gw = ctx.createLinearGradient(0, 0, 0, h);
      const topWarm = 0.35 * warm * clamp01(1 - darkness); // not too strong at night
      const botWarm = 0.15 * warm * clamp01(1 - darkness);
      gw.addColorStop(0, `rgba(255, 185, 95, ${topWarm})`);
      gw.addColorStop(1, `rgba(255, 130, 70, ${botWarm})`);
      ctx.fillStyle = gw;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // 3) Stars at night
    if (darkness > 0.25) {
      ctx.save();
      const k = (darkness - 0.25) / 0.75; // fade in stars
      ctx.globalAlpha = clamp01(k) * 0.9;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      const now = performance.now ? performance.now() / 1000 : 0;
      for (const s of stars) {
        const tw = 0.6 + 0.4 * Math.sin(now * s.tw + s.ph); // 0.2..1.0
        const a = s.a * (0.4 + 0.6 * tw);
        ctx.globalAlpha = clamp01(k) * a;
        ctx.rect(s.x, s.y, s.r, s.r);
      }
      ctx.fill();
      ctx.restore();
    }

    // 4) Player glow at night (screen/lighter)
    if (scene && scene.player && scene.scale != null) {
      const { player, camX, camY, scale } = scene;
      const px = (player.x - camX) * scale;
      const py = (player.y - camY) * scale;
      const radius = (60 + 50 * darkness) * scale;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
      const a0 = 0.65 * darkness;
      grad.addColorStop(0, `rgba(255, 245, 180, ${a0})`);
      grad.addColorStop(1, `rgba(255, 245, 180, 0)`);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grad;
      ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
      ctx.restore();
    }

    // 5) Vignette (stronger at night)
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const vg = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) / 2.2,
      w / 2, h / 2, Math.max(w, h) / 1.0
    );
    const vA = mix(0.10, 0.45, darkness);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${vA})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  return { update, render, getCycle };
}
