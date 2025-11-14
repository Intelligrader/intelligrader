// stuff/dayNight.js
// Cinematic day/night with vignette + real light holes (GIF-style).

const clamp01 = v => Math.max(0, Math.min(1, v));
const mix = (a, b, t) => a + (b - a) * t;
const easeInOut = t => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t)); // smoothstep-ish

export function createDayNight({
  dayLengthSec = 180,
  initialTime = 0.20,   // 0..1 (0 midnight, .25 dawn, .5 noon, .75 dusk)
  starsCount = 220,
} = {}) {
  let t = ((initialTime % 1) + 1) % 1;

  // offscreen darkness buffer (we draw/erase into this, then blit)
  let buf, bctx, bw = 0, bh = 0;

  // star field
  let stars = [];
  function regenStars(w, h) {
    stars = Array.from({ length: starsCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.4,
      baseA: 0.35 + Math.random() * 0.4,
      tw: 0.7 + Math.random() * 1.2,
      ph: Math.random() * Math.PI * 2,
    }));
  }

  function ensureBuffer(w, h) {
    if (!buf || bw !== w || bh !== h) {
      buf = document.createElement('canvas');
      buf.width = bw = w;
      buf.height = bh = h;
      bctx = buf.getContext('2d', { alpha: true });
      bctx.imageSmoothingEnabled = false;
      regenStars(w, h);
    }
  }

  // daylight model (nonlinear, warm at edges of day)
  function getCycle() {
    const sunrise = 0.15;  // ~5:15
    const sunset  = 0.78;  // ~18:45

    let dayLight = 0;
    if (t >= sunrise && t <= sunset) {
      // 0..1 across daytime, sine arc → power for flatter mid-day
      const p = (t - sunrise) / (sunset - sunrise);
      dayLight = Math.pow(Math.sin(p * Math.PI), 0.85);
    } else {
      dayLight = 0;
    }

    const darkness = 1 - dayLight;

    // warm band near sunrise/sunset
    const warmBand = 0.09;
    const dawnWarm = clamp01(1 - Math.abs(t - sunrise) / warmBand);
    const duskWarm = clamp01(1 - Math.abs(t - sunset) / warmBand);
    const warm = Math.max(dawnWarm, duskWarm) * (0.7 + 0.3 * dayLight);

    return { t, dayLight, darkness, warm };
  }

  // frames → time-of-day progression. We accept frames OR seconds.
  function update(dtSec = 1 / 60) {
    t = (t + dtSec / dayLengthSec) % 1;
  }

  function skipMinutes(minutes) {
    t = (t + (minutes / (24 * 60))) % 1;
  }

  /**
   * Render: draw stars, darkness + tint + vignette, then carve light holes.
   * lights = [{x,y,radius,intensity}]
   */
  function render(ctx, w, h, _scene, lights = []) {
    ensureBuffer(w, h);
    const cycle = getCycle();
    const { darkness, warm } = cycle;

    // 0) Stars (under the darkness so they dim naturally)
    if (darkness > 0.35) {
      const k = clamp01((darkness - 0.35) / 0.65); // grow in late dusk
      ctx.save();
      ctx.globalAlpha = 1 * k;
      ctx.fillStyle = '#fff';
      const now = performance.now() / 1000;
      for (const s of stars) {
        const a = s.baseA * (0.5 + 0.5 * Math.sin(now * s.tw + s.ph));
        ctx.globalAlpha = a * 0.9 * k;
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      ctx.restore();
    }

    // 1) Build darkness buffer (deep navy, multiply later)
    bctx.clearRect(0, 0, bw, bh);

    // ambient navy gradient (top a bit brighter)
    const ambTop = `rgba(20, 40, 70, ${mix(0.15, 0.75, darkness)})`;
    const ambBot = `rgba(10, 20, 45, ${mix(0.20, 0.85, darkness)})`;
    const g = bctx.createLinearGradient(0, 0, 0, bh);
    g.addColorStop(0, ambTop);
    g.addColorStop(1, ambBot);
    bctx.fillStyle = g;
    bctx.fillRect(0, 0, bw, bh);

    // warm dusk/dawn tint (screened on top of navy)
    if (warm > 0.01) {
      bctx.save();
      bctx.globalCompositeOperation = 'screen';
      const gw = bctx.createLinearGradient(0, 0, 0, bh);
      const topWarm = 0.30 * warm * (1 - darkness);
      const botWarm = 0.12 * warm * (1 - darkness);
      gw.addColorStop(0, `rgba(255,180,95,${topWarm})`);
      gw.addColorStop(1, `rgba(240,120,70,${botWarm})`);
      bctx.fillStyle = gw;
      bctx.fillRect(0, 0, bw, bh);
      bctx.restore();
    }

    // 2) Vignette that tightens by night (seeping from edges)
    // radius shrinks with darkness; softness grows slightly
    const diag = Math.hypot(bw, bh);
    const baseR = mix(diag * 0.75, diag * 0.38, easeInOut(darkness));
    const soft  = mix(diag * 0.22, diag * 0.34, darkness);
    const cx = bw * 0.5, cy = bh * 0.55; // centered slightly low (feels nicer)
    const vg = bctx.createRadialGradient(cx, cy, baseR, cx, cy, baseR + soft);
    // center: 0 dark, edge: full dark
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,1)');
    bctx.save();
    bctx.globalCompositeOperation = 'multiply';
    bctx.fillStyle = vg;
    bctx.globalAlpha = mix(0.2, 0.7, Math.pow(darkness, 0.8));
    bctx.fillRect(0, 0, bw, bh);
    bctx.restore();

    // 3) Carve light holes (remove darkness) + subtle amber halo
    bctx.save();
    bctx.globalCompositeOperation = 'destination-out';
    const now = performance.now() / 1000;
    for (const L of lights) {
      const x = L.x, y = L.y;
      const r = (L.radius || 120) * 1.3; // 🔆 slightly larger
      const intensity = L.intensity ?? 1.0;

      // soft, slow flicker
      const flickSpeed = 0.9 + (L.seed || 0) * 0.1;
      const flick = 0.96 + 0.04 * Math.sin(now * flickSpeed + (L.seed || 0));

      // smoother falloff (more gradual)
      const innerR = r * 0.25 * flick;
      const outerR = r * flick;

      const cut = bctx.createRadialGradient(x, y, innerR, x, y, outerR);
      cut.addColorStop(0, `rgba(0,0,0,${0.85 * intensity})`);
      cut.addColorStop(0.5, `rgba(0,0,0,${0.4 * intensity})`);
      cut.addColorStop(1, 'rgba(0,0,0,0)');
      bctx.fillStyle = cut;
      bctx.beginPath();
      bctx.arc(x, y, outerR, 0, Math.PI * 2);
      bctx.fill();
    }
    bctx.restore();
    
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      const x = L.x, y = L.y;
      const r = (L.radius || 120) * 1.4;
      const intensity = (L.intensity ?? 1.0) * 0.8;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, `rgba(255, 200, 120, ${0.3 * intensity})`);
      glow.addColorStop(0.4, `rgba(255, 160, 100, ${0.15 * intensity})`);
      glow.addColorStop(1, 'rgba(255, 120, 60, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();

    // 4) Composite darkness buffer over the scene
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(buf, 0, 0);
    ctx.restore();
  }

  return { update, render, getCycle, skipMinutes };
}
