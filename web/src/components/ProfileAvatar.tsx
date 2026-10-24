import type { PrincipalType } from '../lib/types';
import { avatarSrc } from '../lib/avatars';
import { initials, profileTone } from '../lib/profile';
import { BotIcon } from './Icons';

interface ProfileAvatarProps {
  name: string;
  type: PrincipalType;
  handle: string;
  avatar?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function ProfileAvatar({ name, type, handle, avatar, size = 'md' }: ProfileAvatarProps) {
  const tone = profileTone(handle || name);
  const src = avatarSrc(avatar);
  return (
    <span
      className={`profile-avatar profile-avatar-${size} profile-tone-${tone} ${
        type === 'agent' ? 'is-agent' : ''
      } ${src ? 'has-image' : ''}`}
      aria-hidden="true"
    >
      {src ? (
        <img src={src} alt="" />
      ) : type === 'agent' ? (
        <BotIcon size={size === 'xl' ? 38 : size === 'lg' ? 28 : 18} />
      ) : (
        initials(name)
      )}
    </span>
  );
}
