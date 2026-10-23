import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, api, setAuthToken } from './lib/api';
import { clearSession, readSession, saveSession } from './lib/session';
import type {
  Activity,
  CreateAgentResult,
  Member,
  Message,
  MessageKind,
  JoinRequest,
  PresenceEntry,
  PresenceStatus,
  Role,
  RoomActions,
  RoomMode,
  RoomState,
  RoomSummary,
  Session,
  Task,
  TaskInput,
  TaskPatch,
} from './lib/types';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { RoomView } from './components/RoomView';
import { Modal } from './components/Modal';
import { BranchIcon, HashIcon, PlusIcon } from './components/Icons';

function roomTarget(): string | null {
  const pathMatch = window.location.pathname.match(/^\/rooms?\/([A-Za-z0-9]+)/i);
  if (pathMatch && pathMatch[1].toLowerCase() !== 'public' && pathMatch[1].toLowerCase() !== 'all') {
    return pathMatch[1];
  }
  const match = window.location.hash.match(/room=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function appendById<T extends { id: string }>(items: T[], next: T): T[] {
  if (items.some((item) => item.id === next.id)) return items;
  return [...items, next];
}

interface AppProps {
  initialCode?: string;
}

export default function App({ initialCode }: AppProps = {}) {
  const [session, setSession] = useState<Session | null>(readSession);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomTopic, setRoomTopic] = useState('');
  const [roomMode, setRoomMode] = useState<RoomMode>('code');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSelected = useRef(false);
  const initialTarget = useRef<string | null>(initialCode ?? roomTarget());

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (!session) return;
    setAuthToken(session.token);
  }, [session]);

  /* Signing in from a shared room link returns the visitor to that room page. */
  useEffect(() => {
    if (!session) return;
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      window.location.assign(next);
    }
  }, [session?.token]);

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3200);
  }

  function handleAuth(next: Session) {
    setAuthToken(next.token);
    saveSession(next);
    initialSelected.current = false;
    initialTarget.current = roomTarget();
    setSession(next);
    setRooms([]);
    setRoomsLoaded(false);
    setActiveId(null);
    setRoomState(null);
  }

  function handleLogout() {
    setAuthToken('');
    clearSession();
    setSession(null);
    setRooms([]);
    setRoomsLoaded(false);
    setActiveId(null);
    setRoomState(null);
    setConnected(false);
    initialSelected.current = false;
  }

  useEffect(() => {
    if (!session) {
      setRooms([]);
      setRoomsLoaded(false);
      return;
    }
    let cancelled = false;
    setRoomsLoaded(false);
    api
      .rooms()
      .then(({ rooms: list }) => {
        if (!cancelled) setRooms(list);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          handleLogout();
          showNotice('Your session expired. Please sign in again.');
        } else {
          showNotice(error instanceof Error ? error.message : 'Could not load rooms');
        }
      })
      .finally(() => {
        if (!cancelled) setRoomsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  useEffect(() => {
    if (!session || !roomsLoaded) return;
    if (rooms.length === 0 || initialSelected.current) return;
    initialSelected.current = true;
    const preferred = initialTarget.current;
    if (preferred) {
      const match = rooms.find(
        (room) =>
          (room.code && room.code.toLowerCase() === preferred.toLowerCase()) ||
          room.id === preferred,
      );
      if (match) {
        setActiveId(match.id);
        return;
      }
    }
    setActiveId(rooms[0].id);
  }, [rooms, roomsLoaded, session]);

  useEffect(() => {
    if (activeId && rooms.length > 0) {
      const activeRoom = rooms.find((room) => room.id === activeId);
      const targetUrl = activeRoom?.code ? `/room/${activeRoom.code}` : `/room/${activeId}`;
      if (window.location.pathname !== targetUrl || window.location.hash) {
        window.history.replaceState(null, '', targetUrl);
      }
    }
  }, [activeId, rooms]);

  useEffect(() => {
    const handlePopState = () => {
      const target = roomTarget();
      if (!target || !rooms.length) return;
      const match = rooms.find(
        (room) =>
          (room.code && room.code.toLowerCase() === target.toLowerCase()) ||
          room.id === target,
      );
      if (match && match.id !== activeIdRef.current) {
        setActiveId(match.id);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [rooms]);

  useEffect(() => {
    if (!session) return;

    let disposed = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const applyEvent = (payload: Record<string, any>) => {
      const active = activeIdRef.current;
      switch (payload.type) {
        case 'ready':
          break;
        case 'room.state':
          if (payload.state?.room?.id === active) {
            setRoomState(payload.state as RoomState);
            setLoadingRoom(false);
          }
          break;
        case 'message.new':
          if (payload.roomId !== active) break;
          setRoomState((prev) => {
            if (!prev || prev.room.id !== payload.roomId) return prev;
            const messages = appendById(prev.messages, payload.message as Message);
            if (messages === prev.messages) return prev;
            messages.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
            return { ...prev, messages };
          });
          break;
        case 'presence.update':
          if (payload.roomId !== active) break;
          setRoomState((prev) => (prev ? { ...prev, presence: payload.presence as PresenceEntry[] } : prev));
          break;
        case 'task.updated':
          if (payload.roomId !== active) break;
          setRoomState((prev) => {
            if (!prev) return prev;
            const task = payload.task as Task;
            const exists = prev.tasks.some((candidate) => candidate.id === task.id);
            return {
              ...prev,
              tasks: exists
                ? prev.tasks.map((candidate) => (candidate.id === task.id ? task : candidate))
                : [...prev.tasks, task],
            };
          });
          break;
        case 'tasks.replaced':
          if (payload.roomId !== active) break;
          setRoomState((prev) => (prev ? { ...prev, tasks: payload.tasks as Task[] } : prev));
          break;
        case 'members.updated':
          if (payload.roomId !== active) break;
          setRoomState((prev) => {
            if (!prev) return prev;
            const members = payload.members as Member[];
            const mine = members.find(
              (member) => member.type === prev.me.type && member.id === prev.me.id,
            );
            return {
              ...prev,
              members,
              me: mine ? { ...prev.me, role: mine.role, name: mine.name } : prev.me,
            };
          });
          break;
        case 'repos.updated':
          if (payload.roomId !== active) break;
          setRoomState((prev) => (prev ? { ...prev, repos: payload.repos } : prev));
          break;
        case 'join.requests.updated':
          if (payload.roomId !== active) break;
          setRoomState((prev) =>
            prev ? { ...prev, joinRequests: payload.requests as JoinRequest[] } : prev,
          );
          break;
        case 'activity.new':
          if (payload.roomId !== active) break;
          setRoomState((prev) => {
            if (!prev) return prev;
            const activity = payload.activity as Activity;
            if (prev.activity.some((event) => event.id === activity.id)) return prev;
            return { ...prev, activity: [activity, ...prev.activity].slice(0, 120) };
          });
          break;
        case 'removed':
          setRooms((prev) => prev.filter((room) => room.id !== payload.roomId));
          if (payload.roomId === activeIdRef.current) {
            setActiveId(null);
            setRoomState(null);
          }
          showNotice('You were removed from the room.');
          break;
        case 'error':
          showNotice(String(payload.message ?? 'Realtime error'));
          break;
        default:
          break;
      }
    };

    const openSocket = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(
        `${protocol}://${window.location.host}/ws?token=${encodeURIComponent(session.token)}`,
      );
      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
        const id = activeIdRef.current;
        if (id) socket?.send(JSON.stringify({ type: 'room.join', roomId: id }));
      };

      socket.onmessage = (event) => {
        try {
          applyEvent(JSON.parse(String(event.data)) as Record<string, any>);
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        setConnected(false);
        socketRef.current = null;
        if (!disposed) retryTimer = setTimeout(openSocket, 1600);
      };

      socket.onerror = () => {
        // close handler schedules a retry
      };
    };

    openSocket();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
      socketRef.current = null;
      setConnected(false);
    };
  }, [session?.token]);

  useEffect(() => {
    if (!session || !roomsLoaded) return;
    if (!activeId) {
      setRoomState(null);
      setLoadingRoom(false);
      return;
    }

    let cancelled = false;
    setLoadingRoom(true);

    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'room.join', roomId: activeId }));
    } else {
      api
        .room(activeId)
        .then((state) => {
          if (!cancelled) {
            setRoomState(state);
            setLoadingRoom(false);
          }
        })
        .catch((error) => {
          if (cancelled) return;
          setLoadingRoom(false);
          showNotice(error instanceof Error ? error.message : 'Could not load the room');
        });
    }

    return () => {
      cancelled = true;
      const current = socketRef.current;
      if (current && current.readyState === WebSocket.OPEN) {
        current.send(JSON.stringify({ type: 'room.leave', roomId: activeId }));
      }
    };
  }, [activeId, session?.token, roomsLoaded]);

  async function refreshIfOffline(roomId: string) {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const state = await api.room(roomId);
      setRoomState(state);
    } catch {
      // the notice from the triggering action is enough
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      showNotice(`${label} copied`);
    } catch {
      showNotice('Could not access the clipboard');
    }
  }

  const actions: RoomActions = {
    sendMessage(content: string, kind: MessageKind) {
      const roomId = activeIdRef.current;
      if (!roomId) return;
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'message.send', roomId, content, kind }));
        return;
      }
      api
        .sendMessage(roomId, content, kind)
        .then((message) => {
          setRoomState((prev) => {
            if (!prev || prev.room.id !== roomId) return prev;
            const messages = appendById(prev.messages, message);
            messages.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
            return { ...prev, messages };
          });
        })
        .catch((error) => showNotice(error instanceof Error ? error.message : 'Message failed'));
    },

    setPresence(input: {
      status?: PresenceStatus;
      activity?: string;
      taskId?: string | null;
    }) {
      const roomId = activeIdRef.current;
      if (!roomId) return;
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'presence.set', roomId, ...input }));
        return;
      }
      api
        .setPresence(roomId, input)
        .then(({ presence }) => {
          setRoomState((prev) => (prev ? { ...prev, presence } : prev));
        })
        .catch((error) => showNotice(error instanceof Error ? error.message : 'Presence failed'));
    },

    async createTask(input: TaskInput) {
      const roomId = activeIdRef.current;
      if (!roomId) return;
      await api.createTask(roomId, input);
      await refreshIfOffline(roomId);
    },

    async updateTask(taskId: string, patch: TaskPatch) {
      const roomId = activeIdRef.current;
      if (!roomId) return;
      await api.updateTask(roomId, taskId, patch);
      await refreshIfOffline(roomId);
    },

    async addRepo(input) {
      const roomId = activeIdRef.current;
      if (!roomId) return;
      await api.addRepo(roomId, input);
      await refreshIfOffline(roomId);
    },

    async deleteRepo(repoId: string) {
      const roomId = activeIdRef.current;
      if (!roomId) return;
      await api.deleteRepo(roomId, repoId);
      await refreshIfOffline(roomId);
    },

    async createAgent(input): Promise<CreateAgentResult> {
      const roomId = activeIdRef.current;
      if (!roomId) throw new Error('No room selected');
      const result = await api.createAgent(roomId, input);
      await refreshIfOffline(roomId);
      return result;
    },

    async setRole(member: Member, role: Role) {
      const roomId = activeIdRef.current;
      if (!roomId) return;
      await api.setRole(roomId, member, role);
      await refreshIfOffline(roomId);
    },

    async removeMember(member: Member) {
      const roomId = activeIdRef.current;
      if (!roomId) return;
      await api.removeMember(roomId, member);
      await refreshIfOffline(roomId);
    },

    async approveJoinRequest(requestId: string) {
      const roomId = activeIdRef.current;
      if (!roomId) return;
      await api.approveJoinRequest(roomId, requestId);
      await refreshIfOffline(roomId);
    },

    async denyJoinRequest(requestId: string) {
      const roomId = activeIdRef.current;
      if (!roomId) return;
      await api.denyJoinRequest(roomId, requestId);
      await refreshIfOffline(roomId);
    },

    copy(text: string, label: string) {
      void copy(text, label);
    },
  };

  async function submitNewRoom(event: FormEvent) {
    event.preventDefault();
    setRoomError(null);
    setCreatingRoom(true);
    try {
      const { room } = await api.createRoom({
        name: roomName.trim(),
        topic: roomTopic.trim(),
        mode: roomMode,
      });
      const { rooms: list } = await api.rooms();
      setRooms(list);
      setRoomsLoaded(true);
      initialSelected.current = true;
      setActiveId(room.id);
      setNewRoomOpen(false);
      setRoomName('');
      setRoomTopic('');
      setRoomMode('code');
      showNotice('Room created');
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Could not create the room');
    } finally {
      setCreatingRoom(false);
    }
  }

  function submitJoinRoom(event: FormEvent) {
    event.preventDefault();
    setJoinError(null);
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,16}$/.test(code)) {
      setJoinError('Enter the room code from the link an admin shared');
      return;
    }
    window.location.assign(`/room/${code}`);
  }

  if (!session) {
    return <AuthScreen onAuth={handleAuth} initialMode="login" />;
  }

  return (
    <div className="app">
      <Sidebar
        rooms={rooms}
        activeId={activeId}
        user={session.user}
        connected={connected}
        onSelect={setActiveId}
        onNewRoom={() => {
          setRoomError(null);
          setNewRoomOpen(true);
        }}
        onJoinRoom={() => {
          setJoinError(null);
          setJoinOpen(true);
        }}
        onLogout={() => {
          handleLogout();
          window.location.assign('/');
        }}
      />

      <main className="main">
        {roomState ? (
          <RoomView state={roomState} actions={actions} connected={connected} />
        ) : loadingRoom || !roomsLoaded ? (
          <div className="room-skeleton">
            <div className="skeleton-head" />
            <div className="skeleton-body">
              <div className="skeleton-chat" />
              <div className="skeleton-side" />
            </div>
          </div>
        ) : (
          <div className="empty-room">
            <div className="empty-card">
              <div className="empty-glyph">◆</div>
              <h2>{rooms.length === 0 ? 'Your first room is waiting' : 'Pick a room'}</h2>
              <p>
                {rooms.length === 0
                  ? 'Create a code room with shared repos and tasks, or start chat-only. Admins assign roles to people and agents.'
                  : 'Select a room from the sidebar to jump back into the work.'}
              </p>
              <div className="empty-actions">
                <button type="button" className="btn btn-primary" onClick={() => setNewRoomOpen(true)}>
                  <PlusIcon size={15} /> Create a room
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setJoinOpen(true)}>
                  Join with a code
                </button>
              </div>
              {rooms.length === 0 ? (
                <div className="empty-hints">
                  <div><span>1</span> Create a room and share the invite code.</div>
                  <div><span>2</span> Assign tasks to people and agents.</div>
                  <div><span>3</span> Watch progress and presence update live.</div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>

      {newRoomOpen ? (
        <Modal
          title="New room"
          subtitle="Code rooms get shared repos and task scoping. Chat rooms keep it conversational."
          onClose={() => {
            setNewRoomOpen(false);
            setRoomError(null);
          }}
        >
          <form className="stack" onSubmit={submitNewRoom}>
            <label className="field">
              <span>Room name</span>
              <input
                className="input"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="Payments squad"
                required
              />
            </label>
            <label className="field">
              <span>Topic</span>
              <input
                className="input"
                value={roomTopic}
                onChange={(event) => setRoomTopic(event.target.value)}
                placeholder="Ship the checkout rewrite"
              />
            </label>
            <div className="mode-choice">
              <label className={`mode-option ${roomMode === 'code' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="mode"
                  value="code"
                  checked={roomMode === 'code'}
                  onChange={() => setRoomMode('code')}
                />
                <BranchIcon size={18} />
                <div>
                  <strong>Code room</strong>
                  <span>Shared repos, branches, and task scopes.</span>
                </div>
              </label>
              <label className={`mode-option ${roomMode === 'chat' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="mode"
                  value="chat"
                  checked={roomMode === 'chat'}
                  onChange={() => setRoomMode('chat')}
                />
                <HashIcon size={18} />
                <div>
                  <strong>Chat room</strong>
                  <span>Discussion, roles, presence, and tasks only.</span>
                </div>
              </label>
            </div>
            {roomError ? <p className="form-error">{roomError}</p> : null}
            <button type="submit" className="btn btn-primary btn-block" disabled={creatingRoom || !roomName.trim()}>
              {creatingRoom ? 'Creating…' : 'Create room'}
            </button>
          </form>
        </Modal>
      ) : null}

      {joinOpen ? (
        <Modal
          title="Join a room"
          subtitle="Enter the code from the room link. You can preview the room, then request access."
          onClose={() => {
            setJoinOpen(false);
            setJoinError(null);
          }}
        >
          <form className="stack" onSubmit={submitJoinRoom}>
            <label className="field">
              <span>Room code</span>
              <input
                className="input invite-input"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="A7K2Q"
                maxLength={16}
                required
              />
            </label>
            {joinError ? <p className="form-error">{joinError}</p> : null}
            <button type="submit" className="btn btn-primary btn-block" disabled={joinCode.trim().length < 4}>
              Open room page
            </button>
          </form>
        </Modal>
      ) : null}

      {notice ? <div className="toast">{notice}</div> : null}
    </div>
  );
}
