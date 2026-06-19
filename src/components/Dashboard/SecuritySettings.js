'use client';

import { 
  ShieldCheck, Smartphone, Globe, Lock, 
  Trash2, History, AlertTriangle, CheckCircle2, User, Mail, Image as ImageIcon, KeyRound
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useState } from 'react';
import { sha256 } from 'js-sha256';

export default function SecuritySettings({ user }) {
  const dbUser = useQuery(api.users.getCurrentUser, { userId: user._id || user.userId });
  const updateTheme = useMutation(api.users.updateTheme);
  const updateProfileImage = useMutation(api.users.updateProfileImage);
  const changePassword = useMutation(api.users.changePassword);
  const updateEmail = useMutation(api.users.updateEmail);
  
  const sessions = useQuery(api.security.getActiveSessions, { userId: user._id || user.userId });
  const logs = useQuery(api.security.getSecurityLogs, { userId: user._id || user.userId });
  const terminateSession = useMutation(api.security.terminateSession);

  // Form states
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [emailValue, setEmailValue] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [terminating, setTerminating] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Profile picture must be smaller than 2MB.");
      return;
    }

    setProfileSaving(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await updateProfileImage({
          userId: user._id || user.userId,
          profileImage: reader.result
        });
        alert("Profile picture updated successfully!");
      } catch (err) {
        alert("Failed to save avatar: " + err.message);
      } finally {
        setProfileSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!emailValue) return;

    setProfileSaving(true);
    try {
      await updateEmail({
        userId: user._id || user.userId,
        newEmail: emailValue
      });
      alert("Email updated successfully! A welcome/verification email has been dispatched.");
      setEmailValue('');
    } catch (err) {
      alert("Failed to update email: " + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      alert("Please fill in all password fields.");
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      alert("New passwords do not match.");
      return;
    }
    if (passwordForm.new.length < 6) {
      alert("New password must be at least 6 characters long.");
      return;
    }

    setProfileSaving(true);
    try {
      const currentHashed = sha256(passwordForm.current);
      const newHashed = sha256(passwordForm.new);

      await changePassword({
        userId: user._id || user.userId,
        currentPasswordHash: currentHashed,
        newPasswordHash: newHashed
      });

      alert("Password updated successfully!");
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (err) {
      alert("Failed to change password: " + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleTerminate = async (sessionId) => {
    setTerminating(sessionId);
    try {
      await terminateSession({ sessionId });
    } catch (err) {
      alert("Failed to terminate session.");
    } finally {
      setTerminating(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-800 dark:text-slate-100">
      
      {/* 2FA Header */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-3xl flex items-center gap-6">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center shrink-0">
          <ShieldCheck className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Multi-Factor Security Active</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Your account is protected with institutional-grade 2FA (TOTP/Email).</p>
        </div>
      </div>

      {/* 1. USER PROFILE CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 rounded-3xl space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center text-blue-500">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">User Profile</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Manage your personal details and public representation</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar Picture Input */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group w-28 h-28 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 overflow-hidden flex items-center justify-center shadow-inner">
              {dbUser?.profileImage ? (
                <img src={dbUser.profileImage} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-slate-400 uppercase">{dbUser?.name?.charAt(0)}</span>
              )}
              <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer text-[10px] font-bold gap-1">
                <ImageIcon className="w-4 h-4" />
                Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={profileSaving} />
              </label>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">PNG or JPG, max 2MB</p>
          </div>

          {/* Form fields */}
          <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Full Name</label>
              <input
                type="text"
                disabled
                value={dbUser?.name || ''}
                className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-550 dark:text-slate-400 outline-none cursor-not-allowed font-medium"
                title="Name changes must be provisioned by an Administrator"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Role Permission</label>
              <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 px-3 py-2.5 rounded-xl text-xs font-bold uppercase w-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {dbUser?.role} account
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SECURITY CREDENTIALS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Email Address Update */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 rounded-3xl space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center text-blue-500">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Email Address</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Change your system email address</p>
            </div>
          </div>

          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Current Email</label>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-mono font-medium bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 px-4 py-2.5 rounded-xl">
                {dbUser?.email}
              </p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">New Email Address</label>
              <input
                type="email"
                required
                value={emailValue}
                onChange={e => setEmailValue(e.target.value)}
                placeholder="newemail@limkokwing.edu.sl"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-slate-350 dark:focus:border-slate-700 focus:bg-white font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={profileSaving}
              className="w-full bg-blue-650 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-slate-750 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-sm"
            >
              Update Email
            </button>
          </form>
        </div>

        {/* Password Update Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 rounded-3xl space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center text-blue-500">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Change Password</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Securely update your gateway login secret</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <input
                type="password"
                required
                value={passwordForm.current}
                onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                placeholder="Current Gateway Secret"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-slate-350 dark:focus:border-slate-700 focus:bg-white font-medium"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={passwordForm.new}
                onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                placeholder="New Gateway Secret"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-slate-350 dark:focus:border-slate-700 focus:bg-white font-medium"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={passwordForm.confirm}
                onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                placeholder="Confirm New Gateway Secret"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-slate-350 dark:focus:border-slate-700 focus:bg-white font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={profileSaving}
              className="w-full bg-blue-650 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-slate-750 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-sm"
            >
              Update Password
            </button>
          </form>
        </div>

      </div>

      {/* Theme Preference Settings Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 rounded-3xl space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center text-blue-500">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Display Theme</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Select your preferred user interface appearance</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={async () => {
              try {
                await updateTheme({ userId: user._id || user.userId, theme: "light" });
              } catch (err) {
                alert("Failed to update theme preference.");
              }
            }}
            className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
              (dbUser?.theme || "light") === "light"
                ? "bg-blue-50/50 dark:bg-blue-950/15 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/10"
                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center text-amber-500 mb-4">
              <span className="text-sm">☀️</span>
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-white">Light Mode</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Clean, high-contrast UI suited for bright environments</p>
            </div>
          </button>
          <button
            onClick={async () => {
              try {
                await updateTheme({ userId: user._id || user.userId, theme: "dark" });
              } catch (err) {
                alert("Failed to update theme preference.");
              }
            }}
            className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
              dbUser?.theme === "dark"
                ? "bg-slate-900 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/10"
                : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-950 flex items-center justify-center text-slate-100 mb-4 border border-slate-800 dark:border-slate-700">
              <span className="text-sm">🌙</span>
            </div>
            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-white">Dark Mode</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">Sleek, eye-friendly layout suited for lower light environments</p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Active Devices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Active Devices</h3>
            </div>
            <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-md uppercase">Live</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {sessions?.length === 0 && (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">No other active sessions found.</div>
            )}
            {sessions?.map(s => (
              <div key={s._id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-850 rounded-xl flex items-center justify-center">
                    <Globe className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-850 dark:text-white">{s.browser} on {s.device}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tighter uppercase">{s.ipAddress}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleTerminate(s._id)}
                  disabled={terminating === s._id}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security Logs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">MFA Audit History</h3>
            </div>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[400px] overflow-y-auto custom-scrollbar">
            {logs?.map(log => (
              <div key={log._id} className="p-4 flex items-start gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                <div className={`mt-1 p-1 rounded-md ${
                  log.event.includes('success') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {log.event.includes('success') ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-tighter">
                    {log.event.replace('_', ' ')}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{log.details}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1 font-mono italic">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {!logs && <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">Scanning logs...</div>}
          </div>
        </div>

      </div>

      <div className="p-6 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 border-dashed rounded-3xl text-center">
        <Lock className="w-6 h-6 text-slate-400 dark:text-slate-700 mx-auto mb-3" />
        <p className="text-xs text-slate-500 dark:text-slate-600 font-medium">Session tokens are valid for 24 hours. Terminating a session will invalidate all cache on that device immediately.</p>
      </div>
    </div>
  );
}
