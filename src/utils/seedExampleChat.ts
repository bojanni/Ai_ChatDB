import { supabase } from '../lib/supabase';

const EXAMPLE_CHAT_FLAG = 'example_chat_seeded';

export async function seedExampleChatIfNeeded(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    if (localStorage.getItem(EXAMPLE_CHAT_FLAG) === 'true') {
      return false;
    }

    const { data: existingChats, error: chatsError } = await supabase
      .from('chats')
      .select('id')
      .limit(1);

    if (chatsError) {
      console.error('Error checking existing chats:', chatsError);
      return false;
    }

    if (existingChats && existingChats.length > 0) {
      localStorage.setItem(EXAMPLE_CHAT_FLAG, 'true');
      return false;
    }

    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        title: 'Building a React Dashboard with TypeScript',
        ai_source: 'ChatGPT',
        tags: ['react', 'typescript', 'state-management', 'context-api', 'performance', 'localstorage', 'hooks'],
        summary: 'A comprehensive discussion about implementing state management in a React TypeScript dashboard using Context API, with focus on performance optimization and localStorage persistence.',
      })
      .select()
      .single();

    if (chatError) {
      console.error('Error creating example chat:', chatError);
      return false;
    }

    const messages = [
      {
        chat_id: chat.id,
        role: 'user',
        content: "I'm building a dashboard application in React with TypeScript and I'm having trouble with state management. I have multiple components that need to share data about the current user, theme preferences, and notification settings. What's the best approach for this?",
      },
      {
        chat_id: chat.id,
        role: 'assistant',
        content: `For a dashboard application with shared state across multiple components, you have several good options depending on your needs:

1. **React Context API** (Built-in, good for simple to medium complexity):
\`\`\`typescript
interface AppContextType {
  user: User | null;
  theme: 'light' | 'dark';
  notifications: NotificationSettings;
  updateTheme: (theme: 'light' | 'dark') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notifications, setNotifications] = useState<NotificationSettings>({});

  const value = {
    user,
    theme,
    notifications,
    updateTheme: setTheme
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
\`\`\`

2. **Zustand** (Lightweight, great for medium complexity):
\`\`\`typescript
import create from 'zustand';

interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  notifications: NotificationSettings;
  setUser: (user: User | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  theme: 'light',
  notifications: {},
  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme })
}));
\`\`\`

For a dashboard, I'd recommend starting with Context API if it's your first time, or Zustand if you want something more scalable with less boilerplate.`,
      },
      {
        chat_id: chat.id,
        role: 'user',
        content: "I like the Context API approach. But I'm worried about performance. Won't every component re-render when any part of the context changes?",
      },
      {
        chat_id: chat.id,
        role: 'assistant',
        content: `Great question! Yes, that's a common concern with Context API. Here are strategies to optimize performance:

1. **Split contexts by concern**:
\`\`\`typescript
// Separate contexts for different concerns
const UserContext = createContext<UserContextType | undefined>(undefined);
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
\`\`\`

This way, components only re-render when their specific context changes.

2. **Use memo and useMemo**:
\`\`\`typescript
const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Memoize the context value
  const value = useMemo(() => ({
    user,
    theme,
    setUser,
    setTheme
  }), [user, theme]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
\`\`\`

3. **Custom hooks with selectors**:
\`\`\`typescript
export function useUser() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useUser must be used within AppProvider');
  return context.user;
}

export function useTheme() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useTheme must be used within AppProvider');
  return { theme: context.theme, setTheme: context.setTheme };
}
\`\`\`

This allows components to only subscribe to the specific parts they need.`,
      },
      {
        chat_id: chat.id,
        role: 'user',
        content: 'Perfect! One more thing - how do I persist the theme preference to localStorage so it survives page refreshes?',
      },
      {
        chat_id: chat.id,
        role: 'assistant',
        content: `You can add an effect to sync with localStorage. Here's a complete example:

\`\`\`typescript
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Initialize theme from localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  // Persist theme changes to localStorage
  useEffect(() => {
    localStorage.setItem('theme', theme);
    // Optional: apply theme to document
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const value = useMemo(() => ({
    user,
    theme,
    setUser,
    setTheme
  }), [user, theme]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
\`\`\`

You could also create a custom hook to make this reusable:

\`\`\`typescript
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.error('Failed to save to localStorage');
    }
  }, [key, value]);

  return [value, setValue] as const;
}

// Usage in your provider:
const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');
\`\`\`

This gives you automatic localStorage persistence for any value!`,
      },
      {
        chat_id: chat.id,
        role: 'user',
        content: 'This is exactly what I needed. Thanks for the detailed explanations and code examples!',
      },
      {
        chat_id: chat.id,
        role: 'assistant',
        content: "You're welcome! Good luck with your dashboard project. Feel free to ask if you run into any other issues with state management or TypeScript types!",
      },
    ];

    const { error: messagesError } = await supabase
      .from('messages')
      .insert(messages);

    if (messagesError) {
      console.error('Error creating example messages:', messagesError);
      return false;
    }

    localStorage.setItem(EXAMPLE_CHAT_FLAG, 'true');
    return true;

  } catch (error) {
    console.error('Error seeding example chat:', error);
    return false;
  }
}
