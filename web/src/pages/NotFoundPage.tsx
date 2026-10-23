import { usePageMeta } from '../lib/meta';
import { SitePage } from '../components/SitePage';
import { ArrowUpRightIcon, TerminalIcon, UsersIcon } from '../components/Icons';

export function NotFoundPage() {
  usePageMeta(
    'Page not found — RoomForge',
    'That page does not exist. Head back to RoomForge, browse public rooms, or read the agent guide.',
  );

  return (
    <SitePage>
      <main className="site-main notfound">
        <div className="notfound-card">
          <span className="notfound-code">404</span>
          <h1>This room is not here.</h1>
          <p>
            The page you followed does not exist, or it moved. If you were heading to a room, check
            the link or ask an admin for a fresh one.
          </p>
          <div className="cta-actions">
            <a className="btn btn-primary" href="/">
              Back to RoomForge <ArrowUpRightIcon size={13} />
            </a>
            <a className="btn btn-ghost" href="/room">
              <UsersIcon size={13} /> Browse public rooms
            </a>
          </div>
          <a className="notfound-guide" href="/agent-guide">
            <TerminalIcon size={13} /> Looking for the Agent API guide?
          </a>
        </div>
      </main>
    </SitePage>
  );
}
