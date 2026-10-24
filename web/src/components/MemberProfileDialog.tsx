import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { presenceMeta, roleMeta } from '../lib/format';
import { profilePath, shortDate } from '../lib/profile';
import type { Member, PresenceEntry, Profile } from '../lib/types';
import { Modal } from './Modal';
import { ProfileAvatar } from './ProfileAvatar';
import {
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  PencilIcon,
  ShieldIcon,
} from './Icons';

interface MemberProfileDialogProps {
  member: Member;
  presence?: PresenceEntry;
  isMe: boolean;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function MemberProfileDialog({
  member,
  presence,
  isMe,
  canEdit,
  onClose,
  onEdit,
}: MemberProfileDialogProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(member.handle));
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!member.handle) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load =
      member.type === 'agent'
        ? api.agentPublicProfile(member.handle)
        : api.userProfile(member.handle);
    load
      .then(({ profile: loaded }) => {
        if (!cancelled) setProfile(loaded);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the latest profile details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member.type, member.handle]);

  const isAgent = member.type === 'agent';
  const meta = presence ? presenceMeta[presence.status] : null;
  const publicHref = profilePath(member.type, member.handle);
  const headline =
    profile?.headline || member.headline || (isAgent ? 'Agent in this room' : 'Member of this room');
  const bio = profile?.bio || member.description || '';
  const capabilities = profile?.type === 'agent' ? profile.capabilities : [];
  const location = profile?.type === 'user' ? profile.location : '';
  const website = profile?.website ?? '';
  const rooms = profile?.type === 'user' && !profile.roomsHidden ? profile.rooms : [];
  const owner = profile?.type === 'agent' ? profile.owner : null;
  const deliveryMode = profile?.type === 'agent' ? profile.deliveryMode : null;

  async function copyLink() {
    if (!publicHref) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicHref}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Could not access the clipboard');
    }
  }

  return (
    <Modal
      title={isMe ? 'Your room profile' : isAgent ? 'Agent profile' : 'Member profile'}
      subtitle="Profiles follow people and agents across every RoomForge room."
      onClose={onClose}
      wide
    >
      <article className={`member-profile ${isAgent ? 'is-agent' : ''}`}>
        <header className="member-profile-head">
          <ProfileAvatar
            name={member.name}
            type={member.type}
            handle={member.handle ?? member.name}
            avatar={member.avatar}
            size="xl"
          />
          <div className="member-profile-id">
            <div className="member-profile-title">
              <h3>{member.name}</h3>
              {isMe ? <span className="tag tag-gray">you</span> : null}
              <span className={`tag ${isAgent ? 'tag-violet' : 'tag-blue'}`}>
                {isAgent ? 'agent' : 'human'}
              </span>
              <span className={`tag tag-${roleMeta[member.role].tone}`}>
                {roleMeta[member.role].label}
              </span>
            </div>
            <span className="member-profile-handle">
              {member.handle ? `@${member.handle}` : 'No public handle yet'}
            </span>
            <p className="member-profile-headline">{headline}</p>
            <div className="member-profile-presence">
              <span className={`presence-pill tone-${meta?.tone ?? 'gray'}`}>
                <i aria-hidden="true" />
                {meta?.label ?? 'Offline'}
              </span>
              {presence?.activity ? (
                <span className="member-profile-activity">{presence.activity}</span>
              ) : null}
            </div>
          </div>
        </header>

        {loading ? (
          <div className="member-profile-loading" aria-label="Loading profile">
            <span className="profile-loading-bar" />
            <span className="profile-loading-bar short" />
            <span className="profile-loading-bar" />
          </div>
        ) : (
          <>
            <p className={`member-profile-bio ${bio ? '' : 'muted'}`}>
              {bio ||
                (isMe
                  ? 'Add a bio so people know what you work on. Edit your profile to get started.'
                  : `${member.name} has not written a bio yet.`)}
            </p>

            <div className="member-profile-facts">
              <div>
                <span>In this room since</span>
                <strong>{shortDate(member.joinedAt)}</strong>
              </div>
              {location ? (
                <div>
                  <span>Location</span>
                  <strong>{location}</strong>
                </div>
              ) : null}
              {website ? (
                <div>
                  <span>Website</span>
                  <a href={website} target="_blank" rel="noreferrer">
                    {website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              ) : null}
              {deliveryMode ? (
                <div>
                  <span>Delivery</span>
                  <strong>{deliveryMode === 'trigger' ? 'Wakes on mention' : 'Live socket'}</strong>
                </div>
              ) : null}
              {owner ? (
                <div>
                  <span>Owner</span>
                  <a href={profilePath('user', owner.handle) ?? '#'} target="_blank" rel="noreferrer">
                    {owner.name}
                  </a>
                </div>
              ) : null}
            </div>

            {capabilities.length > 0 ? (
              <div className="member-profile-block">
                <span className="section-label">Capabilities</span>
                <div className="member-profile-chips">
                  {capabilities.map((capability) => (
                    <span className="chip" key={capability}>
                      {capability}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {rooms.length > 0 ? (
              <div className="member-profile-block">
                <span className="section-label">Rooms</span>
                <div className="member-profile-chips">
                  {rooms.slice(0, 6).map((room) => (
                    <a className="chip chip-link" href={`/room/${room.code}`} key={room.code}>
                      {room.name}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}

        {error ? <p className="member-profile-note">{error}</p> : null}

        <footer className="member-profile-actions">
          <div className="member-profile-links">
            {publicHref ? (
              <a className="btn btn-ghost btn-small" href={publicHref} target="_blank" rel="noreferrer">
                Public profile <ArrowUpRightIcon size={12} />
              </a>
            ) : null}
            {publicHref ? (
              <button type="button" className="btn btn-quiet btn-small" onClick={copyLink}>
                {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
            ) : null}
          </div>
          {canEdit ? (
            <button type="button" className="btn btn-primary btn-small" onClick={onEdit}>
              <PencilIcon size={13} /> Edit profile
            </button>
          ) : null}
        </footer>

        <p className="member-profile-foot">
          <ShieldIcon size={12} /> Your name, picture, and handle are visible to everyone in this room.
        </p>
      </article>
    </Modal>
  );
}
