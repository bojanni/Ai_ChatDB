import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: () => void;
}

interface MessageInput {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function NewChatModal({ isOpen, onClose, onChatCreated }: NewChatModalProps) {
  const [title, setTitle] = useState('');
  const [aiSource, setAiSource] = useState('');
  const [tags, setTags] = useState('');
  const [messages, setMessages] = useState<MessageInput[]>([
    { id: crypto.randomUUID(), role: 'user', content: '' },
    { id: crypto.randomUUID(), role: 'assistant', content: '' }
  ]);
  const [loading, setLoading] = useState(false);

  const aiSources = ['ChatGPT', 'Claude', 'Gemini', 'DeepSeek', 'Perplexity', 'Grok', 'Other'];

  function addMessage() {
    const lastRole = messages[messages.length - 1]?.role || 'assistant';
    const newRole = lastRole === 'user' ? 'assistant' : 'user';
    setMessages([...messages, { id: crypto.randomUUID(), role: newRole, content: '' }]);
  }

  function removeMessage(id: string) {
    if (messages.length > 1) {
      setMessages(messages.filter((msg) => msg.id !== id));
    }
  }

  function updateMessage(id: string, field: keyof MessageInput, value: string) {
    setMessages(
      messages.map((msg) =>
        msg.id === id ? { ...msg, [field]: value } : msg
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !aiSource.trim()) {
      alert('Please fill in title and AI source');
      return;
    }

    const validMessages = messages.filter((msg) => msg.content.trim());
    if (validMessages.length === 0) {
      alert('Please add at least one message');
      return;
    }

    setLoading(true);

    try {
      const tagArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          title: title.trim(),
          ai_source: aiSource.trim(),
          tags: tagArray
        })
        .select()
        .single();

      if (chatError) throw chatError;

      const messagesData = validMessages.map((msg) => ({
        chat_id: chat.id,
        role: msg.role,
        content: msg.content.trim()
      }));

      const { error: messagesError } = await supabase
        .from('messages')
        .insert(messagesData);

      if (messagesError) throw messagesError;

      setTitle('');
      setAiSource('');
      setTags('');
      setMessages([
        { id: crypto.randomUUID(), role: 'user', content: '' },
        { id: crypto.randomUUID(), role: 'assistant', content: '' }
      ]);

      onChatCreated();
      onClose();
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to create chat. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-cream-50 dark:bg-mocha-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-sand-200 dark:border-mocha-700">
          <h2 className="text-2xl font-semibold text-mocha-900 dark:text-cream-50">Add New Chat</h2>
          <button
            onClick={onClose}
            className="p-2 text-mocha-400 dark:text-sand-400 hover:text-mocha-600 dark:hover:text-sand-200 hover:bg-sand-100 dark:hover:bg-mocha-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-mocha-700 dark:text-sand-200 mb-1">
                Chat Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-sand-300 dark:border-mocha-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                placeholder="e.g., How to build a React app"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-mocha-700 dark:text-sand-200 mb-1">
                AI Source
              </label>
              <select
                value={aiSource}
                onChange={(e) => setAiSource(e.target.value)}
                className="w-full px-3 py-2 border border-sand-300 dark:border-mocha-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                required
              >
                <option value="">Select AI source</option>
                {aiSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-mocha-700 dark:text-sand-200 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-sand-300 dark:border-mocha-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                placeholder="e.g., react, tutorial, web-dev"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-mocha-700 dark:text-sand-200">
                  Messages
                </label>
                <button
                  type="button"
                  onClick={addMessage}
                  className="flex items-center gap-1 text-sm text-lime-600 dark:text-lime-400 hover:text-lime-700 dark:hover:text-lime-300"
                >
                  <Plus size={16} />
                  Add Message
                </button>
              </div>

              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div key={message.id} className="border border-sand-300 dark:border-mocha-600 rounded-lg p-3 bg-white dark:bg-mocha-700">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        value={message.role}
                        onChange={(e) => updateMessage(message.id, 'role', e.target.value)}
                        className="px-2 py-1 text-sm border border-sand-300 dark:border-mocha-600 rounded focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white dark:bg-mocha-800 text-mocha-900 dark:text-cream-50"
                      >
                        <option value="user">User</option>
                        <option value="assistant">Assistant</option>
                      </select>
                      {messages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMessage(message.id)}
                          className="p-1 text-coral-600 dark:text-coral-400 hover:bg-coral-50 dark:hover:bg-coral-900/20 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <textarea
                      value={message.content}
                      onChange={(e) => updateMessage(message.id, 'content', e.target.value)}
                      className="w-full px-3 py-2 border border-sand-300 dark:border-mocha-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white dark:bg-mocha-800 text-mocha-900 dark:text-cream-50 resize-none"
                      placeholder={`${message.role === 'user' ? 'User' : 'Assistant'} message`}
                      rows={3}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>

        <div className="flex gap-3 p-6 border-t border-sand-200 dark:border-mocha-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-sand-200 dark:bg-mocha-700 text-mocha-800 dark:text-sand-200 rounded-lg hover:bg-sand-300 dark:hover:bg-mocha-600 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-lime-400 text-mocha-900 rounded-lg hover:bg-lime-500 transition-colors disabled:opacity-50 font-medium"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Chat'}
          </button>
        </div>
      </div>
    </div>
  );
}
