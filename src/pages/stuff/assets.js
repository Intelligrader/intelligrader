export function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

export function loadItemSprites(itemsData) {
  const map = {};
  itemsData.forEach((it) => { map[it.id] = loadImage(it.src); });
  return map;
}
