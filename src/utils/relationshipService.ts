import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Chat = Database['public']['Tables']['chats']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

interface ChatWithMessages extends Chat {
  messages: Message[];
}

export async function detectAndCreateRelationships(chatId: string) {
  try {
    const { data: currentChat } = await supabase
      .from('chats')
      .select('*, messages(*)')
      .eq('id', chatId)
      .single();

    if (!currentChat || !currentChat.messages) return;

    const { data: allChats } = await supabase
      .from('chats')
      .select('*, messages(*)')
      .neq('id', chatId);

    if (!allChats || allChats.length === 0) return;

    const relationships: Array<{
      source_chat_id: string;
      target_chat_id: string;
      relationship_type: string;
      similarity_score: number;
    }> = [];

    for (const otherChat of allChats) {
      const score = calculateSimilarity(
        currentChat as ChatWithMessages,
        otherChat as ChatWithMessages
      );

      if (score > 0.3) {
        relationships.push({
          source_chat_id: chatId,
          target_chat_id: otherChat.id,
          relationship_type: 'ai_detected',
          similarity_score: score,
        });

        relationships.push({
          source_chat_id: otherChat.id,
          target_chat_id: chatId,
          relationship_type: 'ai_detected',
          similarity_score: score,
        });
      }
    }

    if (relationships.length > 0) {
      for (const relationship of relationships) {
        await supabase
          .from('chat_relationships')
          .upsert(relationship, {
            onConflict: 'source_chat_id,target_chat_id',
            ignoreDuplicates: false,
          });
      }
    }
  } catch (error) {
    console.error('Error detecting relationships:', error);
  }
}

function calculateSimilarity(chat1: ChatWithMessages, chat2: ChatWithMessages): number {
  let score = 0;
  let totalFactors = 0;

  if (chat1.ai_source === chat2.ai_source) {
    score += 0.2;
  }
  totalFactors += 1;

  const tags1 = new Set(chat1.tags);
  const tags2 = new Set(chat2.tags);
  const commonTags = [...tags1].filter((tag) => tags2.has(tag));
  if (commonTags.length > 0) {
    const tagSimilarity = commonTags.length / Math.max(tags1.size, tags2.size);
    score += tagSimilarity * 0.3;
  }
  totalFactors += 1;

  const text1 = extractText(chat1);
  const text2 = extractText(chat2);
  const textSimilarity = calculateTextSimilarity(text1, text2);
  score += textSimilarity * 0.5;
  totalFactors += 1;

  return Math.min(score, 1.0);
}

function extractText(chat: ChatWithMessages): string {
  const titleWords = chat.title.toLowerCase();
  const summaryWords = chat.summary ? chat.summary.toLowerCase() : '';
  const messageWords = chat.messages
    .map((m) => m.content.toLowerCase())
    .join(' ')
    .substring(0, 1000);

  return `${titleWords} ${summaryWords} ${messageWords}`;
}

function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = extractKeywords(text1);
  const words2 = extractKeywords(text2);

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who',
    'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about', 'me',
    'my', 'your', 'their', 'our',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  return new Set(words);
}

export async function getRelatedChats(chatId: string) {
  try {
    const { data: relationships } = await supabase
      .from('chat_relationships')
      .select('target_chat_id, similarity_score, relationship_type')
      .eq('source_chat_id', chatId)
      .order('similarity_score', { ascending: false })
      .limit(10);

    if (!relationships || relationships.length === 0) return [];

    const chatIds = relationships.map((r) => r.target_chat_id);

    const { data: relatedChats } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds);

    if (!relatedChats) return [];

    return relatedChats.map((chat) => {
      const relationship = relationships.find((r) => r.target_chat_id === chat.id);
      return {
        ...chat,
        similarity_score: relationship?.similarity_score || 0,
        relationship_type: relationship?.relationship_type || 'unknown',
      };
    });
  } catch (error) {
    console.error('Error getting related chats:', error);
    return [];
  }
}

export async function getAllRelationshipsForVisualization() {
  try {
    const { data: chats } = await supabase
      .from('chats')
      .select('id, title, ai_source, tags, created_at');

    const { data: relationships } = await supabase
      .from('chat_relationships')
      .select('*')
      .gte('similarity_score', 0.3);

    if (!chats || !relationships) return { nodes: [], edges: [] };

    const nodes = chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      ai_source: chat.ai_source,
      tags: chat.tags,
      created_at: chat.created_at,
    }));

    const edges = relationships.map((rel) => ({
      source: rel.source_chat_id,
      target: rel.target_chat_id,
      strength: rel.similarity_score,
      type: rel.relationship_type,
    }));

    return { nodes, edges };
  } catch (error) {
    console.error('Error getting relationships for visualization:', error);
    return { nodes: [], edges: [] };
  }
}

export async function createManualRelationship(chatId1: string, chatId2: string) {
  try {
    await supabase.from('chat_relationships').upsert([
      {
        source_chat_id: chatId1,
        target_chat_id: chatId2,
        relationship_type: 'manual',
        similarity_score: 1.0,
      },
      {
        source_chat_id: chatId2,
        target_chat_id: chatId1,
        relationship_type: 'manual',
        similarity_score: 1.0,
      },
    ], {
      onConflict: 'source_chat_id,target_chat_id',
      ignoreDuplicates: false,
    });
  } catch (error) {
    console.error('Error creating manual relationship:', error);
  }
}

export async function removeRelationship(chatId1: string, chatId2: string) {
  try {
    await supabase
      .from('chat_relationships')
      .delete()
      .eq('source_chat_id', chatId1)
      .eq('target_chat_id', chatId2);

    await supabase
      .from('chat_relationships')
      .delete()
      .eq('source_chat_id', chatId2)
      .eq('target_chat_id', chatId1);
  } catch (error) {
    console.error('Error removing relationship:', error);
  }
}