
import React from 'react';
import { ChatEntry, ItemType } from '../types';
import { SearchIcon, XIcon, MessageIcon, ActivityIcon, PencilIcon } from './Icons';
import { ChatCard } from './ChatCard';

interface SidebarProps {
  availableTags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  filteredChats: ChatEntry[];
  onSelectChat: (chat: ChatEntry) => void;
  currentChatId?: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onTagClick: (tag: string) => void;
  selectedType: ItemType | 'all';
  onTypeChange: (type: ItemType | 'all') => void;
  activeRelatedTags?: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  availableTags, 
  selectedTags, 
  onTagToggle,
  filteredChats,
  onSelectChat,
  currentChatId,
  searchQuery,
  setSearchQuery,
  onTagClick,
  selectedType,
  onTypeChange,
  activeRelatedTags = []
}) => {
  const hasActiveFilters = selectedTags.length > 0 || searchQuery.trim() !== '' || selectedType !== 'all';

  const clearAllFilters = () => {
    onTagToggle('All');
    setSearchQuery('');
    onTypeChange('all');
  };

  return (
    <aside className="w-80 border-r border-sandstone/40 dark:border-stone-800 bg-white dark:bg-stone-900/50 flex flex-col shrink-0 font-sans backdrop-blur-sm">
      
      {/* Search & Filter Header Container */}
      <div className="p-4 space-y-4 border-b border-sandstone/40 bg-white dark:bg-stone-900 z-10 shadow-sm">
        
        {/* Type Filter Segment Control Container */}
        <div className="flex p-1 bg-sandstone/10 dark:bg-stone-800/50 rounded-xl">
          {(['all', 'chat', 'note'] as const).map(t => (
            <button
              key={t}
              onClick={() => onTypeChange(t)}
              className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-lg flex items-center justify-center gap-2 ${
                selectedType === t 
                  ? t === 'note' 
                    ? 'bg-amber-500 text-white shadow-md scale-105' 
                    : t === 'chat' 
                        ? 'bg-sage-green text-white shadow-md scale-105'
                        : 'bg-stone-800 text-white shadow-md scale-105'
                  : 'text-moss-brown hover:text-earth-dark'
              }`}
            >
              {t === 'chat' && <MessageIcon className="w-3.5 h-3.5" />}
              {t === 'note' && <PencilIcon className="w-3.5 h-3.5" />}
              {t}
            </button>
          ))}
        </div>

        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-sage-green">
              <SearchIcon className="w-4 h-4" />
            </div>
            <input 
              type="text"
              placeholder="Query Archive..."
              className="w-full bg-slate-50 dark:bg-stone-800 border-2 border-sandstone/20 dark:border-stone-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:outline-none focus:border-sage-green transition-all text-earth-dark dark:text-white placeholder:text-moss-brown/60"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-moss-brown hover:text-terracotta"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
        </div>
        
        {/* Tag Filter Container */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            <button
                onClick={() => onTagToggle('All')}
                className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border-2 ${
                    selectedTags.length === 0
                    ? 'bg-sage-green border-sage-green text-white shadow-sm'
                    : 'bg-white dark:bg-stone-800 border-sandstone/30 text-moss-brown hover:border-sage-green/40'
                }`}
            >
                All Concepts
            </button>
            {availableTags.map(tag => {
                const isActive = selectedTags.includes(tag);
                return (
                    <button
                        key={tag}
                        onClick={() => onTagToggle(tag)}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border-2 ${
                            isActive
                            ? 'bg-terracotta border-terracotta text-white shadow-sm'
                            : 'bg-white dark:bg-stone-800 border-sandstone/30 text-moss-brown hover:border-terracotta/40'
                        }`}
                    >
                        {tag}
                    </button>
                );
            })}
        </div>
      </div>

      {/* Result Meta Container */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-stone-900/80 border-b border-sandstone/20 flex items-center justify-between">
          <span className="text-[10px] font-black text-moss-brown uppercase tracking-[0.2em]">
            {filteredChats.length} Memories
          </span>
          {hasActiveFilters && (
              <button onClick={clearAllFilters} className="text-[9px] font-black text-terracotta uppercase tracking-widest hover:underline">Clear Filters</button>
          )}
      </div>

      {/* Entry List Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-paper dark:bg-stone-950 scrollbar-thin">
        {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center opacity-50">
                <div className="w-16 h-16 bg-sandstone/10 rounded-full flex items-center justify-center mb-4 text-sandstone">
                    <SearchIcon className="w-8 h-8" />
                </div>
                <p className="text-xs font-black text-earth-dark uppercase tracking-widest mb-1">Silence in Archive</p>
                <p className="text-[10px] text-moss-brown italic leading-relaxed">No traces found for this conceptual filter.</p>
            </div>
        ) : (
            filteredChats.map(chat => (
                <ChatCard 
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChatId}
                    onClick={() => onSelectChat(chat)}
                    onTagClick={onTagClick}
                    activeRelatedTags={activeRelatedTags}
                />
            ))
        )}
      </div>
    </aside>
  );
};
