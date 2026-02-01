// stuff/npcs/npcManager.js
import { NPC } from './npc.js';
import { loadImage } from '../assets.js';

// ---------- schedule loader ----------
const _scheduleCache = new Map();
async function loadSchedule(name) {
  if (_scheduleCache.has(name)) return _scheduleCache.get(name);
  try {
    const res = await fetch(`/npcs/schedules/${name}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const sched = normalizeSchedule(raw);
    _scheduleCache.set(name, sched);
    console.log(`schedule loaded: ${name} (${sched.waypoints.length} waypoints)`);
    return sched;
  } catch (err) {
    console.warn(`[schedule] failed to load '${name}':`, err);
    _scheduleCache.set(name, null);
    return null;
  }
}
function normalizeSchedule(raw) {
  const loop = !!raw.loop;
  const speed = Number(raw.speed) || 0.4;
  const relative = !!raw.relative;
  const waypoints = Array.isArray(raw.waypoints)
    ? raw.waypoints.map(w => ({
        x: Number(w.x) || 0,
        y: Number(w.y) || 0,
        wait: Number(w.wait) || 0,
      }))
    : [];
  return { loop, speed, relative, waypoints };
}

// ---------- registry ----------
const npcs = [];

// spawn sample NPCs
export function spawnTestNPCs() {
  // const sprite = loadImage('/npc_test.png');

  npcs.push(new NPC({
    id: 'bob',
    name: 'Bob (Triangle)',
    x: 300, y: 300,
    collisionShape: 'triangle',
    dialogue: ["Hey there!", "Nice weather!"]
  }));

  npcs.push(new NPC({
    id: 'alice',
    name: 'Alice (Square)',
    x: 340, y: 300,
    collisionShape: 'square',
    dialogue: ["I'm a square NPC!"]
  }));

  npcs.push(new NPC({
    id: 'orb',
    name: 'Orb (Circle)',
    x: 380, y: 300,
    collisionShape: 'circle',
    dialogue: ["I'm a round guy."]
  }));
}

// auto-load /npcs/schedules/<id>.json for each NPC
export async function autoAttachSchedules() {
  await Promise.all(npcs.map(async npc => {
    const sched = await loadSchedule(npc.id);
    if (sched) {
      npc.setSchedule(sched);
      console.log(`📜 Schedule attached to ${npc.id}:`, sched);
    } else {
      console.warn(`⚠️ No schedule for ${npc.id}`);
    }
  }));
}


// update/draw
export function updateNPCs(dt) { for (const n of npcs) n.update(dt); }
export function drawNPCs(ctx, camX, camY, scale) { for (const n of npcs) n.draw(ctx, camX, camY, scale); }

// interaction
export function tryInteractWithNPCs(player, dialogueRef) {
  for (const npc of npcs) {
    if (npc.onRightClick(player, dialogueRef)) return true;
  }
  return false;
}
export function handleNPCRightClick(mx, my, camX, camY, scale, dialogueRef, player) {
  const worldX = camX + mx / scale;
  const worldY = camY + my / scale;
  for (const npc of npcs) {
    if (npc.containsPoint(worldX, worldY)) {
      npc.onRightClick(dialogueRef, player);
      console.log(`🗨️ Right-clicked NPC: ${npc.name}`);
      return true;
    }
  }
  return false;
}

// player ↔ NPC collisions
export function checkNPCCollisions(px, py, player) {
  const hitW = player.hitW;
  const hitH = player.hitH;
  const offY = player.hitOffsetY;

  const playerBox = {
    x: px - hitW / 2,
    y: py - hitH + offY,
    w: hitW,
    h: hitH
  };

  let result = { x: px, y: py };

  for (const npc of npcs) {
    const box = npc.collisionBox;

    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;

    // ---------- Circle NPC ----------
    if (npc.collisionShape === 'circle') {
      const dx = (playerBox.x + playerBox.w / 2) - cx;
      const dy = (playerBox.y + playerBox.h / 2) - cy;

      const dist = Math.sqrt(dx*dx + dy*dy);
      const minDist = (Math.min(hitW, hitH) / 2) + box.r;

      if (dist < minDist && dist > 0.0001) {
        const overlap = minDist - dist;
        result.x += (dx / dist) * overlap;
        result.y += (dy / dist) * overlap;
      }
    }

    // ---------- Square / Triangle NPC (AABB) ----------
    else {
      if (
        playerBox.x < box.x + box.w &&
        playerBox.x + playerBox.w > box.x &&
        playerBox.y < box.y + box.h &&
        playerBox.y + playerBox.h > box.y
      ) {
        const overlapX =
          Math.min(playerBox.x + playerBox.w, box.x + box.w) -
          Math.max(playerBox.x, box.x);

        const overlapY =
          Math.min(playerBox.y + playerBox.h, box.y + box.h) -
          Math.max(playerBox.y, box.y);

        if (overlapX < overlapY) {
          if (playerBox.x < box.x) result.x -= overlapX;
          else result.x += overlapX;
        } else {
          if (playerBox.y < box.y) result.y -= overlapY;
          else result.y += overlapY;
        }
      }
    }
  }

  return result;
}

export { npcs };

export function removeAllNPCs() {
  npcs.length = 0; // completely clear array in-place
  console.log('🧹 All NPCs removed from world.');
}