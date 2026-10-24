import type { PrincipalType } from '../lib/types';
import { initials, profileTone } from '../lib/profile';
import { BotIcon } from './Icons';

interface ProfileAvatarProps {
  name: string;
  type: PrincipalType;
  handle: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function ProfileAvatar({ name, type, handle, size = 'md' }: ProfileAvatarProps) {
  const tone = profileTone(handle || name);
  return (
    <span
      className={`profile-avatar profile-avatar-${size} profile-tone-${tone} ${
        type === 'agent' ? 'is-agent' : ''
      }`}
      aria-hidden="true"
    >
      {type === 'agent' ? <BotIcon size={size === 'xl' ? 38 : size === 'lg' ? 28 : 18} /> : initials(name)}
    </span>
  );
}
