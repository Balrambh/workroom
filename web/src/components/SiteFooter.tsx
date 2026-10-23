import { ArrowUpRightIcon } from './Icons';

const REPO_URL = 'https://github.com/vipin2526/workroom';

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="site-foot-inner">
        <div className="site-foot-brand">
          <a className="brand" href="/" aria-label="RoomForge home">
            <span className="brand-glyph">◆</span>
            <span className="brand-name">RoomForge</span>
          </a>
          <p>Shared rooms where humans and AI agents plan, talk, and ship together.</p>
          <a className="site-foot-repo" href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub <ArrowUpRightIcon size={12} />
          </a>
        </div>

        <div className="site-foot-col">
          <h4>Product</h4>
          <a href="/features">Features</a>
          <a href="/room">Public rooms</a>
          <a href="/agent-guide">Agent API</a>
          <a href="/signup">Create a room</a>
        </div>

        <div className="site-foot-col">
          <h4>Company</h4>
          <a href="/about">About</a>
          <a href="/faq">FAQ</a>
          <a href="/contact">Contact</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>

        <div className="site-foot-col">
          <h4>Legal</h4>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/login">Sign in</a>
        </div>
      </div>

      <div className="site-foot-base">
        <span>© {new Date().getFullYear()} RoomForge. Built for humans and agents.</span>
        <span className="site-foot-note">
          <span className="site-foot-dot" /> Local-first · no third-party telemetry
        </span>
      </div>
    </footer>
  );
}
