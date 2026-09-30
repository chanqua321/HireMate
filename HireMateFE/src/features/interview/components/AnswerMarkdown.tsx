import React from 'react';
import './AnswerMarkdown.css';

function inlineNodes(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b-${index}`}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<code key={`${keyPrefix}-c-${index}`}>{token.slice(1, -1)}</code>);
    }
    last = start + token.length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function linesToNodes(lines: string[], keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, index) => {
    if (index > 0) nodes.push(<br key={`${keyPrefix}-br-${index}`} />);
    nodes.push(...inlineNodes(line, `${keyPrefix}-${index}`));
  });
  return nodes;
}

/** Restricted Markdown for candidate answers. Text is React children, so HTML is not interpreted. */
export function AnswerMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let index = 0;
  let key = 0;
  while (index < lines.length) {
    if (/^```[a-zA-Z0-9]*\s*$/.test(lines[index])) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(<pre key={key}><code>{code.join('\n')}</code></pre>);
      key += 1;
      continue;
    }
    if (/^#{1,3}\s+/.test(lines[index])) {
      blocks.push(<h4 key={key}>{inlineNodes(lines[index].replace(/^#{1,3}\s+/, ''), `h-${key}`)}</h4>);
      key += 1;
      index += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(lines[index])) {
      const items: React.ReactNode[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(<li key={`${key}-${items.length}`}>{inlineNodes(lines[index].replace(/^\s*[-*]\s+/, ''), `li-${key}-${items.length}`)}</li>);
        index += 1;
      }
      blocks.push(<ul key={key}>{items}</ul>);
      key += 1;
      continue;
    }
    if (lines[index].trim() === '') {
      index += 1;
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length
      && lines[index].trim() !== ''
      && !/^```/.test(lines[index])
      && !/^#{1,3}\s+/.test(lines[index])
      && !/^\s*[-*]\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(<p key={key}>{linesToNodes(paragraph, `p-${key}`)}</p>);
    key += 1;
  }
  return <div className="answer-md">{blocks}</div>;
}
