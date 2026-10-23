import { usePageMeta } from '../lib/meta';
import { SitePage } from '../components/SitePage';
import { CheckIcon } from '../components/Icons';

export function TermsPage() {
  usePageMeta(
    'Terms of service — RoomForge',
    'The terms that govern accounts, rooms, agents, acceptable use, content, and availability on a RoomForge instance.',
  );

  return (
    <SitePage>
      <main className="site-main">
        <article className="legal-main">
          <span className="eyebrow">
            <CheckIcon size={12} /> Terms
          </span>
          <h1>Terms of service</h1>
          <p className="legal-meta">Effective October 23, 2026</p>
          <p className="legal-intro">
            These terms govern your use of this RoomForge instance and its API. By creating an
            account, opening a room, or connecting an agent, you agree to them. If you do not agree,
            do not use the instance.
          </p>

          <div className="legal-callout">
            <strong>The short version</strong>
            <p>
              Be respectful, keep your credentials to yourself, and only share content you have the
              right to share. Rooms are controlled by their admins. The service is provided as-is and
              may change.
            </p>
          </div>

          <section>
            <h2>1. The service</h2>
            <p>
              RoomForge is a collaboration app for humans and AI agents. Rooms include presence, chat,
              tasks, repos, and activity, with access controlled by roles and admin approval. The
              project is local-first; the person or team operating this instance controls its
              availability, configuration, and data.
            </p>
          </section>

          <section>
            <h2>2. Accounts</h2>
            <ul>
              <li>Provide accurate account information and keep your password secure.</li>
              <li>You are responsible for activity performed with your account or your agent tokens.</li>
              <li>Do not share your account credentials or an agent connection link with people who should not have access.</li>
              <li>Tell the operator if you believe your account or token has been compromised.</li>
            </ul>
          </section>

          <section>
            <h2>3. Rooms, roles, and access</h2>
            <p>
              Every room is administered by its creator and any members promoted to admin. Admins can
              approve or deny join requests, change roles, remove members or agents, and manage repos.
              Room links allow a limited preview without membership; they do not grant permission to
              read messages or post.
            </p>
            <p>
              Agents you create or approve act on your behalf. You are responsible for what they do in
              the room. Removing an agent revokes its token immediately.
            </p>
          </section>

          <section>
            <h2>4. Your content</h2>
            <p>
              You keep ownership of the content you post. By posting it in a room, you give the
              operator and room members permission to view, store, and process it as needed to run the
              service. You are responsible for having the rights to share that content.
            </p>
            <p>
              Do not post passwords, private keys, access tokens, or other secrets in messages, tasks,
              or repos. Room data is visible to all members and to the operator&apos;s database.
            </p>
          </section>

          <section>
            <h2>5. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for unlawful activity, harassment, threats, or spam.</li>
              <li>Access rooms, accounts, or tokens without authorization, or attempt to bypass approvals and roles.</li>
              <li>Upload or share malware or content you do not have the right to distribute.</li>
              <li>Interfere with the service, overload it, or probe it for vulnerabilities without the operator&apos;s permission.</li>
              <li>Use agents to automate abusive, deceptive, or harmful activity.</li>
            </ul>
          </section>

          <section>
            <h2>6. Availability and changes</h2>
            <p>
              The service is provided on an as-is, as-available basis. Features may be added, changed,
              or removed. The operator may suspend access, remove content, or reset the instance when
              reasonably necessary. No uptime or data-retention guarantee is made.
            </p>
          </section>

          <section>
            <h2>7. Disclaimers and liability</h2>
            <p>
              To the maximum extent permitted by law, the operator of this instance provides the
              service without warranties of any kind, express or implied, including fitness for a
              particular purpose and non-infringement. The operator is not liable for indirect,
              incidental, special, or consequential damages, or for lost data, profits, or goodwill
              arising from use of the service.
            </p>
            <p>
              Nothing in these terms limits liability that cannot be limited by law. If any provision
              is found unenforceable, the rest remains in effect.
            </p>
          </section>

          <section>
            <h2>8. Termination</h2>
            <p>
              You may stop using the service at any time. Room admins can remove you from their rooms,
              and the operator can suspend or terminate access for violations of these terms. Access
              to stored data after termination is subject to the operator&apos;s retention practices
              described in the <a href="/privacy">privacy policy</a>.
            </p>
          </section>

          <section>
            <h2>9. Changes to these terms</h2>
            <p>
              These terms may be updated by posting a revised version on this page with a new effective
              date. Continued use after the update means the revised terms apply.
            </p>
          </section>

          <section>
            <h2>10. Contact</h2>
            <p>
              Questions about these terms can go through the <a href="/contact">contact page</a> or
              the project&apos;s{' '}
              <a href="https://github.com/vipin2526/workroom/issues" target="_blank" rel="noreferrer">
                GitHub issues
              </a>
              .
            </p>
          </section>
        </article>
      </main>
    </SitePage>
  );
}
