export const itemsData = [
  {
    id: 'stone',
    name: 'Stone',
    src: '/items/stone.png',
    description: 'A small chunk of rock. Useful for crafting tools and building.',
  },
  {
    id: 'fish',
    name: 'Fish',
    src: '/items/fish.png',
    description: 'A fresh catch! Can be cooked or sold for gold.',
  },
  {
    id: 'carrot',
    name: 'Carrot',
    src: '/items/carrot.png',
    description: 'A crunchy orange vegetable. Restores a little stamina.',
  },
  {
    id: 'stoneAxe',
    name: 'Stone Axe',
    src: '/items/stone_axe.png',
    description: 'A basic tool for chopping wood and breaking small rocks.',
  },
];

export function generateInventorySlots(count = 27) {
  return Array.from({ length: count }, () => {
    const roll = Math.random();
    if (roll < 0.25) return { itemId: 'stone' };
    if (roll < 0.5) return { itemId: 'fish' };
    if (roll < 0.75) return { itemId: 'carrot' };
    if (roll < 0.9) return { itemId: 'stoneAxe' };
    return { itemId: null };
  });
}
