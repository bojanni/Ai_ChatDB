
import { GoogleGenAI, Type } from "@google/genai";
import { Settings, AIProvider } from "../types";

export interface ChatMetadata {
  summary: string;
  tags: string[];
  suggestedTitle: string;
}

/**
 * Helper to clean and format local endpoints for different API paths.
 */
const getBaseUrl = (provider: AIProvider, endpoint: string): string => {
  if (provider !== AIProvider.LMSTUDIO) return "";
  
  // Remove trailing slashes and common subpaths to get the base
  let base = endpoint.trim().replace(/\/+$/, "");
  base = base.replace(/\/chat\/completions$/, "");
  base = base.replace(/\/completions$/, "");
  base = base.replace(/\/models$/, "");
  return base;
};

/**
 * Fetches available models from the configured provider.
 */
export const fetchAvailableModels = async (settings: Settings): Promise<string[]> => {
  const { aiProvider, apiKeys, customEndpoint } = settings;
  const key = apiKeys[aiProvider] || "";

  try {
    if (aiProvider === AIProvider.GEMINI) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.API_KEY}`);
      if (!response.ok) throw new Error(`Google API responded with status ${response.status}`);
      const data = await response.json();
      if (data.models) {
        return data.models
          .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
          .map((m: any) => m.name.replace('models/', ''));
      }
      return ["gemini-3-flash-preview", "gemini-3-pro-preview", "gemini-2.5-flash-lite-latest"];
    }

    if (aiProvider === AIProvider.OPENAI || aiProvider === AIProvider.MISTRAL || aiProvider === AIProvider.LMSTUDIO) {
      let url = "";
      const headers: HeadersInit = {};
      
      if (key) {
        headers["Authorization"] = `Bearer ${key}`;
      }

      if (aiProvider === AIProvider.OPENAI) {
        url = "https://api.openai.com/v1/models";
      } else if (aiProvider === AIProvider.MISTRAL) {
        url = "https://api.mistral.ai/v1/models";
      } else if (aiProvider === AIProvider.LMSTUDIO) {
        const base = getBaseUrl(aiProvider, customEndpoint);
        // Resilient check for LM Studio: try /v1/models
        url = `${base}/models`;
        if (!url.includes('/v1/')) {
           // Many local servers use /v1 prefix
           url = `${base}/v1/models`;
        }
      }

      const response = await fetch(url, {
        method: "GET",
        headers
      });
      
      if (!response.ok) {
        throw new Error(`${aiProvider} returned status ${response.status}. Ensure the server is running and CORS is enabled.`);
      }

      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id);
      }
      return [];
    }

    if (aiProvider === AIProvider.ANTHROPIC) {
      return [
        "claude-3-5-sonnet-20240620",
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307"
      ];
    }
  } catch (error: any) {
    console.error(`Failed to fetch models for ${aiProvider}:`, error);
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error(`Connection failed. If using LM Studio, ensure the server is running on ${customEndpoint} and "CORS" is enabled in settings.`);
    }
    throw error;
  }
  return [];
};

/**
 * Generates a vector embedding for the provided text.
 * Primarily supports Gemini's embedding models.
 */
export const generateEmbedding = async (text: string, settings: Settings): Promise<number[] | undefined> => {
  // Currently only supporting Gemini for embeddings for simplicity and free tier access
  // OpenAI embeddings require paid tier usually.
  
  if (settings.aiProvider === AIProvider.GEMINI) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = "text-embedding-004";
      
      const response = await ai.models.embedContent({
        model: model,
        content: { parts: [{ text: text.substring(0, 9000) }] } // Truncate to stay within safe token limits
      });
      
      return response.embedding?.values;
    } catch (error) {
      console.warn("Failed to generate embedding with Gemini:", error);
      return undefined;
    }
  }
  
  // Return undefined for other providers for now, or could fallback to Gemini if API key is present
  if (process.env.API_KEY) {
     try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.embedContent({
            model: "text-embedding-004",
            content: { parts: [{ text: text.substring(0, 9000) }] }
        });
        return response.embedding?.values;
     } catch(e) { console.warn("Fallback embedding generation failed", e); }
  }

  return undefined;
};

export const analyzeChatContent = async (
  content: string, 
  settings: Settings
): Promise<ChatMetadata> => {
  const { aiProvider, preferredModel, apiKeys, customEndpoint } = settings;
  const prompt = `You are a professional digital archivist. Analyze the following AI conversation log.
      
      Return a JSON object with:
      1. "summary": A clear, high-level, one-sentence summary.
      2. "tags": An array of 3-6 relevant, lowercase, single-word or hyphenated tags.
      3. "suggestedTitle": A short, descriptive title (under 10 words).

      Conversation Log:
      ---
      ${content.substring(0, 10000)}
      ---`;

  // 1. Handle Gemini Provider
  if (aiProvider === AIProvider.GEMINI) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: preferredModel || "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedTitle: { type: Type.STRING }
            },
            required: ["summary", "tags", "suggestedTitle"],
          },
        },
      });
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Gemini failed, falling back to basic prompt", error);
      throw error;
    }
  }

  // 2. Handle OpenAI Compatible Providers (OpenAI, Mistral, LM Studio)
  if (aiProvider === AIProvider.OPENAI || aiProvider === AIProvider.MISTRAL || aiProvider === AIProvider.LMSTUDIO) {
    let url = "https://api.openai.com/v1/chat/completions";
    const key = apiKeys[aiProvider] || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (key) {
      headers["Authorization"] = `Bearer ${key}`;
    }

    if (aiProvider === AIProvider.MISTRAL) {
      url = "https://api.mistral.ai/v1/chat/completions";
    } else if (aiProvider === AIProvider.LMSTUDIO) {
      const base = getBaseUrl(aiProvider, customEndpoint);
      url = customEndpoint.includes('/chat/completions') 
        ? customEndpoint 
        : `${base}/v1/chat/completions`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: preferredModel,
        messages: [{ role: "user", content: prompt + " \n\nIMPORTANT: Return ONLY valid raw JSON." }],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`${aiProvider} request failed with status ${response.status}`);
    }

    const data = await response.json();
    const contentStr = data.choices?.[0]?.message?.content || "{}";
    return JSON.parse(contentStr);
  }

  // 3. Handle Anthropic
  if (aiProvider === AIProvider.ANTHROPIC) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKeys[AIProvider.ANTHROPIC] || "",
        "anthropic-version": "2023-06-01",
        "dangerously-allow-browser": "true" 
      } as any,
      body: JSON.stringify({
        model: preferredModel,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt + " \n\nIMPORTANT: Return ONLY valid raw JSON." }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic request failed with status ${response.status}`);
    }

    const data = await response.json();
    const contentStr = data.content?.[0]?.text || "{}";
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : contentStr);
  }

  throw new Error("Unsupported AI Provider");
};
