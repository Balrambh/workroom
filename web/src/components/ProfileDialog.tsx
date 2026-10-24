import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { AVATAR_IDS, avatarSrc, randomAvatarId } from '../lib/avatars';
import { profilePath } from '../lib/profile';
import type { Profile } from '../lib/types';
import { Modal } from './Modal';
import { ProfileAvatar } from './ProfileAvatar';
import { ArrowUpRightIcon, CheckIcon, CopyIcon, SparkleIcon } from './Icons';

interface ProfileDialogProps {
  mode: 'me' | 'agent';
  agentId?: string;
  onClose: () => void;
  onSaved: (profile: Profile) => void;
  onNotice: (message: string) => void;
}

interface Draft {
  name: string;
  handle: string;
  headline: string;
  bio: string;
  location: string;
  website: string;
  showRooms: boolean;
  capabilities: string;
  avatar: string;
}

function draftFrom(profile: Profile): Draft {
  return {
    name: profile.name,
    handle: profile.handle,
    headline: profile.headline,
    bio: profile.bio,
    location: profile.type === 'user' ? profile.location : '',
    website: profile.website,
    showRooms: profile.type === 'user' ? Boolean(profile.showRooms) : false,
    capabilities: profile.type === 'agent' ? profile.capabilities.join(', ') : '',
    avatar: profile.avatar ?? '',
  };
}

function handleIsValid(handle: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/.test(handle);
}

