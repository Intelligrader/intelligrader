// stuff/npcs/schedules/scheduleLoader.js
// Loads and normalizes NPC movement schedules from /public/npcs/schedules/*.json

const _cache = new Map();

export async function loadSchedule(name) {
  if (_cache.has(name)) return _cache.get(name);
  try {
    const res = await fetch(`/npcs/schedules/${name}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const sched = normalizeSchedule(raw);
    _cache.set(name, sched);
    return sched;
  } catch (err) {
    console.warn(`[schedule] failed to load '${name}':`, err);
    _cache.set(name, null);
    return null;
  }
}

function normalizeSchedule(raw) {
  const loop = !!raw.loop;
  const speed = Number(raw.speed) || 0.4;     // world units per 60fps frame
  const relative = !!raw.relative;
  const waypoints = Array.isArray(raw.waypoints)
    ? raw.waypoints.map(w => ({
        x: Number(w.x) || 0,
        y: Number(w.y) || 0,
        wait: Number(w.wait) || 0,           // frames at 60fps; ~60 = 1 sec
      }))
    : [];
  return { loop, speed, relative, waypoints };
}
