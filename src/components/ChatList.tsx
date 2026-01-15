import { useState, useEffect } from 'react';
import { MessageSquare, Tag, Calendar, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Chat = Database['public']['Tables']['chats']['Row'];

interface ChatListProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  refreshTrigger: number;
}

export function ChatList({ selectedChatId, onSelectChat, selectedTag, onSelectTag, refreshTrigger }: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchChats();
  }, [refreshTrigger]);

  async function fetchChats() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  }

  const allTags = Array.from(
    new Set(chats.flatMap((chat) => chat.tags))
  ).sort();

  const filteredChats = chats.filter((chat) => {
    const matchesSearch =
      searchQuery === '' ||
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.ai_source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === null || chat.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 dark:text-slate-500">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        {selectedTag && (
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Filtered by:</span>
            <button
              onClick={() => onSelectTag(null)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              <Tag size={12} />
              {selectedTag}
              <X size={14} />
            </button>
          </div>
        )}
        <input
          type="text"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => onSelectTag(null)}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                selectedTag === null
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSelectTag(tag)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  selectedTag === tag
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 p-6">
            <MessageSquare size={48} className="mb-2 opacity-50" />
            <p className="text-center">No chats found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                  selectedChatId === chat.id ? 'bg-blue-50 dark:bg-slate-700 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1">{chat.title}</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{chat.ai_source}</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(chat.created_at).toLocaleDateString()}
                  </span>
                </div>
                {chat.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {chat.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTag(tag);
                        }}
                        className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <Tag size={10} />
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
