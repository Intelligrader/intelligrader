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
    // t = 0 → midnight, 0.25 → 6 AM, 0.5 → noon, 0.75 → 6 PM, 1 → next midnight

    const sunrise = 0.15;  // 6 AM
    const sunset = 0.95;   // 6 PM
    let dayLight = 0;

    // Before sunrise → fully dark
    if (t < sunrise) {
      dayLight = 0;
    }
    // Between sunrise and sunset → cosine-based daylight arc
    else if (t >= sunrise && t <= sunset) {
      const mid = (sunrise + sunset) / 2; // noon
      const phase = (t - sunrise) / (sunset - sunrise); // 0→1 within daylight
      dayLight = Math.sin(phase * Math.PI); // smooth sunrise→sunset (0→1→0)
    }
    // After sunset → night
    else {
      dayLight = 0;
    }

    const darkness = 1 - dayLight;

    // Warm tint only near sunrise/sunset
    const warmBand = 0.08;
    const dawnWarm = clamp01(1 - Math.abs(t - sunrise) / warmBand);
    const duskWarm = clamp01(1 - Math.abs(t - sunset) / warmBand);
    const warm = Math.max(dawnWarm, duskWarm) * (0.6 + 0.4 * dayLight);

    return { t, dayLight, darkness, warm };
  }

  function update(dtSec) {
    if (!Number.isFinite(dtSec) || dtSec <= 0) dtSec = 1 / 60;
    t = (t + dtSec / dayLengthSec) % 1;
  }

  /**
   * Render all day/night effects on top of the world & entities (before HUD).
   * (Scene arg kept for API compatibility; not used since player glow was removed.)
   * scene = { player, camX, camY, scale }
   */
  function render(ctx, w, h, scene, lights = []) {
    if (w !== lastW || h !== lastH || stars.length === 0) regenStars(w, h);
    const { dayLight, darkness, warm } = getCycle();

    // 1️⃣ Draw ambient dark overlay
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    const topA = mix(0.05, 0.65, darkness);
    const botA = mix(0.10, 0.75, darkness);
    g.addColorStop(0, `rgba(0, 8, 22, ${topA})`);
    g.addColorStop(1, `rgba(0, 12, 28, ${botA})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // 2️⃣ Warm sunset/sunrise tint
    if (warm > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const gw = ctx.createLinearGradient(0, 0, 0, h);
      const topWarm = 0.3 * warm * clamp01(1 - darkness);
      const botWarm = 0.1 * warm * clamp01(1 - darkness);
      gw.addColorStop(0, `rgba(255, 185, 95, ${topWarm})`);
      gw.addColorStop(1, `rgba(255, 130, 70, ${botWarm})`);
      ctx.fillStyle = gw;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // 3️⃣ Stars (faint)
    if (darkness > 0.25) {
      ctx.save();
      const k = (darkness - 0.25) / 0.75;
      ctx.globalAlpha = clamp01(k) * 0.9;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      const now = performance.now() / 1000;
      for (const s of stars) {
        const tw = 0.6 + 0.4 * Math.sin(now * s.tw + s.ph);
        const a = s.a * (0.4 + 0.6 * tw);
        ctx.globalAlpha = clamp01(k) * a;
        ctx.rect(s.x, s.y, s.r, s.r);
      }
      ctx.fill();
      ctx.restore();
    }

    // 4️⃣ Light sources — from campfires or lamps
    if (darkness > 0.2 && lights?.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const light of lights) {
        const { x, y, radius = 80, intensity = 3.0 } = light;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(255, 200, 120, ${0.65 * intensity * darkness})`);
        grad.addColorStop(1, 'rgba(255, 200, 120, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      ctx.restore();
    }

    // 5️⃣ Subtle vignette
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const vg = ctx.createRadialGradient(w / 2, h / 2, w / 3, w / 2, h / 2, w);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${mix(0.1, 0.6, darkness)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function skipMinutes(minutes) {
    const delta = minutes / (24 * 60); // minutes -> day fraction
    t = (t + delta) % 1;
  }

  return { update, render, getCycle, skipMinutes };
}
