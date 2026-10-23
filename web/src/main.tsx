import { createRoot } from 'react-dom/client';
import App from './App';
import { AgentGuidePage } from './components/AgentGuide';
import { RoomLanding } from './components/RoomLanding';
import { PublicRoomsPage } from './components/PublicRooms';
import './styles.css';

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const isAgentGuide = path === '/agent-guide';
const isRoomsDirectory = path === '/room' || path === '/rooms';
const roomMatch = path.match(/^\/room\/([A-Za-z0-9]+)$/) || path.match(/^\/rooms\/([A-Za-z0-9]+)$/);

createRoot(document.getElementById('root')!).render(
  isAgentGuide ? (
    <AgentGuidePage />
  ) : isRoomsDirectory ? (
    <PublicRoomsPage />
  ) : roomMatch ? (
    <RoomLanding code={roomMatch[1]} />
  ) : (
    <App />
  ),
);

