// stuff/draw/slotLayout.js
// Manual slot map for your inventory image

// SCALE these positions are inside inventory.png (native pixel coords)
export const SLOT_SCALE = 4;

// Define each slot pixel coordinate inside inventory.png
// You can tweak these easily!
export const SLOT_RECTS = [
  // === 12 columns × 4 rows (main grid) ===
  // row 0
  { x: 10.5,  y: 18 }, { x: 26.5, y: 18 }, { x: 42.5, y: 18 }, { x: 58.5, y: 18 },
  { x: 74.5, y: 18 }, { x: 90.5, y: 18 }, { x: 106.5, y: 18 }, { x: 122.5, y: 18 },
  { x: 138.5,y: 18 },

  // row 1
  { x: 10.5,  y: 34 }, { x: 26.5, y: 34 }, { x: 42.5, y: 34 }, { x: 58.5, y: 34 },
  { x: 74.5, y: 34 }, { x: 90.5, y: 34 }, { x: 106.5, y: 34 }, { x: 122.5, y: 34 },
  { x: 138.5,y: 34 },

  // row 2
  { x: 10.5,  y: 50 }, { x: 26.5, y: 50 }, { x: 42.5, y: 50 }, { x: 58.5, y: 50 },
  { x: 74.5, y: 50 }, { x: 90.5, y: 50 }, { x: 106.5, y: 50 }, { x: 122.5, y: 50 },
  { x: 138.5,y: 50 },

  // row 3
  { x: 10.5,  y: 66 }, { x: 26.5, y: 66 }, { x: 42.5, y: 66 }, { x: 58.5, y: 66 },
  { x: 74.5, y: 66 }, { x: 90.5, y: 66 }, { x: 106.5, y: 66 }, { x: 122.5, y: 66 },
  { x: 138.5,y: 66 },

  // === Hotbar row (12 slots) ===
  { x: 10.5,  y: 83 }, { x: 26.5, y: 83 }, { x: 42.5, y: 83 }, { x: 58.5, y: 83 },
  { x: 74.5, y: 83 }, { x: 90.5, y: 83 }, { x: 106.5, y: 83 }, { x: 122.5, y: 83 },
  { x: 138.5,y: 83 },
];
