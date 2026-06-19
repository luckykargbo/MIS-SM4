'use client';

import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Wallet, BookOpen, Settings, FileText,
  LogOut, Bell, Search, Menu, X, ShieldAlert, ShieldCheck,
  User, Trash2, Plus, Eye, EyeOff, Lock, Unlock, Clock, Filter, Download,
  CheckCircle2, AlertTriangle, CreditCard, ChevronRight, HelpCircle, Upload
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { sha256 } from 'js-sha256';
import SecuritySettings from '../../components/Dashboard/SecuritySettings';
import RegistryPanel from '../../components/Dashboard/RegistryPanel';
import { printTuitionInvoice } from '../../components/Dashboard/PrintTemplates';

// ─────────────────────────────────────────────────────────────────
// MASKED DATA COMPONENT (Privacy Guard)
// ─────────────────────────────────────────────────────────────────
function MaskedData({ value, label, type = 'text' }) {
  const [visible, setVisible] = useState(false);
  const display = type === 'currency'
    ? `SLE ${visible ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••••'}`
    : visible ? value : '••••••••';
  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-sm ${visible ? 'text-slate-900 font-semibold' : 'text-slate-400 tracking-widest'}`}>{display}</span>
      <button onClick={() => setVisible(!visible)} className="text-slate-400 hover:text-blue-500 transition-colors">
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADMIN: OVERVIEW PANEL
// ─────────────────────────────────────────────────────────────────
function AdminOverview({ user, stats }) {
  const users = useQuery(api.users.listUsers, { requesterId: user._id || user.userId });
  const createUser = useMutation(api.users.createUser);
  const deleteUser = useMutation(api.users.deleteUser);
  const toggleUserActive = useMutation(api.users.toggleUserActive);
  const sendNotification = useMutation(api.notifications.sendNotification);

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', program: 'Bachelor of Information Technology' });
  const [profileImage, setProfileImage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState('FICT');

  const FACULTY_PROGRAMS = {
    "FICT": {
      name: "Faculty of Information & Communication Technology",
      programs: [
        { code: "BIT", name: "Bachelor of Information Technology" },
        { code: "BSEM", name: "Bachelor of Software Engineering Multimedia" },
        { code: "BICT", name: "Bachelor of Information and Communication Technology" },
        { code: "DIT", name: "Diploma in Information Technology" },
        { code: "CIT", name: "Certificate in Information Technology" }
      ]
    },
    "FBMG": {
      name: "Faculty of Business Management & Globalization",
      programs: [
        { code: "BBIB", name: "Bachelor of Business in International Business" },
        { code: "DIB", name: "Diploma in International Business" }
      ]
    },
    "FCMB": {
      name: "Faculty of Communication, Media & Broadcasting",
      programs: [
        { code: "BABJ", name: "Bachelor of Arts in Broadcast Journalism" }
      ]
    },
    "FAB": {
      name: "Faculty of Architecture & Building",
      programs: [
        { code: "BARC", name: "Bachelor of Science in Architecture" }
      ]
    }
  };

  const handleFacultyChange = (fac) => {
    setSelectedFaculty(fac);
    const firstProg = FACULTY_PROGRAMS[fac].programs[0].name;
    setForm(prev => ({ ...prev, program: firstProg }));
  };

  const generateSecurePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^*()";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, password: generated }));
    setShowPassword(true);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Notification states
  const [notifForm, setNotifForm] = useState({ title: '', message: '', recipientId: 'all' });
  const [sendingNotif, setSendingNotif] = useState(false);

  // Form programs
  const programs = [
    "Bachelor of Science in IT",
    "Bachelor of Business Administration",
    "BA in Mass Communication",
    "BSc in Architecture"
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image must be smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      alert("Please fill in Name and Email fields.");
      return;
    }
    setIsCreating(true);
    try {
      const hashed = form.password ? sha256(form.password) : undefined;
      await createUser({
        requesterId: user._id || user.userId,
        name: form.name,
        email: form.email,
        role: form.role,
        passwordHash: hashed,
        plainPassword: form.password || undefined,
        program: form.role === 'student' ? form.program : undefined,
        profileImage: profileImage || undefined
      });
      alert(`Account provisioned successfully for ${form.name}!`);
      setForm({ name: '', email: '', password: '', role: 'student', program: 'Bachelor of Science in IT' });
      setProfileImage('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (targetId, name) => {
    if (!confirm(`Are you sure you want to revoke the account for ${name}?`)) return;
    try {
      await deleteUser({ requesterId: user._id || user.userId, targetUserId: targetId });
      alert(`Account for ${name} revoked.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleToggleActive = async (targetId, currentActive, name) => {
    const action = currentActive ? "block" : "unblock";
    if (!confirm(`Are you sure you want to ${action} the account for ${name}?`)) return;
    try {
      await toggleUserActive({
        requesterId: user._id || user.userId,
        targetUserId: targetId,
        isActive: !currentActive
      });
      alert(`Account for ${name} has been ${currentActive ? 'blocked' : 'unblocked'}.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle account lock');
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifForm.title || !notifForm.message) {
      alert("Please fill in all notification fields.");
      return;
    }
    setSendingNotif(true);
    try {
      await sendNotification({
        requesterId: user._id || user.userId,
        targetUserId: notifForm.recipientId,
        title: notifForm.title,
        message: notifForm.message
      });
      alert("System notification dispatched successfully!");
      setNotifForm({ title: '', message: '', recipientId: 'all' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send alert');
    } finally {
      setSendingNotif(false);
    }
  };

  // Filter staff and admins for User Directory
  const staffUsers = users?.filter(u => u.role !== 'student') || [];
  
  const filteredUsers = staffUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  // Pagination
  const totalEntries = filteredUsers.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatus = (u) => {
    if (!u.isActive) return { label: "Blocked", color: "bg-red-500" };
    if (!u.lastLogin) return { label: "Offline", color: "bg-slate-400" };
    const diff = Date.now() - u.lastLogin;
    if (diff < 5 * 60 * 1000) return { label: "Active Now", color: "bg-emerald-500" };
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return { label: hours === 0 ? "1h ago" : `${hours}h ago`, color: "bg-slate-400" };
    }
    return { label: "Offline", color: "bg-slate-400" };
  };

  return (
    <div className="space-y-8 text-slate-800 dark:text-slate-100">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: User Directory */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Directory</h2>
              <p className="text-xs text-slate-450 dark:text-slate-500 font-medium mt-0.5">Existing staff and administrative users</p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-450" />
                <input 
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Search directory..."
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none w-44 focus:border-slate-350 focus:bg-white dark:focus:bg-slate-850 transition-all"
                />
              </div>
              <select 
                value={roleFilter} 
                onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-350 outline-none focus:border-slate-350"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="finance">Finance</option>
                <option value="registry">Registry</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0B192C] text-white text-[11px] font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Identity</th>
                  <th className="px-6 py-4">Institutional Email</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users === undefined ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-medium animate-pulse">Syncing user directory...</td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 text-xs italic">No administrative staff members found.</td>
                  </tr>
                ) : paginatedUsers.map((u) => {
                  const status = getStatus(u);
                  return (
                    <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                      <td className="px-6 py-4.5 flex items-center gap-3">
                        {u.profileImage ? (
                          <img src={u.profileImage} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                        ) : (
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center font-bold text-blue-700 dark:text-blue-300 text-xs">
                            {u.name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{u.name}</div>
                          {u.staffId && (
                            <div className="text-[10px] text-slate-450 dark:text-slate-500 font-mono font-medium tracking-tight mt-0.5">{u.staffId}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{u.email}</span>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                          <span className={`w-2 h-2 rounded-full ${status.color}`} />
                          {status.label}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-center flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleToggleActive(u._id, u.isActive, u.name)}
                          disabled={u.email === user.email}
                          className={`p-1.5 rounded-lg transition-all disabled:opacity-30 ${
                            u.isActive 
                              ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30' 
                              : 'text-red-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                          title={u.isActive ? "Block User" : "Unblock User"}
                        >
                          {u.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleDelete(u._id, u.name)}
                          disabled={u.email === user.email}
                          className="p-1.5 text-slate-450 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all disabled:opacity-30"
                          title="Revoke Credentials"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Showing {totalEntries > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalEntries)} of {totalEntries} entries
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 border border-slate-200 dark:border-slate-750 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-500 disabled:opacity-40"
              >
                &lt;
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 border border-slate-200 dark:border-slate-750 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-500 disabled:opacity-40"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Forms */}
        <div className="space-y-6">
          {/* Provision Account Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Provision Account</h2>
              <p className="text-xs text-slate-450 dark:text-slate-500 font-medium mt-0.5">Issue new system credentials instantly</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5 flex flex-col items-center">
                {profileImage ? (
                  <img src={profileImage} className="w-16 h-16 rounded-full object-cover border-2 border-blue-500" alt="Avatar Preview" />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-full flex items-center justify-center text-xs text-slate-400">No Photo</div>
                )}
                <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider cursor-pointer hover:underline mt-1">
                  Upload Profile Pic
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Full Name</label>
                <input 
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Mary Kamara"
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-slate-350 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Institutional Email</label>
                <input 
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="username@limkokwing.sl"
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-slate-350 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Initial Password</label>
                  <button 
                    type="button"
                    onClick={generateSecurePassword}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-wider transition-colors"
                  >
                    Generate Password
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="•••••••• (Optional - Auto-generated)"
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-slate-350 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium font-mono"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Assigned Role</label>
                <select 
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-slate-350 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium"
                >
                  <option value="student">Student</option>
                  <option value="finance">Finance Staff</option>
                  <option value="registry">Registry Staff</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {form.role === 'student' && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Faculty Department</label>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(FACULTY_PROGRAMS).map(fac => (
                        <button
                          key={fac}
                          type="button"
                          onClick={() => handleFacultyChange(fac)}
                          className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all border ${
                            selectedFaculty === fac
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                        >
                          {fac}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Select Program</label>
                    <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                      {FACULTY_PROGRAMS[selectedFaculty].programs.map(prog => {
                        const isSelected = form.program === prog.name;
                        return (
                          <button
                            key={prog.code}
                            type="button"
                            onClick={() => setForm({ ...form, program: prog.name })}
                            className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                              isSelected
                                ? 'bg-blue-600/10 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest font-mono shrink-0 uppercase ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-450'
                            }`}>
                              {prog.code}
                            </div>
                            <div>
                              <p className="text-xs font-bold leading-tight">{prog.name}</p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium uppercase tracking-tight">{FACULTY_PROGRAMS[selectedFaculty].name}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-[#0B192C] hover:bg-[#1E293B] dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2.5"
              >
                <Plus className="w-4 h-4" /> {isCreating ? 'Provisioning...' : 'Generate Onboarding Credentials'}
              </button>
            </form>
          </div>

          {/* Dispatch Announcement/Notification Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Broadcast Alert Panel</h2>
              <p className="text-xs text-slate-450 dark:text-slate-500 font-medium mt-0.5">Send critical notifications to members</p>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Audience / Recipient</label>
                <select 
                  value={notifForm.recipientId}
                  onChange={e => setNotifForm({ ...notifForm, recipientId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-slate-350"
                >
                  <option value="all">Everyone (Broadcast Announcement)</option>
                  {users?.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Alert Title</label>
                <input 
                  type="text"
                  required
                  value={notifForm.title}
                  onChange={e => setNotifForm({ ...notifForm, title: e.target.value })}
                  placeholder="e.g. Campus Holiday Notice"
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-slate-350"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Alert Body Message</label>
                <textarea 
                  required
                  value={notifForm.message}
                  onChange={e => setNotifForm({ ...notifForm, message: e.target.value })}
                  placeholder="Enter detailed notice information here..."
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-slate-350 h-24 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sendingNotif}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {sendingNotif ? 'Sending Alert...' : 'Dispatch System Notification'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Dynamic Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex items-center gap-5">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-650">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Users</p>
            <p className="text-3xl font-black text-[#0B192C] dark:text-white tracking-tight mt-1">{stats?.totalUsers ?? '...'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center text-blue-500">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Sessions</p>
            <p className="text-3xl font-black text-[#0B192C] dark:text-white tracking-tight mt-1">{stats?.activeSessions ?? '...'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex items-center gap-5">
          <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 rounded-xl flex items-center justify-center text-red-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">System Alerts</p>
            <p className="text-3xl font-black text-[#0B192C] dark:text-white tracking-tight mt-1">{stats?.systemAlerts ?? '...'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADMIN: MANAGE STAFF PANEL
// ─────────────────────────────────────────────────────────────────
function ManageStaff({ user }) {
  const users = useQuery(api.users.listUsers, { requesterId: user._id || user.userId });
  const deleteUser = useMutation(api.users.deleteUser);
  const toggleUserActive = useMutation(api.users.toggleUserActive);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDelete = async (targetId, name) => {
    if (!confirm(`Are you sure you want to revoke the credentials for ${name}?`)) return;
    try {
      await deleteUser({ requesterId: user._id || user.userId, targetUserId: targetId });
      alert(`Account for ${name} deleted successfully.`);
    } catch (err) {
      alert("Failed to delete user: " + err.message);
    }
  };

  const handleToggleActive = async (targetId, currentActive, name) => {
    const action = currentActive ? "block" : "unblock";
    if (!confirm(`Are you sure you want to ${action} the account for ${name}?`)) return;
    try {
      await toggleUserActive({
        requesterId: user._id || user.userId,
        targetUserId: targetId,
        isActive: !currentActive
      });
      alert(`Account for ${name} has been ${currentActive ? 'blocked' : 'unblocked'}.`);
    } catch (err) {
      alert("Failed to toggle status: " + err.message);
    }
  };

  const staff = users?.filter(u => u.role !== 'student') || [];
  const filtered = staff.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-slate-800 dark:text-slate-100">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Manage Staff Members</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Add, remove, or view system administrators and officers</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search staff members..."
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none w-56 focus:border-slate-350 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-850 transition-all"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0B192C] text-white text-[11px] font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">Full Identity</th>
              <th className="px-6 py-4">Institutional Email</th>
              <th className="px-6 py-4">Role Assignment</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users === undefined ? (
              <tr><td colSpan="5" className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold animate-pulse">Syncing staff records...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs italic">No staff members found matching criteria.</td></tr>
            ) : filtered.map(u => (
              <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  {u.profileImage ? (
                    <img src={u.profileImage} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center font-bold text-blue-700 dark:text-blue-300 text-xs">
                      {u.name?.charAt(0)}
                    </div>
                  )}
                  <div className="font-bold text-slate-800 dark:text-slate-200">{u.name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{u.email}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/45 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-900/60">
                    {u.role} Role
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {u.isActive ? 'Active' : 'Blocked'}
                  </div>
                </td>
                <td className="px-6 py-4 text-center flex items-center justify-center gap-1.5">
                  <button 
                    disabled={u.email === user.email}
                    onClick={() => handleToggleActive(u._id, u.isActive, u.name)}
                    className={`p-1.5 rounded-lg transition-all disabled:opacity-20 ${
                      u.isActive 
                        ? 'text-slate-450 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30' 
                        : 'text-red-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                    title={u.isActive ? "Block User" : "Unblock User"}
                  >
                    {u.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                  <button 
                    disabled={u.email === user.email}
                    onClick={() => handleDelete(u._id, u.name)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all disabled:opacity-20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManageStudents({ user }) {
  const students = useQuery(api.students.listStudents, { requesterId: user._id || user.userId });
  const updateStudentStatus = useMutation(api.students.updateStudentStatus);
  const deleteUser = useMutation(api.users.deleteUser);
  const toggleUserActive = useMutation(api.users.toggleUserActive);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const handleStatusChange = async (studentId, currentStatus) => {
    const statuses = ['active', 'suspended', 'graduated', 'deferred'];
    const nextStatusIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    const nextStatus = statuses[nextStatusIndex];
    
    if (!confirm(`Do you want to update this student's status to ${nextStatus.toUpperCase()}?`)) return;

    try {
      await updateStudentStatus({
        requesterId: user._id || user.userId,
        studentId,
        registryStatus: nextStatus
      });
      alert("Student status updated successfully.");
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleToggleActive = async (targetUserId, currentActive, name) => {
    const action = currentActive ? "block" : "unblock";
    if (!confirm(`Are you sure you want to ${action} the login access for student ${name}?`)) return;
    try {
      await toggleUserActive({
        requesterId: user._id || user.userId,
        targetUserId,
        isActive: !currentActive
      });
      alert(`Student ${name} has been ${currentActive ? 'blocked' : 'unblocked'} from login.`);
    } catch (err) {
      alert("Failed to toggle login access: " + err.message);
    }
  };

  const handleRevoke = async (userId, name) => {
    if (!confirm(`Are you sure you want to completely delete the student record and login account for ${name}?`)) return;
    try {
      await deleteUser({ requesterId: user._id || user.userId, targetUserId: userId });
      alert(`Student profile and login for ${name} removed.`);
    } catch (err) {
      alert("Failed to remove student: " + err.message);
    }
  };

  const filtered = students?.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.program.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? s.registryStatus === statusFilter : true;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-slate-800 dark:text-slate-100">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Manage Students</h2>
          <p className="text-xs text-slate-405 dark:text-slate-500 font-medium">Verify, edit, or terminate academic enrollment credentials</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-505" />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search roll number or name..."
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none w-56 focus:border-slate-350 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-850 transition-all"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg px-2.5 py-2 text-xs text-slate-600 dark:text-slate-350 outline-none focus:border-slate-350"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deferred">Deferred</option>
            <option value="graduated">Graduated</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0B192C] text-white text-[11px] font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">Roll Number</th>
              <th className="px-6 py-4">Student Name</th>
              <th className="px-6 py-4">Program & Faculty</th>
              <th className="px-6 py-4">Year/Sem</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {students === undefined ? (
              <tr><td colSpan="6" className="p-12 text-center text-slate-400 dark:text-slate-505 text-xs font-semibold animate-pulse">Syncing student database...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" className="p-12 text-center text-slate-400 dark:text-slate-505 text-xs italic">No student records found.</td></tr>
            ) : filtered.map(s => (
              <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                <td className="px-6 py-4.5">
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-300">{s.rollNumber}</span>
                </td>
                <td className="px-6 py-4.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{s.name}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{s.email}</div>
                </td>
                <td className="px-6 py-4.5">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-300">{s.program}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-tight font-medium mt-0.5">{s.faculty}</div>
                </td>
                <td className="px-6 py-4.5">
                  <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/60 font-semibold">
                    Sem {s.semester} (Y{Math.ceil(s.semester / 2)})
                  </span>
                </td>
                <td className="px-6 py-4.5">
                  <button 
                    onClick={() => handleStatusChange(s._id, s.registryStatus)}
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border text-left transition-all ${
                      s.registryStatus === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100' :
                      s.registryStatus === 'suspended' ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-450 border-red-200 dark:border-red-900 hover:bg-red-100' :
                      s.registryStatus === 'deferred' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border-amber-200 dark:border-amber-900 hover:bg-amber-100' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                    title="Click to toggle status"
                  >
                    {s.registryStatus} ⇄
                  </button>
                </td>
                <td className="px-6 py-4.5 text-center flex items-center justify-center gap-1.5">
                  <button 
                    onClick={() => handleToggleActive(s.userId, s.isActive, s.name)}
                    className={`p-1.5 rounded-lg transition-all ${
                      s.isActive 
                        ? 'text-slate-450 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30' 
                        : 'text-red-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                    title={s.isActive ? "Block Access" : "Unblock Access"}
                  >
                    {s.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => handleRevoke(s.userId, s.name)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                    title="Revoke and Delete Student Profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADMIN: SECURITY AUDIT LOGS PANEL
// ─────────────────────────────────────────────────────────────────
function SecurityLogsPanel({ user }) {
  const logs = useQuery(api.security.listAllSecurityLogs, { requesterId: user._id || user.userId });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-slate-800 dark:text-slate-100">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Security Audit</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Real-time MFA logs, login failure histories, and session events</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0B192C] text-white text-[11px] font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Security Event</th>
              <th className="px-6 py-4">Details</th>
              <th className="px-6 py-4">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs === undefined ? (
              <tr><td colSpan="5" className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold animate-pulse">Retrieving audit trails...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="5" className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs italic">No security incidents logged.</td></tr>
            ) : logs.map(log => (
              <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{log.userName}</div>
                  <div className="text-[10px] text-slate-450 dark:text-slate-500 font-mono mt-0.5">{log.userEmail}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                    log.event.includes("failure") || log.event === "otp_failure"
                      ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900' 
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900'
                  }`}>
                    {log.event.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate" title={log.details}>{log.details}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{log.ipAddress}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADMIN: FINANCE LEDGER PANEL
// ─────────────────────────────────────────────────────────────────
function FinanceLedgerPanel({ user }) {
  const ledger = useQuery(api.finance.getMasterLedger, { requesterId: user._id || user.userId });
  const recordPayment = useMutation(api.finance.recordPayment);
  const stats = useQuery(api.finance.getFinanceOverviewStats, { requesterId: user._id || user.userId });
  const transactions = useQuery(api.finance.getAllTransactions, { requesterId: user._id || user.userId });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '', notes: '' });
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setPayForm({ amount: '', method: 'cash', reference: '', notes: '' });
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!payForm.amount || !payForm.reference) {
      alert("Please enter amount and payment reference.");
      return;
    }
    const amt = Number(payForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid positive number for amount.");
      return;
    }

    setProcessing(true);
    try {
      await recordPayment({
        requesterId: user._id || user.userId,
        studentId: selectedStudent.studentId,
        amount: amt,
        method: payForm.method,
        reference: payForm.reference,
        notes: payForm.notes || undefined
      });
      alert("Payment processed successfully!");
      setSelectedStudent(null);
    } catch (err) {
      alert("Failed to process payment: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const filtered = ledger?.filter(l => 
    l.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.program.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const paginatedStudents = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Conversion rate: 1 USD = 23.6 SLE (Leones)
  const usdConversionRate = 23.6;

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 animate-in fade-in duration-300">
      {/* Payment Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Process Tuition Payment</h3>
              <button onClick={() => setSelectedStudent(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Paying For</p>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{selectedStudent.studentName}</h4>
              <p className="text-xs text-slate-550 dark:text-slate-400 font-mono mt-0.5">ID: {selectedStudent.rollNumber} · Balance: SLE {Number(selectedStudent.balance).toLocaleString()}</p>
            </div>
            <form onSubmit={handleProcessPayment} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Payment Amount (SLE)</label>
                <input 
                  type="number"
                  required
                  value={payForm.amount}
                  onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                  placeholder="e.g. 5000"
                  max={selectedStudent.balance}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-slate-350 dark:focus:border-slate-650 focus:bg-white dark:focus:bg-slate-850 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Method</label>
                <select 
                  value={payForm.method}
                  onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-slate-350 dark:focus:border-slate-650 focus:bg-white dark:focus:bg-slate-850 font-medium"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Reference / Receipt ID</label>
                <input 
                  type="text"
                  required
                  value={payForm.reference}
                  onChange={e => setPayForm({ ...payForm, reference: e.target.value })}
                  placeholder="e.g. TXN-100489"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-slate-350 dark:focus:border-slate-650 focus:bg-white dark:focus:bg-slate-850 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Notes (Optional)</label>
                <textarea 
                  value={payForm.notes}
                  onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="e.g. Paid via Bank Deposit"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-slate-350 dark:focus:border-slate-650 focus:bg-white dark:focus:bg-slate-850 font-medium h-16 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-[#0B192C] hover:bg-[#152e50] dark:bg-slate-800 dark:hover:bg-slate-750 text-white font-bold text-xs py-3 rounded-lg mt-3 transition-colors flex items-center justify-center gap-2"
              >
                {processing ? 'Processing...' : 'Complete Payment Process'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HEADER SECTION WITH STANDARD BLUE BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-[#0B192C] dark:text-white leading-tight">Finance Department Ledger</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Real-time oversight of student tuition accounts and institutional cash flow.</p>
        </div>
        
        <div className="bg-gradient-to-r from-blue-600 to-sky-500 text-white px-6 py-4 rounded-xl shadow-sm min-w-[280px] border border-blue-400/20 relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
          <span className="text-[9px] font-bold tracking-widest text-blue-100 uppercase">Standard Tuition Rate</span>
          <h3 className="text-lg font-black mt-1 leading-none">Bachelor's Degree: $1,000 USD</h3>
          <p className="text-[10px] text-blue-50 font-bold mt-1.5">23,600,000 SLE (Leones)</p>
        </div>
      </div>

      {/* STATS CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Funds Tracked */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-5 relative overflow-hidden">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/45 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-widest">Total Funds Tracked</p>
            <p className="text-2xl font-black text-[#0B192C] dark:text-white tracking-tight mt-1">
              ${stats ? Math.round(stats.totalFundsTracked / usdConversionRate).toLocaleString() : '...'} USD
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <span>+12% from last semester</span>
            </p>
          </div>
        </div>

        {/* Cleared Transactions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-5 relative overflow-hidden">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/45 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-widest">Cleared Transactions</p>
            <p className="text-2xl font-black text-[#0B192C] dark:text-white tracking-tight mt-1">
              {stats ? stats.transactionCount.toLocaleString() : '...'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">
              {stats ? (stats.totalCount > 0 ? Math.round((stats.clearedCount / stats.totalCount) * 100) : 100) : 94.2}% Cleared Accounts
            </p>
          </div>
        </div>

        {/* Discrepancy Security Flags */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center gap-5 relative overflow-hidden">
          <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 rounded-xl flex items-center justify-center text-red-500 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-widest">Discrepancy Security Flags</p>
            <p className="text-2xl font-black text-[#0B192C] dark:text-white tracking-tight mt-1">
              {stats ? stats.discrepancies : '...'}
            </p>
            <p className={`text-[10px] font-bold mt-1 ${stats?.discrepancies > 0 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
              {stats?.discrepancies > 0 ? 'Requires Immediate Review' : 'Ledger audits secure'}
            </p>
          </div>
        </div>
      </div>

      {/* MASTER STUDENT LEDGER TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-slate-800 dark:text-slate-100">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Master Student Ledger</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Verify balances, review payments, and post transaction logs</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input 
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search student ledger..."
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-700 dark:text-slate-350 outline-none w-56 focus:border-slate-300 focus:bg-white dark:focus:bg-slate-850 transition-all font-medium"
              />
            </div>
            
            <button className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors">
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
            
            <button className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B192C] text-white text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Generated ID</th>
                <th className="px-6 py-4">Assigned Faculty</th>
                <th className="px-6 py-4">Tuition Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ledger === undefined ? (
                <tr><td colSpan="5" className="p-12 text-center text-slate-400 dark:text-slate-505 text-xs font-semibold animate-pulse">Decrypting financial ledger...</td></tr>
              ) : paginatedStudents.length === 0 ? (
                <tr><td colSpan="5" className="p-12 text-center text-slate-405 dark:text-slate-550 text-xs italic">No financial ledger records found.</td></tr>
              ) : paginatedStudents.map(item => {
                const year = Math.ceil(item.semester / 2);
                let statusLabel = "Paid";
                let statusDotColor = "bg-emerald-500";
                let statusTextColor = "text-emerald-600 dark:text-emerald-455";

                if (item.amountPaid === 0) {
                  statusLabel = "Outstanding Balance";
                  statusDotColor = "bg-red-500";
                  statusTextColor = "text-red-505 dark:text-red-400";
                } else if (item.balance > 0) {
                  statusLabel = "Partial Payment";
                  statusDotColor = "bg-blue-505";
                  statusTextColor = "text-blue-650 dark:text-blue-400";
                }

                return (
                  <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/15 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-605 dark:text-slate-350">
                        {item.studentName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{item.studentName}</div>
                        <div className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">Year {year} Student</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-550 dark:text-slate-400 font-semibold">{item.rollNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-350 px-2.5 py-1 rounded-md">
                        {item.program.includes("IT") || item.program.includes("Science") ? "Faculty of ICT" : 
                         item.program.includes("Business") ? "Faculty of Business" : "Faculty of Design"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className={`w-2 h-2 rounded-full ${statusDotColor}`} />
                        <span className={statusTextColor}>{statusLabel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {statusLabel === "Outstanding Balance" ? (
                        <button 
                          onClick={() => handleSelectStudent(item)}
                          className="bg-[#0B192C] hover:bg-[#1E293B] dark:bg-slate-800 dark:hover:bg-slate-750 text-white font-bold text-xs py-1.5 px-4 rounded-lg transition-all shadow-sm"
                        >
                          Bill Now
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-2.5">
                          <button 
                            onClick={() => handleSelectStudent(item)}
                            className="p-1 text-slate-405 hover:text-blue-500 dark:hover:text-blue-455 transition-colors"
                            title="Receipt Invoice Details"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleSelectStudent(item)}
                            className="p-1 text-slate-405 hover:text-slate-700 dark:hover:text-white transition-colors"
                            title="Edit Record"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            Showing {totalEntries > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalEntries)} of {totalEntries} records
          </span>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-505 disabled:opacity-40"
            >
              &lt;
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-505 disabled:opacity-40"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Audit Trail & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Finance Audit Trail */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-white">Finance Audit Trail</h3>
            <span className="text-xs text-blue-605 dark:text-blue-450 hover:underline cursor-pointer font-bold">View All Logs</span>
          </div>

          <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
            {transactions === undefined ? (
              <div className="text-center text-slate-400 text-xs py-8 animate-pulse font-medium">Loading audit history...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-8 italic">No payment transactions recorded yet.</div>
            ) : transactions.map((tx) => (
              <div key={tx._id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/50 hover:border-slate-205 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-450 shrink-0 font-bold text-xs">
                    {tx.studentName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-205">Payment by {tx.studentName}</div>
                    <div className="text-[10px] text-slate-450 font-mono mt-0.5">REF: {tx.reference} · via {tx.method.replace('_', ' ')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-emerald-650 dark:text-emerald-450">+ SLE {tx.amount.toLocaleString()}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{new Date(tx.timestamp).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Forecast */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-white">Revenue Forecast</h3>
            <span className="w-7 h-7 bg-blue-50 dark:bg-blue-950/45 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-450 shrink-0">
              <Download className="w-4 h-4" />
            </span>
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Current Collection Rate</p>
                <h4 className="text-3xl font-black text-[#0B192C] dark:text-white mt-1">
                  {stats ? (stats.totalFundsTracked > 0 ? Math.round((stats.totalCollected / stats.totalFundsTracked) * 100) : 0) : '78'}%
                </h4>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Total Outstanding Arrears</p>
                <p className="text-sm font-mono font-bold text-red-500 mt-2">
                  SLE {stats ? stats.totalOutstanding.toLocaleString() : '...'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span>Tuition Fees Collection</span>
                <span>{stats ? stats.totalCollected.toLocaleString() : '...'} / {stats ? stats.totalFundsTracked.toLocaleString() : '...'} SLE</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-sky-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${stats ? (stats.totalFundsTracked > 0 ? Math.round((stats.totalCollected / stats.totalFundsTracked) * 100) : 0) : 78}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-[#64748B] dark:text-slate-400 leading-relaxed font-medium">
              Note: Forecasted collection rates assume full clearance of the {stats ? stats.totalCount : '...'} currently enrolled student profiles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADMIN: ENTRANCE SCANNER PANEL
// ─────────────────────────────────────────────────────────────────
function EntranceScannerPanel({ user }) {
  const students = useQuery(api.students.listStudents, { requesterId: user._id || user.userId });
  const scanEntrance = useMutation(api.security.scanStudentEntrance);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scanningState, setScanningState] = useState('idle'); // 'idle', 'scanning', 'result'
  const [scanResult, setScanResult] = useState(null); // { status: 'granted' | 'denied', reason: '...' }
  const [showDropdown, setShowDropdown] = useState(false);
  const [ipAddress, setIpAddress] = useState('127.0.0.1');

  // Fetch client IP on load
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('127.0.0.1'));
  }, []);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    setScanningState('idle');
    setScanResult(null);
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setSearchTerm(`${student.name} (${student.rollNumber})`);
    setShowDropdown(false);
    setScanningState('idle');
    setScanResult(null);
  };

  const handleStartScan = async () => {
    if (!selectedStudent) return;
    setScanningState('scanning');
    
    // Simulate biometric scan & security verification
    setTimeout(async () => {
      try {
        const result = await scanEntrance({
          requesterId: user._id || user.userId,
          studentId: selectedStudent._id,
          ipAddress
        });
        setScanResult({ status: result.status, reason: result.reason });
        setScanningState('result');
      } catch (err) {
        alert("Verification Log Error: " + err.message);
        setScanningState('idle');
      }
    }, 2000);
  };

  const filtered = students?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 text-slate-800 dark:text-slate-100">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 6%; }
          50% { top: 90%; }
          100% { top: 6%; }
        }
      `}} />
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-blue-500" />
          Live Entrance Scanner
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-505 font-medium">Verify student entrance authorization and audit registry/finance status in real-time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* VIEWFEED / SCANNING VIEW */}
        <div className="bg-slate-950 rounded-3xl p-8 border border-slate-800/80 w-full h-[360px] relative flex flex-col items-center justify-center overflow-hidden shadow-inner">
          {/* Scanning frame corner borders */}
          <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-blue-500/60 rounded-tl" />
          <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-blue-500/60 rounded-tr" />
          <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-blue-500/60 rounded-bl" />
          <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-blue-500/60 rounded-br" />

          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.25)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-20" />

          {scanningState === 'idle' && (
            <div className="text-center space-y-4 z-10 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Scanner Arm Ready</p>
                <p className="text-[10px] text-slate-550 mt-1 font-medium">Select a student from the ledger to scan</p>
              </div>
            </div>
          )}

          {scanningState === 'scanning' && (
            <div className="w-full text-center space-y-4 z-10">
              {/* Scanline Animation */}
              <div className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_2px_#3b82f6] animate-[scan_2s_ease-in-out_infinite]" />
              <div className="w-16 h-16 rounded-full bg-blue-600/10 border border-blue-500/40 flex items-center justify-center mx-auto text-blue-400 animate-spin">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Running Biometric Scan...</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">RFID decrypt: OK · Verifying database records...</p>
              </div>
            </div>
          )}

          {scanningState === 'result' && scanResult && (
            <div className="w-full text-center space-y-6 z-10 animate-in zoom-in-95 duration-200">
              {scanResult.status === 'granted' ? (
                <>
                  {/* Flashing neon green border */}
                  <div className="absolute inset-0 border-2 border-emerald-500/40 rounded-3xl animate-[pulse_1.5s_infinite]" />
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-emerald-400 uppercase tracking-wide">Access Granted</h3>
                    <p className="text-xs text-slate-300 px-6 mt-2 font-medium leading-relaxed">{scanResult.reason}</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Flashing neon red border */}
                  <div className="absolute inset-0 border-2 border-red-500/40 rounded-3xl animate-[pulse_1.5s_infinite]" />
                  <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center mx-auto text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-red-505 uppercase tracking-wide">Access Denied</h3>
                    <p className="text-xs text-red-400 px-6 mt-2 font-semibold leading-relaxed">{scanResult.reason}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* CONTROLS & SELECTION */}
        <div className="space-y-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl h-full">
          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-wider block">Find Student Roll Number / Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Type name or roll number..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-750 rounded-xl pl-9 pr-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-slate-350 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
              />
            </div>

            {/* Dropdown Results */}
            {showDropdown && searchTerm.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-855 max-h-56 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="p-4 text-xs text-slate-450 dark:text-slate-550 text-center italic">No students found</div>
                ) : (
                  filtered.slice(0, 5).map(s => (
                    <button
                      key={s._id}
                      onClick={() => handleSelectStudent(s)}
                      className="w-full p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-left flex justify-between items-center"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-white">{s.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{s.rollNumber}</div>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                        s.registryStatus === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-red-50 text-red-650 dark:bg-red-950/20'
                      }`}>{s.registryStatus}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedStudent && (
            <div className="border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-5 rounded-2xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
                {selectedStudent.profileImage ? (
                  <img src={selectedStudent.profileImage} alt={selectedStudent.name} className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-800" />
                ) : (
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/45 rounded-full flex items-center justify-center font-bold text-blue-650 dark:text-blue-400 text-sm">
                    {selectedStudent.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{selectedStudent.name}</h4>
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-555 font-mono mt-0.5">{selectedStudent.rollNumber} · {selectedStudent.program}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Registry Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${selectedStudent.registryStatus === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-xs font-bold uppercase">{selectedStudent.registryStatus}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ledger Balance</span>
                  <div className="text-xs font-bold mt-0.5 text-slate-400 dark:text-slate-500 italic">
                    Restricted (Admin Blind Spot)
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartScan}
                disabled={scanningState === 'scanning'}
                className="w-full bg-[#0B192C] hover:bg-[#1E293B] dark:bg-blue-600 dark:hover:bg-blue-505 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                {scanningState === 'scanning' ? (
                  <>Verification in progress...</>
                ) : (
                  <>Run Gate Check-in Scan</>
                )}
              </button>
            </div>
          )}

          {!selectedStudent && (
            <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 dark:text-slate-500 text-xs">
              Search and select a student record to initiate entrance biometric check.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ADMIN: MANAGE COURSES CATALOG PANEL
// ─────────────────────────────────────────────────────────────────
function ManageCoursesPanel({ user }) {
  const courses = useQuery(api.students.listAllCourses);
  const addCourse = useMutation(api.students.addCourse);

  const [courseForm, setCourseForm] = useState({ name: '', code: '', faculty: 'Faculty of Information Technology', credits: 3 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faculties = [
    "Faculty of Information Technology", 
    "Faculty of Business Administration", 
    "Faculty of Media & Communication", 
    "Faculty of Architecture & Design"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!courseForm.name || !courseForm.code || !courseForm.credits) {
      alert("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addCourse({
        requesterId: user._id || user.userId,
        courseName: courseForm.name,
        courseCode: courseForm.code,
        faculty: courseForm.faculty,
        credits: Number(courseForm.credits)
      });
      alert(`Course ${courseForm.code} added successfully!`);
      setCourseForm({ name: '', code: '', faculty: 'Faculty of Information Technology', credits: 3 });
      setShowAddForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-500" />
            Academic Courses Catalog
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Manage and review global academic courses provisioned for all faculties.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 bg-[#0B192C] hover:bg-[#1E293B] dark:bg-blue-600 dark:hover:bg-blue-505 text-white font-bold text-xs py-3 px-5 rounded-xl transition-all shadow-md self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> {showAddForm ? 'Close Course Creator' : 'Create New Course'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-200 max-w-xl">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider mb-2">Configure New Course</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Course Code</label>
              <input
                type="text"
                required
                value={courseForm.code}
                onChange={e => setCourseForm({ ...courseForm, code: e.target.value })}
                placeholder="e.g. IT302"
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-755 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-slate-350 focus:bg-white font-semibold uppercase font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Course Name</label>
              <input
                type="text"
                required
                value={courseForm.name}
                onChange={e => setCourseForm({ ...courseForm, name: e.target.value })}
                placeholder="e.g. Network Security"
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-755 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-slate-350 focus:bg-white font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Assigned Faculty Department</label>
              <select
                value={courseForm.faculty}
                onChange={e => setCourseForm({ ...courseForm, faculty: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-755 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-slate-350 focus:bg-white font-medium"
              >
                {faculties.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Credits</label>
              <input
                type="number"
                required
                min={1}
                max={6}
                value={courseForm.credits}
                onChange={e => setCourseForm({ ...courseForm, credits: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-755 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-slate-350 focus:bg-white font-semibold font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all shadow-md text-xs uppercase tracking-wider mt-3"
          >
            {isSubmitting ? 'Creating Course...' : 'Save & Publish Course'}
          </button>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B192C] text-white text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Course Code</th>
                <th className="px-6 py-4">Course Title</th>
                <th className="px-6 py-4">Faculty Department</th>
                <th className="px-6 py-4">Credits</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {courses === undefined ? (
                <tr><td colSpan="5" className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold animate-pulse">Syncing courses...</td></tr>
              ) : courses.length === 0 ? (
                <tr><td colSpan="5" className="p-12 text-center text-slate-400 dark:text-slate-505 text-xs italic">No courses in the academic catalog.</td></tr>
              ) : courses.map(c => (
                <tr key={c._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-855/20 transition-colors">
                  <td className="px-6 py-4.5">
                    <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">{c.courseCode}</span>
                  </td>
                  <td className="px-6 py-4.5">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{c.courseName}</span>
                  </td>
                  <td className="px-6 py-4.5">
                    <span className="text-[10px] font-bold tracking-tight uppercase px-2.5 py-0.5 rounded bg-slate-550/5 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">{c.faculty}</span>
                  </td>
                  <td className="px-6 py-4.5">
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{c.credits} Credits</span>
                  </td>
                  <td className="px-6 py-4.5">
                    <span className="text-[9px] font-black tracking-widest text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// STUDENT: COURSE CATALOG & ENROLLMENT PANEL
// ─────────────────────────────────────────────────────────────────
function StudentCourseCatalog({ user }) {
  const profile = useQuery(api.students.getMyProfile, { userId: user._id || user.userId });
  const allCourses = useQuery(api.students.listAllCourses);
  const enrollInCatalog = useMutation(api.students.enrollInCourseCatalog);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const academicRecords = useQuery(api.students.getStudentAcademicRecords, 
    profile ? { requesterId: user._id || user.userId, studentId: profile._id } : "skip"
  );

  const handleEnroll = async (course) => {
    if (!profile) return;
    if (!confirm(`Do you want to enroll in ${course.courseCode} — ${course.courseName}?`)) return;

    setIsSubmitting(true);
    try {
      await enrollInCatalog({
        requesterId: user._id || user.userId,
        studentId: profile._id,
        courseId: course._id
      });
      alert(`Successfully enrolled in ${course.courseName}!`);
    } catch (err) {
      alert("Enrollment Failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const enrolledCodes = academicRecords?.map(r => r.courseCode) || [];
  
  // Enrolled records list with credits mapped
  const enrolledCoursesWithCredits = academicRecords?.map(record => {
    const courseDetails = allCourses?.find(c => c.courseCode === record.courseCode);
    return {
      ...record,
      credits: courseDetails?.credits || 3
    };
  }) || [];

  const totalCredits = enrolledCoursesWithCredits.reduce((acc, curr) => acc + curr.credits, 0);

  // Available courses (matching student's faculty department and not enrolled)
  const availableCourses = allCourses?.filter(c => !enrolledCodes.includes(c.courseCode)) || [];
  
  return (
    <div className="space-y-8 text-slate-800 dark:text-slate-100 animate-in fade-in duration-300">
      
      {/* Overview stats */}
      <div className="bg-gradient-to-br from-[#0B192C] to-[#1E293B] rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Course Directory & Self-Enrollment</h2>
          <p className="text-xs text-slate-400 font-medium">Select and enroll in available academic courses for the current semester.</p>
        </div>
        <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/5 flex gap-6">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Enrolled Credits</span>
            <span className="text-2xl font-black text-white font-mono">{totalCredits} credits</span>
          </div>
          <div className="border-l border-white/10 pl-6">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Enrolled Courses</span>
            <span className="text-2xl font-black text-white font-mono">{enrolledCodes.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* ENROLLED COURSES */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Enrolled Courses</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Academic courses you are currently attending</p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {academicRecords === undefined ? (
              <div className="py-12 text-center text-slate-450 animate-pulse text-xs font-semibold">Updating enrollment list...</div>
            ) : academicRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-550 text-xs italic">You are not currently enrolled in any academic courses.</div>
            ) : enrolledCoursesWithCredits.map(r => (
              <div key={r._id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center font-bold text-blue-650 dark:text-blue-400 text-xs font-mono">
                    {r.courseCode}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-850 dark:text-slate-205">{r.courseName}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{r.credits} Credits · {r.status}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded border ${
                    r.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' :
                    r.status === 'Deferred' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20' :
                    'bg-blue-50 text-blue-650 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900'
                  }`}>{r.status}</span>
                  
                  {r.grade && (
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">{r.grade}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AVAILABLE CATALOG */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-sans">Available Catalog</h3>
            <p className="text-xs text-slate-450 dark:text-slate-500 font-medium">Browse and self-enroll in campus courses</p>
          </div>

          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
            {allCourses === undefined ? (
              <div className="py-12 text-center text-slate-450 animate-pulse text-xs">Syncing course catalog...</div>
            ) : availableCourses.length === 0 ? (
              <div className="py-12 text-center text-slate-450 dark:text-slate-550 text-xs italic">No new courses available for enrollment.</div>
            ) : availableCourses.map(course => (
              <div key={course._id} className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-200/60 dark:border-slate-800 rounded-2xl hover:border-slate-350 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">{course.courseCode}</span>
                    <span className="text-[9px] font-black text-slate-400 font-mono uppercase tracking-widest">{course.credits} Credits</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5 leading-tight">{course.courseName}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">{course.faculty.split('Faculty of ')[1] || course.faculty}</p>
                </div>

                <button
                  onClick={() => handleSaveAndEnroll(course)}
                  disabled={isSubmitting}
                  className="w-full bg-[#0B192C] hover:bg-[#1E293B] dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Save & Enroll
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );

  async function handleSaveAndEnroll(course) {
    await handleEnroll(course);
  }
}

// ─────────────────────────────────────────────────────────────────
// ADMIN PANEL COMPONENT
// ─────────────────────────────────────────────────────────────────
function AdminPanel({ user, currentView, stats }) {
  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">Welcome back, Admin</h1>
          <p className="text-slate-400 text-xs font-semibold mt-0.5">Managing Limkokwing University Sierra Leone Management Information System.</p>
        </div>
      </div>

      {currentView === 'overview' && <AdminOverview user={user} stats={stats} />}
      {currentView === 'manage_staff' && <ManageStaff user={user} />}
      {currentView === 'manage_students' && <ManageStudents user={user} />}
      {currentView === 'entrance_scanner' && <EntranceScannerPanel user={user} />}
      {currentView === 'manage_courses' && <ManageCoursesPanel user={user} />}
      {currentView === 'security_logs' && <SecurityLogsPanel user={user} />}
      {currentView === 'finance_ledger' && <FinanceLedgerPanel user={user} />}
      {currentView === 'settings' && <SecuritySettings user={user} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// STUDENT PANEL COMPONENT
// ─────────────────────────────────────────────────────────────────
function StudentPanel({ user }) {
  const profile = useQuery(api.students.getMyProfile, { userId: user._id || user.userId });
  const dbUser = useQuery(api.users.getCurrentUser, { userId: user._id || user.userId });
  const finance = useQuery(
    api.finance.getStudentFinance,
    profile
      ? { requesterId: user._id || user.userId, studentId: profile._id }
      : "skip"
  );

  const academicRecords = useQuery(
    api.students.getStudentAcademicRecords,
    profile && (user._id || user.userId)
      ? { requesterId: user._id || user.userId, studentId: profile._id }
      : "skip"
  );

  if (!profile) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Academic Records...</div>;

  const deferredMidterms = academicRecords?.filter(r => r.midtermStatus === 'Deferred') || [];
  const deferredFinals = academicRecords?.filter(r => r.finalStatus === 'Deferred') || [];
  const hasDeferredExams = deferredMidterms.length > 0 || deferredFinals.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-800">
      {/* Header Profile */}
      <div className="bg-gradient-to-br from-[#0B192C] to-[#1E293B] rounded-3xl p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {dbUser?.profileImage ? (
              <img src={dbUser.profileImage} alt={dbUser.name} className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
            ) : (
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-inner border border-white/10">
                {user.name?.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white leading-tight uppercase tracking-wide">{user.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <span className="text-[9px] font-black text-slate-200 bg-white/10 px-2 py-0.5 rounded uppercase tracking-wider border border-white/5">{profile.program}</span>
                <span className="text-[9px] font-black text-slate-200 bg-white/10 px-2 py-0.5 rounded uppercase tracking-wider border border-white/5">Semester {profile.semester}</span>
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/5 min-w-[200px]">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">Student ID Number</p>
            <div className="font-mono text-white font-bold">{profile.rollNumber}</div>
          </div>
        </div>
      </div>

      {/* Tuition Default Warning Alert Banner */}
      {finance && finance.balance > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 text-orange-250 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-sm text-orange-200">Tuition Default Alert</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Outstanding tuition balance of <strong>SLE {finance.balance.toLocaleString()}</strong> detected. 
                Midterm or Final exams for the current semester have been moved to <strong>Deferred</strong> status. 
                Please complete your payments at the Finance Office to clear your records.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tuition & Financial Status (Invoice Sale) at the TOP, Full Width */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Wallet className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Tuition & Financial Status</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Manage tuition payments and view official invoice sale details.</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${
            finance?.isCleared 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
              : 'bg-red-50 text-red-600 border-red-200'
          }`}>
            {finance?.isCleared ? 'CLEARED' : 'ARREARS DETECTED'}
          </span>
        </div>

        {/* Invoice Sale Breakdown Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Invoice Sale Breakdown</h4>
          <div className="overflow-hidden border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Amount (SLE)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
                {finance?.invoiceLines && finance.invoiceLines.length > 0 ? (
                  finance.invoiceLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">{line.description}</td>
                      <td className="px-4 py-3 font-mono">{new Date(line.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-mono">SLE {Number(line.amount).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">Enrollment Tuition Fee (Standard Rate)</td>
                    <td className="px-4 py-3 font-mono">{new Date(finance?.updatedAt || Date.now()).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right font-mono">SLE {Number(finance?.tuitionFee || 0).toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Details & Print Button */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-100 items-center">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Fee Billed</p>
            <p className="text-lg font-black text-slate-800 font-mono">
              SLE {Number(finance?.tuitionFee || 0).toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Outstanding Arrears</p>
            <div className="flex items-center">
              <MaskedData value={finance?.balance || 0} type="currency" />
            </div>
          </div>
          <div className="sm:text-right">
            <button 
              onClick={() => {
                if (!finance || !profile) {
                  alert("Financial record is not loaded yet. Please wait.");
                  return;
                }
                printTuitionInvoice({
                  name: dbUser?.name || user.name,
                  rollNumber: profile.rollNumber,
                  program: profile.program,
                  faculty: profile.faculty
                }, finance);
              }}
              className="w-full sm:w-auto bg-[#0B192C] hover:bg-[#1E293B] text-white font-bold text-xs py-3 px-6 rounded-xl transition-all shadow-sm uppercase tracking-wider"
            >
              Generate Official Payment Invoice
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Status Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 mr-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Registry & Academic Verification</h3>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Registration Status</p>
                <p className="text-lg font-black text-slate-800 uppercase tracking-tight mt-0.5">{profile.registryStatus}</p>
              </div>
              <div className="px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-600 rounded text-xs font-bold font-mono">
                Sem {profile.semester}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium pt-1">
              <Clock className="w-3.5 h-3.5" />
              <span suppressHydrationWarning>Verified for enrollment as of {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Deferred Exams & Slip Card (Now sits side-by-side!) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Deferred Exams Slip</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Academic Year {profile.academicYear}
            </span>
          </div>

          {!hasDeferredExams ? (
            <div className="p-8 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">All Clear!</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No deferred exams found. You are eligible to sit for all registered midterm and final exams.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-550">
                The following examinations have been moved to <strong>Deferred (November Session)</strong> due to tuition default. Print this slip and present it to the Registry once your balance is cleared.
              </p>
              
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-650 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="px-4 py-3">Course Code</th>
                      <th className="px-4 py-3">Course Name</th>
                      <th className="px-4 py-3">Deferred Exam Type</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {deferredMidterms.map(r => (
                      <tr key={`${r._id}-midterm`} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-600">{r.courseCode}</td>
                        <td className="px-4 py-3 text-slate-700 font-medium">{r.courseName}</td>
                        <td className="px-4 py-3 text-orange-600 font-bold">Midterm Exam</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-orange-50 border border-orange-100 text-orange-600 text-[9px] font-bold uppercase">Deferred</span>
                        </td>
                      </tr>
                    ))}
                    {deferredFinals.map(r => (
                      <tr key={`${r._id}-final`} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-600">{r.courseCode}</td>
                        <td className="px-4 py-3 text-slate-700 font-medium">{r.courseName}</td>
                        <td className="px-4 py-3 text-orange-655 font-bold">Final Exam</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-orange-50 border border-orange-100 text-orange-600 text-[9px] font-bold uppercase">Deferred</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 bg-[#0B192C] hover:bg-[#1E293B] text-white font-bold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Print Deferred Exam Slip (PDF)
                </button>
                <button 
                  onClick={() => {
                    const slipText = [...deferredMidterms.map(r => `${r.courseCode} Midterm`), ...deferredFinals.map(r => `${r.courseCode} Final`)].join(', ');
                    navigator.clipboard.writeText(`Student: ${user.name}\nRoll: ${profile.rollNumber}\nDeferred: ${slipText}`);
                    alert("Exam Slip credentials copied to clipboard!");
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs py-3 px-5 rounded-xl transition-all"
                >
                  Copy Slip Credentials
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentSittingPanel({ user }) {
  const profile = useQuery(api.students.getMyProfile, { userId: user._id || user.userId });
  const submitApp = useMutation(api.students.submitDeferredApplication);
  const myApps = useQuery(
    api.students.getStudentDeferredApplications,
    profile ? { studentId: profile._id } : "skip"
  );

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    category: '',
    faculty: '',
    program: '',
    semester: '',
    reason: '',
    missedDate: '',
    modules: '',
    evidenceName: '',
    declaration: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  if (!profile) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Exam Details...</div>;

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the form?")) {
      setFormData({
        category: '',
        faculty: '',
        program: '',
        semester: '',
        reason: '',
        missedDate: '',
        modules: '',
        evidenceName: '',
        declaration: false
      });
      setStep(1);
    }
  };

  const handleNext = () => {
    if (step === 1 && !formData.category) {
      alert("Please select a deferment category.");
      return;
    }
    if (step === 2 && !formData.faculty) {
      alert("Please select your Faculty/School.");
      return;
    }
    if (step === 3 && !formData.program) {
      alert("Please select your Program.");
      return;
    }
    if (step === 4 && !formData.semester) {
      alert("Please select your Semester.");
      return;
    }
    if (step === 5) {
      if (!formData.reason.trim()) {
        alert("Please state the reason for deferment.");
        return;
      }
      if (!formData.missedDate) {
        alert("Please select the date of the missed assessment.");
        return;
      }
    }
    if (step === 6 && !formData.modules.trim()) {
      alert("Please specify the deferred modules.");
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.declaration) {
      alert("You must accept the declaration to submit.");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitApp({
        studentId: profile._id,
        email: user.email,
        category: formData.category,
        faculty: formData.faculty,
        program: formData.program,
        semester: formData.semester,
        reason: formData.reason,
        missedDate: formData.missedDate,
        modules: formData.modules,
        evidenceName: formData.evidenceName || undefined
      });
      setStep(8); // Success step
    } catch (err) {
      alert("Failed to submit deferred application: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, evidenceName: e.target.files[0].name });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFormData({ ...formData, evidenceName: e.dataTransfer.files[0].name });
    }
  };

  const logoUrl = window.location.origin + '/limkokwing_logo.jpg';

  const programsByFaculty = {
    'FICT': ['BBIT', 'BICT', 'BIT', 'BSEM', 'DIT', 'CIT'],
    'FBM': ['BBA', 'DBA', 'MBA', 'BAF', 'DMF', 'DHR'],
    'FCMB': ['BPR', 'BCS', 'Diploma in Journalism', 'BA Mass Comm'],
    'FAD': ['BDes', 'Diploma in Graphic Design', 'BA Creative Imaging', 'Diploma in Fashion Design']
  };

  const getPageNum = (s, f) => {
    if (s === 1) return 1;
    if (s === 2) return 2;
    if (s === 3) {
      if (f === 'FICT') return 3;
      if (f === 'FBM') return 4;
      if (f === 'FCMB') return 5;
      if (f === 'FAD') return 6;
      return 3;
    }
    if (s === 4) return 7;
    if (s === 5) return 8;
    if (s === 6) return 9;
    if (s === 7) return 10;
    return 10;
  };

  const pageNum = getPageNum(step, formData.faculty);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-800 dark:text-slate-100">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-br from-[#0B192C] to-[#1E293B] rounded-3xl p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white leading-tight uppercase tracking-wide">Deferred Exam Applications</h2>
            <p className="text-xs text-slate-400 mt-2 font-semibold">Apply for deferred assessments or check application status natively.</p>
          </div>
          {step > 1 && step < 8 && (
            <button 
              onClick={() => {
                setFormData({
                  category: '',
                  faculty: '',
                  program: '',
                  semester: '',
                  reason: '',
                  missedDate: '',
                  modules: '',
                  evidenceName: '',
                  declaration: false
                });
                setStep(1);
              }}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] px-4 py-2 rounded-xl transition-all uppercase tracking-wider border border-white/5 shadow-inner"
            >
              Restart Application
            </button>
          )}
        </div>
      </div>

      {/* MULTI-STEP NATIVE GOOGLE-STYLE FORM */}
      {step <= 7 && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header Banner Logo */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#4285F4]" />
            <img className="h-16 object-contain" src={logoUrl} alt="Limkokwing University Logo" onError={(e)=>{e.target.style.display='none'}} />
            <div className="text-center mt-3 animate-in fade-in zoom-in-95 duration-300">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white pb-1 px-4 inline-block uppercase tracking-wider">
                DEFERRED ACCESS FORM
              </h1>
              <p className="text-xs text-red-500 font-bold mt-3 max-w-md mx-auto italic leading-normal text-center">
                *Read all instructions very carefully before proceeding. Failure to follow them may result in your request not being processed.*
              </p>
            </div>
          </div>

          {/* User Account Info Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm text-xs space-y-2 relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-400 dark:bg-slate-700" />
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-medium">
              <span>{user.email}</span>
              <span className="text-[#4285F4] hover:underline font-semibold cursor-pointer">Switch account</span>
            </div>
            <p className="text-slate-450 dark:text-slate-500 leading-normal">
              The name, email, and photo associated with your academic account will be recorded when you upload files and submit this form.
            </p>
            <p className="text-red-500 font-bold text-[10px] uppercase tracking-wider mt-1">* Indicates required question</p>
          </div>

          {/* STEP 1: CATEGORY SELECTION */}
          {step === 1 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[#4285F4]" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-805 pb-2">
                Deferment Category <span className="text-red-500">*</span>
              </h3>
              
              <div className="space-y-4">
                <label className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-805 hover:bg-slate-50/50 dark:hover:bg-slate-850/10 cursor-pointer transition-colors">
                  <input 
                    type="radio" 
                    name="category"
                    value="Category A"
                    checked={formData.category === "Category A"}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-4 h-4 text-[#4285F4] border-slate-350 focus:ring-[#4285F4]" 
                  />
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Category A – Emergency / Medical Reasons</span>
                    <p className="text-slate-450 dark:text-slate-405 leading-relaxed">
                      You missed the assessment due to a sudden, unexpected emergency (e.g., accident, medical emergency, family death) that happened during the exam period. Not for ongoing or semester-long illness. Evidence is required within 5 days.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-805 hover:bg-slate-50/50 dark:hover:bg-slate-850/10 cursor-pointer transition-colors">
                  <input 
                    type="radio" 
                    name="category"
                    value="Category B"
                    checked={formData.category === "Category B"}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-4 h-4 text-[#4285F4] border-slate-350 focus:ring-[#4285F4]" 
                  />
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Category B – Financial Clearance</span>
                    <p className="text-slate-450 dark:text-slate-405 leading-relaxed">
                      You missed the assessment because you hadn't paid fees on time, but you have now cleared your fees. A deferred assessment fee applies. Second offence may lead to semester deferral or withdrawal.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: FACULTY SELECTION */}
          {step === 2 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[#4285F4]" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-805 pb-2">
                Faculty / School selection <span className="text-red-500">*</span>
              </h3>
              
              <div className="flex flex-col gap-2.5">
                {['FICT', 'FBM', 'FCMB', 'FAD'].map((fac) => (
                  <label key={fac} className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-100 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-slate-850/10 cursor-pointer transition-colors text-xs font-bold text-slate-700 dark:text-slate-200">
                    <input 
                      type="radio"
                      name="faculty"
                      value={fac}
                      checked={formData.faculty === fac}
                      onChange={(e) => setFormData({ ...formData, faculty: e.target.value, program: '' })}
                      className="w-4 h-4 text-[#4285F4] border-slate-300 dark:border-slate-700 focus:ring-[#4285F4]"
                    />
                    <span>{fac}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: PROGRAM SELECTION */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-[#4D4D4D] text-white px-6 py-4 rounded-xl font-bold text-sm tracking-wider uppercase shadow-sm">
                {formData.faculty === 'FICT' || formData.faculty === 'FCMB' ? 'FICT FCMB' : formData.faculty}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
                <h3 className="font-bold text-base text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-850">
                  {formData.faculty} <span className="text-red-500">*</span>
                </h3>

                <div className="flex flex-col gap-2.5">
                  {programsByFaculty[formData.faculty]?.map((prog) => (
                    <label key={prog} className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-100 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-slate-850/10 cursor-pointer transition-colors text-xs font-bold text-slate-700 dark:text-slate-200">
                      <input 
                        type="radio"
                        name="program"
                        value={prog}
                        checked={formData.program === prog}
                        onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                        className="w-4 h-4 text-[#4285F4] border-slate-300 dark:border-slate-700 focus:ring-[#4285F4]"
                      />
                      <span>{prog}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SEMESTER SELECTION */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-[#4D4D4D] text-white px-6 py-4 rounded-xl font-bold text-sm tracking-wider uppercase shadow-sm">
                Semester
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
                <h3 className="font-bold text-base text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-850">
                  Semester <span className="text-red-500">*</span>
                </h3>

                <div className="flex flex-col gap-2.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8'].map((sem) => (
                    <label key={sem} className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-100 dark:border-slate-805 hover:bg-slate-50 dark:hover:bg-slate-850/10 cursor-pointer transition-colors text-xs font-bold text-slate-700 dark:text-slate-200">
                      <input 
                        type="radio"
                        name="semester"
                        value={sem}
                        checked={formData.semester === sem}
                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                        className="w-4 h-4 text-[#4285F4] border-slate-300 dark:border-slate-700 focus:ring-[#4285F4]"
                      />
                      <span>{sem}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REASON & DATE */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-[#4D4D4D] text-white px-6 py-4 rounded-xl font-bold text-sm tracking-wider uppercase shadow-sm">
                DEFERRED ASSESSMENT DETAILS
                <p className="text-xs text-slate-200 font-normal normal-case mt-1 leading-relaxed">State clearly the reason for missing your exam, in detail.</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Reason for Deferment <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Your answer"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-250 dark:border-slate-700 focus:border-[#4285F4] rounded-lg px-4 py-3 text-sm text-slate-850 dark:text-slate-100 outline-none transition-colors h-28 resize-none font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Date of Missed Assessment <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date"
                    value={formData.missedDate}
                    onChange={(e) => setFormData({ ...formData, missedDate: e.target.value })}
                    className="bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-250 dark:border-slate-700 focus:border-[#4285F4] rounded-lg px-4 py-2.5 text-sm text-slate-850 dark:text-slate-100 outline-none transition-colors w-full sm:w-60 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: APPROVED MODULES */}
          {step === 6 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-[#4D4D4D] text-white px-6 py-4 rounded-xl font-bold text-sm tracking-wider uppercase shadow-sm">
                APPROVED MODULES FOR DEFERMENT
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Deferred Module <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    value={formData.modules}
                    onChange={(e) => setFormData({ ...formData, modules: e.target.value })}
                    placeholder="Your answer"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-250 dark:border-slate-700 focus:border-[#4285F4] rounded-lg px-4 py-2.5 text-sm text-slate-850 dark:text-slate-100 outline-none transition-colors font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: UPLOAD & DECLARATION */}
          {step === 7 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-4">
                <div className="bg-[#4D4D4D] text-white px-6 py-4 rounded-xl font-bold text-sm tracking-wider uppercase shadow-sm">
                  DEFERRED ACCESS FORM
                  <p className="text-xs text-slate-200 font-normal normal-case mt-1 leading-relaxed">
                    Upload authentic documents as proof of your claim. The Medical Department, SSD, and Year Leaders will investigate all submitted documents for legitimacy.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Evidence Documents
                  </label>
                  
                  <div 
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-colors ${
                      dragActive 
                        ? 'border-[#4285F4] bg-[#4285F4]/5' 
                        : formData.evidenceName 
                          ? 'border-emerald-500 bg-emerald-50/5' 
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-350'
                    }`}
                  >
                    {formData.evidenceName ? (
                      <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2.5 rounded-xl border border-emerald-500/20 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{formData.evidenceName}</span>
                        <button 
                          onClick={() => setFormData({ ...formData, evidenceName: '' })}
                          className="ml-2 text-slate-450 hover:text-red-500 font-bold uppercase text-[9px] tracking-wider"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400" />
                        <div className="text-center space-y-1">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Drag and drop file here, or click to upload</p>
                          <p className="text-[10px] text-slate-400">PDF, image, document (max 10MB)</p>
                        </div>
                        <input 
                          type="file" 
                          onChange={handleFileChange}
                          className="hidden" 
                          id="evidence-file-input"
                        />
                        <label 
                          htmlFor="evidence-file-input"
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-[10px] px-4 py-2 rounded-lg cursor-pointer transition-colors uppercase tracking-wider"
                        >
                          Add File
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-base text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-850 pb-2">
                  Declaration <span className="text-red-500">*</span>
                </h3>

                <label className="flex items-start gap-4 p-4 rounded-xl border border-slate-150 dark:border-slate-805 hover:bg-slate-50/50 dark:hover:bg-slate-850/10 cursor-pointer transition-colors">
                  <input 
                    type="checkbox"
                    checked={formData.declaration}
                    onChange={(e) => setFormData({ ...formData, declaration: e.target.checked })}
                    className="mt-1 w-4 h-4 text-[#4285F4] rounded border-slate-300 focus:ring-[#4285F4]" 
                  />
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                    I hereby declare that the information provided in this form is true, complete, and accurate to the best of my knowledge. I understand that any false statements or omissions may result in the rejection of my application or further disciplinary action.
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* NAV BUTTONS AND PROGRESS BAR */}
          <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-slate-150 dark:border-slate-850">
            <div className="flex gap-3">
              {step > 1 && (
                <button 
                  onClick={handleBack}
                  className="bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs py-2.5 px-5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm uppercase tracking-wider"
                >
                  Back
                </button>
              )}
              {step < 7 ? (
                <button 
                  onClick={handleNext}
                  className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-[#4285F4] border border-slate-200 dark:border-slate-750 font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-sm uppercase tracking-wider"
                >
                  Next
                </button>
              ) : (
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-[#4285F4] hover:bg-blue-600 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition-all shadow-sm flex items-center gap-1.5 uppercase tracking-wider"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              )}
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-3">
              <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#4285F4] h-full transition-all duration-300"
                  style={{ width: `${(pageNum / 10) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">Page {pageNum} of 10</span>
            </div>

            <button 
              onClick={handleClear}
              className="text-xs text-[#4285F4] hover:underline font-semibold"
            >
              Clear form
            </button>
          </div>
        </div>
      )}

      {/* STEP 8: SUCCESS PAGE */}
      {step === 8 && (
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-3xl p-8 shadow-sm text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2.5 bg-emerald-500" />
          
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Response Recorded</h1>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Your Deferred Access Form has been submitted successfully. The Medical Department, SSD, and Year Leaders will investigate and review all submitted documents for legitimacy.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-left text-xs space-y-2 font-semibold text-slate-700 dark:text-slate-300">
            <div><span className="font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest text-[9px] block">Category</span> {formData.category}</div>
            <div><span className="font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest text-[9px] block">Faculty & Program</span> {formData.faculty} - {formData.program}</div>
            <div><span className="font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest text-[9px] block">Semester</span> {formData.semester}</div>
            <div><span className="font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest text-[9px] block">Deferred Modules</span> {formData.modules}</div>
            <div><span className="font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest text-[9px] block">Missed Assessment Date</span> {formData.missedDate}</div>
            {formData.evidenceName && <div><span className="font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest text-[9px] block">Attached Proof</span> {formData.evidenceName}</div>}
          </div>

          <div className="pt-2 flex gap-3 flex-wrap">
            <button 
              onClick={() => {
                setFormData({
                  category: '',
                  faculty: '',
                  program: '',
                  semester: '',
                  reason: '',
                  missedDate: '',
                  modules: '',
                  evidenceName: '',
                  declaration: false
                });
                setStep(1);
              }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs py-3 rounded-xl transition-colors min-w-[140px] uppercase tracking-wider"
            >
              Submit Another Request
            </button>
            <button 
              onClick={() => window.print()}
              className="flex-1 bg-[#0B192C] hover:bg-[#1E293B] text-white font-bold text-xs py-3 rounded-xl transition-all shadow-sm min-w-[140px] uppercase tracking-wider"
            >
              Print Confirmation
            </button>
          </div>
        </div>
      )}

      {/* MY SUBMITTED APPLICATIONS HISTORY TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">My Deferment Application History</h3>
          <p className="text-[10px] text-slate-405 dark:text-slate-500 mt-0.5 font-semibold">Real-time status updates of your deferred requests.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="bg-[#0B192C] text-white text-[10px] font-semibold uppercase tracking-wider">
                <th className="px-4 py-3 rounded-l-lg">Date Applied</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Faculty / Program</th>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Modules Listed</th>
                <th className="px-4 py-3">Attached Document</th>
                <th className="px-4 py-3 text-center rounded-r-lg">Application Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {myApps === undefined ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 dark:text-slate-505 text-xs font-semibold animate-pulse">
                    Accessing application records...
                  </td>
                </tr>
              ) : myApps.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-405 dark:text-slate-550 text-xs italic">
                    No deferred exam applications submitted.
                  </td>
                </tr>
              ) : myApps.map(app => {
                let badgeColor = "bg-yellow-50 text-yellow-600 border-yellow-250";
                if (app.status === "approved") badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-250";
                if (app.status === "rejected") badgeColor = "bg-red-50 text-red-600 border-red-250";

                return (
                  <tr key={app._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/15 text-xs font-medium transition-colors">
                    <td className="px-4 py-3.5 text-slate-555 font-mono">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 dark:text-slate-200">
                      {app.category}
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 dark:text-slate-200">
                      {app.faculty && app.program ? `${app.faculty} - ${app.program}` : "N/A"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 dark:text-slate-200 font-mono">
                      {app.semester || "N/A"}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-300">
                      {app.modules}
                    </td>
                    <td className="px-4 py-3.5 text-slate-450 dark:text-slate-555 font-mono">
                      {app.evidenceName || "None"}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeColor}`}>
                        {app.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}




// ─────────────────────────────────────────────────────────────────
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentView, setCurrentView] = useState('overview');
  const router = useRouter();

  // Load user session
  useEffect(() => {
    setMounted(true);
    try {
      const session = sessionStorage.getItem('lusl_session');
      if (!session) { router.push('/login'); return; }
      setUser(JSON.parse(session));
    } catch {
      router.push('/login');
    }
  }, [router]);

  // Seed default admin and courses if none exist
  const seed = useMutation(api.users.seedAdmin);
  useEffect(() => {
    seed().catch(console.error);
  }, [seed]);

  const ensureProfile = useMutation(api.students.ensureStudentProfile);
  useEffect(() => {
    if (user && user.role === 'student') {
      ensureProfile({ userId: user._id || user.userId }).catch(console.error);
    }
  }, [user, ensureProfile]);

  const dbUser = useQuery(api.users.getCurrentUser, { userId: user?._id || user?.userId || "" });
  const notifications = useQuery(api.notifications.getMyNotifications, { userId: user?._id || user?.userId || "" });
  const markAsRead = useMutation(api.notifications.markAsRead);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const logout = () => {
    sessionStorage.removeItem('lusl_session');
    router.push('/login');
  };

  // Real-time block protection
  useEffect(() => {
    if (dbUser && !dbUser.isActive) {
      alert("Your account has been deactivated by the administrator.");
      logout();
    }
  }, [dbUser]);

  // Fetch admin dynamic stats
  const stats = useQuery(api.users.getDashboardStats, 
    user?.role === 'admin' ? { requesterId: user._id || user.userId } : "skip"
  );

  if (!mounted || !user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#0B192C] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const unreadNotifications = notifications?.filter(n => !n.isRead) || [];

  // Sidebar configurations
  const roleLabel = { admin: 'Master Administrator', finance: 'Finance Officer', registry: 'Registry Staff', student: 'Student Portal' };
  
  // Nav views for Admin
  const adminNav = [
    { icon: LayoutDashboard, label: 'Overview', view: 'overview' },
    { icon: Users, label: 'Manage Staff', view: 'manage_staff' },
    { icon: Users, label: 'Manage Students', view: 'manage_students' },
    { icon: ShieldAlert, label: 'Entrance Scanner', view: 'entrance_scanner' },
    { icon: BookOpen, label: 'Course Catalog', view: 'manage_courses' },
    { icon: ShieldCheck, label: 'Security Logs', view: 'security_logs' },
    { icon: Settings, label: 'Settings', view: 'settings' }
  ];

  const isDarkMode = dbUser?.theme === 'dark';

  return (
    <div className={`min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex text-slate-800 dark:text-slate-100 transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0B192C] flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-[#1A2A40]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center p-1 border border-slate-800 shadow-md shadow-black/10 overflow-hidden shrink-0">
              <img src="/limkokwing_logo.jpg" alt="Limkokwing Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-black text-white tracking-tight">Limkokwing MIS</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Sierra Leone</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {user.role === 'admin' ? (
            adminNav.map((item, i) => (
              <button
                key={i}
                onClick={() => { setCurrentView(item.view); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold tracking-wide transition-all ${
                  item.view === currentView
                    ? 'bg-[#D6E6F2] text-[#0B192C] shadow-sm'
                    : 'text-slate-400 hover:bg-[#1A2A40] hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </button>
            ))
          ) : (
            <>
              <button
                onClick={() => { setCurrentView('overview'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold tracking-wide transition-all ${
                  currentView === 'overview'
                    ? 'bg-[#D6E6F2] text-[#0B192C] shadow-sm'
                    : 'text-slate-400 hover:bg-[#1A2A40] hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>
              {user.role === 'student' && (
                <>
                  <button
                    onClick={() => { setCurrentView('course_catalog'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold tracking-wide transition-all ${
                      currentView === 'course_catalog'
                        ? 'bg-[#D6E6F2] text-[#0B192C] shadow-sm'
                        : 'text-slate-400 hover:bg-[#1A2A40] hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" /> Course Catalog
                  </button>
                  <button
                    onClick={() => { setCurrentView('sitting'); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold tracking-wide transition-all ${
                      currentView === 'sitting'
                        ? 'bg-[#D6E6F2] text-[#0B192C] shadow-sm'
                        : 'text-slate-400 hover:bg-[#1A2A40] hover:text-white'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Exam Sitting
                  </button>
                </>
              )}
              <button
                onClick={() => { setCurrentView('settings'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold tracking-wide transition-all ${
                  currentView === 'settings'
                    ? 'bg-[#D6E6F2] text-[#0B192C] shadow-sm'
                    : 'text-slate-400 hover:bg-[#1A2A40] hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4" /> Security Settings
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-[#1A2A40]">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-slate-950">
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200/80 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-550" />
              <input placeholder="Search directory..." className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none w-56 focus:border-slate-350 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-850 transition-all" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden text-slate-800 dark:text-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">Notifications</span>
                    {unreadNotifications.length > 0 && (
                      <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded">
                        {unreadNotifications.length} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications === undefined ? (
                      <p className="p-4 text-center text-xs text-slate-400 animate-pulse">Loading alerts...</p>
                    ) : notifications.length === 0 ? (
                      <p className="p-4 text-center text-xs text-slate-400 italic">No notifications yet.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id} className={`p-3.5 transition-colors flex items-start gap-2.5 ${!n.isRead ? 'bg-blue-50/40 dark:bg-blue-950/10 hover:bg-blue-50/60 dark:hover:bg-blue-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                          <div className="flex-1 space-y-0.5">
                            <div className="flex justify-between items-start gap-2">
                              <p className={`text-xs ${!n.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>{n.title}</p>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium shrink-0">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">{n.message}</p>
                            {!n.isRead && (
                              <button 
                                onClick={async () => {
                                  try {
                                    await markAsRead({ userId: user._id || user.userId, notificationId: n._id });
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="text-[9px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors mt-1 block"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <HelpCircle className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{user.email}</p>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">{roleLabel[user.role]}</p>
              </div>
              {dbUser?.profileImage ? (
                <img src={dbUser.profileImage} alt={dbUser.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 text-xs">
                  {user.name ? user.name.charAt(0) : 'A'}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-6xl mx-auto w-full animate-in fade-in duration-300">
          {user.role === 'admin' ? (
            <AdminPanel user={user} currentView={currentView} stats={stats} />
          ) : (
            <>
              {currentView === 'settings' ? (
                <SecuritySettings user={user} />
              ) : (
                <>
                  {user.role === 'student' && currentView === 'overview' && <StudentPanel user={user} />}
                  {user.role === 'student' && currentView === 'course_catalog' && <StudentCourseCatalog user={user} />}
                  {user.role === 'student' && currentView === 'sitting' && <StudentSittingPanel user={user} />}
                  {user.role === 'finance' && <FinanceLedgerPanel user={user} />}
                  {user.role === 'registry' && <RegistryPanel user={user} />}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}