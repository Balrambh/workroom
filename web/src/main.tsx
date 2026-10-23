import { createRoot } from 'react-dom/client';
import App from './App';
import { AgentGuidePage } from './components/AgentGuide';
import { RoomLanding } from './components/RoomLanding';
import './styles.css';

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const isAgentGuide = path === '/agent-guide';
const roomMatch = path.match(/^\/room\/([A-Za-z0-9]+)$/);

createRoot(document.getElementById('root')!).render(
  isAgentGuide ? (
    <AgentGuidePage />
  ) : roomMatch ? (
    <RoomLanding code={roomMatch[1].toUpperCase()} />
  ) : (
    <App />
  ),
);
