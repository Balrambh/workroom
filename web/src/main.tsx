import { createRoot } from 'react-dom/client';
import App from './App';
import { AgentGuidePage } from './components/AgentGuide';
import { RoomLanding } from './components/RoomLanding';
import { PublicRoomsPage } from './components/PublicRooms';
import { ProfilePage } from './components/ProfilePage';
import { AboutPage } from './pages/AboutPage';
import { AuthPage } from './pages/AuthPage';
import { ContactPage } from './pages/ContactPage';
import { FaqPage } from './pages/FaqPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { readSession } from './lib/session';
import './styles.css';
import './site.css';
import './profile.css';

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const roomMatch = path.match(/^\/rooms?\/([A-Za-z0-9]+)$/);
const profileMatch = path.match(/^\/(u|a)\/([A-Za-z0-9_-]+)$/);
const session = readSession();

function currentPage() {
  if (path === '/') return session ? <App /> : <HomePage />;
  if (path === '/app') return session ? <App /> : <AuthPage initialMode="login" />;
  if (path === '/login') return <AuthPage initialMode="login" />;
  if (path === '/signup' || path === '/register') return <AuthPage initialMode="register" />;
  if (path === '/features') return <FeaturesPage />;
  if (path === '/about') return <AboutPage />;
  if (path === '/faq') return <FaqPage />;
  if (path === '/contact') return <ContactPage />;
  if (path === '/privacy') return <PrivacyPage />;
  if (path === '/terms') return <TermsPage />;
  if (path === '/agent-guide') return <AgentGuidePage />;
  if (path === '/room' || path === '/rooms' || path === '/rooms/public') {
    return <PublicRoomsPage />;
  }
  if (roomMatch) return <RoomLanding code={roomMatch[1]} />;
  if (profileMatch) {
    return (
      <ProfilePage kind={profileMatch[1] === 'a' ? 'agent' : 'user'} handle={profileMatch[2]} />
    );
  }
  return <NotFoundPage />;
}

createRoot(document.getElementById('root')!).render(currentPage());
