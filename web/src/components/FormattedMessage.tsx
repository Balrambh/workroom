import { useState } from 'react';
import type { ReactNode } from 'react';
import type { PrincipalType } from '../lib/types';
import { CheckIcon, CopyIcon } from './Icons';

export interface MentionTarget {
  name: string;
  type: PrincipalType;
  id: string;
}

interface FormattedMessageProps {
  content: string;
  meName: string;
  onCopy?: (text: string, label: string) => void;
  mentionTargets?: MentionTarget[];
  onMentionClick?: (type: PrincipalType, id: string) => void;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function CodeBlock({
  code,
  lang,
  onCopy,
}: {
  code: string;
  lang: string;
  onCopy?: (text: string, label: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (onCopy) {
      onCopy(code, 'Code snippet copied');
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="chat-code-block">
      <div className="chat-code-head">
        <span className="chat-code-lang">{lang || 'snippet'}</span>
        <button
          type="button"
          className={`chat-code-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          title="Copy snippet"
        >
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="chat-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInlineText(
  text: string,
  meName: string,
  mentionTargets: MentionTarget[],
  onMentionClick?: (type: PrincipalType, id: string) => void,
): ReactNode[] {
  const targetsByName = new Map<string, MentionTarget>();
  for (const target of mentionTargets) {
    if (target.name) targetsByName.set(target.name.toLowerCase(), target);
  }
  const knownNames = [...targetsByName.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  const knownMention = knownNames.length
    ? `|(?<known>@(?:${knownNames.join('|')})(?![\\p{L}\\p{N}_]))`
    : '';
  const tokenRegex = new RegExp(
    `(?<code>\`[^\`\\n]+\`)|(?<bold>\\*\\*[^*]+?\\*\\*)|(?<url>https?:\\/\\/[^\\s<]+[^<.,:;"')\\]\\s])${knownMention}|(?<mention>@[\\w\\u00C0-\\u024F-]+)|(?<newline>\\n)`,
    'giu',
  );

  const result: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  const mentionPattern = meName ? new RegExp(`^@${escapeRegExp(meName)}$`, 'i') : null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const groups = match.groups ?? {};

    if (groups.code) {
      result.push(
        <code className="chat-inline-code" key={keyIndex++}>
          {groups.code.slice(1, -1)}
        </code>,
      );
    } else if (groups.bold) {
      result.push(
        <strong key={keyIndex++}>
          {groups.bold.slice(2, -2)}
        </strong>,
      );
    } else if (groups.url) {
      result.push(
        <a
          href={groups.url}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-link"
          key={keyIndex++}
        >
          {groups.url}
        </a>,
      );
    } else if (groups.known || groups.mention) {
      const mention = groups.known ?? groups.mention ?? '';
      const target = groups.known
        ? targetsByName.get(mention.slice(1).toLowerCase())
        : undefined;
      const isMe = mentionPattern ? mentionPattern.test(mention) : false;
      const className = `mention ${isMe ? 'mention-highlight' : ''} ${
        target && onMentionClick ? 'mention-link' : ''
      }`;
      if (target && onMentionClick) {
        result.push(
          <button
            type="button"
            className={className}
            title={`Open ${target.name}'s profile`}
            key={keyIndex++}
            onClick={() => onMentionClick(target.type, target.id)}
          >
            {mention}
          </button>,
        );
      } else {
        result.push(
          <mark className={className} key={keyIndex++}>
            {mention}
          </mark>,
        );
      }
    } else if (groups.newline) {
      result.push(<br key={keyIndex++} />);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

export function FormattedMessage({
  content,
  meName,
  onCopy,
  mentionTargets = [],
  onMentionClick,
}: FormattedMessageProps) {
  const parts: ReactNode[] = [];
  const blockRegex = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let blockMatch: RegExpExecArray | null;
  let blockIdx = 0;

  while ((blockMatch = blockRegex.exec(content)) !== null) {
    if (blockMatch.index > lastIndex) {
      const rawText = content.slice(lastIndex, blockMatch.index);
      parts.push(
        <span key={`text-${blockIdx++}`}>
          {renderInlineText(rawText, meName, mentionTargets, onMentionClick)}
        </span>,
      );
    }

    const lang = blockMatch[1].trim();
    const code = blockMatch[2].replace(/\r\n/g, '\n');
    parts.push(
      <CodeBlock
        key={`code-${blockIdx++}`}
        lang={lang}
        code={code}
        onCopy={onCopy}
      />,
    );

    lastIndex = blockMatch.index + blockMatch[0].length;
  }

  if (lastIndex < content.length) {
    const rawText = content.slice(lastIndex);
    parts.push(
      <span key={`text-${blockIdx++}`}>
        {renderInlineText(rawText, meName, mentionTargets, onMentionClick)}
      </span>,
    );
  }

  return <div className="formatted-msg-content">{parts}</div>;
}
