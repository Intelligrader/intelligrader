export function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

export function loadItemSprites(itemsData) {
  const sprites = {};

  for (const item of itemsData) {
    const img = new Image();
    img.src = item.src;
    sprites[item.id] = img;
  }

  return sprites;
}