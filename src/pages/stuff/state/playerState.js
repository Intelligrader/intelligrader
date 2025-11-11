// stuff/state/playerState.js
let player = null;

export function setPlayerRef(p) {
  player = p;
}

export function getPlayerPosition() {
  if (!player) return { x: 0, y: 0 };
  return { x: player.x, y: player.y };
}
