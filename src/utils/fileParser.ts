interface ParsedMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedChat {
  title: string;
  aiSource: string;
  messages: ParsedMessage[];
}

const AI_INDICATORS = [
  'assistant',
  'chatgpt',
  'gpt',
  'claude',
  'gemini',
  'perplexity',
  'ai',
  'bot',
  'copilot',
  'bard',
];

const USER_INDICATORS = [
  'user',
  'human',
  'me',
  'you',
  'question',
];

function detectAISource(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('chatgpt') || lowerText.includes('gpt')) return 'ChatGPT';
  if (lowerText.includes('claude')) return 'Claude';
  if (lowerText.includes('gemini') || lowerText.includes('bard')) return 'Gemini';
  if (lowerText.includes('deepseek')) return 'DeepSeek';
  if (lowerText.includes('perplexity')) return 'Perplexity';
  if (lowerText.includes('grok')) return 'Grok';
  if (lowerText.includes('copilot')) return 'Copilot';

  return 'Other';
}

function identifySpeaker(label: string): 'user' | 'assistant' {
  const lowerLabel = label.toLowerCase().trim();

  for (const indicator of AI_INDICATORS) {
    if (lowerLabel.includes(indicator)) {
      return 'assistant';
    }
  }

  for (const indicator of USER_INDICATORS) {
    if (lowerLabel.includes(indicator)) {
      return 'user';
    }
  }

  return 'user';
}

function generateTitle(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      return trimmed.replace(/^#+\s*/, '').trim();
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 10 && trimmed.length < 100) {
      return trimmed.substring(0, 80) + (trimmed.length > 80 ? '...' : '');
    }
  }

  return 'Imported Chat';
}

export function parseMarkdown(content: string): ParsedChat {
  const messages: ParsedMessage[] = [];
  const lines = content.split('\n');

  let currentRole: 'user' | 'assistant' | null = null;
  let currentContent: string[] = [];

  const patterns = [
    /^(?:###?|####)\s*\*?\*?(.*?)[:：]\*?\*?\s*$/,
    /^\*\*\*?(.*?)[:：]\*?\*?\*?\s*$/,
    /^(.*?)[:：]\s*$/,
    /^>\s*\*?\*?(.*?)[:：]\*?\*?\s*$/,
  ];

  function flushMessage() {
    if (currentRole && currentContent.length > 0) {
      const content = currentContent.join('\n').trim();
      if (content) {
        messages.push({
          role: currentRole,
          content: content
        });
      }
    }
    currentContent = [];
  }

  for (const line of lines) {
    let matched = false;

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        flushMessage();
        const label = match[1].trim();
        currentRole = identifySpeaker(label);
        matched = true;
        break;
      }
    }

    if (!matched && line.trim()) {
      if (currentRole === null) {
        currentRole = 'user';
      }
      currentContent.push(line);
    } else if (!matched && !line.trim() && currentContent.length > 0) {
      currentContent.push('');
    }
  }

  flushMessage();

  if (messages.length === 0) {
    const chunks = content.split(/\n\n+/);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim();
      if (chunk) {
        messages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: chunk
        });
      }
    }
  }

  const title = generateTitle(content);
  const aiSource = detectAISource(content);

  return { title, aiSource, messages };
}

export function parsePDF(content: string): ParsedChat {
  return parseMarkdown(content);
}

export async function parseFile(file: File): Promise<ParsedChat> {
  const content = await file.text();

  if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
    return parseMarkdown(content);
  } else if (file.name.endsWith('.pdf')) {
    return parsePDF(content);
  }

  throw new Error('Unsupported file type');
}
