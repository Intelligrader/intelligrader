export const itemsData = [
  {
    id: 'stone',
    name: 'Stone',
    src: '/items/stone.png',
    description: 'A small chunk of rock. Useful for crafting tools and building.',
    maxStack: 999,
  },
  {
    id: 'fish',
    name: 'Fish',
    src: '/items/fish.png',
    description: 'A fresh catch! Can be cooked or sold for gold.',
    maxStack: 999,
  },
  {
    id: 'carrot',
    name: 'Carrot',
    src: '/items/carrot.png',
    description: 'A crunchy orange vegetable. Restores a little stamina.',
    maxStack: 999,
  },
  {
    id: 'stoneAxe',
    name: 'Stone Axe',
    src: '/items/stone_axe.png',
    description: 'A basic tool for chopping wood and breaking small rocks.',
    maxStack: 1,
  },
  {
    id: 'campfire',
    name: 'Campfire',
    src: '/blocks/campfire.png',
    description: 'Placeable campfire that lights up the night.',
    maxStack: 99,
    placeBlock: 'campfire',
    placeOnPlayer: false,
  },
  {
    id: 'fence',
    name: 'Wood Fence',
    src: '/tilesets/fence.png',
    description: 'Placeable wooden fence segment.',
    maxStack: 99,
    placeBlock: 'fence',
    placeOnPlayer: true,
  },
];

export function getItemID(slotOrId) {
  if (!slotOrId) return null;
  if (typeof slotOrId === 'string') return slotOrId;
  if (slotOrId.id) return slotOrId.id;
  if (slotOrId.itemId) return slotOrId.itemId;

  return null;
}