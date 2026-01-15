import { useState, useEffect } from 'react';
import { User, Bot, Trash2, Edit2, Save, X, Sparkles, Key, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { MessageContent } from './MessageContent';

type Chat = Database['public']['Tables']['chats']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

interface ChatViewProps {
  chatId: string;
  onChatDeleted: () => void;
}

export function ChatView({ chatId, onChatDeleted }: ChatViewProps) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingChatId, setEditingChatId] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');

  useEffect(() => {
    fetchChatAndMessages();
  }, [chatId]);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('openai_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  async function fetchChatAndMessages() {
    try {
      setLoading(true);

      const [chatResult, messagesResult] = await Promise.all([
        supabase.from('chats').select('*').eq('id', chatId).maybeSingle(),
        supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true })
      ]);

      if (chatResult.error) throw chatResult.error;
      if (messagesResult.error) throw messagesResult.error;

      setChat(chatResult.data);
      setMessages(messagesResult.data || []);

      if (chatResult.data) {
        setEditTitle(chatResult.data.title);
        setEditTags(chatResult.data.tags.join(', '));
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteChat() {
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      const { error } = await supabase.from('chats').delete().eq('id', chatId);
      if (error) throw error;
      onChatDeleted();
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  }

  async function handleSaveEdit() {
    try {
      const tags = editTags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const { error } = await supabase
        .from('chats')
        .update({ title: editTitle, tags })
        .eq('id', chatId);

      if (error) throw error;

      await fetchChatAndMessages();
      setEditingChatId(false);
    } catch (error) {
      console.error('Error updating chat:', error);
    }
  }

  function handleSaveApiKey() {
    localStorage.setItem('openai_api_key', tempApiKey);
    setApiKey(tempApiKey);
    setShowApiKeyModal(false);
    setTempApiKey('');
  }

  async function handleGenerateSummary() {
    if (messages.length === 0) {
      alert('No messages to summarize');
      return;
    }

    setSummarizing(true);

    try {
      const { data: profile } = await supabase
        .from('user_profile')
        .select('*')
        .maybeSingle();

      if (!profile) {
        alert('Please configure AI settings first');
        setSummarizing(false);
        return;
      }

      if (['openai', 'gemini', 'claude', 'deepseek', 'qwen'].includes(profile.ai_provider) && !apiKey) {
        setShowApiKeyModal(true);
        setSummarizing(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/summarize-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          currentTitle: chat?.title,
          openaiApiKey: apiKey,
          aiProvider: profile.ai_provider,
          aiEndpoint: profile.ai_endpoint,
          aiModel: profile.ai_model
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate summary');
      }

      const result = await response.json();

      const newTags = [...new Set([...(chat?.tags || []), ...result.tags])];

      const { error: updateError } = await supabase
        .from('chats')
        .update({
          title: result.title,
          tags: newTags,
          summary: result.title
        })
        .eq('id', chatId);

      if (updateError) throw updateError;

      await fetchChatAndMessages();
      alert('Summary generated successfully!');
    } catch (error) {
      console.error('Error generating summary:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setSummarizing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 dark:text-slate-500">Loading chat...</div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 dark:text-slate-500">Chat not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
        {editingChatId ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Chat title"
            />
            <input
              type="text"
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              placeholder="Tags (comma separated)"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Save size={16} />
                Save
              </button>
              <button
                onClick={() => {
                  setEditingChatId(false);
                  setEditTitle(chat.title);
                  setEditTags(chat.tags.join(', '));
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{chat.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {chat.ai_source} • {new Date(chat.created_at).toLocaleDateString()}
                </p>
                {chat.summary && (
                  <div className="mt-2 p-3 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border border-violet-200 dark:border-violet-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Sparkles size={14} className="text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-700 dark:text-slate-300">{chat.summary}</p>
                    </div>
                  </div>
                )}
                {chat.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {chat.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateSummary}
                  disabled={summarizing}
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-lg hover:from-violet-600 hover:to-fuchsia-600 transition-colors disabled:opacity-50"
                  title="Generate AI summary and tags"
                >
                  <Sparkles size={16} />
                  {summarizing ? 'Generating...' : 'AI Summary'}
                </button>
                {!apiKey && (
                  <button
                    onClick={() => setShowApiKeyModal(true)}
                    className="p-2 text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                    title="Set OpenAI API Key"
                  >
                    <Key size={18} />
                  </button>
                )}
                <button
                  onClick={() => setEditingChatId(true)}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Edit chat"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={handleDeleteChat}
                  className="p-2 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete chat"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
            No messages in this chat
          </div>
        ) : (
          <div>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`group px-4 py-6 sm:px-6 sm:py-8 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                  message.role === 'user'
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-slate-50/30 dark:bg-slate-800/20'
                }`}
              >
                <div className="max-w-3xl mx-auto">
                  <div className="flex gap-3 sm:gap-4">
                    <div
                      className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-emerald-600 dark:bg-emerald-500 text-white'
                      }`}
                    >
                      {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {message.role === 'user' ? 'You' : chat.ai_source}
                        </span>
                      </div>
                      <div className="text-[15px] leading-7 text-slate-800 dark:text-slate-200">
                        <MessageContent content={message.content} role={message.role} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">OpenAI API Key</h3>
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setTempApiKey('');
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Enter your OpenAI API key to enable AI-powered summarization and tagging. Your key is stored locally in your browser.
            </p>
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveApiKey}
                disabled={!tempApiKey}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setTempApiKey('');
                }}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                OpenAI Platform
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
