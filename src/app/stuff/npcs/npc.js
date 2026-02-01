import { getPlayerPosition } from '../state/playerState.js';

export class NPC {
  constructor({ id, name, x, y, size = 16, sprite, dialogue = [], collisionShape = 'square' }) {
    Object.assign(this, {
      id, name, x, y, size, sprite, dialogue, collisionShape,
      state: 'idle', dialogueIndex: 0, interactionRange: 20,
      speed: 60, _clockMs: performance.now(),
      _pauseTimer: 0, _isPaused: false, _bobPhase: 0,
      _schedule: null, _segments: [], _segIndex: 0,
      _segElapsed: 0, _waitLeft: 0,
      _wanderT: 0, _wanderDur: 0, _wanderDX: 0, _wanderDY: 0,
    });

    const half = size / 2;
    this.hitbox = this.collisionBox = { x: x - half, y: y - half, w: size, h: size, r: half };
  }

  // ---------- Scheduling ----------
  setSchedule(schedule) {
    if (!schedule?.waypoints?.length) return;

    const sched = structuredClone(schedule);
    this.speed = Math.max(1, (sched.speed <= 5 ? sched.speed * 60 : sched.speed) || this.speed);

    if (sched.relative) {
      for (const wp of sched.waypoints) {
        wp.x += this.x;
        wp.y += this.y;
      }
    }

    this._schedule = sched;
    this._segments = this._buildSegments(sched);
    this._segIndex = 0;
    this._segElapsed = 0;
    this._waitLeft = (sched.waypoints[0]?.wait || 0) / 60;
  }

  _buildSegments({ waypoints, loop }) {
    if (waypoints.length < 2) return [];
    const segs = [];

    const mk = (a, b) => ({
      ax: a.x, ay: a.y, bx: b.x, by: b.y,
      dur: Math.hypot(b.x - a.x, b.y - a.y) / this.speed,
      waitSec: (b.wait || 0) / 60,
    });

    for (let i = 0; i < waypoints.length - 1; i++) segs.push(mk(waypoints[i], waypoints[i + 1]));
    if (loop) segs.push(mk(waypoints.at(-1), waypoints[0]));
    return segs;
  }

  _advanceSegment() {
    if (this._segments.length) this._segIndex = (this._segIndex + 1) % this._segments.length;
  }

  // ---------- Update ----------
  update() {
    const now = performance.now();
    const dt = Math.max(0, (now - this._clockMs) / 1000);
    this._clockMs = now;

    this._bobPhase += dt * 3.0;

    if (this._pauseTimer > 0) {
      this._pauseTimer -= dt;
      this._isPaused = true;
      return;
    }
    this._isPaused = false;

    if (this._segments.length) this._updateSchedule(dt);
    else this._updateWander(dt);

    const half = this.size / 2;
    this.hitbox.x = this.collisionBox.x = this.x - half;
    this.hitbox.y = this.collisionBox.y = this.y - half;
  }

  _updateSchedule(dt) {
    const segs = this._segments;
    if (!segs.length) return;

    if (this._waitLeft > 0) return (this._waitLeft = Math.max(0, this._waitLeft - dt));

    const seg = segs[this._segIndex];
    if (seg.dur <= 1e-6) {
      this.x = seg.bx; this.y = seg.by;
      this._waitLeft = seg.waitSec;
      this._advanceSegment();
      this._segElapsed = 0;
      return;
    }

    this._segElapsed += dt;
    const t = this._segElapsed / seg.dur;

    if (t >= 1) {
      this.x = seg.bx; this.y = seg.by;
      this._waitLeft = seg.waitSec;
      this._advanceSegment();
      this._segElapsed = 0;
    } else {
      this.x = seg.ax + (seg.bx - seg.ax) * t;
      this.y = seg.ay + (seg.by - seg.ay) * t;
    }
  }

  _updateWander(dt) {
    this._wanderT += dt;
    if (this._wanderT >= this._wanderDur) {
      this._wanderT = 0;
      this._wanderDur = 0.75 + Math.random() * 1.5;
      const ang = Math.random() * Math.PI * 2;
      this._wanderDX = Math.cos(ang);
      this._wanderDY = Math.sin(ang);
    }
    const step = this.speed * 0.25 * dt;
    this.x += this._wanderDX * step;
    this.y += this._wanderDY * step;
  }

  // ---------- Draw ----------
  draw(ctx, camX, camY, scale) {
    const s = Math.round(this.size * scale);
    const sx = Math.round((this.x - camX) * scale);
    const sy = Math.round((this.y - camY) * scale);
    const bob = Math.sin(this._bobPhase) * 1.5;

    // shadow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(sx, sy + s / 2, s / 2, s / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // body
    ctx.save();
    ctx.fillStyle = '#4af';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;

    const top = sy - s / 2 - bob;
    if (this.collisionShape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(sx, top);
      ctx.lineTo(sx - s / 2, sy + s / 2 - bob);
      ctx.lineTo(sx + s / 2, sy + s / 2 - bob);
      ctx.closePath();
    } else if (this.collisionShape === 'circle') {
      ctx.beginPath();
      ctx.arc(sx, sy - bob, s / 2, 0, Math.PI * 2);
    } else {
      ctx.beginPath();
      ctx.rect(sx - s / 2, top, s, s);
    }
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // name
    ctx.font = '10px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, sx, sy - s - 4);

    // path preview
    const sched = this._schedule;
    if (!sched?.waypoints?.length) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,0,0.3)';
    ctx.beginPath();
    sched.waypoints.forEach((wp, i) => {
      const wx = (wp.x - camX) * scale;
      const wy = (wp.y - camY) * scale;
      i === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
    });
    if (sched.loop) ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // ---------- Interaction ----------
  containsPoint(x, y) {
    const b = this.hitbox;
    if (this.collisionShape === 'circle') {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      return (x - cx) ** 2 + (y - cy) ** 2 <= b.r ** 2;
    }
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  onRightClick(dialogueRef) {
    const { x: px, y: py } = getPlayerPosition();
    if (Math.hypot(this.x - px, this.y - py) > this.interactionRange) return false;

    this._pauseTimer = 5.0;

    const text = this.dialogue.length
      ? this.dialogue[this.dialogueIndex++ % this.dialogue.length]
      : `Hi, I’m ${this.name}!`;

    dialogueRef.current = { text, frame: 0, duration: 180, npcX: this.x, npcY: this.y };
    return true;
  }
}
