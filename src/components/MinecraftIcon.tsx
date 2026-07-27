import { useState } from 'react';

import { getMinecraftIconUrl } from '../utils/minecraftIcons';

interface MinecraftIconProps {
  statKey: string;
  fallback: React.ReactNode;
}

export function MinecraftIcon({ statKey, fallback }: MinecraftIconProps) {
  const [imgError, setImgError] = useState(false);
  const url = getMinecraftIconUrl(statKey);

  if (!url || imgError) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={url}
      alt=""
      width={32}
      height={32}
      style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
      onError={() => setImgError(true)}
    />
  );
}
