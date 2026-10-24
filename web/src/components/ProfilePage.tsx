import { useEffect, useState } from 'react';
import { ApiError, api } from '../lib/api';
import { usePageMeta } from '../lib/meta';
import { displayWebsite, joinedLabel, profileTone, shortDate } from '../lib/profile';
import { readSession } from '../lib/session';
import type { Profile, ProfileRoom } from '../lib/types';
import { SitePage } from './SitePage';
import { LinkifyText } from './LinkifyText';
import { ProfileAvatar } from './ProfileAvatar';
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BotIcon,
  BranchIcon,
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  GlobeIcon,
  HashIcon,
  PencilIcon,
  PinIcon,
  ShieldIcon,
  SparkleIcon,
  TerminalIcon,
  UsersIcon,
} from './Icons';

interface ProfilePageProps {
  kind: 'user' | 'agent';
  handle: string;
}

function profileFallbackHeadline(profile: Profile): string {
  return profile.type === 'agent'
    ? 'An autonomous teammate forging work alongside the room.'
    : 'Building in public with humans and agents on RoomForge.';
}

function RoomCard({ room }: { room: ProfileRoom }) {
  return (
    <a className="profile-room-card" href={`/room/${room.code}`}>
      <span className={`profile-room-icon ${room.mode}`}>
        {room.mode === 'code' ? <BranchIcon size={16} /> : <HashIcon size={16} />}
      </span>
      <span className="profile-room-main">
        <strong>{room.name}</strong>
        <span>{room.topic || (room.mode === 'code' ? 'Code room' : 'Chat room')}</span>
      </span>
      <span className="profile-room-foot">
        <span>{room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}</span>
        <ArrowUpRightIcon size={13} />
      </span>
    </a>
  );
}

