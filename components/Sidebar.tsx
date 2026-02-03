import React from 'react';
import { Moon, BookHeart, Info, MessageSquare, MessageCircle, Clock, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { ChatSession, User } from '../types';

interface SidebarProps {
  onNewChat: () => void;
  isOpen: boolean;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onNewChat, 
  isOpen, 
  sessions, 
  currentSessionId, 
  onSelectSession,
  user,
  onLogin,
  onLogout
}) => {
  return (
    <aside className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static z-20 top-0 left-0 h-full w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800`}>
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/50">
           <Moon className="fill-current" size={20} />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg tracking-tight">HalalGPT</h1>
          <p className="text-xs text-emerald-400 font-medium">Your Islamic Companion</p>
        </div>
      </div>

      <div className="p-4">
        <button 
          onClick={onNewChat}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 transition-all font-medium shadow-lg shadow-emerald-900/20"
        >
          <MessageSquare size={18} />
          <span>New Conversation</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
        
        {/* Previous Conversations Section */}
        {sessions.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
              <Clock size={12} />
              History
            </h3>
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 text-sm truncate ${
                    currentSessionId === session.id 
                      ? 'bg-slate-800 text-emerald-400' 
                      : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageCircle size={16} className={`flex-shrink-0 ${currentSessionId === session.id ? 'text-emerald-500' : 'text-slate-600'}`} />
                  <span className="truncate">{session.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Knowledge Base Section */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Knowledge Base</h3>
          <div className="space-y-1">
             <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors cursor-help group">
                <BookHeart size={18} className="text-slate-400 group-hover:text-emerald-400" />
                <span className="text-sm">Sahih Bukhari</span>
             </div>
             <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors cursor-help group">
                <BookHeart size={18} className="text-slate-400 group-hover:text-emerald-400" />
                <span className="text-sm">Sahih Muslim</span>
             </div>
             <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors cursor-help group">
                <BookHeart size={18} className="text-slate-400 group-hover:text-emerald-400" />
                <span className="text-sm">Sunan an-Nasa'i</span>
             </div>
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
           <div className="flex items-start gap-2 mb-2 text-amber-400">
             <Info size={16} className="mt-0.5" />
             <span className="text-xs font-bold uppercase">Important</span>
           </div>
           <p className="text-xs text-slate-400 leading-relaxed">
             HalalGPT strictly adheres to authentic (Sahih) narrations. Always verify rulings with a qualified local scholar.
           </p>
        </div>
      </nav>

      {/* Auth Section */}
      <div className="p-4 border-t border-slate-800">
        {user ? (
          <div className="bg-slate-800 rounded-xl p-3">
             <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-emerald-100 font-bold uppercase">
                  {user.username.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">{user.username}</p>
                  <p className="text-xs text-emerald-500">Logged in</p>
                </div>
             </div>
             <button 
               onClick={onLogout}
               className="w-full flex items-center justify-center gap-2 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg transition-colors"
             >
               <LogOut size={14} />
               Sign Out
             </button>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-all font-medium border border-slate-700"
          >
            <LogIn size={18} className="text-emerald-400" />
            <span>Sign In / Sign Up</span>
          </button>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 text-xs text-slate-600 text-center">
        © 2024 HalalGPT. <br/> Built for the Ummah.
      </div>
    </aside>
  );
};