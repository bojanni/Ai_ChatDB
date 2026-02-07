
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChatEntry, Settings, ItemType, Link } from '../types';
import { XIcon, TagIcon, NetworkIcon, ChartIcon, MessageIcon, ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, RefreshIcon, PencilIcon, SearchIcon, PlusIcon, BoltIcon } from './Icons';
import { analyzeChatContent } from '../services/geminiService';
import { parseChatMessages, Message } from '../utils/chatUtils';
import { ChatCard } from './ChatCard';
import { cosineSimilarity } from '../utils/vectorUtils';

interface ChatViewerProps {
  chat: ChatEntry;
  allChats: ChatEntry[];
  allLinks: Link[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (chat: ChatEntry) => void;
  onSelectChat: (chat: ChatEntry, fromMindMap?: boolean) => void;
  onAddLink: (fromId: string, toId: string, type?: string) => void;
  onRemoveLink: (fromId: string, toId: string) => void;
  settings: Settings;
  returnToMindMap?: boolean;
  onTagClick: (tag: string) => void;
  activeRelatedTags?: string[];
}

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
);

const CodeBlock: React.FC<{ lang: string; code: string }> = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-lg overflow-hidden bg-[#1c1917] border border-stone-800 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-[#292524] border-b border-stone-800">
        <span className="text-xs font-mono text-stone-400 lowercase">{lang || 'code'}</span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-stone-400 hover:text-white transition-colors"
        >
          <CopyIcon />
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>
      <div className="p-5 overflow-x-auto">
        <pre className="font-mono text-sm leading-relaxed text-stone-200">
          <code>{code.trim()}</code>
        </pre>
      </div>
    </div>
  );
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/```/);
  
  return (
    <div className="prose dark:prose-invert max-w-none text-base leading-8 text-stone-700 dark:text-stone-300">
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const firstLineBreak = part.indexOf('\n');
          let lang = '';
          let code = part;
          if (firstLineBreak > -1) {
             const firstLine = part.substring(0, firstLineBreak).trim();
             if (firstLine && !firstLine.includes(' ')) { 
                 lang = firstLine;
                 code = part.substring(firstLineBreak + 1);
             }
          }
          return <CodeBlock key={i} lang={lang} code={code} />;
        } else {
          return (
            <div key={i} className="whitespace-pre-wrap font-serif">
              {part.split(/(\*\*.*?\*\*|###.*?$|^#.*?$)/gm).map((chunk, j) => {
                 if (chunk.startsWith('**') && chunk.endsWith('**')) {
                     return <strong key={j} className="text-stone-900 dark:text-white font-bold">{chunk.slice(2, -2)}</strong>;
                 }
                 if (chunk.trim().startsWith('#')) {
                    const level = chunk.trim().match(/^#+/)?.[0].length || 0;
                    const content = chunk.trim().replace(/^#+\s*/, '');
                    if (level === 1) return <h1 key={j} className="text-2xl font-black mt-6 mb-4 text-stone-900 dark:text-white font-sans uppercase tracking-tight">{content}</h1>;
                    if (level === 2) return <h2 key={j} className="text-xl font-black mt-6 mb-3 text-stone-900 dark:text-white font-sans uppercase">{content}</h2>;
                    if (level === 3) return <h3 key={j} className="text-lg font-bold mt-4 mb-2 text-stone-900 dark:text-white font-sans">{content}</h3>;
                 }
                 return chunk;
              })}
            </div>
          );
        }
      })}
    </div>
  );
};

const UserAvatar = ({ avatar }: { avatar?: string }) => {
  if (avatar) {
    return <img src={avatar} className="w-8 h-8 rounded-lg object-cover border border-[#DBAA89]" alt="User" />;
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-[#DBAA89] flex items-center justify-center text-white shrink-0 shadow-sm">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    </div>
  );
};

const UserMessageBubble: React.FC<{ message: Message; userAvatar?: string; userName?: string }> = ({ message, userAvatar, userName }) => {
  let displayName = message.name;
  if (userName && userName.trim()) {
      displayName = userName.trim().split(' ')[0];
  }

  return (
    <div className="flex gap-4 mt-8 mb-8 p-6 bg-white dark:bg-stone-800 rounded-2xl border border-sandstone/30 dark:border-stone-700/50 shadow-md">
      <UserAvatar avatar={userAvatar} />
      <div className="flex flex-col flex-1">
        <span className="text-xs font-black uppercase tracking-widest text-sage-green mb-2">{displayName || 'Author'}</span>
        <div className="text-stone-700 dark:text-stone-300 text-base leading-relaxed">
            <FormattedText text={message.text} />
        </div>
      </div>
    </div>
  );
};

const AIMessageContent: React.FC<{ message: Message; source: string }> = ({ message, source }) => {
  return (
    <div className="mb-10 pl-4 border-l-4 border-sage-green/20">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-moss-brown mb-4 block">{source} Response</span>
      <FormattedText text={message.text} />
    </div>
  );
};

export const ChatViewer: React.FC<ChatViewerProps> = ({ 
  chat, allChats, allLinks, onClose, onDelete, onUpdate, onSelectChat, onAddLink, onRemoveLink, settings, returnToMindMap, onTagClick, activeRelatedTags = [] 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const [editSummary, setEditSummary] = useState(chat.summary);
  const [editTags, setEditTags] = useState<string[]>(chat.tags);
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const isNote = chat.type === ItemType.NOTE;

  useEffect(() => {
    setEditTitle(chat.title);
    setEditSummary(chat.summary);
    setEditTags(chat.tags);
    setIsEditing(false);
    setIsDetecting(false);
    setHasScanned(false);
    setIsLinking(false);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [chat.id]);

  const parsedMessages = useMemo(() => {
    return parseChatMessages(chat.content, chat.createdAt);
  }, [chat.content, chat.createdAt]);

  // Logic for explicit manual links
  const manualLinkedChats = useMemo(() => {
    const relevantLinks = allLinks.filter(l => l.fromId === chat.id || l.toId === chat.id);
    const linkedIds = relevantLinks.map(l => l.fromId === chat.id ? l.toId : l.fromId);
    return allChats.filter(c => linkedIds.includes(c.id));
  }, [chat.id, allLinks, allChats]);

  const linkSearchResults = useMemo(() => {
    if (!linkSearch.trim()) return [];
    const q = linkSearch.toLowerCase();
    const currentLinkedIds = new Set(manualLinkedChats.map(c => c.id));
    return allChats
      .filter(c => c.id !== chat.id && !currentLinkedIds.has(c.id))
      .filter(c => c.title.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q))
      .slice(0, 5);
  }, [linkSearch, allChats, chat.id, manualLinkedChats]);

  const relatedChatsWithScores = useMemo(() => {
    if (!chat || allChats.length <= 1) return [];

    const getTokens = (str: string) => str.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const currentTitleTokens = new Set(getTokens(chat.title));
    const currentSummaryTokens = new Set(getTokens(chat.summary));
    const currentTags = chat.tags.map(t => t.toLowerCase());

    const result = allChats
      .filter(c => c.id !== chat.id)
      .map(other => {
        let score = 0;
        let semanticScore = 0;
        if (chat.embedding && other.embedding) {
          semanticScore = cosineSimilarity(chat.embedding, other.embedding);
          score += semanticScore * 50;
        }
        const commonTags = other.tags.filter(t => currentTags.includes(t.toLowerCase()));
        score += commonTags.length * 10;
        const otherTitleTokens = getTokens(other.title);
        const titleMatches = otherTitleTokens.filter(t => currentTitleTokens.has(t));
        score += titleMatches.length * 5;
        const otherSummaryTokens = getTokens(other.summary);
        const summaryMatches = otherSummaryTokens.filter(t => currentSummaryTokens.has(t));
        score += summaryMatches.length * 2;
        return { chat: other, score, semanticMatch: semanticScore > 0 ? Math.round(semanticScore * 100) : null };
      });

    return result
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score > 1)
      .slice(0, settings.relatedChatsLimit || 6);

  }, [chat, allChats, settings.relatedChatsLimit]);

  const handleSave = () => { onUpdate({ ...chat, title: editTitle, summary: editSummary, tags: editTags }); setIsEditing(false); };
  
  const handleDetect = () => {
    setIsDetecting(true);
    setHasScanned(false);
    setTimeout(() => {
      setIsDetecting(false);
      setHasScanned(true);
    }, 1500);
  };

  const currentIndex = allChats.findIndex(c => c.id === chat.id);
  const prevChat = currentIndex > 0 ? allChats[currentIndex - 1] : null;
  const nextChat = currentIndex !== -1 && currentIndex < allChats.length - 1 ? allChats[currentIndex + 1] : null;

  const dateObj = new Date(chat.createdAt);
  const formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-paper dark:bg-stone-950">
      {/* Header */}
      <div className="px-8 py-6 border-b shrink-0 bg-white dark:bg-stone-900 border-sandstone dark:border-stone-800">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4 min-h-[32px]">
                <div>
                    {returnToMindMap && (
                        <button 
                            onClick={onClose}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-lg transition-all transform hover:-translate-y-0.5 ${isNote ? 'bg-amber-600 hover:bg-amber-500' : 'bg-sage-green hover:bg-[#929475]'}`}
                        >
                            <ArrowLeftIcon />
                            Neural Map
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => prevChat && onSelectChat(prevChat, returnToMindMap)}
                        disabled={!prevChat}
                        className={`p-2 rounded-lg border transition-all ${
                            prevChat 
                            ? 'bg-white dark:bg-stone-800 border-sandstone dark:border-stone-700 text-earth-dark dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 shadow-sm active:scale-90' 
                            : 'opacity-30 cursor-not-allowed border-transparent text-stone-400'
                        }`}
                    >
                        <ChevronLeftIcon />
                    </button>
                    <button 
                        onClick={() => nextChat && onSelectChat(nextChat, returnToMindMap)}
                        disabled={!nextChat}
                        className={`p-2 rounded-lg border transition-all ${
                            nextChat 
                            ? 'bg-white dark:bg-stone-800 border-sandstone dark:border-stone-700 text-earth-dark dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700 shadow-sm active:scale-90' 
                            : 'opacity-30 cursor-not-allowed border-transparent text-stone-400'
                        }`}
                    >
                        <ChevronRightIcon />
                    </button>
                </div>
            </div>
            <div className="flex justify-between items-start mb-2">
                {isEditing ? (
                    <input 
                        className={`text-2xl font-black bg-white dark:bg-stone-800 border-2 rounded-xl px-4 py-2 text-earth-dark dark:text-white w-full outline-none focus:border-sage-green ${isNote ? 'font-serif border-amber-300' : 'font-sans border-sandstone'}`}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                    />
                ) : (
                    <div className="flex items-center gap-4">
                         <div className={`p-3 rounded-2xl text-white ${isNote ? 'bg-amber-500 shadow-amber-500/20' : 'bg-sage-green shadow-sage-green/20'} shadow-xl`}>
                             {isNote ? <PencilIcon className="w-6 h-6" /> : <MessageIcon className="w-6 h-6" />}
                         </div>
                         <div>
                            <h1 className={`text-2xl font-black text-stone-900 dark:text-white ${isNote ? 'font-serif italic' : 'font-sans uppercase tracking-tight'}`}>{chat.title}</h1>
                            <div className="flex items-center gap-2 text-[10px] font-black text-moss-brown uppercase tracking-[0.2em] mt-1">
                                <span>{isNote ? 'PERSONAL SYNTHESIS' : chat.source}</span>
                                <span>•</span>
                                <span>{formattedDate}</span>
                            </div>
                         </div>
                    </div>
                )}
                <div className="flex items-center gap-2 ml-4 shrink-0">
                     <button className={`flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${isNote ? 'bg-amber-600 hover:bg-amber-500' : 'bg-sage-green hover:bg-[#929475]'}`}>
                        <SparklesIcon />
                        {isNote ? 'Refine' : 'Summarize'}
                     </button>
                     <div className="w-px h-6 bg-sandstone/40 dark:bg-stone-700 mx-2"></div>
                     <button onClick={() => setIsEditing(!isEditing)} className="p-2 text-moss-brown hover:text-earth-dark dark:hover:text-stone-200 transition-colors bg-white dark:bg-stone-800 rounded-lg border border-sandstone/20"><EditIcon /></button>
                     <button onClick={() => confirm('Delete permanently?') && onDelete(chat.id)} className="p-2 text-terracotta hover:text-red-600 transition-colors bg-white dark:bg-stone-800 rounded-lg border border-sandstone/20"><TrashIcon /></button>
                </div>
            </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10 space-y-12">
            
            {/* Meta Block */}
            <div className={`border-2 rounded-3xl p-8 relative shadow-sm transition-all duration-300 ${isNote ? 'bg-amber-50/30 border-amber-200 dark:bg-amber-950/10' : 'bg-slate-50/50 border-sandstone/30 dark:bg-stone-900/40'}`}>
                <div className={`absolute -top-3 left-8 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-md ${isNote ? 'bg-amber-500' : 'bg-sage-green'}`}>
                    Intelligence Abstract
                </div>
                <div className="flex gap-4">
                    <div className={`${isNote ? 'text-amber-500' : 'text-sage-green'} pt-1`}>
                        <SparklesIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        {isEditing ? (
                            <textarea className="w-full bg-white dark:bg-stone-800 border-2 border-sandstone/30 rounded-xl p-4 text-sm font-serif italic outline-none focus:border-sage-green" value={editSummary} onChange={(e) => setEditSummary(e.target.value)} />
                        ) : (
                            <p className={`text-base leading-relaxed italic ${isNote ? 'text-amber-900/80 dark:text-stone-300 font-serif' : 'text-stone-700 dark:text-stone-400 font-serif'}`}>
                                {chat.summary}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 px-2">
                {(isEditing ? editTags : chat.tags).map(tag => (
                    <button 
                        key={tag} 
                        onClick={() => !isEditing && onTagClick(tag)}
                        className={`px-3 py-1.5 rounded-xl border-2 text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5 transition-all ${
                            isNote ? 'bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200' : 'bg-sage-green/10 border-sage-green/20 text-sage-green hover:bg-sage-green/20'
                        }`}
                    >
                        <TagIcon className="w-3 h-3" />
                        {tag}
                        {isEditing && <div onClick={(e) => { e.stopPropagation(); setEditTags(editTags.filter(t => t !== tag)); }} className="ml-1 hover:text-red-500"><XIcon className="w-3 h-3" /></div>}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className={`relative transition-all duration-700 min-h-[400px] ${
                isNote 
                  ? 'bg-[#FFFDF7] dark:bg-stone-900 p-12 md:p-16 rounded-[2rem] shadow-2xl border-2 border-dashed border-amber-200 dark:border-amber-900/30' 
                  : 'bg-transparent space-y-4'
            }`}>
                {isNote && (
                    <div className="absolute top-0 left-0 right-0 h-12 bg-amber-50/20 rounded-t-[2rem] border-b border-dashed border-amber-200/30 flex items-center px-10">
                        <div className="flex gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-200/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-200/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-200/50"></div>
                        </div>
                    </div>
                )}
                
                <div className={`${isNote ? 'mt-4' : ''}`}>
                    {isNote ? (
                        <div className="max-w-none">
                             <FormattedText text={chat.content} />
                        </div>
                    ) : (
                        parsedMessages.map((msg, idx) => {
                            if (msg.role === 'user') {
                                return <UserMessageBubble key={idx} message={msg} userAvatar={settings.userAvatar} userName={settings.userName} />;
                            } else {
                                return <AIMessageContent key={idx} message={msg} source={chat.source} />;
                            }
                        })
                    )}
                </div>
            </div>

            {/* Manual Links Section (NEW) */}
            <div className="mt-24 pt-12 border-t border-sandstone/20">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 dark:bg-stone-800 p-2 rounded-lg text-amber-600"><BoltIcon className="w-4 h-4" /></div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-moss-brown">Knowledge Connections</h3>
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => setIsLinking(!isLinking)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${isLinking ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white dark:bg-stone-800 border-sandstone/30 text-stone-600 dark:text-stone-300 hover:border-amber-500'}`}
                        >
                            <PlusIcon className="w-3 h-3" />
                            {isLinking ? 'Done Linking' : 'Add Link'}
                        </button>
                        
                        {isLinking && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-sandstone/30 z-30 p-4 animate-in fade-in slide-in-from-top-2">
                                <div className="relative mb-4">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-moss-brown"><SearchIcon className="w-3 h-3" /></div>
                                    <input 
                                        type="text"
                                        placeholder="Search by title..."
                                        className="w-full bg-slate-50 dark:bg-stone-900 border border-sandstone/20 rounded-lg py-2 pl-8 pr-3 text-[10px] font-bold outline-none focus:border-amber-500"
                                        value={linkSearch}
                                        onChange={(e) => setLinkSearch(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    {linkSearchResults.map(res => (
                                        <button 
                                            key={res.id}
                                            onClick={() => { onAddLink(chat.id, res.id); setLinkSearch(''); }}
                                            className="w-full text-left p-3 rounded-xl border border-transparent hover:border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all flex items-center gap-3 group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-sandstone/10 flex items-center justify-center shrink-0 group-hover:bg-amber-100">
                                                {res.type === ItemType.NOTE ? <PencilIcon className="w-3.5 h-3.5" /> : <MessageIcon className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="truncate">
                                                <p className="text-[10px] font-black text-earth-dark dark:text-stone-200 truncate">{res.title}</p>
                                                <p className="text-[9px] text-moss-brown truncate">{res.source}</p>
                                            </div>
                                        </button>
                                    ))}
                                    {linkSearch && linkSearchResults.length === 0 && (
                                        <p className="text-[10px] text-center text-moss-brown italic py-2">No results found.</p>
                                    )}
                                    {!linkSearch && (
                                        <p className="text-[10px] text-center text-moss-brown italic py-2">Start typing to search archive...</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {manualLinkedChats.map(linked => (
                        <div key={linked.id} className="relative group">
                            <button 
                                onClick={() => onRemoveLink(chat.id, linked.id)}
                                className="absolute -top-2 -right-2 z-20 bg-white dark:bg-stone-800 text-terracotta border border-sandstone/30 p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-terracotta hover:text-white"
                            >
                                <XIcon className="w-3 h-3" />
                            </button>
                            <div className="scale-95 origin-top-left w-full transition-transform hover:scale-[0.98]">
                                <ChatCard 
                                    chat={linked} 
                                    onClick={() => onSelectChat(linked)} 
                                    isActive={false} 
                                    onTagClick={onTagClick}
                                    activeRelatedTags={activeRelatedTags}
                                />
                            </div>
                        </div>
                    ))}
                    {manualLinkedChats.length === 0 && (
                        <div className="col-span-full py-12 px-8 text-center bg-slate-50 dark:bg-stone-900/30 rounded-3xl border border-dashed border-sandstone/40">
                            <p className="text-[10px] text-moss-brown dark:text-stone-500 font-serif italic leading-relaxed">
                                Use the 'Add Link' tool to explicitly connect this synthesis to specific raw logs or other notes.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Neural Proximity Section */}
            <div className="mt-24 pt-12 border-t border-sandstone/20">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-sandstone/10 p-2 rounded-lg text-moss-brown"><NetworkIcon /></div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-moss-brown">Neural Proximity</h3>
                    </div>
                    <button 
                        onClick={handleDetect}
                        disabled={isDetecting}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                            isDetecting 
                            ? 'bg-sage-green/10 border-sage-green text-sage-green cursor-wait' 
                            : 'bg-white dark:bg-stone-800 border-sandstone/30 text-stone-600 dark:text-stone-300 hover:border-sage-green shadow-sm'
                        }`}
                    >
                        {isDetecting ? (
                            <>
                                <RefreshIcon className="w-3 h-3 animate-spin" />
                                Analyzing Neural Map...
                            </>
                        ) : (
                            <>
                                <BoltIcon className="w-3 h-3" />
                                {hasScanned ? 'Rescan Connections' : 'Scan Connections'}
                            </>
                        )}
                    </button>
                </div>

                <div className="relative min-h-[100px]">
                    {isDetecting && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-paper/50 dark:bg-stone-950/50 backdrop-blur-sm rounded-3xl animate-in fade-in">
                            <div className="flex gap-1 mb-2">
                                <div className="w-2 h-2 rounded-full bg-sage-green animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 rounded-full bg-sage-green animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 rounded-full bg-sage-green animate-bounce"></div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-sage-green">Querying Vector Space</span>
                        </div>
                    )}

                    {!isDetecting && relatedChatsWithScores.length > 0 ? (
                        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500 ${hasScanned ? 'opacity-100 translate-y-0' : 'opacity-70 grayscale'}`}>
                            {relatedChatsWithScores.map(({ chat: related, semanticMatch }) => (
                                <div key={related.id} className="relative group">
                                    {semanticMatch !== null && (
                                        <div className="absolute -top-2 -right-2 z-20 bg-lime-500 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-lg border border-lime-400 uppercase tracking-tighter">
                                            {semanticMatch}% Match
                                        </div>
                                    )}
                                    <div className="scale-95 origin-top-left w-full transition-transform hover:scale-[0.98]">
                                        <ChatCard 
                                            chat={related} 
                                            onClick={() => onSelectChat(related)} 
                                            isActive={false} 
                                            onTagClick={onTagClick}
                                            activeRelatedTags={activeRelatedTags}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        !isDetecting && (
                            <div className="flex flex-col items-center justify-center py-12 px-8 text-center bg-slate-50 dark:bg-stone-900/30 rounded-3xl border border-dashed border-sandstone/40">
                                <div className="bg-white dark:bg-stone-800 p-3 rounded-full shadow-sm mb-4 text-moss-brown">
                                    <NetworkIcon className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-black text-earth-dark dark:text-stone-300 uppercase tracking-widest mb-2">
                                    {hasScanned ? 'The Neural Map is Empty' : 'Neural Analysis Idle'}
                                </p>
                                <p className="text-[10px] text-moss-brown dark:text-stone-500 font-serif italic max-w-xs leading-relaxed">
                                    {hasScanned 
                                        ? "No other conversations share conceptual similarities with this chronicle." 
                                        : "Click 'Scan Connections' to initiate an AI-powered semantic search across your entire archive."
                                    }
                                </p>
                            </div>
                        )
                    )}
                </div>
            </div>

            {isEditing && (
                 <div className="sticky bottom-8 flex gap-3 justify-end animate-in slide-in-from-bottom-4">
                     <button onClick={() => setIsEditing(false)} className="px-6 py-3 rounded-2xl bg-white text-stone-500 font-black text-[10px] uppercase border border-sandstone/30 shadow-lg">Discard</button>
                     <button onClick={handleSave} className={`px-8 py-3 rounded-2xl text-white font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all ${isNote ? 'bg-amber-600' : 'bg-sage-green'}`}>Commit Synthesis</button>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};
