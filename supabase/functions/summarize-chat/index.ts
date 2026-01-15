import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Message {
  role: string;
  content: string;
}

interface RequestBody {
  messages: Message[];
  currentTitle?: string;
  openaiApiKey?: string;
  aiProvider: 'openai' | 'gemini' | 'claude' | 'deepseek' | 'qwen' | 'ollama' | 'lmstudio';
  aiEndpoint?: string;
  aiModel?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messages, currentTitle, openaiApiKey, aiProvider, aiEndpoint, aiModel }: RequestBody = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (['openai', 'gemini', 'claude', 'deepseek', 'qwen'].includes(aiProvider) && !openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "API key is required for cloud providers" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const conversationText = messages
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n");

    const prompt = `Analyze the following conversation and provide:
1. A concise, informative title (5-10 words) that captures the main topic
2. 3-5 relevant tags (single words or short phrases, lowercase, hyphenated if needed)

Conversation:
${conversationText}

Respond in JSON format:
{
  "title": "the title here",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const systemMessage = "You are a helpful assistant that analyzes conversations and generates concise titles and relevant tags. Always respond with valid JSON.";

    let result;

    if (aiProvider === 'openai') {
      result = await callOpenAI(prompt, systemMessage, openaiApiKey!, aiModel || 'gpt-3.5-turbo');
    } else if (aiProvider === 'gemini') {
      result = await callGemini(prompt, systemMessage, openaiApiKey!, aiModel || 'gemini-pro');
    } else if (aiProvider === 'claude') {
      result = await callClaude(prompt, systemMessage, openaiApiKey!, aiModel || 'claude-3-5-sonnet-20241022');
    } else if (aiProvider === 'deepseek') {
      result = await callDeepSeek(prompt, systemMessage, openaiApiKey!, aiModel || 'deepseek-chat');
    } else if (aiProvider === 'qwen') {
      result = await callQwen(prompt, systemMessage, openaiApiKey!, aiModel || 'qwen-turbo');
    } else if (aiProvider === 'ollama') {
      result = await callOllama(prompt, systemMessage, aiEndpoint || 'http://localhost:11434', aiModel || 'llama2');
    } else if (aiProvider === 'lmstudio') {
      result = await callLMStudio(prompt, systemMessage, aiEndpoint || 'http://localhost:1234', aiModel || 'local-model');
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid AI provider" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        title: result.title || currentTitle || "Untitled Chat",
        tags: result.tags || [],
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function callOpenAI(prompt: string, systemMessage: string, apiKey: string, model: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate summary with OpenAI");
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function callOllama(prompt: string, systemMessage: string, endpoint: string, model: string) {
  const response = await fetch(`${endpoint}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Ollama API error:", error);
    throw new Error("Failed to generate summary with Ollama");
  }

  const data = await response.json();
  return JSON.parse(data.message.content);
}

async function callLMStudio(prompt: string, systemMessage: string, endpoint: string, model: string) {
  const response = await fetch(`${endpoint}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("LM Studio API error:", error);
    throw new Error("Failed to generate summary with LM Studio");
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function callGemini(prompt: string, systemMessage: string, apiKey: string, model: string) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemMessage}\n\n${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200,
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate summary with Gemini");
  }

  const data = await response.json();
  const textContent = data.candidates[0].content.parts[0].text;
  return JSON.parse(textContent);
}

async function callClaude(prompt: string, systemMessage: string, apiKey: string, model: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 200,
      system: systemMessage,
      messages: [
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Claude API error:", error);
    throw new Error("Failed to generate summary with Claude");
  }

  const data = await response.json();
  return JSON.parse(data.content[0].text);
}

async function callDeepSeek(prompt: string, systemMessage: string, apiKey: string, model: string) {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("DeepSeek API error:", error);
    throw new Error("Failed to generate summary with DeepSeek");
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

async function callQwen(prompt: string, systemMessage: string, apiKey: string, model: string) {
  const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: {
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ]
      },
      parameters: {
        temperature: 0.7,
        max_tokens: 200,
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Qwen API error:", error);
    throw new Error("Failed to generate summary with Qwen");
  }

  const data = await response.json();
  return JSON.parse(data.output.text);
}