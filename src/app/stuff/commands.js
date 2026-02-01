// stuff/commands.js
// Provides a central command runner for /setblock, /tp, /give, etc.
// Now supports ghost placement preview mode.

import { getBlock, allBlocks } from './blocks/blocks.js';
import { TILE_SIZE } from './constants.js';

/**
 * Creates a command runner that integrates with world and player state.
 * @param {object} context
 * @param {Function} context.placeBlock - Places a finalized block in the world
 * @param {object} context.player - The player object
 * @param {object} context.inventory - Player inventory
 * @param {object} context.dialogueRef - Dialogue display ref
 * @param {object} context.state - Shared state object containing `placingBlock`
 * @returns {object} command runner
 */
export function createCommandRunner({ placeBlock, player, inventory, dialogueRef, state }) {
  fromCommand: true | false

  function say(msg) {
    if (dialogueRef)
      dialogueRef.current = { text: msg, frame: 0, duration: 240 };
  }

  return {
    runCommand(raw) {
      const parts = raw.trim().split(/\s+/);
      if (!parts.length) return;

      const cmd = parts[0].replace('/', '').toLowerCase();

      // === /setblock ===
      if (cmd === 'setblock') {
        const id = parts[1];
        if (!id) return say('Usage: /setblock <blockId> [x] [y]');

        const def = allBlocks.find(b => b.id === id);
        if (!def) return say(`Unknown block: ${id}`);

        // ✅ Ghost placement preview mode
        state.placingBlock = {
        id,
        def,
        x: player.x,
        y: player.y,
        fromCommand: true,
      };
        say(`Placing ${id}... move cursor and click to confirm.`);
        return;
      }

      // === /tp ===
      if (cmd === 'tp') {
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        if (isNaN(x) || isNaN(y)) return say('Usage: /tp <x> <y>');
        player.x = x;
        player.y = y;
        say(`Teleported to ${x}, ${y}`);
        return;
      }

      // === /give ===
      if (cmd === 'give') {
        const id = parts[1];
        const count = parseInt(parts[2]) || 1;
        if (!id) return say('Usage: /give <item> [count]');
        inventory.addItem({ id, count });
        say(`Gave ${count}x ${id}`);
        return;
      }

      say(`Unknown command: ${cmd}`);
    },
  };
}
