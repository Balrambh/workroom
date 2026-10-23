import { usePageMeta } from '../lib/meta';
import { SitePage } from '../components/SitePage';
import { ShieldIcon } from '../components/Icons';

export function PrivacyPage() {
  usePageMeta(
    'Privacy policy — RoomForge',
    'What RoomForge stores, where room data lives, how sessions and agent tokens work, and the choices you have.',
  );

  return (
    <SitePage>
      <main className="site-main">
        <article className="legal-main">
          <span className="eyebrow">
            <ShieldIcon size={12} /> Privacy
          </span>
          <h1>Privacy policy</h1>
          <p className="legal-meta">Effective October 23, 2026</p>
          <p className="legal-intro">
            RoomForge is local-first. The server you connect to keeps room data in a SQLite database
            on its own machine. This policy explains what that data is, who can see it, and the
            controls you have. The person or team operating this instance decides where it runs and
            who has access to the machine.
          </p>

          <div className="legal-callout">
            <strong>The short version</strong>
            <p>
              Room content lives in the operator&apos;s database, not in a third-party analytics or
              realtime service. Room members and admins can see what is shared in a room. There are no
              advertising trackers. Do not put secrets or sensitive personal data into a room.
            </p>
          </div>

          <section>
            <h2>1. What RoomForge stores</h2>
            <ul>
              <li>
                <strong>Account data:</strong> your name, email address, and a bcrypt hash of your
                password. Passwords are never stored in plain text.
              </li>
              <li>
                <strong>Session data:</strong> a signed JWT that keeps you signed in for up to seven
                days. It is stored in your browser&apos;s local storage under{' '}
                <code>roomforge.session</code>.
              </li>
              <li>
                <strong>Room data:</strong> room name, topic, mode, five-character code, membership,
                roles, and pending join requests.
              </li>
              <li>
                <strong>Content:</strong> messages, tasks, repos, presence status and activity, and the
                room work log.
              </li>
              <li>
                <strong>Agent data:</strong> agent name, description, role, and a SHA-256 hash of its
                access token. The raw token is shown once when the agent is created.
              </li>
            </ul>
          </section>

          <section>
            <h2>2. What is not collected</h2>
            <p>
              The app itself does not include third-party analytics, advertising pixels, session
              recorders, or third-party fonts and scripts. It does not ask for a phone number,
              contacts, precise location, or payment details.
            </p>
            <p>
              The operator of an instance may add logging, backups, a reverse proxy, or other
              infrastructure around it. Those choices are outside the app and are governed by the
              operator&apos;s own policies.
            </p>
          </section>

          <section>
            <h2>3. Cookies and local storage</h2>
            <p>
              RoomForge does not set tracking cookies. It uses browser local storage for one purpose:
              keeping your session token after you sign in. Clearing site data or signing out removes
              it.
            </p>
          </section>

          <section>
            <h2>4. Who can see your data</h2>
            <ul>
              <li>Room members can read messages, tasks, repos, and presence for rooms they belong to.</li>
              <li>Room admins can see membership, pending join requests, and all room content, and can change roles or remove members.</li>
              <li>
                Anyone with a room link can see a preview: room name, topic, mode, code, and member
                names and roles. Messages require membership.
              </li>
              <li>The operator of the instance can access the database and backups on the server.</li>
              <li>Agents see the room content their token grants access to. Removing an agent revokes its token.</li>
            </ul>
          </section>

          <section>
            <h2>5. Retention and deletion</h2>
            <p>
              Room data remains in the database until it is deleted by the operator. There is no
              in-app account deletion flow yet; an operator can remove records directly from SQLite.
              Removing an agent revokes its token immediately. To reset an instance entirely, stop the
              server and delete <code>server/data/roomforge.db</code> and its WAL files.
            </p>
          </section>

          <section>
            <h2>6. Security</h2>
            <p>
              Passwords are hashed with bcrypt and agent tokens are stored as SHA-256 hashes. Access is
              enforced per room and per role. No system is perfectly secure: run the app behind HTTPS,
              set a strong <code>JWT_SECRET</code>, restrict access to the database, and treat agent
              tokens like passwords.
            </p>
          </section>

          <section>
            <h2>7. Children</h2>
            <p>
              RoomForge is not directed at children under 13, and the project does not knowingly
              collect their personal information.
            </p>
          </section>

          <section>
            <h2>8. Changes to this policy</h2>
            <p>
              If the way the app handles data changes, this page will be updated and the effective
              date at the top will change. Continued use of the instance after an update means the
              revised policy applies.
            </p>
          </section>

          <section>
            <h2>9. Contact</h2>
            <p>
              Questions about privacy can go through the{' '}
              <a href="/contact">contact page</a> or the project&apos;s{' '}
              <a href="https://github.com/vipin2526/workroom/issues" target="_blank" rel="noreferrer">
                GitHub issues
              </a>
              . Do not include secrets in a public issue.
            </p>
          </section>
        </article>
      </main>
    </SitePage>
  );
}
