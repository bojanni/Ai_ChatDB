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

function parseChatGPTExport(data: any): ParsedChat {
  const messages: ParsedMessage[] = [];
  const title = data.title || 'ChatGPT Conversation';

  if (data.mapping) {
    const messageMap = new Map();
    const childrenMap = new Map();

    for (const [id, node] of Object.entries(data.mapping as any)) {
      if (node.message && node.message.content && node.message.content.parts) {
        messageMap.set(id, node);
        if (node.parent) {
          if (!childrenMap.has(node.parent)) {
            childrenMap.set(node.parent, []);
          }
          childrenMap.get(node.parent).push(id);
        }
      }
    }

    const rootIds = Array.from(messageMap.keys()).filter(id => {
      const node = messageMap.get(id);
      return !node.parent || !messageMap.has(node.parent);
    });

    function traverseMessages(nodeId: string) {
      const node = messageMap.get(nodeId);
      if (!node || !node.message) return;

      const role = node.message.author?.role;
      const parts = node.message.content?.parts || [];
      const content = parts.join('\n').trim();

      if (content && (role === 'user' || role === 'assistant')) {
        messages.push({
          role: role as 'user' | 'assistant',
          content
        });
      }

      const children = childrenMap.get(nodeId) || [];
      for (const childId of children) {
        traverseMessages(childId);
      }
    }

    for (const rootId of rootIds) {
      traverseMessages(rootId);
    }
  }

  return {
    title,
    aiSource: 'ChatGPT',
    messages
  };
}

function parseClaudeExport(data: any): ParsedChat {
  const messages: ParsedMessage[] = [];
  const title = data.name || 'Claude Conversation';

  if (data.chat_messages && Array.isArray(data.chat_messages)) {
    for (const msg of data.chat_messages) {
      const role = msg.sender === 'human' ? 'user' : 'assistant';
      const content = msg.text?.trim();

      if (content) {
        messages.push({
          role,
          content
        });
      }
    }
  }

  return {
    title,
    aiSource: 'Claude',
    messages
  };
}

function parseGeminiExport(data: any): ParsedChat {
  const messages: ParsedMessage[] = [];
  const title = data.title || 'Gemini Conversation';

  if (data.history && Array.isArray(data.history)) {
    for (const msg of data.history) {
      const role = msg.role === 'model' ? 'assistant' : 'user';
      const parts = msg.parts || [];
      const content = parts.map((p: any) => p.text || '').join('\n').trim();

      if (content) {
        messages.push({
          role,
          content
        });
      }
    }
  }

  return {
    title,
    aiSource: 'Gemini',
    messages
  };
}

function parseJSON(content: string): ParsedChat {
  try {
    const data = JSON.parse(content);

    if (data.mapping && data.title !== undefined) {
      return parseChatGPTExport(data);
    }

    if (data.chat_messages && Array.isArray(data.chat_messages)) {
      return parseClaudeExport(data);
    }

    if (data.history && Array.isArray(data.history)) {
      return parseGeminiExport(data);
    }

    throw new Error('Unrecognized JSON format. Expected ChatGPT, Claude, or Gemini export format.');
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON file');
    }
    throw error;
  }
}

export async function parseFile(file: File): Promise<ParsedChat> {
  const content = await file.text();

  if (file.name.endsWith('.json')) {
    return parseJSON(content);
  } else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
    return parseMarkdown(content);
  } else if (file.name.endsWith('.pdf')) {
    return parsePDF(content);
  }

  throw new Error('Unsupported file type');
}
