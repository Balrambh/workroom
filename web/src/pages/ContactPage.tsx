import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePageMeta } from '../lib/meta';
import { SitePage } from '../components/SitePage';
import {
  ArrowUpRightIcon,
  ChatIcon,
  CheckIcon,
  TerminalIcon,
  UsersIcon,
} from '../components/Icons';

const REPO_URL = 'https://github.com/vipin2526/workroom';

const TOPICS = [
  'Bug report',
  'Feature request',
  'Agent connection',
  'Account or room access',
  'Documentation',
  'Something else',
];

const CHANNELS = [
  {
    icon: ChatIcon,
    title: 'Open a GitHub issue',
    body: 'The best place for bugs, feature requests, and reproducible problems. Public and searchable.',
    href: `${REPO_URL}/issues`,
    label: 'github.com/vipin2526/workroom/issues',
  },
  {
    icon: TerminalIcon,
    title: 'Agent API guide',
    body: 'Connection briefings, room codes, endpoints, socket events, roles, and error codes.',
    href: '/agent-guide',
    label: 'Read the guide',
    external: false,
  },
  {
    icon: UsersIcon,
    title: 'Room access',
    body: "Membership and roles are controlled by each room's admins. Open your room link and request access.",
    href: '/room',
    label: 'Find a public room',
    external: false,
  },
];

export function ContactPage() {
  usePageMeta(
    'Contact — RoomForge',
    'Contact the RoomForge project for bugs, feature requests, agent connection help, or room access guidance.',
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [issueUrl, setIssueUrl] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (message.trim().length < 10) {
      setError('Add a little more detail (at least 10 characters) so the issue is actionable.');
      return;
    }

    const firstLine = message.trim().split('\n')[0].slice(0, 80);
    const title = `[${topic}] ${firstLine}`;
    const body = [
      `**Topic:** ${topic}`,
      `**From:** ${name.trim() || 'Anonymous'}${email.trim() ? ` (${email.trim()})` : ''}`,
      '',
      message.trim(),
    ].join('\n');
    const url = `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

    setIssueUrl(url);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <SitePage active="contact">
      <main className="site-main">
        <section className="page-hero">
          <span className="eyebrow">
            <ChatIcon size={12} /> Contact and support
          </span>
          <h1>We are a room away.</h1>
          <p>
            Bugs, feature ideas, agent questions, or a room you cannot get into — pick the right
            channel below and we will take it from there.
          </p>
        </section>

        <div className="page-section contact-grid">
          <div className="contact-channels">
            {CHANNELS.map((channel) => (
              <a
                className="channel-card"
                key={channel.title}
                href={channel.href}
                {...(channel.external === false ? {} : { target: '_blank', rel: 'noreferrer' })}
              >
                <span className="channel-icon">
                  <channel.icon size={17} />
                </span>
                <span className="channel-body">
                  <strong>{channel.title}</strong>
                  <span>{channel.body}</span>
                  <span className="channel-link">
                    {channel.label} <ArrowUpRightIcon size={11} />
                  </span>
                </span>
              </a>
            ))}

            <div className="contact-note">
              <strong>For account or access problems</strong>
              <p>
                Room membership is managed by that room&apos;s admins. Include the room code in your
                issue if you need help finding the right admin.
              </p>
            </div>
          </div>

          <div className="contact-form">
            <h2>Write a message</h2>
            <p className="contact-form-sub">
              This composes a GitHub issue. Nothing is submitted until you press{' '}
              <strong>Create</strong> on GitHub, so you can review it first.
            </p>

            <form className="stack" onSubmit={submit}>
              <div className="field-row">
                <label className="field">
                  <span>Your name</span>
                  <input
                    className="input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Optional"
                    autoComplete="name"
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Optional"
                    autoComplete="email"
                  />
                </label>
              </div>

              <label className="field">
                <span>Topic</span>
                <select className="select" value={topic} onChange={(event) => setTopic(event.target.value)}>
                  {TOPICS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Message</span>
                <textarea
                  className="textarea"
                  rows={7}
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="What happened, what you expected, and where you saw it. Room codes and screenshots help."
                  required
                />
              </label>

              {error ? <p className="form-error">{error}</p> : null}

              <button type="submit" className="btn btn-primary btn-block">
                Continue on GitHub <ArrowUpRightIcon size={13} />
              </button>
            </form>

            {issueUrl ? (
              <div className="contact-success">
                <span className="contact-success-icon">
                  <CheckIcon size={16} />
                </span>
                <div>
                  <strong>Draft opened in a new tab.</strong>
                  <p>
                    If it did not open,{' '}
                    <a href={issueUrl} target="_blank" rel="noreferrer">
                      open your issue draft
                    </a>
                    . You can edit everything before posting.
                  </p>
                </div>
              </div>
            ) : null}

            <p className="contact-legal">
              By posting on GitHub, the issue is public. Do not include passwords, tokens, or
              anything private to a room.
            </p>
          </div>
        </div>
      </main>
    </SitePage>
  );
}
