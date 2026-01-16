import { useState, useEffect } from 'react';
import { Plus, Brain, Upload, Settings, BarChart3, Network } from 'lucide-react';
import { ChatList } from './components/ChatList';
import { ChatView } from './components/ChatView';
import { NewChatModal } from './components/NewChatModal';
import { ImportModal } from './components/ImportModal';
import { SettingsModal } from './components/SettingsModal';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import NetworkVisualization from './components/NetworkVisualization';
import { seedExampleChatIfNeeded } from './utils/seedExampleChat';

function App() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isNetworkViewOpen, setIsNetworkViewOpen] = useState(false);
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
    <div className="h-screen flex flex-col bg-cream-50 dark:bg-mocha-900">
      <header className="bg-sand-50 dark:bg-mocha-800 border-b border-sand-200 dark:border-mocha-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-lime-400 to-lime-500 text-mocha-900 p-2 rounded-lg">
              <Brain size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-mocha-900 dark:text-cream-50">AI Knowledge Base</h1>
              <p className="text-sm text-mocha-600 dark:text-sand-300">Your personal collection of AI conversations</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsAnalyticsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-lime-400 to-lime-500 text-mocha-900 rounded-lg hover:from-lime-500 hover:to-lime-600 transition-all shadow-sm font-medium"
            >
              <BarChart3 size={20} />
              Analytics
            </button>
            <button
              onClick={() => setIsNetworkViewOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-coral-400 to-coral-500 text-white rounded-lg hover:from-coral-500 hover:to-coral-600 transition-all shadow-sm font-medium"
            >
              <Network size={20} />
              Network
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sand-200 dark:bg-mocha-700 text-mocha-800 dark:text-sand-200 rounded-lg hover:bg-sand-300 dark:hover:bg-mocha-600 transition-colors shadow-sm"
            >
              <Settings size={20} />
              Settings
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors shadow-sm"
            >
              <Upload size={20} />
              Import
            </button>
            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-lime-400 text-mocha-900 rounded-lg hover:bg-lime-500 transition-colors shadow-sm font-medium"
            >
              <Plus size={20} />
              New Chat
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-sand-50 dark:bg-mocha-800 border-r border-sand-200 dark:border-mocha-700 flex flex-col">
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
              onSelectChat={setSelectedChatId}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-mocha-400 dark:text-sand-400">
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

      {isAnalyticsOpen && (
        <AnalyticsDashboard
          onClose={() => setIsAnalyticsOpen(false)}
          onSelectChat={(chatId) => {
            setIsAnalyticsOpen(false);
            setSelectedChatId(chatId);
          }}
        />
      )}

      {isNetworkViewOpen && (
        <NetworkVisualization
          onClose={() => setIsNetworkViewOpen(false)}
          onSelectChat={(chatId) => {
            setIsNetworkViewOpen(false);
            setSelectedChatId(chatId);
          }}
          selectedChatId={selectedChatId}
        />
      )}
    </div>
  );
}

export default App;
