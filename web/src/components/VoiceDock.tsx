import { useEffect, useRef, useState } from 'react';
import type { RoomState, VoiceParticipant } from '../lib/types';
import type { VoiceController } from '../lib/useRoomVoice';
import { initial } from '../lib/format';
import {
  HeadphonesIcon,
  HeadphonesOffIcon,
  MicIcon,
  MicOffIcon,
  PhoneOffIcon,
  SlidersIcon,
  XIcon,
} from './Icons';

interface VoiceDockProps {
  voice: VoiceController;
  participants: VoiceParticipant[];
  me: RoomState['me'];
  connected: boolean;
}

interface RemoteAudioProps {
  stream: MediaStream;
  deafened: boolean;
  sinkId: string;
}

function RemoteAudio({ stream, deafened, sinkId }: RemoteAudioProps) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    audio.srcObject = stream;
    void audio.play().catch(() => undefined);
    return () => {
      audio.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    const audio = ref.current as
      | (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> })
      | null;
    if (!audio || !sinkId || typeof audio.setSinkId !== 'function') return;
    void audio.setSinkId(sinkId).catch(() => undefined);
  }, [sinkId]);

  return <audio ref={ref} className="voice-audio" autoPlay playsInline muted={deafened} />;
}

function deviceName(device: MediaDeviceInfo, index: number, kind: 'mic' | 'speaker'): string {
  if (device.label) return device.label;
  return kind === 'mic' ? `Microphone ${index + 1}` : `Speaker ${index + 1}`;
}

function idleDetail(
  roster: VoiceParticipant[],
  connected: boolean,
  viewer: boolean,
): string {
  if (viewer) return 'Viewers can follow chat and activity, but cannot join the call.';
  if (!connected) return 'Reconnect to the room before starting voice.';
  if (roster.length === 0) return 'Start a live call — your mic opens only after you join.';
  const names = roster.map((participant) => participant.name);
  if (names.length === 1) return `${names[0]} is in voice`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are in voice`;
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more are in voice`;
}

function VoiceTile({
  participant,
  isSelf,
  speaking,
}: {
  participant: VoiceParticipant;
  isSelf: boolean;
  speaking: boolean;
}) {
  const silenced = participant.muted || participant.deafened;
  return (
    <div
      className={`voice-tile ${speaking ? 'speaking' : ''} ${isSelf ? 'self' : ''}`}
      role="listitem"
      title={`${participant.name}${isSelf ? ' (you)' : ''}${participant.deafened ? ' · deafened' : participant.muted ? ' · muted' : ''}`}
    >
      <span className="voice-avatar">
        {initial(participant.name)}
        {silenced ? (
          <span className="voice-mute-badge" aria-hidden="true">
            {participant.deafened ? <HeadphonesOffIcon size={9} /> : <MicOffIcon size={9} />}
          </span>
        ) : null}
      </span>
      <span className="voice-tile-name">
        {participant.name}
        {isSelf ? <em>you</em> : null}
      </span>
      <span className="visually-hidden">
        {speaking ? 'Speaking, ' : ''}
        {participant.deafened ? 'deafened' : participant.muted ? 'muted' : 'connected'}
      </span>
    </div>
  );
}

