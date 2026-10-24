import type { ReactNode } from 'react';

const URL_PATTERN = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

export function LinkifyText({
  text,
  className,
  stopPropagation,
}: {
  text: string;
  className?: string;
  stopPropagation?: boolean;
}) {
  const parts = text.split(URL_PATTERN);
  const nodes: ReactNode[] = parts.map((part, index) =>
    index % 2 === 1 ? (
      <a
        className="text-link"
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        key={`url-${index}`}
        onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      >
        {part}
      </a>
    ) : (
      part
    ),
  );

  return <span className={className}>{nodes}</span>;
}
