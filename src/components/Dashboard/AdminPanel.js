'use client';

import { useState } from 'react';
import { 
  Users, DollarSign, BookOpen, ShieldAlert, 
  Trash2, UserPlus, Search, Filter, Lock 
} from 'lucide-react';
import MaskedData from '../ui/MaskedData';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('provisioning');

  return (
    <div className="space-y-6">
      {/* Admin Header with Security Alert */}
      <div className="flex items-center justify-between p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 rounded-2xl">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">System Provisioning Mode</h2>
            <p className="text-xs text-amber-500/70 font-medium">Financial and Academic records are strictly hidden from this view.</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-xl border border-slate-800">
          <Lock className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase">Privacy Protocol v4.0 Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation */}
        <div className="lg:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('provisioning')}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'provisioning' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <UserPlus className="w-5 h-5" /> Account Provisioning
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Users className="w-5 h-5" /> User Ledger
          </button>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                {activeTab === 'provisioning' ? 'Create New Institution Account' : 'Manage System Access'}
              </h3>
            </div>

            {activeTab === 'provisioning' ? (
              <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Identity</label>
                  <input className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50" placeholder="e.g. John Sesay" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">System Role</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50">
                    <option>Finance Staff</option>
                    <option>Registry Staff</option>
                    <option>Student</option>
                    <option>Sub-Admin</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-2xl transition-all flex items-center gap-2">
                    <UserPlus className="w-5 h-5" /> Provision Account
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Example User Row */}
                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Finance Officer #01</p>
                      <p className="text-xs text-slate-500">finance@limkokwing.edu.sl</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase rounded-lg border border-blue-500/20">
                      Finance Role
                    </div>
                    <button className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl italic text-xs text-slate-400">
                  Notice: As an Administrator, you can revoke access for the above accounts, but the private work ledger and transaction history of these accounts remain encrypted and inaccessible to you.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
