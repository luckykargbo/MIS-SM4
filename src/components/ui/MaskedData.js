'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function MaskedData({ label, value, type = 'text' }) {
  const [isVisible, setIsVisible] = useState(false);

  const maskValue = (val) => {
    if (type === 'currency') return 'SLE ••••••';
    if (type === 'id') return 'LUC/2026/••••';
    return '••••••••';
  };

  return (
    <div className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800 rounded-2xl group hover:border-slate-700 transition-all">
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-white font-mono font-semibold">
          {isVisible ? value : maskValue(value)}
        </p>
      </div>
      <button 
        onClick={() => setIsVisible(!isVisible)}
        className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-blue-500 transition-all opacity-0 group-hover:opacity-100"
      >
        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
