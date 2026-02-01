// stuff/storage/saveUtils.js
// Provides save/load helpers using cookies for small game state data.

export function saveToCookies(key, data, days = 30) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    const json = encodeURIComponent(JSON.stringify(data));
    document.cookie = `${key}=${json}; expires=${expires}; path=/; SameSite=Lax`;
    console.log(`[saveUtils] Saved ${key} to cookies`);
  } catch (err) {
    console.error('Failed to save to cookies:', err);
  }
}

export function loadFromCookies(key) {
  try {
    const match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
    if (!match) return null;
    return JSON.parse(decodeURIComponent(match[2]));
  } catch (err) {
    console.error('Failed to load from cookies:', err);
    return null;
  }
}

export function deleteCookie(key) {
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function restoreFromSave(save, { player, inventory, dayNight, trees }) {
  if (!save) return false;
  try {
    if (save.player) Object.assign(player, save.player);
    if (Array.isArray(save.inventory)) {
      inventory.slots = save.inventory;
      inventory.syncHotbar(); // ✅ update hotbar after loading
    }
    if (dayNight && typeof dayNight.setTime === 'function' && save.timeOfDay != null) {
      dayNight.setTime(save.timeOfDay);
    }
    if (Array.isArray(save.trees)) {
      trees.length = 0;
      trees.push(...save.trees);
    }
    console.log('[restoreFromSave] Game restored.');
    return true;
  } catch (err) {
    console.error('Failed to restore save:', err);
    return false;
  }
}