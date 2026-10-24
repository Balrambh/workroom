import { useState } from 'react';
import type { ReactNode } from 'react';
import { CheckIcon, CopyIcon } from './Icons';

interface FormattedMessageProps {
  content: string;
  meName: string;
  onCopy?: (text: string, label: string) => void;
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

function renderInlineText(text: string, meName: string): ReactNode[] {
  const tokenRegex =
    /(`[^`\n]+`)|(\*\*[^*]+?\*\*)|(https?:\/\/[^\s<]+[^<.,:;"')\]\s])|(@[\w\u00C0-\u024F-]+)|(\n)/gu;

  const result: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  const mentionPattern = meName ? new RegExp(`^@${escapeRegExp(meName)}$`, 'i') : null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const [fullMatch, code, bold, url, mention, newline] = match;

    if (code) {
      result.push(
        <code className="chat-inline-code" key={keyIndex++}>
          {code.slice(1, -1)}
        </code>,
      );
    } else if (bold) {
      result.push(
        <strong key={keyIndex++}>
          {bold.slice(2, -2)}
        </strong>,
      );
    } else if (url) {
      result.push(
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-link"
          key={keyIndex++}
        >
          {url}
        </a>,
      );
    } else if (mention) {
      const isMe = mentionPattern ? mentionPattern.test(mention) : false;
      result.push(
        <mark className={`mention ${isMe ? 'mention-highlight' : ''}`} key={keyIndex++}>
          {mention}
        </mark>,
      );
    } else if (newline) {
      result.push(<br key={keyIndex++} />);
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

export function FormattedMessage({ content, meName, onCopy }: FormattedMessageProps) {
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
          {renderInlineText(rawText, meName)}
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
        {renderInlineText(rawText, meName)}
      </span>,
    );
  }

  return <div className="formatted-msg-content">{parts}</div>;
}