export function ProfilePage({ kind, handle }: ProfilePageProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const title = profile
    ? `${profile.name} (@${profile.handle}) — RoomForge`
    : kind === 'agent'
      ? 'Agent profile — RoomForge'
      : 'Member profile — RoomForge';
  usePageMeta(
    title,
    profile?.headline || `View ${profile?.name ?? 'this profile'} on RoomForge.`,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    const load = kind === 'agent' ? api.agentPublicProfile(handle) : api.userProfile(handle);
    load
      .then((result) => {
        if (!cancelled) setProfile(result.profile);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : 'Could not load this profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, handle]);

  async function copyProfileLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be blocked; the URL is still visible in the browser.
    }
  }

  if (loading) {
    return (
      <SitePage>
        <main className="site-main">
          <div className="profile-page profile-loading">
            <div className="profile-loading-bar" />
            <div className="profile-loading-hero" />
            <div className="profile-loading-grid">
              <div />
              <div />
            </div>
          </div>
        </main>
      </SitePage>
    );
  }

  if (notFound) {
    return (
      <SitePage>
        <main className="site-main">
          <div className="profile-page profile-page-center">
            <div className="profile-empty-card">
              <span className="profile-empty-glyph">◌</span>
              <span className="profile-empty-kicker">Profile not found</span>
              <h1>No one is using @{handle}.</h1>
              <p>
                The handle may have changed, or this profile has not been created yet. You can look
                for a room instead.
              </p>
              <div className="profile-empty-actions">
                <a className="btn btn-primary" href="/room">
                  Browse public rooms <ArrowUpRightIcon size={13} />
                </a>
                <a className="btn btn-ghost" href="/">
                  Go to RoomForge
                </a>
              </div>
            </div>
          </div>
        </main>
      </SitePage>
    );
  }

  if (error || !profile) {
    return (
      <SitePage>
        <main className="site-main">
          <div className="profile-page profile-page-center">
            <div className="profile-empty-card">
              <span className="profile-empty-glyph">◆</span>
              <span className="profile-empty-kicker">Connection lost</span>
              <h1>Could not load this profile.</h1>
              <p>{error ?? 'Something went wrong while loading the profile.'}</p>
              <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          </div>
        </main>
      </SitePage>
    );
  }

  const tone = profileTone(profile.handle);
  const isAgent = profile.type === 'agent';
  const user = profile.type === 'user' ? profile : null;
  const agent = profile.type === 'agent' ? profile : null;
  const website = profile.website;
  const joinDate = user ? joinedLabel(user.joinedAt) : joinedLabel(agent!.createdAt);
  const viewer = readSession();
  const canEdit = Boolean(
    profile.type === 'user' &&
      viewer?.user.handle &&
      viewer.user.handle.toLowerCase() === profile.handle.toLowerCase(),
  );

  return (
    <SitePage>
      <main className="site-main">
        <div className="profile-page">
          <div className="profile-crumb">
            <a href="/room">
              <ArrowLeftIcon size={13} /> Public rooms
            </a>
            <span>/</span>
            <span>{isAgent ? 'Agent' : 'Member'}</span>
          </div>

          <section className={`profile-hero profile-tone-bg-${tone}`}>
            <span className="profile-hero-orbit" aria-hidden="true" />
            <div className="profile-hero-top">
              <ProfileAvatar
                name={profile.name}
                type={profile.type}
                handle={profile.handle}
                avatar={profile.avatar}
                size="xl"
              />
              <div className="profile-identity">
                <div className="profile-kicker">
                  <span className={`profile-kind ${isAgent ? 'is-agent' : ''}`}>
                    {isAgent ? <BotIcon size={12} /> : <UsersIcon size={12} />}
                    {isAgent ? 'AI agent' : 'Human member'}
                  </span>
                  {agent ? (
                    <span className="profile-kind">
                      <SparkleIcon size={12} />
                      {agent.deliveryMode === 'trigger' ? 'Wakes on mention' : 'Live connection'}
                    </span>
                  ) : (
                    <span className="profile-kind">
                      <CalendarIcon size={12} /> Joined {joinDate}
                    </span>
                  )}
                </div>
                <h1>{profile.name}</h1>
                <div className="profile-handle-line">
                  <span>@{profile.handle}</span>
                  <button
                    type="button"
                    className="profile-copy-inline"
                    onClick={copyProfileLink}
                    title="Copy profile link"
                  >
                    {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                </div>
                <p className="profile-headline">
                  {profile.headline || profileFallbackHeadline(profile)}
                </p>
                <div className="profile-hero-meta">
                  {user?.location || agent?.room ? (
                    <span>
                      <PinIcon size={13} />
                      {user?.location || agent?.room?.name}
                    </span>
                  ) : null}
                  {website ? (
                    <a href={website} target="_blank" rel="noreferrer">
                      <GlobeIcon size={13} /> {displayWebsite(website)}
                    </a>
                  ) : null}
                  {agent?.owner ? (
                    <a href={agent.owner.type === 'agent' ? `/a/${agent.owner.handle}` : `/u/${agent.owner.handle}`}>
                      <BotIcon size={13} /> Built by {agent.owner.name}
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="profile-hero-actions">
                {canEdit ? (
                  <a className="btn btn-primary btn-small" href="/?editProfile=1">
                    <PencilIcon size={13} /> Edit profile
                  </a>
                ) : null}
                <button type="button" className="btn btn-ghost btn-small" onClick={copyProfileLink}>
                  {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                  {copied ? 'Copied' : 'Share profile'}
                </button>
                {agent?.room ? (
                  <a className="btn btn-primary btn-small" href={`/room/${agent.room.code}`}>
                    Open room <ArrowUpRightIcon size={13} />
                  </a>
                ) : (
                  <a className="btn btn-primary btn-small" href="/room">
                    Find a room <ArrowUpRightIcon size={13} />
                  </a>
                )}
              </div>
            </div>

            <div className="profile-stat-strip">
              {user ? (
                user.roomsHidden ? (
                  <div className="profile-stat">
                    <span>Activity</span>
                    <strong>Private</strong>
                    <small>Kept off this page</small>
                  </div>
                ) : (
                  <>
                    <div className="profile-stat">
                      <span>Shared rooms</span>
                      <strong>{user.rooms.length}</strong>
                      <small>{user.rooms.length === 1 ? 'room to drop into' : 'rooms to drop into'}</small>
                    </div>
                    <div className="profile-stat">
                      <span>Agents built</span>
                      <strong>{user.agents.length}</strong>
                      <small>autonomous teammates</small>
                    </div>
                  </>
                )
              ) : agent ? (
                <>
                  <div className="profile-stat">
                    <span>Room</span>
                    <strong>{agent.room?.name ?? 'Unassigned'}</strong>
                    <small>{agent.room ? `${agent.room.memberCount} members` : 'No active room'}</small>
                  </div>
                  <div className="profile-stat">
                    <span>Room role</span>
                    <strong className="profile-stat-capital">{agent.role}</strong>
                    <small>{agent.deliveryMode === 'trigger' ? 'Trigger delivery' : 'Socket delivery'}</small>
                  </div>
                </>
              ) : null}
              <div className="profile-stat">
                <span>{isAgent ? 'Created' : 'Member since'}</span>
                <strong>{joinDate}</strong>
                <small>{isAgent ? 'Forged on RoomForge' : 'Part of the forge'}</small>
              </div>
            </div>
          </section>

          <div className="profile-layout">
            <div className="profile-primary">
              <section className="profile-card profile-about-card">
                <div className="profile-section-head">
                  <span>About</span>
                  <h2>{isAgent ? 'What this agent does' : `Meet ${profile.name.split(/\s+/)[0]}`}</h2>
                </div>
                <p className={profile.bio ? 'profile-bio' : 'profile-bio is-empty'}>
                  {profile.bio ? (
                    <LinkifyText text={profile.bio} />
                  ) : isAgent ? (
                    'This agent has not added a bio yet. Open its room to see it in action.'
                  ) : (
                    'This member has not written a bio yet. Their rooms are a good place to start.'
                  )}
                </p>
                {agent ? (
                  agent.capabilities.length ? (
                    <div className="profile-capabilities-wrap">
                      <span className="section-label">Capabilities</span>
                      <div className="profile-capabilities">
                        {agent.capabilities.map((capability) => (
                          <span key={capability}>{capability}</span>
                        ))}
                      </div>
                    </div>
                  ) : null
                ) : null}
              </section>

              {user ? (
                user.roomsHidden ? (
                  <section className="profile-private-card">
                    <span className="profile-private-icon">
                      <ShieldIcon size={20} />
                    </span>
                    <div>
                      <h2>Room activity is private</h2>
                      <p>
                        {user.name} has chosen to keep their rooms and agents off this public
                        profile. You can still find their shared rooms in the{' '}
                        <a className="text-link" href="/room">
                          directory
                        </a>
                        .
                      </p>
                    </div>
                  </section>
                ) : (
                  <>
                    <section className="profile-card">
                      <div className="profile-section-head profile-section-head-row">
                        <div>
                          <span>Shared spaces</span>
                          <h2>Rooms</h2>
                        </div>
                        <span className="profile-section-count">{user.rooms.length}</span>
                      </div>
                      {user.rooms.length ? (
                        <div className="profile-room-grid">
                          {user.rooms.map((room) => (
                            <RoomCard key={room.code} room={room} />
                          ))}
                        </div>
                      ) : (
                        <p className="profile-empty-line">No public rooms yet.</p>
                      )}
                    </section>

                    {user.agents.length ? (
                      <section className="profile-card">
                        <div className="profile-section-head profile-section-head-row">
                          <div>
                            <span>Autonomous teammates</span>
                            <h2>Agents built</h2>
                          </div>
                          <span className="profile-section-count">{user.agents.length}</span>
                        </div>
                        <div className="profile-agent-grid">
                          {user.agents.map((item) => (
                            <a
                              key={item.handle}
                              className="profile-agent-link"
                              href={`/a/${encodeURIComponent(item.handle)}`}
                            >
                              <ProfileAvatar name={item.name} type="agent" handle={item.handle} avatar={item.avatar} size="sm" />
                              <span>
                                <strong>{item.name}</strong>
                                <span>{item.headline || `@${item.handle}`}</span>
                              </span>
                              <ArrowUpRightIcon size={13} />
                            </a>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </>
                )
              ) : (
                <section className="profile-card">
                  <div className="profile-section-head">
                    <span>Home base</span>
                    <h2>Working in</h2>
                  </div>
                  {agent?.room ? (
                    <RoomCard room={agent.room} />
                  ) : (
                    <p className="profile-empty-line">This agent is not attached to a room right now.</p>
                  )}
                </section>
              )}
            </div>

            <aside className="profile-side">
              <section className="profile-card profile-facts-card">
                <div className="profile-section-head">
                  <span>At a glance</span>
                  <h2>Profile details</h2>
                </div>
                <dl className="profile-facts">
                  <div>
                    <dt>{isAgent ? 'Agent' : 'Member'}</dt>
                    <dd>@{profile.handle}</dd>
                  </div>
                  <div>
                    <dt>{isAgent ? 'Created' : 'Joined'}</dt>
                    <dd>{shortDate(isAgent ? agent!.createdAt : user!.joinedAt)}</dd>
                  </div>
                  {user?.location ? (
                    <div>
                      <dt>Location</dt>
                      <dd>{user.location}</dd>
                    </div>
                  ) : null}
                  {isAgent ? (
                    <div>
                      <dt>Delivery</dt>
                      <dd>{agent!.deliveryMode === 'trigger' ? 'Wakes on mention' : 'Persistent socket'}</dd>
                    </div>
                  ) : null}
                  {website ? (
                    <div>
                      <dt>Website</dt>
                      <dd>
                        <a href={website} target="_blank" rel="noreferrer">
                          {displayWebsite(website)} <ArrowUpRightIcon size={11} />
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              {agent?.owner ? (
                <section className="profile-card profile-owner-card">
                  <span className="section-label">Forged by</span>
                  <a
                    className="profile-owner"
                    href={agent.owner.type === 'agent' ? `/a/${agent.owner.handle}` : `/u/${agent.owner.handle}`}
                  >
                    <ProfileAvatar
                      name={agent.owner.name}
                      type={agent.owner.type}
                      handle={agent.owner.handle}
                      avatar={agent.owner.avatar}
                      size="sm"
                    />
                    <span>
                      <strong>{agent.owner.name}</strong>
                      <span>@{agent.owner.handle}</span>
                    </span>
                    <ArrowUpRightIcon size={13} />
                  </a>
                </section>
              ) : null}

              <section className="profile-side-cta">
                <span className="profile-side-cta-icon">
                  {isAgent ? <TerminalIcon size={18} /> : <UsersIcon size={18} />}
                </span>
                <h2>{isAgent ? 'Bring your own agent' : 'Build in the same room'}</h2>
                <p>
                  {isAgent
                    ? 'RoomForge gives agents a room identity, live sockets, and a clear API.'
                    : 'Voice, chat, tasks, and agents — in one focused room.'}
                </p>
                <a className="btn btn-ghost btn-small" href={isAgent ? '/agent-guide' : '/room'}>
                  {isAgent ? 'Read the agent guide' : 'Explore public rooms'}
                  <ArrowUpRightIcon size={12} />
                </a>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </SitePage>
  );
}
