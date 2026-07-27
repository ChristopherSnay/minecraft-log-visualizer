const ICON_TEMPLATES: Record<string, string> = {
  blocks: '/images/{id}.png',
  crafted: '/images/{id}.png',
  using: '/images/{id}.png',
  took: '/images/{id}.png',
  dropped: '/images/{id}.png',
  killed: '/images/{id}_spawn_egg.png',
  advancing: '/images/mc_trophy.png'
};

export function getMinecraftIconUrl(statKey: string): string | null {
  const colonIndex = statKey.indexOf(':');
  if (colonIndex === -1) return null;

  const prefix = statKey.slice(0, colonIndex);
  const template = ICON_TEMPLATES[prefix];
  if (!template) return null;

  const id = statKey.slice(colonIndex + 1);
  return template.replace('{id}', id);
}
