import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceParticipant } from './types';

export type VoiceStatus = 'idle' | 'requesting' | 'joining' | 'connected' | 'error';

export interface VoiceController {
  status: VoiceStatus;
  joined: boolean;
  connecting: boolean;
  error: string | null;
  muted: boolean;
  deafened: boolean;
  selfPeerId: string | null;
  speaking: string[];
  remoteStreams: Record<string, MediaStream>;
  inputDevices: MediaDeviceInfo[];
  outputDevices: MediaDeviceInfo[];
  inputDeviceId: string;
  outputDeviceId: string;
  canSelectOutput: boolean;
  join(): void;
  leave(): void;
  toggleMute(): void;
  toggleDeafen(): void;
  selectInputDevice(deviceId: string): void;
  selectOutputDevice(deviceId: string): void;
  clearError(): void;
}

interface UseRoomVoiceOptions {
  socket: WebSocket | null;
  roomId: string;
  participants: VoiceParticipant[];
}

interface PeerRecord {
  pc: RTCPeerConnection;
  remoteStream: MediaStream;
  hasRemoteDescription: boolean;
  pendingCandidates: RTCIceCandidateInit[];
}

const MAX_PENDING_CANDIDATES = 120;

const iceServers: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
];
const turnUrl = import.meta.env.VITE_TURN_URL;
if (turnUrl) {
  iceServers.push({
    urls: turnUrl,
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  });
}

function audioConstraints(deviceId?: string): MediaTrackConstraints {
  const constraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  if (deviceId) constraints.deviceId = { exact: deviceId };
  return constraints;
}

