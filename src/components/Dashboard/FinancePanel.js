'use client';

import { 
  DollarSign, TrendingUp, CreditCard, 
  ArrowUpRight, Download, History, ShieldAlert, CheckCircle2 
} from 'lucide-react';
import MaskedData from '../ui/MaskedData';
import { useState } from 'react';

export default function FinancePanel() {
  const [isSimulatedVerified, setIsSimulatedVerified] = useState(true);
  return (
    <div className="space-y-6">
      {/* Finance Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md tracking-widest">REAL-TIME</span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Fee Revenue</p>
          <p className="text-2xl font-black text-white tracking-tight">SLE 4,250,000.00</p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Outstanding Arrears</p>
          <p className="text-2xl font-black text-white tracking-tight">SLE 125,400.00</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-center">
           <button className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors">
              <Download className="w-4 h-4" /> Export Master Ledger
           </button>
        </div>
      </div>

      {/* Student Audit View */}
      <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Student Financial Audit</h3>
            <p className="text-sm text-slate-500">Full access to sensitive financial ledger lines.</p>
          </div>
          <div className="flex gap-2">
             <input className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-blue-500" placeholder="Search Roll Number..." />
          </div>
        </div>

        <div className="space-y-4">
          {/* Detailed Financial Profile (Sensitive Area) */}
          <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800 space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
               <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center font-bold text-blue-500">
                  IK
               </div>
               <div>
                  <h4 className="font-bold text-white flex items-center gap-2">
                    Ibrahim Kamara
                    {isSimulatedVerified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" title="Physically Verified" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" title="Not Verified" />
                    )}
                  </h4>
                  <p className="text-xs text-slate-500">Faculty of ICT • BSc Software Engineering</p>
               </div>
               <div className="ml-auto flex items-center gap-4">
                  <button 
                    onClick={() => setIsSimulatedVerified(!isSimulatedVerified)}
                    className="text-[10px] uppercase font-bold text-slate-400 border border-slate-700 px-2 py-1 rounded hover:bg-slate-800"
                  >
                    Simulate: {isSimulatedVerified ? 'Verified' : 'Unverified'}
                  </button>
                  {isSimulatedVerified ? (
                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-lg">High Trust Level</div>
                  ) : (
                    <div className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded-lg">Verification Required</div>
                  )}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <MaskedData label="Identification Number" value="LUC/2026/001" type="id" />
               <MaskedData label="Total Tuition Balance" value="SLE 15,200.00" type="currency" />
               <MaskedData label="Library Arrears" value="SLE 450.00" type="currency" />
               <MaskedData label="Lab Compliance Status" value="PAID - FULL" type="text" />
            </div>

            {/* Cyber Lock Warning */}
            {!isSimulatedVerified && (
               <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                 <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                 <div>
                   <h5 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-1">Cybersecurity Lock Active</h5>
                   <p className="text-xs text-red-400">
                     This student's payments are securely locked. They must physically present their printed Acceptance Letter (with the Cryptographic Verification Code) to the Registry for verification before any financial transactions can be processed.
                   </p>
                 </div>
               </div>
            )}

            <div className="pt-4 flex gap-3">
               <button 
                 disabled={!isSimulatedVerified}
                 className={`text-white text-xs font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 ${
                   isSimulatedVerified ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-800 opacity-50 cursor-not-allowed'
                 }`}
               >
                  <CreditCard className="w-4 h-4" /> Process Payment
               </button>
               <button className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-3 px-6 rounded-xl transition-all">
                  Generate Official Receipt
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
