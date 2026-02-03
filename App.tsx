import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, Leaf, Loader2, Image as ImageIcon, Sparkles, X, Moon, ArrowRight } from 'lucide-react';
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
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // New features state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageGenMode, setIsImageGenMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Auth and Load Data
  useEffect(() => {
    const init = async () => {
      setIsAuthLoading(true);
      try {
        if (typeof puter !== 'undefined') {
           // Silently check if user is already logged in
           const currentUser = await puter.auth.getUser();
           
           if (currentUser) {
             setUser(currentUser);
             // Load from cloud if user exists
             const cloudData = await puter.kv.get(STORAGE_KEY);
             if (cloudData) {
               setSessions(cloudData);
             }
           } 
           // If no user, we simply do nothing. The render logic will show the Landing Page.
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsAuthLoading(false);
        setIsDataLoaded(true);
      }
    };

    init();
  }, []);

  // Save sessions whenever they change
  useEffect(() => {
    const save = async () => {
      if (!isDataLoaded || !user) return;
      await puter.kv.set(STORAGE_KEY, sessions);
    };

    const timeoutId = setTimeout(save, 1000);
    return () => clearTimeout(timeoutId);
  }, [sessions, user, isDataLoaded]);

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
        text: "Assalamu Alaikum wa Rahmatullahi wa Barakatuh. \n\nI am **HalalGPT**, your companion for seeking knowledge. How may I assist you today?",
        timestamp: Date.now()
      };
      setMessages([initialGreeting]);
    }
  }, [messages.length]);

  const updateCurrentSession = (updatedMessages: Message[], titleExcerpt?: string) => {
    const timestamp = Date.now();
    
    if (currentSessionId) {
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { ...session, messages: updatedMessages } 
          : session
      ));
    } else {
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
    if ((!input.trim() && !selectedImage) || isLoading) return;

    // User is guaranteed to be logged in due to the landing page gate
    
    const userText = input.trim();
    const currentImage = selectedImage;
    const isGenMode = isImageGenMode;

    // Reset Input State
    setInput('');
    setSelectedImage(null);
    setIsImageGenMode(false);
    
    const isFirstUserMessage = currentSessionId === null;
    const sessionTitle = isFirstUserMessage 
      ? (userText.length > 30 ? userText.substring(0, 30) + '...' : userText)
      : undefined;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: Date.now(),
      attachment: currentImage || undefined
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    updateCurrentSession(newMessages, sessionTitle);

    setIsLoading(true);

    const loadingId = (Date.now() + 1).toString();
    const loadingMsg: Message = {
      id: loadingId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isLoading: true
    };
    
    setMessages(prev => [...prev, loadingMsg]);

    try {
      const response = await sendMessageToHalalGPT(
        newMessages, 
        userText, 
        currentImage || undefined,
        isGenMode
      );
      
      setMessages(prev => {
        const finalMessages = prev.map(msg => {
          if (msg.id === loadingId) {
            return {
              ...msg,
              text: response.text,
              isLoading: false,
              groundingMetadata: response.groundingMetadata,
              generatedImage: response.generatedImage
            };
          }
          return msg;
        });
        
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setIsImageGenMode(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleImageGenMode = () => {
    setIsImageGenMode(!isImageGenMode);
    setSelectedImage(null);
  };

  const startNewChat = () => {
     setCurrentSessionId(null);
     setMessages([]); 
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
      // Prompt sign in
      await puter.auth.signIn();
      // Get the user after sign in
      const newUser = await puter.auth.getUser();
      if (newUser) {
        setUser(newUser);
        setIsDataLoaded(false);
        const cloudData = await puter.kv.get(STORAGE_KEY);
        setSessions(cloudData || []);
        setIsDataLoaded(true);
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
  };

  // --- RENDERING ---

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white text-emerald-600">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  // FORCE LOGIN GATE
  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 px-4 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-300/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-200/50 max-w-md w-full text-center border border-slate-100 relative z-10">
           
           <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-emerald-600/20 rotate-3 transition-transform hover:rotate-6 duration-300">
              <Moon size={40} className="fill-current" />
           </div>
           
           <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">HalalGPT</h1>
           <p className="text-emerald-600 font-medium text-sm mb-6 uppercase tracking-wider">Your Islamic AI Companion</p>
           
           <p className="text-slate-500 mb-8 leading-relaxed">
             Access a knowledge base strictly adhering to the Quran and Sahih Sunnah. 
             <br/><br/>
             Please sign in to continue your journey.
           </p>
           
           <button 
             onClick={handleLogin}
             className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 flex items-center justify-center gap-3 group transform hover:-translate-y-0.5"
           >
             <span>Sign In / Sign Up</span>
             <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
           </button>
           
           <div className="mt-8 pt-6 border-t border-slate-100">
             <p className="text-[10px] text-slate-400">
               Securely powered by Puter.js
             </p>
           </div>
        </div>
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
             
             {/* Image Preview */}
             {selectedImage && (
               <div className="relative inline-block mb-2">
                 <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg border border-slate-200 shadow-sm" />
                 <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                 >
                   <X size={12} />
                 </button>
               </div>
             )}

             {/* Generation Mode Indicator */}
             {isImageGenMode && (
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full w-fit">
                  <Sparkles size={14} />
                  <span>Image Generation Mode Active</span>
                  <button onClick={() => setIsImageGenMode(false)} className="ml-1 hover:text-purple-800"><X size={12} /></button>
                </div>
             )}

             <div className="relative flex items-end gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                
                {/* Tools */}
                <div className="flex pb-2 pl-1 gap-1">
                   {/* Image Upload Button */}
                   <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageSelect}
                   />
                   <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-lg transition-colors ${selectedImage ? 'text-emerald-600 bg-emerald-100' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-200'}`}
                    title="Upload Image"
                   >
                     <ImageIcon size={20} />
                   </button>

                   {/* Image Gen Button */}
                   <button 
                    onClick={toggleImageGenMode}
                    className={`p-2 rounded-lg transition-colors ${isImageGenMode ? 'text-purple-600 bg-purple-100' : 'text-slate-400 hover:text-purple-600 hover:bg-slate-200'}`}
                    title="Generate Image"
                   >
                     <Sparkles size={20} />
                   </button>
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={isImageGenMode ? "Describe the image you want to generate..." : "Ask about Islam, Hadith, or upload an image..."}
                  className="w-full bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 py-3 px-3 max-h-32 resize-none"
                  disabled={isLoading}
                  autoComplete="off"
                />
                
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                  className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                    (input.trim() || selectedImage) && !isLoading
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