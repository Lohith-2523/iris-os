'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Send, Bot, User, Trash2, HelpCircle } from 'lucide-react';
import { PrismAIService } from '@/lib/prism-ai/service';
import { cn, formatUserMessage } from '@/lib/utils';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

export default function PrismPage() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: 'assistant',
      content: formatUserMessage('Lohith, welcome to the Prism AI Flagship Intelligence Command Center. How can I assist you with your agency operations, financial health, or design campaigns today?'),
    },
  ]);
  const [query, setQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      const response = await PrismAIService.askPrism(textToSend);
      // Artificial delay for premium experience loading feel
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: 'assistant', content: formatUserMessage(response.result), model: response.model }]);
        setIsLoading(false);
      }, 1000);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: formatUserMessage('Lohith, I encountered a connection anomaly while fetching insights. Please retry.') },
      ]);
      setIsLoading(false);
    }
  };

  // Parse initial query from URL search parameters (like if submitted from top bar!)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const q = searchParams.get('q');
      if (q) {
        handleSendMessage(q);
        // Clear query param from address bar without reloading
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(query);
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: formatUserMessage('Lohith, chat logs cleared. I am ready to process your next financial or project capacity request.'),
      },
    ]);
  };

  const suggestionPills = [
    'Summarize portfolio health scores',
    'Detect active project profit leaks',
    'Forecast revenue billing for Q3',
    'Creative suggestions for campaigns',
  ];

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Prism Command Center</h1>
            <Badge variant="default" className="bg-zinc-900 border-zinc-800 text-zinc-300 py-0.5 px-2 flex items-center gap-1 font-semibold">
              <Sparkles className="h-3 w-3 text-zinc-300" />
              <span>Proprietary AI Engine</span>
            </Badge>
          </div>
          <p className="text-xs text-zinc-500">Dedicated cognitive terminal to solve contractor leaks, compute CSAT values, and predict resource capacities.</p>
        </div>
        <Button variant="outline" size="sm" onClick={clearChat} className="h-8 border-zinc-800 text-zinc-400 gap-1.5 self-start md:self-auto rounded-none">
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear Chat</span>
        </Button>
      </div>

      {/* Main Terminal Chat Interface */}
      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        {/* Chat Stream Panel */}
        <div className="flex flex-1 flex-col rounded-none border border-zinc-800 bg-[#0d0e12] overflow-hidden brushed-border">
          {/* Messages stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                  Prism compiling metrics database...
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
                placeholder="Ask Prism about portfolio summaries, leaks, forecasts..."
                className="flex-1 rounded-none border border-zinc-800 bg-zinc-900/40 py-2 px-4 text-xs text-white placeholder-zinc-500 focus:border-zinc-700 focus:bg-zinc-900/80 focus:outline-none focus:ring-0 transition-all font-sans"
              />
              <Button type="submit" disabled={isLoading || !query.trim()} className="h-9 w-9 px-0 bg-white hover:bg-zinc-200 text-zinc-950 shrink-0 rounded-none">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Right Help sidebar */}
        <div className="w-64 hidden lg:flex flex-col gap-4 shrink-0">
          <Card className="rounded-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Suggested Queries</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex flex-col gap-2">
              {suggestionPills.map((pill, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(pill)}
                  className="w-full text-left rounded-none border border-zinc-850 hover:border-zinc-750 bg-zinc-900/20 hover:bg-zinc-900/80 p-2.5 text-[11px] text-zinc-400 hover:text-white transition-all font-sans cursor-pointer"
                >
                  {pill}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
