export function drawEscapeMenu(ctx, VIEW_W, VIEW_H, open, options, hoveredIndex) {
  if (!open) return;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '22px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('Paused', VIEW_W / 2, VIEW_H / 2 - 100);

  const startY = VIEW_H / 2 - 60;
  options.forEach((opt, i) => {
    const y = startY + i * 40;
    const hovered = i === hoveredIndex;
    ctx.fillStyle = hovered ? '#ffffff' : '#dddddd';
    ctx.fillText(opt.label, VIEW_W / 2, y);
    if (hovered) {
      ctx.strokeStyle = '#ffff99';
      ctx.lineWidth = 1.5;
      const tw = ctx.measureText(opt.label).width;
      ctx.strokeRect(VIEW_W / 2 - tw / 2 - 10, y - 14, tw + 20, 28);
    }
  });

  ctx.restore();
}
