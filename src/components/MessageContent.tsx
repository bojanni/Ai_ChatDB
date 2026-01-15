import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MessageContentProps {
  content: string;
  role: 'user' | 'assistant';
}

export function MessageContent({ content, role }: MessageContentProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };
  const formattedContent = useMemo(() => {
    const parts: JSX.Element[] = [];
    let currentIndex = 0;
    let key = 0;

    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const listItemRegex = /^[-*]\s+(.+)$/gm;

    let match;
    const codeBlocks: Array<{ start: number; end: number; lang?: string; code: string }> = [];

    while ((match = codeBlockRegex.exec(content)) !== null) {
      codeBlocks.push({
        start: match.index,
        end: match.index + match[0].length,
        lang: match[1],
        code: match[2],
      });
    }

    if (codeBlocks.length === 0) {
      return formatInlineElements(content);
    }

    codeBlocks.forEach((block, idx) => {
      if (currentIndex < block.start) {
        const textBefore = content.slice(currentIndex, block.start);
        parts.push(
          <span key={`text-${key++}`}>{formatInlineElements(textBefore)}</span>
        );
      }

      parts.push(
        <div key={`code-${key++}`} className="my-4 rounded-lg overflow-hidden border border-slate-700">
          <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              {block.lang || 'code'}
            </span>
            <button
              onClick={() => handleCopy(block.code, idx)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            >
              {copiedIndex === idx ? (
                <>
                  <Check size={14} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy code</span>
                </>
              )}
            </button>
          </div>
          <div className="bg-slate-900 p-4 overflow-x-auto">
            <pre className="text-sm text-slate-100 font-mono leading-6">
              <code>{block.code}</code>
            </pre>
          </div>
        </div>
      );

      currentIndex = block.end;
    });

    if (currentIndex < content.length) {
      const textAfter = content.slice(currentIndex);
      parts.push(
        <span key={`text-${key++}`}>{formatInlineElements(textAfter)}</span>
      );
    }

    return parts;
  }, [content]);

  function formatInlineElements(text: string): (string | JSX.Element)[] {
    const parts: (string | JSX.Element)[] = [];
    let key = 0;

    const lines = text.split('\n');
    let inList = false;
    let paragraphBuffer: (string | JSX.Element)[] = [];

    const flushParagraph = () => {
      if (paragraphBuffer.length > 0) {
        parts.push(
          <p key={`para-${key++}`} className="mb-4 last:mb-0">
            {paragraphBuffer}
          </p>
        );
        paragraphBuffer = [];
      }
    };

    lines.forEach((line, lineIdx) => {
      const trimmedLine = line.trim();

      const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        const sizeClasses = {
          1: 'text-2xl font-bold mb-4 mt-6',
          2: 'text-xl font-bold mb-3 mt-5',
          3: 'text-lg font-bold mb-3 mt-4',
          4: 'text-base font-bold mb-2 mt-3',
          5: 'text-sm font-bold mb-2 mt-3',
          6: 'text-sm font-semibold mb-2 mt-3',
        };
        parts.push(
          <HeadingTag key={`heading-${key++}`} className={sizeClasses[level as keyof typeof sizeClasses]}>
            {text}
          </HeadingTag>
        );
        return;
      }

      const listMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
      if (listMatch) {
        flushParagraph();
        if (!inList) {
          inList = true;
        }
        parts.push(
          <div key={`list-${key++}`} className="flex gap-2 mb-2 ml-4">
            <span className="text-slate-600 dark:text-slate-400 mt-1">•</span>
            <span className="flex-1">{processInlineFormatting(listMatch[1])}</span>
          </div>
        );
        return;
      } else {
        inList = false;
      }

      if (trimmedLine === '') {
        flushParagraph();
        return;
      }

      const processedLine = processInlineFormatting(line);
      paragraphBuffer.push(...(Array.isArray(processedLine) ? processedLine : [processedLine]));

      if (lineIdx < lines.length - 1 && lines[lineIdx + 1]?.trim() !== '') {
        paragraphBuffer.push(' ');
      }
    });

    flushParagraph();

    return parts;
  }

  function processInlineFormatting(text: string): (string | JSX.Element)[] {
    const parts: (string | JSX.Element)[] = [];
    let key = 0;
    let currentPos = 0;

    const combinedRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let match;

    while ((match = combinedRegex.exec(text)) !== null) {
      if (currentPos < match.index) {
        parts.push(text.slice(currentPos, match.index));
      }

      const matchedText = match[0];
      if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
        parts.push(
          <code
            key={`inline-${key++}`}
            className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded text-[0.9em] font-mono"
          >
            {matchedText.slice(1, -1)}
          </code>
        );
      } else if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        parts.push(
          <strong key={`bold-${key++}`} className="font-semibold">
            {matchedText.slice(2, -2)}
          </strong>
        );
      } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
        parts.push(
          <em key={`italic-${key++}`}>{matchedText.slice(1, -1)}</em>
        );
      }

      currentPos = match.index + match[0].length;
    }

    if (currentPos < text.length) {
      parts.push(text.slice(currentPos));
    }

    return parts;
  }

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-4">
      {formattedContent}
    </div>
  );
}
