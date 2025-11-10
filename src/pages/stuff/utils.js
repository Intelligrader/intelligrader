export function windowToCanvas(canvas, e, VIEW_W, VIEW_H) {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (VIEW_W / rect.width);
  const my = (e.clientY - rect.top) * (VIEW_H / rect.height);
  return { mx, my };
}