function newPeerId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `peer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function micErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Microphone access was blocked. Allow it in your browser settings and try again.';
    }
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return 'No usable microphone was found. Connect one and try again.';
    }
    if (error.name === 'NotReadableError') {
      return 'Your microphone is busy in another app. Close it and try again.';
    }
  }
  return 'Could not start your microphone. Check your browser permissions and try again.';
}

export function useRoomVoice({ socket, roomId, participants }: UseRoomVoiceOptions): VoiceController {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [selfPeerId, setSelfPeerId] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState<string[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [inputDeviceId, setInputDeviceId] = useState('');
  const [outputDeviceId, setOutputDeviceId] = useState('');
  const [canSelectOutput] = useState(
    () => typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype,
  );

  const socketRef = useRef(socket);
  const roomIdRef = useRef(roomId);
  socketRef.current = socket;
  roomIdRef.current = roomId;

  const statusRef = useRef<VoiceStatus>('idle');
  statusRef.current = status;
  const joinedRef = useRef(false);
  const selfPeerIdRef = useRef<string | null>(null);
  const mutedRef = useRef(false);
  const deafenedRef = useRef(false);
  const mutedBeforeDeafen = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, PeerRecord>());
  const analysersRef = useRef(new Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>());
  const speakingAtRef = useRef(new Map<string, number>());
  const speakTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mountedRef = useRef(true);
  const joinAttemptRef = useRef(0);
  const inputDeviceIdRef = useRef('');
  const outputDeviceIdRef = useRef('');

  const sendSignal = useCallback((to: string, data: Record<string, unknown>) => {
    const self = selfPeerIdRef.current;
    const activeSocket = socketRef.current;
    if (!self || activeSocket?.readyState !== WebSocket.OPEN) return;
    activeSocket.send(
      JSON.stringify({
        type: 'voice.signal',
        roomId: roomIdRef.current,
        from: self,
        to,
        data,
      }),
    );
  }, []);

  const sendVoiceState = useCallback(() => {
    const self = selfPeerIdRef.current;
    const activeSocket = socketRef.current;
    if (!self || !joinedRef.current || activeSocket?.readyState !== WebSocket.OPEN) return;
    activeSocket.send(
      JSON.stringify({
        type: 'voice.update',
        roomId: roomIdRef.current,
        peerId: self,
        muted: mutedRef.current,
        deafened: deafenedRef.current,
      }),
    );
  }, []);

  const attachAnalyser = useCallback((key: string, stream: MediaStream) => {
    const context = audioContextRef.current;
    if (!context || analysersRef.current.has(key)) return;
    try {
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      analysersRef.current.set(key, { analyser, source });
    } catch {
      // analysis is optional; audio still plays
    }
  }, []);

  const detachAnalyser = useCallback((key: string) => {
    const entry = analysersRef.current.get(key);
    if (!entry) return;
    try {
      entry.source.disconnect();
    } catch {
      // already disconnected
    }
    analysersRef.current.delete(key);
    speakingAtRef.current.delete(key);
  }, []);

  const closePeer = useCallback(
    (peerId: string) => {
      const record = peersRef.current.get(peerId);
      if (!record) return;
      peersRef.current.delete(peerId);
      record.pc.onicecandidate = null;
      record.pc.ontrack = null;
      record.pc.onconnectionstatechange = null;
      try {
        record.pc.close();
      } catch {
        // already closed
      }
      detachAnalyser(peerId);
      setRemoteStreams((prev) => {
        if (!(peerId in prev)) return prev;
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    },
    [detachAnalyser],
  );

  const ensurePeer = useCallback(
    (peerId: string): PeerRecord => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers });
      const record: PeerRecord = {
        pc,
        remoteStream: new MediaStream(),
        hasRemoteDescription: false,
        pendingCandidates: [],
      };
      peersRef.current.set(peerId, record);

      const localStream = localStreamRef.current;
      if (localStream) {
        for (const track of localStream.getTracks()) pc.addTrack(track, localStream);
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) sendSignal(peerId, { candidate: event.candidate.toJSON() });
      };

      pc.ontrack = (event) => {
        const incoming = event.streams[0];
        if (incoming) {
          for (const track of incoming.getTracks()) {
            if (!record.remoteStream.getTracks().some((candidate) => candidate.id === track.id)) {
              record.remoteStream.addTrack(track);
            }
          }
        } else {
          record.remoteStream.addTrack(event.track);
        }
        setRemoteStreams((prev) => ({ ...prev, [peerId]: record.remoteStream }));
        attachAnalyser(peerId, record.remoteStream);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          try {
            pc.restartIce();
          } catch {
            // the next signal exchange can recover
          }
        }
      };

      return record;
    },
    [attachAnalyser, sendSignal],
  );

  const initiatePeer = useCallback(
    async (peerId: string) => {
      try {
        const record = ensurePeer(peerId);
        if (record.pc.signalingState !== 'stable') return;
        const offer = await record.pc.createOffer();
        await record.pc.setLocalDescription(offer);
        sendSignal(peerId, { description: record.pc.localDescription?.toJSON() ?? offer });
      } catch {
        // a failed handshake leaves the tile visible; the user can rejoin
      }
    },
    [ensurePeer, sendSignal],
  );

  const handleSignal = useCallback(
    async (from: string, data: Record<string, unknown>) => {
      if (!joinedRef.current) return;
      const description = data.description as RTCSessionDescriptionInit | undefined;
      const candidate = data.candidate as RTCIceCandidateInit | undefined;
      try {
        if (description?.type === 'offer') {
          const record = ensurePeer(from);
          await record.pc.setRemoteDescription(description);
          record.hasRemoteDescription = true;
          for (const pending of record.pendingCandidates.splice(0)) {
            await record.pc.addIceCandidate(pending).catch(() => undefined);
          }
          const answer = await record.pc.createAnswer();
          await record.pc.setLocalDescription(answer);
          sendSignal(from, { description: record.pc.localDescription?.toJSON() ?? answer });
          return;
        }

        const record = peersRef.current.get(from);
        if (!record) return;

        if (description?.type === 'answer') {
          await record.pc.setRemoteDescription(description);
          record.hasRemoteDescription = true;
          for (const pending of record.pendingCandidates.splice(0)) {
            await record.pc.addIceCandidate(pending).catch(() => undefined);
          }
          return;
        }

        if (candidate) {
          if (record.hasRemoteDescription) {
            await record.pc.addIceCandidate(candidate).catch(() => undefined);
          } else if (record.pendingCandidates.length < MAX_PENDING_CANDIDATES) {
            record.pendingCandidates.push(candidate);
          }
        }
      } catch {
        // ignore malformed or outdated signals
      }
    },
    [ensurePeer, sendSignal],
  );

  const teardownLocal = useCallback(
    (notifyServer: boolean) => {
      joinAttemptRef.current += 1;
      const activeSocket = socketRef.current;
      const peerId = selfPeerIdRef.current;
      if (notifyServer && joinedRef.current && peerId && activeSocket?.readyState === WebSocket.OPEN) {
        activeSocket.send(
          JSON.stringify({
            type: 'voice.leave',
            roomId: roomIdRef.current,
            peerId,
          }),
        );
      }

      joinedRef.current = false;
      selfPeerIdRef.current = null;
      mutedRef.current = false;
      deafenedRef.current = false;
      mutedBeforeDeafen.current = false;

      if (mountedRef.current) {
        setJoined(false);
        setSelfPeerId(null);
        setMuted(false);
        setDeafened(false);
        setStatus('idle');
        setSpeaking([]);
        setRemoteStreams({});
      }

      for (const peerIdToClose of [...peersRef.current.keys()]) closePeer(peerIdToClose);
      for (const key of [...analysersRef.current.keys()]) detachAnalyser(key);
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;

      if (speakTimerRef.current !== null) {
        window.clearInterval(speakTimerRef.current);
        speakTimerRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
      speakingAtRef.current.clear();
    },
    [closePeer, detachAnalyser],
  );

  const startSpeakingLoop = useCallback(() => {
    if (speakTimerRef.current !== null) return;
    const data = new Uint8Array(512);
    speakTimerRef.current = window.setInterval(() => {
      if (!joinedRef.current) return;
      const now = performance.now();
      const active: string[] = [];
      for (const [key, entry] of analysersRef.current) {
        if (key === 'self' && mutedRef.current) {
          speakingAtRef.current.delete(key);
          continue;
        }
        entry.analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let index = 0; index < data.length; index += 1) {
          const sample = (data[index] - 128) / 128;
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / data.length);
        if (rms > 0.05) speakingAtRef.current.set(key, now);
        if (now - (speakingAtRef.current.get(key) ?? 0) < 420) active.push(key);
        else speakingAtRef.current.delete(key);
      }
      active.sort();
      setSpeaking((prev) =>
        prev.length === active.length && prev.every((value, index) => value === active[index])
          ? prev
          : active,
      );
    }, 130);
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (!mountedRef.current) return;
      setInputDevices(devices.filter((device) => device.kind === 'audioinput'));
      setOutputDevices(devices.filter((device) => device.kind === 'audiooutput'));
    } catch {
      // device labels stay hidden until permission is granted
    }
  }, []);

  const join = useCallback(async () => {
    if (joinedRef.current || statusRef.current === 'requesting') return;
    const activeSocket = socketRef.current;
    if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
      setStatus('error');
      setError('Reconnect to the room before joining voice.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setError('Voice needs microphone access, which this browser does not support.');
      return;
    }

    const attempt = ++joinAttemptRef.current;
    setError(null);
    setStatus('requesting');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints(inputDeviceIdRef.current || undefined),
        video: false,
      });
    } catch (cause) {
      if (attempt !== joinAttemptRef.current) return;
      setStatus('error');
      setError(micErrorMessage(cause));
      return;
    }

    if (attempt !== joinAttemptRef.current || !mountedRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    localStreamRef.current = stream;
    const track = stream.getAudioTracks()[0];
    const actualDeviceId = track?.getSettings().deviceId;
    if (actualDeviceId) {
      inputDeviceIdRef.current = actualDeviceId;
      setInputDeviceId(actualDeviceId);
    }

    try {
      const context = new AudioContext();
      audioContextRef.current = context;
      await context.resume().catch(() => undefined);
      attachAnalyser('self', stream);
      startSpeakingLoop();
    } catch {
      // speaking rings are optional; audio does not depend on them
    }

    const peerId = newPeerId();
    selfPeerIdRef.current = peerId;
    setSelfPeerId(peerId);
    joinedRef.current = true;
    setJoined(true);
    mutedRef.current = false;
    setMuted(false);
    deafenedRef.current = false;
    setDeafened(false);
    setStatus('joining');

    activeSocket.send(
      JSON.stringify({
        type: 'voice.join',
        roomId: roomIdRef.current,
        peerId,
        muted: false,
        deafened: false,
      }),
    );
    void refreshDevices();
  }, [attachAnalyser, refreshDevices, startSpeakingLoop]);

  const applyMuted = useCallback(
    (next: boolean) => {
      mutedRef.current = next;
      setMuted(next);
      for (const track of localStreamRef.current?.getAudioTracks() ?? []) {
        track.enabled = !next;
      }
      sendVoiceState();
    },
    [sendVoiceState],
  );

  const toggleMute = useCallback(() => {
    if (!joinedRef.current || deafenedRef.current) return;
    applyMuted(!mutedRef.current);
  }, [applyMuted]);

  const toggleDeafen = useCallback(() => {
    if (!joinedRef.current) return;
    const next = !deafenedRef.current;
    deafenedRef.current = next;
    setDeafened(next);
    if (next) {
      mutedBeforeDeafen.current = mutedRef.current;
      if (!mutedRef.current) applyMuted(true);
      else sendVoiceState();
    } else if (mutedRef.current && !mutedBeforeDeafen.current) {
      applyMuted(false);
    } else {
      sendVoiceState();
    }
  }, [applyMuted, sendVoiceState]);

  const selectInputDevice = useCallback(
    async (deviceId: string) => {
      if (!joinedRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints(deviceId || undefined),
          video: false,
        });
        if (!joinedRef.current || !mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const track = stream.getAudioTracks()[0];
        if (track) track.enabled = !mutedRef.current;
        const previous = localStreamRef.current;
        localStreamRef.current = stream;
        previous?.getTracks().forEach((oldTrack) => oldTrack.stop());

        for (const record of peersRef.current.values()) {
          const sender =
            record.pc.getSenders().find((candidate) => candidate.track?.kind === 'audio') ??
            record.pc.getSenders().find((candidate) => !candidate.track);
          if (sender && track) await sender.replaceTrack(track).catch(() => undefined);
        }

        detachAnalyser('self');
        attachAnalyser('self', stream);
        inputDeviceIdRef.current = track?.getSettings().deviceId ?? deviceId;
        setInputDeviceId(inputDeviceIdRef.current);
        setError(null);
        await refreshDevices();
      } catch (cause) {
        setError(micErrorMessage(cause));
      }
    },
    [attachAnalyser, detachAnalyser, refreshDevices],
  );

  const selectOutputDevice = useCallback((deviceId: string) => {
    outputDeviceIdRef.current = deviceId;
    setOutputDeviceId(deviceId);
  }, []);

  const leave = useCallback(() => {
    teardownLocal(true);
    setError(null);
  }, [teardownLocal]);

  const clearError = useCallback(() => {
    setError(null);
    setStatus((prev) => (prev === 'error' ? 'idle' : prev));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      teardownLocal(true);
    };
  }, [teardownLocal]);

  const previousSocketRef = useRef<WebSocket | null>(socket);
  useEffect(() => {
    const previous = previousSocketRef.current;
    previousSocketRef.current = socket;
    if (!socket && previous && joinedRef.current) {
      teardownLocal(false);
      setStatus('error');
      setError('Voice disconnected. Rejoin when you are back online.');
    }
  }, [socket, teardownLocal]);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (event: MessageEvent) => {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(String(event.data)) as Record<string, unknown>;
      } catch {
        return;
      }
      if (typeof payload.type !== 'string' || !payload.type.startsWith('voice.')) return;
      if (payload.roomId && payload.roomId !== roomIdRef.current) return;

      if (payload.type === 'voice.joined') {
        setStatus('connected');
        const existing = Array.isArray(payload.participants)
          ? (payload.participants as VoiceParticipant[])
          : [];
        for (const participant of existing) {
          if (participant.peerId !== selfPeerIdRef.current) void initiatePeer(participant.peerId);
        }
        return;
      }

      if (payload.type === 'voice.signal') {
        const from = String(payload.from ?? '');
        const data = payload.data;
        if (from && data && typeof data === 'object') {
          void handleSignal(from, data as Record<string, unknown>);
        }
        return;
      }

      if (payload.type === 'voice.replaced' || payload.type === 'voice.error') {
        teardownLocal(false);
        setStatus('error');
        setError(String(payload.message ?? 'Voice ended unexpectedly.'));
      }
    };
    socket.addEventListener('message', onMessage);
    return () => socket.removeEventListener('message', onMessage);
  }, [socket, handleSignal, initiatePeer, teardownLocal]);

  useEffect(() => {
    if (!joinedRef.current) return;
    const present = new Set(participants.map((participant) => participant.peerId));
    for (const peerId of [...peersRef.current.keys()]) {
      if (!present.has(peerId)) closePeer(peerId);
    }
  }, [participants, closePeer]);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) return;
    const onChange = () => void refreshDevices();
    mediaDevices.addEventListener('devicechange', onChange);
    return () => mediaDevices.removeEventListener('devicechange', onChange);
  }, [refreshDevices]);

  useEffect(() => {
    if (!joined) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        if (!deafenedRef.current) applyMuted(!mutedRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [joined, applyMuted]);

  return {
    status,
    joined,
    connecting: status === 'requesting' || status === 'joining',
    error,
    muted,
    deafened,
    selfPeerId,
    speaking,
    remoteStreams,
    inputDevices,
    outputDevices,
    inputDeviceId,
    outputDeviceId,
    canSelectOutput,
    join: () => void join(),
    leave,
    toggleMute,
    toggleDeafen,
    selectInputDevice: (deviceId) => void selectInputDevice(deviceId),
    selectOutputDevice,
    clearError,
  };
}
