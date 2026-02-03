import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const DisclaimerBadge: React.FC = () => {
  return (
    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-600/80 bg-amber-50 px-2 py-1 rounded-full w-fit select-none">
      <AlertTriangle className="w-3 h-3" />
      <span className="font-medium tracking-wide uppercase">HalalGPT can make mistakes, please confirm</span>
    </div>
  );
};