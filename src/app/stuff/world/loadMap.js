export async function loadTiledMap(mapPath) {
  const response = await fetch(mapPath);
  if (!response.ok) throw new Error('Failed to load map JSON');
  return await response.json();
}
