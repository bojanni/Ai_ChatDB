import { useState, useEffect } from 'react';
import { Plus, Brain, Upload, Settings } from 'lucide-react';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { NewChatModal } from './components/NewChatModal';
import { ImportModal } from './components/ImportModal';
import { SettingsModal } from './components/SettingsModal';
import { seedExampleChatIfNeeded } from './utils/seedExampleChat';

function App() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const darkMode = localStorage.getItem('dark_mode') === 'true';
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }

    seedExampleChatIfNeeded().then((seeded) => {
      if (seeded) {
        setRefreshTrigger((prev) => prev + 1);
      }
    });
  }, []);

  function handleChatCreated() {
    setRefreshTrigger((prev) => prev + 1);
  }

  function handleChatDeleted() {
    setSelectedChatId(null);
    setRefreshTrigger((prev) => prev + 1);
  }

  function handleImportComplete() {
    setRefreshTrigger((prev) => prev + 1);
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-2 rounded-lg">
              <Brain size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Knowledge Base</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Your personal collection of AI conversations</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm"
            >
              <Settings size={20} />
              Settings
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 dark:bg-slate-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-500 transition-colors shadow-sm"
            >
              <Upload size={20} />
              Import
            </button>
            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
            >
              <Plus size={20} />
              New Chat
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
          <ChatList
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            refreshTrigger={refreshTrigger}
          />
        </aside>

        <main className="flex-1 overflow-hidden">
          {selectedChatId ? (
            <ChatView
              chatId={selectedChatId}
              onChatDeleted={handleChatDeleted}
              onSelectTag={setSelectedTag}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <Brain size={64} className="opacity-50 mb-4" />
              <p className="text-lg">Select a chat to view its content</p>
              <p className="text-sm mt-2">or create a new one to get started</p>
            </div>
          )}
        </main>
      </div>

      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onChatCreated={handleChatCreated}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}

export default App;
