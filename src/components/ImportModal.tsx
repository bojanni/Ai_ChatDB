import { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseFile } from '../utils/fileParser';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportResult {
  filename: string;
  status: 'success' | 'error';
  message: string;
}

export function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [tags, setTags] = useState('');
  const [autoSummarize, setAutoSummarize] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const storedApiKey = localStorage.getItem('openai_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }

    async function checkAIConfiguration() {
      const { data: profile } = await supabase
        .from('user_profile')
        .select('*')
        .maybeSingle();

      if (profile) {
        const cloudProviders = ['openai', 'gemini', 'claude', 'deepseek', 'qwen'];
        const isCloudProvider = cloudProviders.includes(profile.ai_provider);
        const hasApiKey = storedApiKey && storedApiKey.length > 0;
        const isLocalProvider = profile.ai_provider === 'ollama' || profile.ai_provider === 'lmstudio';

        if ((isCloudProvider && hasApiKey) || isLocalProvider) {
          setAutoSummarize(true);
        }
      }
    }

    if (isOpen) {
      checkAIConfiguration();
    }
  }, [isOpen]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setImporting(true);
    const importResults: ImportResult[] = [];
    const cloudProviders = ['openai', 'gemini', 'claude', 'deepseek', 'qwen'];

    const tagArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        if (!file.name.match(/\.(md|markdown|pdf)$/i)) {
          importResults.push({
            filename: file.name,
            status: 'error',
            message: 'Unsupported file type. Only .md and .pdf files are supported.'
          });
          continue;
        }

        const parsed = await parseFile(file);

        if (parsed.messages.length === 0) {
          importResults.push({
            filename: file.name,
            status: 'error',
            message: 'No messages found in file'
          });
          continue;
        }

        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .insert({
            title: parsed.title,
            ai_source: parsed.aiSource,
            tags: tagArray
          })
          .select()
          .single();

        if (chatError) throw chatError;

        const messagesData = parsed.messages.map((msg) => ({
          chat_id: chat.id,
          role: msg.role,
          content: msg.content
        }));

        const { error: messagesError } = await supabase
          .from('messages')
          .insert(messagesData);

        if (messagesError) throw messagesError;

        let profile = null;
        if (autoSummarize) {
          try {
            const { data: profileData } = await supabase
              .from('user_profile')
              .select('*')
              .maybeSingle();

            profile = profileData;

            const isCloudProvider = cloudProviders.includes(profile?.ai_provider || '');
            const isLocalProvider = profile?.ai_provider === 'ollama' || profile?.ai_provider === 'lmstudio';
            const canSummarize = profile && ((isCloudProvider && apiKey) || isLocalProvider);

            if (canSummarize) {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

              const response = await fetch(`${supabaseUrl}/functions/v1/summarize-chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({
                  messages: parsed.messages,
                  currentTitle: parsed.title,
                  openaiApiKey: apiKey,
                  aiProvider: profile.ai_provider,
                  aiEndpoint: profile.ai_endpoint,
                  aiModel: profile.ai_model
                })
              });

              if (response.ok) {
                const result = await response.json();
                const newTags = [...new Set([...tagArray, ...result.tags])];

                await supabase
                  .from('chats')
                  .update({
                    title: result.title,
                    tags: newTags,
                    summary: result.title
                  })
                  .eq('id', chat.id);
              }
            }
          } catch (error) {
            console.error('Auto-summarization failed:', error);
          }
        }

        const aiSummaryApplied = autoSummarize && (
          (cloudProviders.includes(profile?.ai_provider || '') && apiKey) ||
          profile?.ai_provider === 'ollama' ||
          profile?.ai_provider === 'lmstudio'
        );

        importResults.push({
          filename: file.name,
          status: 'success',
          message: `Imported ${parsed.messages.length} messages as "${parsed.title}"${aiSummaryApplied ? ' (with AI summary & tags)' : ''}`
        });
      } catch (error) {
        importResults.push({
          filename: file.name,
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to import'
        });
      }
    }

    setResults(importResults);
    setImporting(false);
    onImportComplete();
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
  }

  function handleClose() {
    setResults([]);
    setTags('');
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Import Chats</h2>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tags (optional, comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., imported, research, coding"
              disabled={importing}
            />
            <p className="text-xs text-slate-500 mt-1">
              These tags will be applied to all imported chats
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-summarize"
              checked={autoSummarize}
              onChange={(e) => setAutoSummarize(e.target.checked)}
              disabled={importing}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="auto-summarize" className="text-sm text-slate-700 dark:text-slate-300">
              Auto-generate AI summaries and tags for imported chats
              {!autoSummarize && !apiKey && (
                <span className="text-amber-600 dark:text-amber-500 ml-1">(configure AI provider in settings first)</span>
              )}
            </label>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            } ${importing ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="bg-slate-100 p-4 rounded-full">
                <Upload size={32} className="text-slate-600" />
              </div>
              <div>
                <p className="text-lg font-medium text-slate-900 mb-1">
                  Drop files here or click to browse
                </p>
                <p className="text-sm text-slate-500">
                  Supports .md and .pdf files
                </p>
              </div>
              <input
                type="file"
                multiple
                accept=".md,.markdown,.pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={importing}
              />
              <label
                htmlFor="file-upload"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
              >
                Select Files
              </label>
            </div>
          </div>

          {importing && (
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span>Importing files...</span>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-slate-900">Import Results</h3>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 p-3 rounded-lg border ${
                      result.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {result.status === 'success' ? (
                      <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{result.filename}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{result.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Automatically detects AI vs user messages based on labels and patterns</li>
              <li>• Extracts chat title from headers or first lines</li>
              <li>• Identifies AI source (ChatGPT, Claude, Gemini, etc.)</li>
              <li>• Supports markdown with labeled speakers (e.g., "User:", "Assistant:")</li>
              <li>• PDF text is parsed the same way as markdown</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-200">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
