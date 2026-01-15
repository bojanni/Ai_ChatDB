import { useState, useEffect } from 'react';
import { X, Key, Moon, Sun, Save, User, Cpu } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  phone: string;
  email: string;
  ai_provider: string;
  ai_endpoint: string;
  ai_model: string;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    address: '',
    city: '',
    country: '',
    postal_code: '',
    phone: '',
    email: '',
    ai_provider: 'openai',
    ai_endpoint: '',
    ai_model: 'gpt-4',
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  async function loadSettings() {
    const storedApiKey = localStorage.getItem('openai_api_key');
    const storedDarkMode = localStorage.getItem('dark_mode') === 'true';

    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    setDarkMode(storedDarkMode);

    const { data, error } = await supabase
      .from('user_profile')
      .select('*')
      .maybeSingle();

    if (data && !error) {
      setProfile(data);
    }
  }

  async function handleSave() {
    setSaving(true);

    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
    } else {
      localStorage.removeItem('openai_api_key');
    }

    localStorage.setItem('dark_mode', darkMode.toString());

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (profile.id) {
      await supabase
        .from('user_profile')
        .update({
          name: profile.name,
          address: profile.address,
          city: profile.city,
          country: profile.country,
          postal_code: profile.postal_code,
          phone: profile.phone,
          email: profile.email,
          ai_provider: profile.ai_provider,
          ai_endpoint: profile.ai_endpoint,
          ai_model: profile.ai_model,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);
    }

    setSaving(false);
    onClose();
  }

  function handleDarkModeToggle(enabled: boolean) {
    setDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function updateProfile(field: keyof UserProfile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-cream-50 dark:bg-mocha-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-sand-200 dark:border-sand-700">
          <h2 className="text-2xl font-semibold text-mocha-900 dark:text-cream-50">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-mocha-400 hover:text-mocha-600 dark:hover:text-sand-300 hover:bg-sand-100 dark:hover:bg-mocha-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-mocha-900 dark:text-cream-50 mb-4 flex items-center gap-2">
              <User size={20} />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-mocha-700 dark:text-sand-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => updateProfile('name', e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-sand-300 dark:border-sand-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-cream-50 dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-mocha-700 dark:text-sand-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => updateProfile('email', e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 border border-sand-300 dark:border-sand-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-cream-50 dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-mocha-700 dark:text-sand-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => updateProfile('phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="w-full px-3 py-2 border border-sand-300 dark:border-sand-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-cream-50 dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-mocha-700 dark:text-sand-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => updateProfile('city', e.target.value)}
                  placeholder="New York"
                  className="w-full px-3 py-2 border border-sand-300 dark:border-sand-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-cream-50 dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-mocha-700 dark:text-sand-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => updateProfile('address', e.target.value)}
                  placeholder="123 Main St"
                  className="w-full px-3 py-2 border border-sand-300 dark:border-sand-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-cream-50 dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-mocha-700 dark:text-sand-300 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={profile.country}
                  onChange={(e) => updateProfile('country', e.target.value)}
                  placeholder="United States"
                  className="w-full px-3 py-2 border border-sand-300 dark:border-sand-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-cream-50 dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-mocha-700 dark:text-sand-300 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={profile.postal_code}
                  onChange={(e) => updateProfile('postal_code', e.target.value)}
                  placeholder="10001"
                  className="w-full px-3 py-2 border border-sand-300 dark:border-sand-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-cream-50 dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-sand-200 dark:border-sand-700 pt-6">
            <h3 className="text-lg font-semibold text-mocha-900 dark:text-cream-50 mb-4 flex items-center gap-2">
              <Cpu size={20} />
              AI Configuration
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-mocha-700 dark:text-sand-300 mb-2">
                  AI Provider
                </label>
                <select
                  value={profile.ai_provider}
                  onChange={(e) => updateProfile('ai_provider', e.target.value)}
                  className="w-full px-3 py-2 border border-sand-300 dark:border-sand-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-cream-50 dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                >
                  <option value="openai">OpenAI (Cloud)</option>
                  <option value="gemini">Google Gemini (Cloud)</option>
                  <option value="claude">Anthropic Claude (Cloud)</option>
                  <option value="deepseek">DeepSeek (Cloud)</option>
                  <option value="qwen">Qwen (Cloud)</option>
                  <option value="ollama">Ollama (Local)</option>
                  <option value="lmstudio">LM Studio (Local)</option>
                </select>
                <p className="text-xs text-mocha-500 dark:text-sand-400 mt-2">
                  Choose between cloud-based AI providers or local AI models
                </p>
              </div>

              {['openai', 'gemini', 'claude', 'deepseek', 'qwen'].includes(profile.ai_provider) && (
                <div>
                  <label className="block text-sm font-medium text-mocha-700 dark:text-sand-300 mb-2">
                    {profile.ai_provider === 'openai' && 'OpenAI API Key'}
                    {profile.ai_provider === 'gemini' && 'Google Gemini API Key'}
                    {profile.ai_provider === 'claude' && 'Anthropic Claude API Key'}
                    {profile.ai_provider === 'deepseek' && 'DeepSeek API Key'}
                    {profile.ai_provider === 'qwen' && 'Qwen API Key'}
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        profile.ai_provider === 'openai' ? 'sk-...' :
                        profile.ai_provider === 'gemini' ? 'AIza...' :
                        profile.ai_provider === 'claude' ? 'sk-ant-...' :
                        'Enter your API key'
                      }
                      className="w-full px-3 py-2 pr-10 border border-sand-300 dark:border-sand-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-cream-50 dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-mocha-400 hover:text-mocha-600 dark:hover:text-sand-300"
                    >
                      {showApiKey ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-mocha-500 dark:text-sand-400 mt-2">
                    {profile.ai_provider === 'openai' && (
                      <>Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-lime-500 hover:underline">OpenAI Platform</a></>
                    )}
                    {profile.ai_provider === 'gemini' && (
                      <>Get your key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-lime-500 hover:underline">Google AI Studio</a></>
                    )}
                    {profile.ai_provider === 'claude' && (
                      <>Get your key from <a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener noreferrer" className="text-lime-500 hover:underline">Anthropic Console</a></>
                    )}
                    {profile.ai_provider === 'deepseek' && (
                      <>Get your key from <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-lime-500 hover:underline">DeepSeek Platform</a></>
                    )}
                    {profile.ai_provider === 'qwen' && (
                      <>Get your key from <a href="https://dashscope.aliyun.com/apiKey" target="_blank" rel="noopener noreferrer" className="text-lime-500 hover:underline">Alibaba Cloud</a></>
                    )}
                  </p>
                </div>
              )}

              {(profile.ai_provider === 'ollama' || profile.ai_provider === 'lmstudio') && (
                <div>
                  <label className="block text-sm font-medium text-mocha-700 dark:text-sand-300 mb-2">
                    {profile.ai_provider === 'ollama' ? 'Ollama' : 'LM Studio'} Endpoint
                  </label>
                  <input
                    type="text"
                    value={profile.ai_endpoint}
                    onChange={(e) => updateProfile('ai_endpoint', e.target.value)}
                    placeholder={profile.ai_provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'}
                    className="w-full px-3 py-2 border border-sand-300 dark:border-sand-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-cream-50 dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                  />
                  <p className="text-xs text-mocha-500 dark:text-sand-400 mt-2">
                    {profile.ai_provider === 'ollama'
                      ? 'Default: http://localhost:11434. Make sure Ollama is running locally.'
                      : 'Default: http://localhost:1234. Make sure LM Studio is running locally.'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-mocha-700 dark:text-sand-300 mb-2">
                  Model Name
                </label>
                <input
                  type="text"
                  value={profile.ai_model}
                  onChange={(e) => updateProfile('ai_model', e.target.value)}
                  placeholder={
                    profile.ai_provider === 'openai' ? 'gpt-4' :
                    profile.ai_provider === 'gemini' ? 'gemini-pro' :
                    profile.ai_provider === 'claude' ? 'claude-3-5-sonnet-20241022' :
                    profile.ai_provider === 'deepseek' ? 'deepseek-chat' :
                    profile.ai_provider === 'qwen' ? 'qwen-turbo' :
                    profile.ai_provider === 'ollama' ? 'llama2' :
                    'local-model'
                  }
                  className="w-full px-3 py-2 border border-sand-300 dark:border-sand-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-cream-50 dark:bg-mocha-700 text-mocha-900 dark:text-cream-50"
                />
                <p className="text-xs text-mocha-500 dark:text-sand-400 mt-2">
                  {profile.ai_provider === 'openai' && 'e.g., gpt-4, gpt-3.5-turbo, gpt-4-turbo'}
                  {profile.ai_provider === 'gemini' && 'e.g., gemini-pro, gemini-1.5-pro, gemini-1.5-flash'}
                  {profile.ai_provider === 'claude' && 'e.g., claude-3-5-sonnet-20241022, claude-3-opus-20240229'}
                  {profile.ai_provider === 'deepseek' && 'e.g., deepseek-chat, deepseek-coder'}
                  {profile.ai_provider === 'qwen' && 'e.g., qwen-turbo, qwen-plus, qwen-max'}
                  {profile.ai_provider === 'ollama' && 'e.g., llama2, mistral, codellama'}
                  {profile.ai_provider === 'lmstudio' && 'The model name configured in LM Studio'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-sand-200 dark:border-sand-700 pt-6">
            <h3 className="text-lg font-semibold text-mocha-900 dark:text-cream-50 mb-4">Appearance</h3>
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {darkMode ? (
                    <Moon size={20} className="text-mocha-600 dark:text-sand-300" />
                  ) : (
                    <Sun size={20} className="text-mocha-600 dark:text-sand-300" />
                  )}
                  <label className="text-sm font-medium text-mocha-700 dark:text-sand-300">
                    Dark Mode
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => handleDarkModeToggle(!darkMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    darkMode ? 'bg-lime-600' : 'bg-sand-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-cream-50 transition-transform ${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-mocha-500 dark:text-sand-400 mt-2">
                Toggle between light and dark theme
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-sand-200 dark:border-sand-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-sand-200 dark:bg-sand-700 text-mocha-700 dark:text-sand-300 rounded-lg hover:bg-sand-300 dark:hover:bg-sand-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-lime-500 text-cream-50 rounded-lg hover:bg-lime-600 transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
