import { avatarSrc } from '../lib/avatars';
import { initial } from '../lib/format';
import type { PrincipalType } from '../lib/types';
import { BotIcon } from './Icons';

interface AvatarProps {
  name: string;
  type: PrincipalType;
  avatar?: string | null;
  iconSize?: number;
  className?: string;
}

export function Avatar({ name, type, avatar, iconSize = 15, className }: AvatarProps) {
  const src = avatarSrc(avatar);
  return (
    <span
      className={[
        'avatar',
        type === 'agent' ? 'avatar-agent' : '',
        src ? 'has-image' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      {src ? (
        <img src={src} alt="" />
      ) : type === 'agent' ? (
        <BotIcon size={iconSize} />
      ) : (
        initial(name)
      )}
    </span>
  );
}
