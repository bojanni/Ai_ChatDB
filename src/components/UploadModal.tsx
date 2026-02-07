
import React, { useState, useRef } from 'react';
import { SourceType, Settings, AIProvider } from '../types';
import { XIcon, FileIcon, TagIcon, PlusIcon, SettingsIcon } from './Icons';
import { analyzeChatContent, generateEmbedding, ChatMetadata } from '../services/geminiService';
import { parseChatMessages, convertJsonToTranscript } from '../utils/chatUtils';

interface UploadModalProps {
  onClose: () => void;
  onUpload: (content: string, source: string, title: string, summary: string, tags: string[], fileName: string, embedding?: number[]) => void;
  settings: Settings;
}

type ModalStep = 'upload' | 'format' | 'review';

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload, settings }) => {
  const [step, setStep] = useState<ModalStep>('upload');
  const [source, setSource] = useState<SourceType>(SourceType.CHATGPT);
  const [customSource, setCustomSource] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [error, setError] = useState<{ message: string; type: 'type' | 'parse' | 'network' | 'size' | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawContent, setRawContent] = useState('');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [embedding, setEmbedding] = useState<number[] | undefined>(undefined);
  const [newTag, setNewTag] = useState('');
  
  // Custom Parsing State
  const [customUserLabel, setCustomUserLabel] = useState('');
  const [customAiLabel, setCustomAiLabel] = useState('');

  const processContent = async (text: string, fname: string) => {
    setIsProcessing(true);
    setProcessingStatus('Analyzing content structure...');
    try {
        const metadata = await analyzeChatContent(text, settings);
        
        setProcessingStatus('Generating vector embeddings...');
        const vector = await generateEmbedding(text + "\n" + metadata.summary, settings);
        
        setContent(text);
        setFileName(fname);
        setTitle(metadata.suggestedTitle);
        setSummary(metadata.summary);
        setTags(metadata.tags);
        setEmbedding(vector);
        setStep('review');
    } catch (apiErr: any) {
        setError({ message: `AI Analysis Error (${settings.aiProvider}): Check connection or API settings.`, type: 'network' });
    } finally {
        setIsProcessing(false);
        setProcessingStatus('');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError({ message: "File is too large. Maximum size allowed is 10MB.", type: 'size' });
      return;
    }

    const validTypes = ['.md', '.txt', '.docx', '.pdf', '.json'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(extension) && extension !== '.markdown') {
      setError({ message: `Unsupported format "${extension}". Use Markdown, TXT, JSON, PDF, or DOCX.`, type: 'type' });
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Reading file...');
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsText(file);
      });

      if (extension === '.pdf' || extension === '.docx') {
        setError({ message: `Full ${extension.toUpperCase()} support is limited. Please use .md, .txt, or .json for AI analysis.`, type: 'parse' });
        setIsProcessing(false);
        return;
      }

      // JSON Handling
      if (extension === '.json') {
          let json;
          try {
              json = JSON.parse(text);
          } catch (e) {
             setError({ message: "Invalid JSON file.", type: 'parse' });
             setIsProcessing(false);
             return;
          }
          
          const transcript = convertJsonToTranscript(json);
          if (!transcript) {
             setError({ message: "Could not identify chat structure in JSON. Ensure it contains a 'messages', 'history', or array format.", type: 'parse' });
             setIsProcessing(false);
             return;
          }
          
          await processContent(transcript, file.name);
          return;
      }
      
      const parsed = parseChatMessages(text, Date.now());
      const lineCount = text.split('\n').length;
      
      // Heuristic: If strict parsing found 0 or 1 message but the file is reasonably long,
      // it likely has a non-standard format that failed detection.
      if (parsed.length <= 1 && lineCount > 5) {
          setRawContent(text);
          setFileName(file.name);
          setIsProcessing(false);
          setStep('format');
          return;
      }

      await processContent(text, file.name);

    } catch (parseErr: any) {
      setError({ message: "Failed to read file contents.", type: 'parse' });
      setIsProcessing(false);
    }
  };

  const handleCustomFormatSubmit = () => {
      if (!customUserLabel || !customAiLabel) {
          setError({ message: "Please provide both User and AI labels.", type: 'parse' });
          return;
      }
      
      // Normalize content by replacing custom labels with standard headers
      // We look for the label at the start of a line, followed by optional colon/whitespace
      const userRegex = new RegExp(`^[\\W_]*${escapeRegExp(customUserLabel)}[\\W_]*(?::|$)`, 'gmi');
      const aiRegex = new RegExp(`^[\\W_]*${escapeRegExp(customAiLabel)}[\\W_]*(?::|$)`, 'gmi');
      
      let normalized = rawContent.replace(userRegex, 'User: ');
      normalized = normalized.replace(aiRegex, 'Assistant: ');
      
      processContent(normalized, fileName);
  };

  const addTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleFinalize = () => {
    const finalSource = source === SourceType.OTHER ? (customSource || 'Other') : source;
    onUpload(content, finalSource, title, summary, tags, fileName, embedding);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-warm-beige dark:bg-slate-900 border border-sandstone dark:border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-sandstone dark:border-slate-800">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-earth-dark dark:text-white">
              {step === 'upload' ? 'Import Chat Log' : step === 'format' ? 'Configure Parsing' : 'Review Archive Entry'}
            </h2>
            <p className="text-[10px] text-moss-brown uppercase font-bold tracking-widest">Engine: {settings.aiProvider} ({settings.preferredModel})</p>
          </div>
          <button onClick={onClose} className="text-moss-brown hover:text-earth-dark dark:hover:text-white transition-colors">
            <XIcon />
          </button>
        </div>

        <div className="p-8 overflow-y-auto">
          {step === 'upload' && (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-moss-brown mb-2">Select AI Source</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.values(SourceType).map((src) => (
                    <button
                      key={src}
                      onClick={() => setSource(src)}
                      className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                        source === src 
                          ? 'bg-sage-green/20 border-sage-green text-sage-green dark:text-blue-400 font-bold' 
                          : 'bg-white dark:bg-slate-800 border-sandstone dark:border-slate-700 text-moss-brown dark:text-slate-400 hover:border-earth-dark'
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>

              <div 
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isProcessing ? 'opacity-50 cursor-wait border-sandstone dark:border-slate-700' : 'border-sandstone dark:border-slate-700 hover:border-sage-green hover:bg-sage-green/5'
                }`}
              >
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".md,.markdown,.txt,.pdf,.docx,.json" />
                {isProcessing ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-green mx-auto mb-4"></div>
                    <p className="text-sage-green font-medium italic">{processingStatus || `Processing with ${settings.aiProvider}...`}</p>
                  </div>
                ) : (
                  <>
                    <FileIcon />
                    <p className="mt-4 text-earth-dark dark:text-slate-300 font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-moss-brown mt-2">Markdown, TXT, JSON, PDF, DOCX (up to 10MB)</p>
                  </>
                )}
              </div>
            </>
          )}

          {step === 'format' && (
              <div className="space-y-6">
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-900/40">
                      <h3 className="text-sm font-bold text-orange-800 dark:text-orange-400 mb-2 flex items-center gap-2">
                          <SettingsIcon />
                          Parsing Configuration Required
                      </h3>
                      <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                          We couldn't automatically detect the message structure in this file. 
                          Please specify the names or labels used for the User and the AI in your chat log.
                      </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                      <div>
                          <label className="block text-xs font-bold text-moss-brown uppercase tracking-widest mb-2">User Label in File</label>
                          <input
                            type="text"
                            placeholder='e.g. "Me", "John", "User"'
                            className="w-full bg-white dark:bg-slate-800 border border-sandstone dark:border-slate-700 rounded-lg py-3 px-4 text-earth-dark dark:text-white focus:ring-1 focus:ring-sage-green outline-none"
                            value={customUserLabel}
                            onChange={(e) => setCustomUserLabel(e.target.value)}
                          />
                          <p className="text-[10px] text-moss-brown mt-1">The name appearing before your messages.</p>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-moss-brown uppercase tracking-widest mb-2">AI Label in File</label>
                          <input
                            type="text"
                            placeholder='e.g. "Llama", "Bot", "AI"'
                            className="w-full bg-white dark:bg-slate-800 border border-sandstone dark:border-slate-700 rounded-lg py-3 px-4 text-earth-dark dark:text-white focus:ring-1 focus:ring-sage-green outline-none"
                            value={customAiLabel}
                            onChange={(e) => setCustomAiLabel(e.target.value)}
                          />
                          <p className="text-[10px] text-moss-brown mt-1">The name appearing before the AI's responses.</p>
                      </div>
                  </div>
                  
                  <div className="border border-sandstone dark:border-slate-700 rounded-xl p-4 bg-sandstone/10 dark:bg-slate-800/50">
                      <p className="text-xs font-bold text-moss-brown mb-2 uppercase">Preview Raw Content (First 3 lines)</p>
                      <pre className="text-xs font-mono text-earth-dark dark:text-slate-400 whitespace-pre-wrap">
                          {rawContent.split('\n').slice(0, 3).join('\n')}
                      </pre>
                  </div>
              </div>
          )}

          {step === 'review' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-moss-brown uppercase tracking-widest mb-2">Entry Title</label>
                <input
                  type="text"
                  className="w-full bg-white dark:bg-slate-800 border border-sandstone dark:border-slate-700 rounded-lg py-3 px-4 text-earth-dark dark:text-white focus:ring-1 focus:ring-sage-green outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-moss-brown uppercase tracking-widest mb-2">AI Summary</label>
                <textarea
                  className="w-full bg-white dark:bg-slate-800 border border-sandstone dark:border-slate-700 rounded-lg py-3 px-4 text-earth-dark dark:text-slate-300 text-sm focus:ring-1 focus:ring-sage-green outline-none h-24 resize-none"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                 {embedding ? (
                     <div className="text-xs text-sage-green dark:text-green-400 flex items-center gap-1 font-bold">
                        <div className="w-2 h-2 rounded-full bg-sage-green dark:bg-green-400"></div>
                        Vector Embedding Generated
                     </div>
                 ) : (
                     <div className="text-xs text-orange-500 flex items-center gap-1 font-bold">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        No Embedding Available
                     </div>
                 )}
              </div>
              <div>
                <label className="block text-xs font-bold text-moss-brown uppercase tracking-widest mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-sage-green dark:text-blue-400 bg-sage-green/10 border border-sage-green/20 px-2 py-1 rounded">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-terracotta"><XIcon /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 border rounded-xl bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-terracotta dark:text-red-400 text-xs">
              {error.message}
            </div>
          )}
        </div>

        <div className="p-6 bg-warm-beige dark:bg-slate-900/50 border-t border-sandstone dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-moss-brown dark:text-slate-400">Cancel</button>
          
          {step === 'format' && (
            <button onClick={handleCustomFormatSubmit} disabled={isProcessing} className="bg-sage-green hover:bg-[#989a7a] text-white px-6 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-sage-green/20">
               {isProcessing ? 'Processing...' : 'Analyze Format'}
            </button>
          )}

          {step === 'review' && (
            <button onClick={handleFinalize} className="bg-sage-green hover:bg-[#989a7a] text-white px-6 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-sage-green/20">
              Archive Chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