export function VoiceDock({ voice, participants, me, connected }: VoiceDockProps) {
  const [devicesOpen, setDevicesOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  const roster = [...participants].sort((left, right) => left.joinedAt.localeCompare(right.joinedAt));
  const selfInRoster = roster.some((participant) => participant.peerId === voice.selfPeerId);
  const displayRoster: VoiceParticipant[] =
    voice.joined && !selfInRoster
      ? [
          {
            peerId: voice.selfPeerId ?? 'self',
            type: me.type,
            id: me.id,
            name: me.name,
            role: me.role,
            muted: voice.muted,
            deafened: voice.deafened,
            joinedAt: '0000',
          },
          ...roster,
        ]
      : roster;
  const participantCount = displayRoster.length;
  const speakingSet = new Set(voice.speaking);
  const anyoneSpeaking = voice.speaking.length > 0;
  const viewer = me.role === 'viewer';

  useEffect(() => {
    if (!voice.joined) setDevicesOpen(false);
  }, [voice.joined]);

  useEffect(() => {
    if (!devicesOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setDevicesOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDevicesOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [devicesOpen]);

  const joinDisabled = !connected || voice.connecting || viewer;
  const joinLabel = voice.connecting ? 'Connecting…' : connected ? 'Join voice' : 'Offline';

  return (
    <section className={`voice-dock ${voice.joined ? 'active' : ''}`} aria-label="Room voice">
      <div className="voice-audio-sink" aria-hidden="true">
        {Object.entries(voice.remoteStreams).map(([peerId, stream]) => (
          <RemoteAudio
            key={peerId}
            stream={stream}
            deafened={voice.deafened}
            sinkId={voice.outputDeviceId}
          />
        ))}
      </div>

      {!voice.joined ? (
        <div className="voice-idle">
          <div className="voice-idle-row">
            <span className={`voice-orb ${participantCount > 0 ? 'live' : ''}`}>
              <HeadphonesIcon size={17} />
            </span>
            <div className="voice-idle-copy">
              <span className="voice-title-line">
                <strong>Room voice</strong>
                {participantCount > 0 ? (
                  <span className="voice-count-pill">
                    <span className="voice-pulse" aria-hidden="true" />
                    {participantCount} live
                  </span>
                ) : null}
              </span>
              <span className="voice-sub">{idleDetail(roster, connected, viewer)}</span>
            </div>
            {participantCount > 0 ? (
              <div className="voice-stack" aria-hidden="true">
                {roster.slice(0, 4).map((participant) => (
                  <span
                    key={participant.peerId}
                    className={`voice-stack-avatar ${speakingSet.has(participant.peerId) ? 'speaking' : ''}`}
                  >
                    {initial(participant.name)}
                  </span>
                ))}
                {roster.length > 4 ? (
                  <span className="voice-stack-avatar more">+{roster.length - 4}</span>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              className="voice-join"
              onClick={voice.join}
              disabled={joinDisabled}
              title={viewer ? 'Viewers cannot join voice' : undefined}
            >
              <MicIcon size={14} />
              {joinLabel}
            </button>
          </div>
          {voice.error ? (
            <div className="voice-error" role="alert">
              <span>{voice.error}</span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Dismiss voice error"
                onClick={voice.clearError}
              >
                <XIcon size={13} />
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="voice-live">
          <div className="voice-live-head">
            <div className="voice-live-title">
              <span className="voice-live-pill">
                <span className="voice-pulse" aria-hidden="true" />
                Live
              </span>
              <span className="voice-meta">
                {participantCount} in voice
              </span>
              <span className="voice-signal" data-active={anyoneSpeaking} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>

            <div className="voice-controls">
              <button
                type="button"
                className={`voice-ctl ${voice.muted ? 'off' : ''}`}
                aria-label={voice.muted ? 'Unmute microphone' : 'Mute microphone'}
                aria-pressed={voice.muted}
                title={`${voice.muted ? 'Unmute' : 'Mute'} (Ctrl+Shift+M)`}
                onClick={voice.toggleMute}
              >
                {voice.muted ? <MicOffIcon size={15} /> : <MicIcon size={15} />}
              </button>
              <button
                type="button"
                className={`voice-ctl ${voice.deafened ? 'off' : ''}`}
                aria-label={voice.deafened ? 'Undeafen audio' : 'Deafen audio'}
                aria-pressed={voice.deafened}
                title={voice.deafened ? 'Undeafen' : 'Deafen'}
                onClick={voice.toggleDeafen}
              >
                {voice.deafened ? <HeadphonesOffIcon size={15} /> : <HeadphonesIcon size={15} />}
              </button>
              <div className="voice-settings-wrap" ref={settingsRef}>
                <button
                  type="button"
                  className={`voice-ctl ${devicesOpen ? 'on' : ''}`}
                  aria-label="Voice device settings"
                  aria-expanded={devicesOpen}
                  title="Microphone and speaker"
                  onClick={() => setDevicesOpen((open) => !open)}
                >
                  <SlidersIcon size={15} />
                </button>
                {devicesOpen ? (
                  <div className="voice-devices">
                    <div className="voice-devices-head">
                      <span>Voice settings</span>
                      <span className="voice-devices-note">Mesh · encrypted</span>
                    </div>
                    <label className="voice-device">
                      <span>Microphone</span>
                      <select
                        className="voice-select"
                        value={voice.inputDeviceId}
                        onChange={(event) => voice.selectInputDevice(event.target.value)}
                      >
                        <option value="">Default microphone</option>
                        {voice.inputDevices.map((device, index) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {deviceName(device, index, 'mic')}
                          </option>
                        ))}
                      </select>
                    </label>
                    {voice.canSelectOutput ? (
                      <label className="voice-device">
                        <span>Speaker</span>
                        <select
                          className="voice-select"
                          value={voice.outputDeviceId}
                          onChange={(event) => voice.selectOutputDevice(event.target.value)}
                        >
                          <option value="">System default</option>
                          {voice.outputDevices.map((device, index) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {deviceName(device, index, 'speaker')}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <p className="voice-device-note">
                        Speaker selection is available in Chrome and Edge. Audio uses your system
                        output here.
                      </p>
                    )}
                    <p className="voice-device-note">
                      Echo cancellation, noise suppression, and auto gain are on. Audio flows
                      directly between people.
                    </p>
                  </div>
                ) : null}
              </div>
              <span className="voice-ctl-sep" aria-hidden="true" />
              <button
                type="button"
                className="voice-leave"
                onClick={voice.leave}
                title="Leave voice"
              >
                <PhoneOffIcon size={14} />
                <span>Leave</span>
              </button>
            </div>
          </div>

          <div className="voice-roster" role="list" aria-label="People in voice">
            {displayRoster.map((participant) => {
              const isSelf = participant.peerId === voice.selfPeerId;
              return (
                <VoiceTile
                  key={participant.peerId}
                  participant={{
                    ...participant,
                    muted: isSelf ? voice.muted : participant.muted,
                    deafened: isSelf ? voice.deafened : participant.deafened,
                  }}
                  isSelf={isSelf}
                  speaking={speakingSet.has(isSelf ? 'self' : participant.peerId)}
                />
              );
            })}
            {displayRoster.length === 0 ? (
              <span className="voice-roster-empty">Waiting for the room…</span>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
