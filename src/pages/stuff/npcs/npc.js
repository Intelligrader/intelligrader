import { getPlayerPosition } from '../state/playerState.js';

export class NPC {
  constructor({ id, name, x, y, size = 16, sprite, dialogue = [], collisionShape = 'square' }) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.interactionRange = 60;
    this._clockMs = performance.now();
    this._pauseTimer = 0;
    this._isPaused = false;
    this.size = size;
    this.sprite = sprite;
    this.dialogue = dialogue;
    this.dialogueIndex = 0;

    this.state = 'idle';
    this._bobPhase = 0;
    this.collisionShape = collisionShape;

    // --- movement (time-driven) ---
    this.speed = 60;            // default pixels/second (nice and visible)
    this._clockMs = performance.now();

    // schedule/path state
    this._schedule = null;
    this._segments = null;      // [{ax,ay,bx,by,dur,waitSec}]
    this._segIndex = 0;
    this._segElapsed = 0;       // seconds on current segment
    this._waitLeft = 0;         // seconds to wait at segment end

    // idle wander fallback (if no schedule)
    this._wanderT = 0;
    this._wanderDur = 0;
    this._wanderDX = 0;
    this._wanderDY = 0;

    // boxes
    const half = size / 2;
    this.hitbox = { x: x - half, y: y - half, w: size, h: size, r: half };
    this.collisionBox = { x: x - half, y: y - half, w: size, h: size, r: half };
  }

  // ---------- schedule binding ----------
  setSchedule(schedule) {
    if (!schedule || !schedule.waypoints?.length) return;

    // clone so we can safely mutate for 'relative'
    const sched = JSON.parse(JSON.stringify(schedule));

    // interpret speed as pixels/second.
    // If legacy tiny values (<=5) are used (old px/frame), convert to px/s:
    const spd = Number(sched.speed);
    this.speed = isFinite(spd) ? (spd <= 5 ? spd * 60 : spd) : this.speed;

    // bind relative waypoints to current spawn
    if (sched.relative) {
      for (const wp of sched.waypoints) { wp.x += this.x; wp.y += this.y; }
      sched.relative = false;
    }

    this._schedule = sched;
    this._segments = this._buildSegmentsFromSchedule(sched, this.speed);
    this._segIndex = 0;
    this._segElapsed = 0;
    this._waitLeft = (sched.waypoints[0]?.wait || 0) / 60; // frames → seconds
  }

  _buildSegmentsFromSchedule(sched, speedPxSec) {
    const pts = sched.waypoints.slice();
    if (pts.length < 2) return [];

    const segs = [];
    const makeSeg = (a, b, waitAfterFrames) => {
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const dur = len / Math.max(1e-6, speedPxSec);   // seconds
      const waitSec = (waitAfterFrames || 0) / 60;    // frames → seconds
      return { ax: a.x, ay: a.y, bx: b.x, by: b.y, dur, waitSec };
    };

    for (let i = 0; i < pts.length - 1; i++) {
      segs.push(makeSeg(pts[i], pts[i + 1], pts[i + 1].wait));
    }
    if (sched.loop && pts.length >= 2) {
      segs.push(makeSeg(pts[pts.length - 1], pts[0], pts[0].wait));
    }
    return segs;
  }

  _advanceSegment() {
    if (!this._segments || !this._segments.length) return;
    this._segIndex = (this._segIndex + 1) % this._segments.length;
  }

  // ---------- time-driven update ----------
  update(/* deltaTimeIgnored */) {
    // internal real-time delta in seconds (independent of external dt)
    const now = performance.now();
    const dtSec = Math.max(0, (now - this._clockMs) / 1000);
    this._clockMs = now;

    // bob still updates (so they breathe), but no walking
    this._bobPhase += dtSec * 3.0;

    // 🔒 hard pause logic
    if (this._pauseTimer > 0) {
      this._pauseTimer -= dtSec;
      this._isPaused = true;
      // do NOT advance _segElapsed or anything else
      return; // full freeze — schedule time doesn't move
    }
    this._isPaused = false;


    // bob animation
    this._bobPhase += dtSec * 3.0;

    if (this._segments && this._segments.length) {
      // wait at waypoint?
      if (this._waitLeft > 0) {
        this._waitLeft -= dtSec;
        this._waitLeft = Math.max(0, this._waitLeft);
      } else {
        let seg = this._segments[this._segIndex];

        // zero-length safety: skip
        if (seg.dur <= 1e-6) {
          this.x = seg.bx; this.y = seg.by;
          this._waitLeft = seg.waitSec;
          this._advanceSegment();
          this._segElapsed = 0;
        } else {
          this._segElapsed += dtSec;
          let t = this._segElapsed / seg.dur;

          if (t >= 1) {
            // land exactly on the end
            this.x = seg.bx; this.y = seg.by;
            // enqueue wait, then next segment
            this._waitLeft = seg.waitSec;
            this._advanceSegment();
            this._segElapsed = 0;
          } else {
            // lerp along segment
            this.x = seg.ax + (seg.bx - seg.ax) * t;
            this.y = seg.ay + (seg.by - seg.ay) * t;
          }
        }
      }
    } else {
      // --- fallback: gentle idle wander if no schedule
      this._wanderT += dtSec;
      if (this._wanderT >= this._wanderDur) {
        this._wanderT = 0;
        this._wanderDur = 0.75 + Math.random() * 1.5;
        const ang = Math.random() * Math.PI * 2;
        this._wanderDX = Math.cos(ang);
        this._wanderDY = Math.sin(ang);
      }
      const step = (this.speed * 0.25) * dtSec; // slower than path speed
      this.x += this._wanderDX * step;
      this.y += this._wanderDY * step;
    }

    // refresh boxes
    const half = this.size / 2;
    this.hitbox.x = this.x - half;
    this.hitbox.y = this.y - half;
    this.collisionBox.x = this.x - half;
    this.collisionBox.y = this.y - half;
  }

  draw(ctx, camX, camY, scale) {
    const sx = Math.round((this.x - camX) * scale);
    const sy = Math.round((this.y - camY) * scale);
    const s = Math.round(this.size * scale);
    const bob = Math.sin(this._bobPhase) * 1.5;

    // shadow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(sx, sy + s / 2, s / 2, s / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // body by shape (triangle/square/circle supported)
    ctx.save();
    ctx.fillStyle = '#4af';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;

    if (this.collisionShape === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(sx, sy - s / 2 - bob);
      ctx.lineTo(sx - s / 2, sy + s / 2 - bob);
      ctx.lineTo(sx + s / 2, sy + s / 2 - bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.collisionShape === 'circle') {
      ctx.beginPath();
      ctx.arc(sx, sy - bob, s / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.rect(sx - s / 2, sy - s / 2 - bob, s, s);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // name
    ctx.font = '10px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, sx, sy - s - 4);

    if (this._schedule && this._schedule.waypoints?.length) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,0,0.3)';
      ctx.beginPath();
      for (let i = 0; i < this._schedule.waypoints.length; i++) {
        const wp = this._schedule.waypoints[i];
        const wx = (wp.x - camX) * scale;
        const wy = (wp.y - camY) * scale;
        if (i === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      if (this._schedule.loop) ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  containsPoint(x, y) {
    const b = this.hitbox;
    if (this.collisionShape === 'circle') {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      const dx = x - cx, dy = y - cy;
      return dx * dx + dy * dy <= b.r * b.r;
    }
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  onRightClick(dialogueRef) {
    // distance check
    const dx = this.x - getPlayerPosition().x;
    const dy = this.y - getPlayerPosition().y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.interactionRange) {
      dialogueRef.current = { text: `${this.name} is too far away.`, frame: 0, duration: 60 };
      return false;
    }

    // ✅ pause movement for 5 seconds
    this._pauseTimer = 5.0;

    // dialogue
    if (this.dialogue.length) {
      const text = this.dialogue[this.dialogueIndex % this.dialogue.length];
      dialogueRef.current = { text, frame: 0, duration: 180 };
      this.dialogueIndex++;
    } else {
      dialogueRef.current = { text: `Hi, I’m ${this.name}!`, frame: 0, duration: 120 };
    }

    return true;
  }
}