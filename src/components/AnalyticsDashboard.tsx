import { useState, useEffect } from 'react';
import { BarChart3, MessageSquare, Calendar, Tag, TrendingUp, Sparkles, Network } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import NetworkVisualization from './NetworkVisualization';

type Chat = Database['public']['Tables']['chats']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

interface ChatStats {
  totalChats: number;
  messageCount: number;
  mostUsedAI: string;
  popularTags: Array<{ tag: string; count: number }>;
  chatsByDay: Array<{ date: string; count: number }>;
  avgMessagesPerChat: number;
  aiSourceBreakdown: Array<{ source: string; count: number }>;
  recentActivity: Array<{ date: string; chats: number; messages: number }>;
}

interface AnalyticsDashboardProps {
  onClose: () => void;
  onSelectChat?: (chatId: string) => void;
}

export default function AnalyticsDashboard({ onClose, onSelectChat }: AnalyticsDashboardProps) {
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [showNetworkView, setShowNetworkView] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const cutoffDate = new Date();
      if (timeRange === '7d') {
        cutoffDate.setDate(cutoffDate.getDate() - 7);
      } else if (timeRange === '30d') {
        cutoffDate.setDate(cutoffDate.getDate() - 30);
      }

      let chatsQuery = supabase
        .from('chats')
        .select('*');

      if (timeRange !== 'all') {
        chatsQuery = chatsQuery.gte('created_at', cutoffDate.toISOString());
      }

      const { data: chats } = await chatsQuery;

      let messagesQuery = supabase
        .from('messages')
        .select('*');

      if (timeRange !== 'all') {
        messagesQuery = messagesQuery.gte('created_at', cutoffDate.toISOString());
      }

      const { data: messages } = await messagesQuery;

      if (!chats || !messages) {
        setLoading(false);
        return;
      }

      const aiSourceCounts: Record<string, number> = {};
      chats.forEach((chat) => {
        aiSourceCounts[chat.ai_source] = (aiSourceCounts[chat.ai_source] || 0) + 1;
      });

      const mostUsedAI = Object.entries(aiSourceCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

      const aiSourceBreakdown = Object.entries(aiSourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      const tagCounts: Record<string, number> = {};
      chats.forEach((chat) => {
        chat.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const popularTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const chatsByDayMap: Record<string, number> = {};
      chats.forEach((chat) => {
        const date = new Date(chat.created_at).toLocaleDateString();
        chatsByDayMap[date] = (chatsByDayMap[date] || 0) + 1;
      });

      const chatsByDay = Object.entries(chatsByDayMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-14);

      const activityMap: Record<string, { chats: number; messages: number }> = {};
      chats.forEach((chat) => {
        const date = new Date(chat.created_at).toLocaleDateString();
        if (!activityMap[date]) {
          activityMap[date] = { chats: 0, messages: 0 };
        }
        activityMap[date].chats += 1;
      });

      messages.forEach((message) => {
        const date = new Date(message.created_at).toLocaleDateString();
        if (!activityMap[date]) {
          activityMap[date] = { chats: 0, messages: 0 };
        }
        activityMap[date].messages += 1;
      });

      const recentActivity = Object.entries(activityMap)
        .map(([date, data]) => ({ date, chats: data.chats, messages: data.messages }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 7);

      setStats({
        totalChats: chats.length,
        messageCount: messages.length,
        mostUsedAI,
        popularTags,
        chatsByDay,
        avgMessagesPerChat: chats.length > 0 ? Math.round(messages.length / chats.length) : 0,
        aiSourceBreakdown,
        recentActivity,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-mocha-800 rounded-xl p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const maxCount = Math.max(...stats.chatsByDay.map((d) => d.count), 1);
  const maxAICount = Math.max(...stats.aiSourceBreakdown.map((d) => d.count), 1);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 dark:bg-mocha-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-lime-400 to-lime-500 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 size={28} className="text-white" />
              <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNetworkView(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white font-medium"
              >
                <Network size={20} />
                Network Map
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            {(['7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === range
                    ? 'bg-white text-lime-600 shadow-md'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-mocha-700 p-6 rounded-xl border border-sand-200 dark:border-mocha-600 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-lime-100 dark:bg-lime-900/30 rounded-lg">
                  <MessageSquare size={20} className="text-lime-600 dark:text-lime-400" />
                </div>
                <h3 className="font-semibold text-mocha-600 dark:text-sand-300">Total Chats</h3>
              </div>
              <p className="text-3xl font-bold text-mocha-900 dark:text-cream-50">{stats.totalChats}</p>
            </div>

            <div className="bg-white dark:bg-mocha-700 p-6 rounded-xl border border-sand-200 dark:border-mocha-600 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-coral-100 dark:bg-coral-900/30 rounded-lg">
                  <TrendingUp size={20} className="text-coral-600 dark:text-coral-400" />
                </div>
                <h3 className="font-semibold text-mocha-600 dark:text-sand-300">Total Messages</h3>
              </div>
              <p className="text-3xl font-bold text-mocha-900 dark:text-cream-50">{stats.messageCount}</p>
            </div>

            <div className="bg-white dark:bg-mocha-700 p-6 rounded-xl border border-sand-200 dark:border-mocha-600 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Sparkles size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-mocha-600 dark:text-sand-300">Avg Messages</h3>
              </div>
              <p className="text-3xl font-bold text-mocha-900 dark:text-cream-50">{stats.avgMessagesPerChat}</p>
            </div>

            <div className="bg-white dark:bg-mocha-700 p-6 rounded-xl border border-sand-200 dark:border-mocha-600 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <BarChart3 size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-semibold text-mocha-600 dark:text-sand-300">Most Used AI</h3>
              </div>
              <p className="text-2xl font-bold text-mocha-900 dark:text-cream-50">{stats.mostUsedAI}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-mocha-700 p-6 rounded-xl border border-sand-200 dark:border-mocha-600 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={20} className="text-lime-600 dark:text-lime-400" />
                <h3 className="text-lg font-bold text-mocha-900 dark:text-cream-50">Chat Activity</h3>
              </div>
              <div className="space-y-3">
                {stats.chatsByDay.length > 0 ? (
                  stats.chatsByDay.map((day) => (
                    <div key={day.date} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-mocha-600 dark:text-sand-300">{day.date}</span>
                        <span className="font-semibold text-mocha-900 dark:text-cream-50">{day.count} chats</span>
                      </div>
                      <div className="w-full bg-sand-200 dark:bg-mocha-600 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-lime-400 to-lime-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(day.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-mocha-500 dark:text-sand-400 text-center py-8">No activity in this period</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-mocha-700 p-6 rounded-xl border border-sand-200 dark:border-mocha-600 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={20} className="text-coral-600 dark:text-coral-400" />
                <h3 className="text-lg font-bold text-mocha-900 dark:text-cream-50">AI Usage Distribution</h3>
              </div>
              <div className="space-y-3">
                {stats.aiSourceBreakdown.map((ai) => (
                  <div key={ai.source} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-mocha-600 dark:text-sand-300">{ai.source}</span>
                      <span className="font-semibold text-mocha-900 dark:text-cream-50">
                        {ai.count} ({Math.round((ai.count / stats.totalChats) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-sand-200 dark:bg-mocha-600 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-coral-400 to-coral-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(ai.count / maxAICount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-mocha-700 p-6 rounded-xl border border-sand-200 dark:border-mocha-600 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Tag size={20} className="text-lime-600 dark:text-lime-400" />
                <h3 className="text-lg font-bold text-mocha-900 dark:text-cream-50">Popular Tags</h3>
              </div>
              <div className="space-y-2">
                {stats.popularTags.length > 0 ? (
                  stats.popularTags.map((tagData) => (
                    <div
                      key={tagData.tag}
                      className="flex items-center justify-between p-3 bg-cream-100 dark:bg-mocha-600 rounded-lg"
                    >
                      <span className="text-mocha-900 dark:text-cream-50 font-medium">{tagData.tag}</span>
                      <span className="text-sm bg-coral-100 dark:bg-coral-900/30 text-coral-700 dark:text-coral-300 px-3 py-1 rounded-full font-semibold">
                        {tagData.count} uses
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-mocha-500 dark:text-sand-400 text-center py-8">No tags used yet</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-mocha-700 p-6 rounded-xl border border-sand-200 dark:border-mocha-600 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} className="text-lime-600 dark:text-lime-400" />
                <h3 className="text-lg font-bold text-mocha-900 dark:text-cream-50">Recent Activity</h3>
              </div>
              <div className="space-y-2">
                {stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity) => (
                    <div
                      key={activity.date}
                      className="flex items-center justify-between p-3 bg-cream-100 dark:bg-mocha-600 rounded-lg"
                    >
                      <span className="text-mocha-900 dark:text-cream-50 font-medium">{activity.date}</span>
                      <div className="flex gap-3 text-sm">
                        <span className="text-mocha-600 dark:text-sand-300">
                          {activity.chats} chats
                        </span>
                        <span className="text-mocha-600 dark:text-sand-300">
                          {activity.messages} msgs
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-mocha-500 dark:text-sand-400 text-center py-8">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showNetworkView && (
        <NetworkVisualization
          onClose={() => setShowNetworkView(false)}
          onSelectChat={(chatId) => {
            setShowNetworkView(false);
            onClose();
            if (onSelectChat) {
              onSelectChat(chatId);
            }
          }}
          selectedChatId={null}
        />
      )}
    </div>
  );
}