export function ProfileDialog({ mode, agentId, onClose, onSaved, onNotice }: ProfileDialogProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = mode === 'agent' && agentId ? api.agentProfile(agentId) : api.myProfile();
    load
      .then(({ profile: loaded }) => {
        if (cancelled) return;
        setProfile(loaded);
        setDraft(draftFrom(loaded));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, agentId, retryKey]);

  const isAgent = profile?.type === 'agent';
  const currentPublicPath = useMemo(() => {
    if (!profile) return null;
    return profilePath(profile.type, profile.handle);
  }, [profile]);

  function patchDraft(patch: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
    if (error) setError(null);
  }

  function shuffleAvatar() {
    let next = randomAvatarId();
    while (next === draft?.avatar && AVATAR_IDS.length > 1) next = randomAvatarId();
    patchDraft({ avatar: next });
  }

  async function copyPublicLink() {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${profilePath(profile.type, profile.handle)}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not access the clipboard');
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!profile || !draft) return;
    const name = draft.name.trim();
    const handle = draft.handle.trim().toLowerCase();
    if (!name) {
      setError('Add a display name');
      return;
    }
    if (!handleIsValid(handle)) {
      setError('Handles use 3–30 lowercase letters, numbers, hyphens, or underscores');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let updated: Profile;
      if (profile.type === 'user') {
        const result = await api.updateMyProfile({
          name,
          handle,
          headline: draft.headline.trim(),
          bio: draft.bio.trim(),
          location: draft.location.trim(),
          website: draft.website.trim(),
          showRooms: draft.showRooms,
          ...(draft.avatar ? { avatar: draft.avatar } : {}),
        });
        updated = result.profile;
      } else {
        const capabilities = draft.capabilities
          .split(/[\n,]+/)
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 12);
        const result = await api.updateAgentProfile(profile.id, {
          name,
          handle,
          headline: draft.headline.trim(),
          bio: draft.bio.trim(),
          website: draft.website.trim(),
          capabilities,
          ...(draft.avatar ? { avatar: draft.avatar } : {}),
        });
        updated = result.profile;
      }
      setProfile(updated);
      setDraft(draftFrom(updated));
      onSaved(updated);
      onNotice(profile.type === 'agent' ? 'Agent profile updated' : 'Profile updated');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the profile');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPasswordError(null);
    setPasswordSaved(false);
    if (!currentPassword) {
      setPasswordError('Enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
      onNotice('Password updated');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not update the password');
    } finally {
      setChangingPassword(false);
    }
  }

  const canSave =
    Boolean(draft && draft.name.trim() && handleIsValid(draft.handle.trim().toLowerCase())) && !saving;
  const canChangePassword =
    currentPassword.length > 0 && newPassword.length >= 8 && confirmPassword.length > 0;

  return (
    <Modal
      title={mode === 'agent' ? 'Agent profile' : 'Your profile'}
      subtitle={
        mode === 'agent'
          ? 'Public identity for this agent. Room admins control what appears here.'
          : 'This is how you show up on your public profile and around RoomForge.'
      }
      onClose={onClose}
      wide
    >
      {loading ? (
        <div className="profile-dialog-loading">
          <span className="profile-loading-bar" />
          <span className="profile-loading-bar short" />
          <div className="profile-dialog-loading-block" />
        </div>
      ) : error && !draft ? (
        <div className="profile-dialog-error">
          <p className="form-error">{error}</p>
          <button type="button" className="btn btn-ghost" onClick={() => setRetryKey((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : profile && draft ? (
        <form className="profile-form" onSubmit={save}>
          <div className="profile-edit-preview">
            <ProfileAvatar
              name={draft.name || profile.name}
              type={profile.type}
              handle={draft.handle || profile.handle}
              avatar={draft.avatar}
              size="lg"
            />
            <div className="profile-edit-preview-main">
              <strong>{draft.name || profile.name}</strong>
              <span>@{draft.handle || profile.handle}</span>
              <p>{draft.headline || 'No headline yet'}</p>
            </div>
            <span className={`profile-kind ${isAgent ? 'is-agent' : ''}`}>
              {isAgent ? 'Agent' : 'Human'}
            </span>
          </div>

          <div className="profile-edit-section">
            <div className="profile-avatar-section-head">
              <div>
                <span className="section-label">Profile picture</span>
                <p className="profile-field-hint">
                  Choose one of 30 RoomForge portraits. Agents get one at random when they join.
                </p>
              </div>
              <button type="button" className="btn btn-quiet btn-tiny" onClick={shuffleAvatar}>
                <SparkleIcon size={12} /> Surprise me
              </button>
            </div>
            <div className="avatar-picker" role="radiogroup" aria-label="Profile picture">
              {AVATAR_IDS.map((id, index) => {
                const selected = draft.avatar === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Profile picture ${index + 1}`}
                    className={`avatar-choice ${selected ? 'selected' : ''}`}
                    onClick={() => patchDraft({ avatar: id })}
                  >
                    <img src={avatarSrc(id) ?? ''} alt="" />
                    {selected ? (
                      <span className="avatar-choice-check" aria-hidden="true">
                        <CheckIcon size={11} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="profile-edit-section">
            <span className="section-label">Identity</span>
            <div className="profile-field-grid">
              <label className="field">
                <span>Display name</span>
                <input
                  className="input"
                  value={draft.name}
                  onChange={(event) => patchDraft({ name: event.target.value })}
                  maxLength={isAgent ? 40 : 48}
                  required
                />
              </label>
              <label className="field">
                <span>Public handle</span>
                <div className="profile-handle-field">
                  <span>{isAgent ? '/a/' : '/u/'}</span>
                  <input
                    className="input"
                    value={draft.handle}
                    onChange={(event) =>
                      patchDraft({ handle: event.target.value.toLowerCase().replace(/\s+/g, '-') })
                    }
                    maxLength={30}
                    spellCheck={false}
                    autoComplete="off"
                    required
                  />
                </div>
              </label>
            </div>
            <p className="profile-field-hint">
              Your handle is your public address. Changing it breaks links to the old one.
            </p>
          </div>

          <div className="profile-edit-section">
            <span className="section-label">About</span>
            <label className="field">
              <span>Headline</span>
              <input
                className="input"
                value={draft.headline}
                onChange={(event) => patchDraft({ headline: event.target.value })}
                placeholder={isAgent ? 'Keeps the API layer honest' : 'Product engineer · voice-first tools'}
                maxLength={isAgent ? 120 : 100}
              />
            </label>
            <label className="field">
              <span>Bio</span>
              <textarea
                className="input profile-textarea"
                value={draft.bio}
                onChange={(event) => patchDraft({ bio: event.target.value })}
                placeholder={
                  isAgent
                    ? 'What this agent is good at, how it works, and when to call on it.'
                    : 'What you build, how you work, and what you want to forge next.'
                }
                maxLength={isAgent ? 900 : 600}
                rows={4}
              />
              <span className="profile-char-count">
                {draft.bio.length}/{isAgent ? 900 : 600}
              </span>
            </label>
            <div className="profile-field-grid">
              {!isAgent ? (
                <label className="field">
                  <span>Location</span>
                  <input
                    className="input"
                    value={draft.location}
                    onChange={(event) => patchDraft({ location: event.target.value })}
                    placeholder="Bengaluru, India"
                    maxLength={80}
                  />
                </label>
              ) : (
                <label className="field">
                  <span>Capabilities</span>
                  <input
                    className="input"
                    value={draft.capabilities}
                    onChange={(event) => patchDraft({ capabilities: event.target.value })}
                    placeholder="Code review, TypeScript, CI triage"
                    maxLength={300}
                  />
                  <span className="profile-field-hint">Separate with commas, up to 12.</span>
                </label>
              )}
              <label className="field">
                <span>Website</span>
                <input
                  className="input"
                  type="url"
                  value={draft.website}
                  onChange={(event) => patchDraft({ website: event.target.value })}
                  placeholder="https://your.site"
                  maxLength={300}
                />
              </label>
            </div>
          </div>

          {!isAgent ? (
            <div className="profile-edit-section">
              <span className="section-label">Privacy</span>
              <label className="profile-toggle">
                <input
                  type="checkbox"
                  checked={draft.showRooms}
                  onChange={(event) => patchDraft({ showRooms: event.target.checked })}
                />
                <span className="profile-toggle-track" aria-hidden="true">
                  <span />
                </span>
                <span className="profile-toggle-copy">
                  <strong>Show rooms and agents on my public profile</strong>
                  <span>Your name, bio, and handle stay public either way.</span>
                </span>
              </label>
              <div className="profile-private-line">
                <span>Email</span>
                <strong>{profile.type === 'user' ? profile.email : ''}</strong>
                <em>Private</em>
              </div>
            </div>
          ) : null}

          {!isAgent ? (
            <div className="profile-edit-section">
              <span className="section-label">Password</span>
              <div className="profile-field-grid">
                <label className="field">
                  <span>Current password</span>
                  <input
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => {
                      setCurrentPassword(event.target.value);
                      setPasswordError(null);
                      setPasswordSaved(false);
                    }}
                  />
                </label>
                <label className="field">
                  <span>New password</span>
                  <input
                    className="input"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setPasswordError(null);
                      setPasswordSaved(false);
                    }}
                  />
                </label>
              </div>
              <label className="field">
                <span>Confirm new password</span>
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setPasswordError(null);
                    setPasswordSaved(false);
                  }}
                />
              </label>
              {passwordError ? <p className="form-error">{passwordError}</p> : null}
              {passwordSaved ? <p className="form-success">Password updated.</p> : null}
              <button
                type="button"
                className="btn btn-ghost btn-small"
                disabled={!canChangePassword || changingPassword}
                onClick={changePassword}
              >
                {changingPassword ? 'Updating…' : 'Update password'}
              </button>
            </div>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <div className="profile-dialog-actions">
            {currentPublicPath ? (
              <div className="profile-public-link">
                <a href={currentPublicPath} target="_blank" rel="noreferrer">
                  View public profile <ArrowUpRightIcon size={12} />
                </a>
                <button type="button" className="icon-btn" onClick={copyPublicLink} title="Copy public profile link">
                  {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                </button>
              </div>
            ) : null}
            <div className="profile-dialog-buttons">
              <button type="button" className="btn btn-quiet" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!canSave}>
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
