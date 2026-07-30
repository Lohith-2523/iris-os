'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Send, Bot, User, Trash2, MessageSquare, Plus } from 'lucide-react';
import { PrismIcon } from '@/components/ui/prism-icon';
import { PrismAIService } from '@/lib/prism-ai/service';
import { formatUserMessage } from '@/lib/utils';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

export default function PrismPage() {
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(null);

  const initialMessage: Message = {
    role: 'assistant',
    content: formatUserMessage('Welcome to Prism AI. Ask a question, or tell me to create a project, task, invoice, or report. I’ll collect any missing details and complete the work after your confirmation.'),
  };

  const [messages, setMessages] = React.useState<Message[]>([initialMessage]);
  const [query, setQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [chatError, setChatError] = React.useState<string | null>(null);

  const loadSessions = React.useCallback(async () => {
    const data = await PrismAIService.getSessions();
    setSessions(data);
    return data;
  }, []);

  React.useEffect(() => {
    const init = async () => {
      const data = await loadSessions();
        const latestSessionId = data[0]?.id;
        if (latestSessionId) {
          setCurrentSessionId(latestSessionId);
          const msgData = await PrismAIService.getSessionMessages(latestSessionId);
          if (msgData && msgData.messages && msgData.messages.length > 0) {
            setMessages(msgData.messages);
          }
        }
    };
    init();
  }, [loadSessions]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setChatError(null);
    setIsLoading(true);

    try {
      const response = await PrismAIService.askPrism(textToSend, undefined, currentSessionId || undefined);
      
      if (response.sessionId !== currentSessionId) {
        setCurrentSessionId(response.sessionId);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: formatUserMessage(response.result), model: response.model }]);
      await loadSessions();
    } catch (error) {
      // The optimistic user message was never persisted, so remove it instead
      // of displaying a misleading completed-looking conversation.
      setMessages((prev) => prev.slice(0, -1));
      setChatError(error instanceof Error ? error.message : 'Prism could not save this chat. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  // Parse initial query from URL search parameters
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const q = searchParams.get('q');
      if (q) {
        handleSendMessage(q);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [loadSessions]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(query);
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([initialMessage]);
  };

  const selectSession = async (id: string) => {
    setCurrentSessionId(id);
    const data = await PrismAIService.getSessionMessages(id);
    if (data && data.messages && data.messages.length > 0) {
      setMessages(data.messages);
    } else {
      setMessages([initialMessage]);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await PrismAIService.deleteSession(id);
    if (currentSessionId === id) {
      handleNewChat();
    }
    loadSessions();
  };

  const suggestionPills = [
    'Create a new client project',
    'Add a task to a project',
    'Create and send an invoice',
    'Generate an executive report',
    'Schedule a meeting with my client',
  ];

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Prism Command Center</h1>
            <Badge variant="default" className="bg-zinc-900 border-zinc-800 text-zinc-300 py-0.5 px-2 flex items-center gap-1 font-semibold">
              <PrismIcon className="h-3 w-3" />
              <span>Proprietary AI Engine</span>
            </Badge>
          </div>
          <p className="text-xs text-zinc-500">Ask, analyze, or create projects, tasks, invoices, reports, and meetings through one secure conversation.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleNewChat} className="h-8 border-zinc-800 text-zinc-300 gap-1.5 self-start md:self-auto rounded-none bg-zinc-900 hover:bg-zinc-800">
          <Plus className="h-3.5 w-3.5" />
          <span>New Chat</span>
        </Button>
      </div>

      {/* Main Terminal Chat Interface */}
      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        
        {/* Chat History Sidebar (Left) */}
        <div className="w-68 hidden lg:flex flex-col shrink-0 border border-zinc-850 bg-[#0c0d12]/50 p-4 rounded-lg shadow-xl backdrop-blur-md overflow-hidden h-full">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850/60 mb-4 shrink-0">
            <div className="flex items-center gap-2 text-zinc-400">
              <MessageSquare className="h-4 w-4 text-zinc-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-sans">Chat History</span>
            </div>
            <span className="text-[9px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-mono">
              {sessions.length} chats
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`group relative flex flex-col justify-between w-full text-left rounded-md border p-3.5 text-xs transition-all duration-200 cursor-pointer ${
                  currentSessionId === session.id 
                    ? 'bg-zinc-900 border-zinc-750 text-white shadow-lg' 
                    : 'border-transparent bg-zinc-950/20 hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`font-semibold truncate pr-4 ${currentSessionId === session.id ? 'text-white' : 'text-zinc-300'}`}>
                    {session.title}
                  </span>
                  <button 
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="text-zinc-650 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
                    title="Delete Chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {session.updatedAt && (
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-[9px] text-zinc-500 font-medium font-sans">
                      {new Date(session.updatedAt).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <span className="text-[9px] text-zinc-650 font-mono">
                      {new Date(session.updatedAt).toLocaleTimeString(undefined, { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false
                      })}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-xs text-zinc-600 italic py-6 text-center font-sans">No recent chats.</div>
            )}
          </div>
        </div>

        {/* Chat Stream Panel */}
        <div className="flex flex-1 flex-col rounded-none border border-zinc-800 bg-[#0d0e12] overflow-hidden brushed-border">
          {/* Messages stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatError && (
              <div role="alert" className="border border-amber-900/70 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
                {chatError}
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-xs leading-relaxed max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar Icon */}
                <div className={`h-8 w-8 rounded-none border flex items-center justify-center shrink-0 shadow-md ${
                  msg.role === 'user' 
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-200' 
                    : 'bg-zinc-100 border-zinc-200 text-zinc-950 font-bold'
                }`}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div className="space-y-1">
                  <div className={`rounded-none p-4 font-sans ${
                    msg.role === 'user'
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-100'
                      : 'bg-[#121215] border border-zinc-850 text-zinc-300'
                  }`}>
                    <FormattedMarkdown text={msg.content} />
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 text-xs mr-auto items-center">
                <div className="h-8 w-8 rounded-none bg-zinc-100 border border-zinc-200 text-zinc-950 font-bold flex items-center justify-center animate-pulse">
                  <Bot className="h-4 w-4 animate-spin" />
                </div>
                <div className="rounded-none p-4 bg-[#121215] border border-zinc-850 text-zinc-500 font-sans italic">
                  Prism is working...
                </div>
              </div>
            )}

            {/* Suggestions when empty */}
            {showSuggestions && (
              <div className="mt-8 flex flex-col gap-2">
                <div className="text-xs text-zinc-500 mb-2">Suggested queries:</div>
                <div className="flex flex-wrap gap-2">
                  {suggestionPills.map((pill, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(pill)}
                      className="text-left rounded-none border border-zinc-850 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800 p-2 text-xs text-zinc-400 hover:text-white transition-all font-sans cursor-pointer"
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Input area */}
          <div className="border-t border-zinc-800 p-4 bg-zinc-950/40">
            <form onSubmit={handleFormSubmit} className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask Prism anything, or say “Create a project…”"
                className="flex-1 rounded-none border border-zinc-800 bg-zinc-900/40 py-2 px-4 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:bg-zinc-900/80 focus:outline-none focus:ring-0 transition-all font-sans"
              />
              <Button type="submit" disabled={isLoading || !query.trim()} className="h-9 w-9 px-0 bg-white hover:bg-zinc-200 text-zinc-950 shrink-0 rounded-none">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
