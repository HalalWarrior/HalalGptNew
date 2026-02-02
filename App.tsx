import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, Leaf, Loader2 } from 'lucide-react';
import { Message, ChatSession, User } from './types';
import { sendMessageToHalalGPT } from './services/geminiService';
import { MessageBubble } from './components/MessageBubble';
import { Sidebar } from './components/Sidebar';

// Puter types are global in this context
declare const puter: any;

const STORAGE_KEY = 'halal-gpt-sessions';

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Auth and Load Data
  useEffect(() => {
    const init = async () => {
      setIsAuthLoading(true);
      try {
        if (typeof puter !== 'undefined') {
           const currentUser = await puter.auth.getUser();
           if (currentUser) {
             setUser(currentUser);
             // Load from cloud if user exists
             const cloudData = await puter.kv.get(STORAGE_KEY);
             if (cloudData) {
               setSessions(cloudData);
             }
           } else {
             // Fallback to local storage if guest
             const localData = localStorage.getItem(STORAGE_KEY);
             if (localData) {
               setSessions(JSON.parse(localData));
             }
           }
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsAuthLoading(false);
      }
    };

    init();
  }, []);

  // Save sessions whenever they change
  useEffect(() => {
    // Debounce saving slightly to avoid heavy KV writes if typing fast
    const save = async () => {
      if (sessions.length === 0) return;

      if (user) {
        // Save to Cloud
        await puter.kv.set(STORAGE_KEY, sessions);
      } else {
        // Save to Local
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      }
    };

    const timeoutId = setTimeout(save, 1000);
    return () => clearTimeout(timeoutId);
  }, [sessions, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial Greeting if chat is empty
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting: Message = {
        id: 'init-1',
        role: 'model',
        text: "Assalamu Alaikum wa Rahmatullahi wa Barakatuh. \n\nI am **HalalGPT**, your companion for seeking knowledge from the Quran and Authentic Sunnah. How may I assist you today? \n\n_Note: I strictly verify sources from Sunnah.com and avoid weak narrations._",
        timestamp: Date.now()
      };
      setMessages([initialGreeting]);
    }
  }, [messages.length]);

  const updateCurrentSession = (updatedMessages: Message[], titleExcerpt?: string) => {
    const timestamp = Date.now();
    
    // If we have an active session, update it
    if (currentSessionId) {
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { ...session, messages: updatedMessages } 
          : session
      ));
    } 
    // If no active session (new chat), create one
    else {
      const newId = Date.now().toString();
      const newTitle = titleExcerpt || "New Conversation";
      
      const newSession: ChatSession = {
        id: newId,
        title: newTitle,
        messages: updatedMessages,
        createdAt: timestamp
      };
      
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newId);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    // Determine title if this is the first real message
    const isFirstUserMessage = currentSessionId === null;
    const sessionTitle = isFirstUserMessage 
      ? (userText.length > 30 ? userText.substring(0, 30) + '...' : userText)
      : undefined;

    // Create User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    updateCurrentSession(newMessages, sessionTitle);

    setIsLoading(true);

    // Create Loading Placeholder
    const loadingId = (Date.now() + 1).toString();
    const loadingMsg: Message = {
      id: loadingId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isLoading: true
    };
    
    // Update visual state immediately
    setMessages(prev => [...prev, loadingMsg]);

    try {
      const response = await sendMessageToHalalGPT(newMessages, userText);
      
      setMessages(prev => {
        const finalMessages = prev.map(msg => {
          if (msg.id === loadingId) {
            return {
              ...msg,
              text: response.text,
              isLoading: false,
              groundingMetadata: response.groundingMetadata
            };
          }
          return msg;
        });
        
        // Sync with session storage once we have the response
        updateCurrentSession(finalMessages);
        return finalMessages;
      });

    } catch (error) {
      setMessages(prev => {
        const errorMessages = prev.map(msg => {
          if (msg.id === loadingId) {
            return {
              ...msg,
              text: "Astaghfirullah, I encountered a connection error. Please try again.",
              isLoading: false
            };
          }
          return msg;
        });
        updateCurrentSession(errorMessages);
        return errorMessages;
      });
    } finally {
      setIsLoading(false);
      if (window.innerWidth > 768) {
        inputRef.current?.focus();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewChat = () => {
     setCurrentSessionId(null);
     setMessages([]); // This triggers the useEffect to re-add greeting
     setSidebarOpen(false);
     if (window.innerWidth > 768) {
        inputRef.current?.focus();
     }
  };

  const selectSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setSidebarOpen(false);
    }
  };

  const handleLogin = async () => {
    try {
      // Puter's signIn is usually a popup.
      await puter.auth.signIn();
      const newUser = await puter.auth.getUser();
      if (newUser) {
        setUser(newUser);
        // Load cloud sessions immediately after login
        const cloudData = await puter.kv.get(STORAGE_KEY);
        if (cloudData) {
          setSessions(cloudData);
          setCurrentSessionId(null);
          setMessages([]);
        } else {
           // Optional: Migrate local sessions to cloud if cloud is empty
           // For now, we just start fresh or keep empty
           setSessions([]);
           setMessages([]);
           setCurrentSessionId(null);
        }
      }
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleLogout = async () => {
    await puter.auth.signOut();
    setUser(null);
    setSessions([]);
    setMessages([]);
    setCurrentSessionId(null);
    // Optionally reload from local storage or just show empty
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      setSessions(JSON.parse(localData));
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white text-emerald-600">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        onNewChat={startNewChat} 
        isOpen={sidebarOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative w-full">
        
        {/* Header */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
             >
                <Menu size={20} />
             </button>
             <div className="md:hidden flex items-center gap-2">
                <Leaf className="text-emerald-600" size={20} />
                <span className="font-bold text-slate-800">HalalGPT</span>
             </div>
             <div className="hidden md:flex flex-col">
                <span className="font-semibold text-slate-800">Conversation</span>
                <span className="text-xs text-slate-400">Authentic Knowledge Base</span>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Online
             </div>
             {user && (
               <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                 <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">
                   {user.username.charAt(0)}
                 </div>
                 <span className="text-xs font-medium text-slate-600 pr-1">{user.username}</span>
               </div>
             )}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 bg-slate-50/50 scroll-smooth">
          <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-end">
             {messages.length === 0 && (
               <div className="flex-1 flex items-center justify-center text-slate-300 pb-20">
                  <Leaf size={48} className="opacity-20" />
               </div>
             )}
             
             {messages.map((msg) => (
               <MessageBubble key={msg.id} message={msg} />
             ))}
             <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="max-w-3xl mx-auto">
             <div className="relative flex items-end gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask about Islam, Hadith, or Quran..."
                  className="w-full bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 py-3 px-3 max-h-32 resize-none"
                  disabled={isLoading}
                  autoComplete="off"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                    input.trim() && !isLoading
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                   {isLoading ? (
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   ) : (
                     <Send size={20} />
                   )}
                </button>
             </div>
             <p className="text-center text-[10px] text-slate-400 mt-2">
                HalalGPT is an AI assistant. Please verify all rulings with qualified scholars.
             </p>
          </div>
        </div>

      </main>
    </div>
  );
}