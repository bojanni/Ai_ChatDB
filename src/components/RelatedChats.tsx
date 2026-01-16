import { useState, useEffect } from 'react';
import { Link2, Sparkles, RefreshCw } from 'lucide-react';
import { getRelatedChats, detectAndCreateRelationships } from '../utils/relationshipService';
import type { Database } from '../lib/database.types';

type Chat = Database['public']['Tables']['chats']['Row'];

interface RelatedChat extends Chat {
  similarity_score: number;
  relationship_type: string;
}

interface RelatedChatsProps {
  chatId: string;
  onSelectChat: (chatId: string) => void;
}

export default function RelatedChats({ chatId, onSelectChat }: RelatedChatsProps) {
  const [relatedChats, setRelatedChats] = useState<RelatedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    loadRelatedChats();
  }, [chatId]);

  const loadRelatedChats = async () => {
    setLoading(true);
    const chats = await getRelatedChats(chatId);
    setRelatedChats(chats);
    setLoading(false);
  };

  const handleDetectRelationships = async () => {
    setDetecting(true);
    await detectAndCreateRelationships(chatId);
    await loadRelatedChats();
    setDetecting(false);
  };

  const getStrengthColor = (score: number) => {
    if (score >= 0.7) return 'bg-lime-500';
    if (score >= 0.5) return 'bg-lime-400';
    if (score >= 0.3) return 'bg-coral-400';
    return 'bg-sand-400';
  };

  const getStrengthLabel = (score: number) => {
    if (score >= 0.7) return 'Strong';
    if (score >= 0.5) return 'Medium';
    if (score >= 0.3) return 'Weak';
    return 'Very Weak';
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-lime-600 dark:text-lime-400" />
          <h3 className="font-semibold text-mocha-900 dark:text-cream-50">Related Chats</h3>
        </div>
        <button
          onClick={handleDetectRelationships}
          disabled={detecting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 rounded-lg hover:bg-lime-200 dark:hover:bg-lime-900/50 transition-colors text-sm disabled:opacity-50"
          title="Detect new relationships"
        >
          {detecting ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Detect
            </>
          )}
        </button>
      </div>

      {relatedChats.length === 0 ? (
        <div className="text-center py-6 text-mocha-500 dark:text-sand-400 text-sm">
          <p>No related chats found</p>
          <p className="mt-1">Click "Detect" to find connections</p>
        </div>
      ) : (
        <div className="space-y-2">
          {relatedChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className="w-full text-left p-3 bg-white dark:bg-mocha-700 rounded-lg border border-sand-200 dark:border-mocha-600 hover:border-lime-400 dark:hover:border-lime-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-medium text-mocha-900 dark:text-cream-50 group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors line-clamp-1">
                  {chat.title}
                </h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${getStrengthColor(
                    chat.similarity_score
                  )}`}
                >
                  {Math.round(chat.similarity_score * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-mocha-600 dark:text-sand-400">
                <span className="px-2 py-0.5 bg-sand-100 dark:bg-mocha-600 rounded">
                  {chat.ai_source}
                </span>
                {chat.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 rounded">
                    {tag}
                  </span>
                ))}
                {chat.tags.length > 2 && (
                  <span className="text-mocha-500 dark:text-sand-500">+{chat.tags.length - 2}</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex-1 h-1.5 bg-sand-200 dark:bg-mocha-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getStrengthColor(chat.similarity_score)} transition-all`}
                    style={{ width: `${chat.similarity_score * 100}%` }}
                  />
                </div>
                <span className="text-xs text-mocha-500 dark:text-sand-400">
                  {getStrengthLabel(chat.similarity_score)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}