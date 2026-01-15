interface AIConfig {
  provider: 'openai' | 'ollama' | 'lmstudio';
  apiKey?: string;
  endpoint?: string;
  model: string;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callAI(
  messages: Message[],
  config: AIConfig
): Promise<string> {
  if (config.provider === 'openai') {
    return callOpenAI(messages, config);
  } else if (config.provider === 'ollama') {
    return callOllama(messages, config);
  } else if (config.provider === 'lmstudio') {
    return callLMStudio(messages, config);
  }

  throw new Error(`Unknown AI provider: ${config.provider}`);
}

async function callOpenAI(
  messages: Message[],
  config: AIConfig
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4',
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callOllama(
  messages: Message[],
  config: AIConfig
): Promise<string> {
  const endpoint = config.endpoint || 'http://localhost:11434';
  const url = `${endpoint}/api/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'llama2',
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama API error: ${error}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}

async function callLMStudio(
  messages: Message[],
  config: AIConfig
): Promise<string> {
  const endpoint = config.endpoint || 'http://localhost:1234';
  const url = `${endpoint}/v1/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'local-model',
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LM Studio API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}
