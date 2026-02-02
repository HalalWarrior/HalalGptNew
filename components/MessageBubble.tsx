import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { User, Sparkles, BookOpen } from 'lucide-react';
import { DisclaimerBadge } from './DisclaimerBadge';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isModel = message.role === 'model';

  return (
    <div className={`flex w-full mb-6 ${isModel ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isModel ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-slate-700 text-white'
        } shadow-md`}>
          {isModel ? <Sparkles size={16} /> : <User size={16} />}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
          <div
            className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
              isModel
                ? 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                : 'bg-emerald-600 text-white rounded-tr-none'
            }`}
          >
            {message.isLoading ? (
              <div className="flex gap-1.5 py-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <div className={`markdown-content ${isModel ? 'prose-sm prose-emerald' : ''}`}>
                <ReactMarkdown
                  components={{
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-emerald-700" {...props} />,
                    blockquote: ({node, ...props}) => (
                      <blockquote className="border-l-4 border-emerald-300 pl-3 italic bg-emerald-50/50 py-1 my-2 rounded-r" {...props} />
                    ),
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                    a: ({node, ...props}) => <a className="text-emerald-600 underline hover:text-emerald-800" {...props} />,
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Grounding Sources (if any) */}
          {isModel && message.groundingMetadata?.groundingChunks && message.groundingMetadata.groundingChunks.length > 0 && (
             <div className="mt-2 text-xs flex flex-wrap gap-2">
                {message.groundingMetadata.groundingChunks.map((chunk, idx) => {
                  if (chunk.web?.uri && chunk.web?.title) {
                    return (
                       <a 
                        key={idx} 
                        href={chunk.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-white border border-slate-200 text-slate-500 hover:text-emerald-700 px-2 py-1 rounded-md transition-colors"
                      >
                         <BookOpen size={10} />
                         <span>Source: {chunk.web.title}</span>
                      </a>
                    )
                  }
                  return null;
                })}
             </div>
          )}

          {/* Mandatory Disclaimer for AI messages */}
          {isModel && !message.isLoading && (
            <DisclaimerBadge />
          )}
          
          {/* Timestamp */}
          <span className="text-[10px] text-slate-400 mt-1 px-1">
             {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};