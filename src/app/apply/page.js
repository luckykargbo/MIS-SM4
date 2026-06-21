'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { GraduationCap, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck, Mail, BookOpen, Hash } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const PROGRAMS = [
  "Bachelor of Information Technology",
  "Bachelor of Software Engineering Multimedia",
  "Bachelor of Information and Communication Technology",
  "Bachelor of Business Management with Honours",
  "Bachelor of International Business",
  "Bachelor of Tourism Management",
  "Bachelor of Professional Communication",
  "Bachelor of Digital Film and Television",
  "Bachelor of Architecture",
  "Bachelor of Graphic Design",
  "Diploma in Information Technology",
  "Diploma in Business Administration",
  "Diploma in International Business",
  "Diploma in Architecture",
  "Certificate in Business Management",
  "Certificate in Information Technology"
];

const WASSCE_SUBJECTS = [
  "English Language",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Further Mathematics",
  "Economics",
  "Financial Accounting",
  "Business Management",
  "Government",
  "History",
  "Literature in English",
  "Geography",
  "Agricultural Science"
];

export default function ApplyPage() {
  const router = useRouter();
  const portalStatus = useQuery(api.admissions.getPortalStatus);
  const submitApp = useMutation(api.admissions.submitApplication);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form State
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    program: 'Bachelor of Information Technology'
  });
  const [grades, setGrades] = useState([{ subject: 'English Language', grade: 'C4' }, { subject: 'Mathematics', grade: 'C4' }]);

  // Since we are mocking the email OTP for MVP, we'll just require them to enter it and click "Send OTP" then "Verify".
  // In a full production system, we'd trigger an email.
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  if (portalStatus === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!portalStatus.isOpen) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white mb-2">Admissions Closed</h1>
            <p className="text-slate-400">The university is not currently accepting new applications. Please check back later or contact the Registry for more information.</p>
          </div>
          <Link href="/login" className="block w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg("Please enter your email address first.");
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    // Simulate sending OTP
    setTimeout(() => {
      setIsSubmitting(false);
      setOtpSent(true);
      // For demonstration, prefill a fake OTP or tell them it's '123456'
    }, 1000);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setErrorMsg("Please enter a valid 6-digit OTP code.");
      return;
    }
    setErrorMsg(null);
    // Simulate verification
    setStep(2);
  };

  const addGradeRow = () => {
    if (grades.length >= 9) return;
    setGrades([...grades, { subject: WASSCE_SUBJECTS[0], grade: 'C4' }]);
  };

  const updateGrade = (index, field, value) => {
    const newGrades = [...grades];
    newGrades[index][field] = value;
    setGrades(newGrades);
  };

  const removeGrade = (index) => {
    const newGrades = [...grades];
    newGrades.splice(index, 1);
    setGrades(newGrades);
  };

  const determineFaculty = (progName) => {
    if (progName.includes("Business") || progName.includes("Tourism")) return "Faculty of Business Management & Globalization";
    if (progName.includes("Communication") || progName.includes("Film") || progName.includes("Design")) return "Faculty of Communication, Media & Broadcasting";
    if (progName.includes("Architecture")) return "Faculty of Architecture & Building";
    return "Faculty of Information & Communication Technology";
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    
    try {
      await submitApp({
        firstName: form.firstName,
        lastName: form.lastName,
        email: email,
        phone: form.phone,
        program: form.program,
        faculty: determineFaculty(form.program),
        wassceGrades: grades
      });
      setStep(4); // Success step
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans text-slate-900">
      
      {/* LEFT SIDE - HERO COVER */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-16 bg-slate-950 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/campus_cover.png" 
            alt="University Campus" 
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-slate-900/10"></div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-2xl">
              <GraduationCap className="text-blue-600 w-7 h-7" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">LUSL <span className="text-blue-400">Admissions</span></span>
          </div>

          <h1 className="text-6xl font-black text-white leading-[1.1] mb-6 tracking-tight">
            Design your future.<br />
            Defy the ordinary.
          </h1>
          <p className="text-xl text-slate-300 max-w-lg font-medium leading-relaxed">
            Join a prestigious community of innovators and global leaders. The world is waiting for your creativity.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 p-6 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl w-max">
          <div className="flex -space-x-4">
             <div className="w-12 h-12 rounded-full border-2 border-slate-900 bg-blue-500 flex items-center justify-center text-[10px] font-black text-white">UK</div>
             <div className="w-12 h-12 rounded-full border-2 border-slate-900 bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white">MY</div>
             <div className="w-12 h-12 rounded-full border-2 border-slate-900 bg-purple-500 flex items-center justify-center text-[10px] font-black text-white">SL</div>
          </div>
          <div>
            <p className="text-sm text-slate-300 font-bold uppercase tracking-widest mb-1">Global Campuses</p>
            <p className="text-white font-black text-lg">30,000+ Students Worldwide</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - FORM AREA */}
      <div className="w-full lg:w-1/2 flex flex-col bg-slate-50 overflow-y-auto">
        <div className="flex-1 w-full max-w-2xl mx-auto px-6 lg:px-12 py-12 lg:py-20 flex flex-col justify-center">
          
          <div className="flex justify-end mb-12 lg:mb-16">
            <Link href="/login" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-2">
              Existing Student? Login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Progress Indicator */}
          {step < 4 && (
            <div className="flex items-center gap-4 mb-12">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex-1 flex flex-col gap-2">
                  <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${step >= s ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${step >= s ? 'text-blue-600' : 'text-slate-400'}`}>
                    {s === 1 ? 'Verify' : s === 2 ? 'Details' : 'Academics'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Form Steps Container */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Welcome.</h2>
                  <p className="text-lg text-slate-500 font-medium">To maintain security and prevent spam, please verify your email address to begin your application.</p>
                </div>
                
                {errorMsg && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" /> {errorMsg}
                  </div>
                )}

                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">Official Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-slate-900 font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400" placeholder="e.g. you@example.com" />
                      </div>
                    </div>
                    <button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2 text-lg">
                      {isSubmitting ? 'Sending...' : 'Send Access Code'} <ArrowRight className="w-5 h-5" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1 text-center block">Enter 6-Digit Access Code</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-500" />
                        <input type="text" maxLength={6} required value={otpCode} onChange={e => setOtpCode(e.target.value)} className="w-full bg-emerald-50/50 border-2 border-emerald-500/30 rounded-xl py-6 pl-12 pr-4 text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 transition-all text-center tracking-[1em] font-black text-3xl placeholder:text-slate-300" placeholder="••••••" />
                      </div>
                      <p className="text-xs text-slate-400 mt-4 text-center font-bold">For this demo, just enter any 6 digits to proceed.</p>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 text-lg">
                      Verify Identity & Continue
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Personal Details.</h2>
                  <p className="text-lg text-slate-500 font-medium">Please provide your official information exactly as it appears on your ID.</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">Legal First Name</label>
                      <input required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400" placeholder="e.g. John" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">Legal Last Name</label>
                      <input required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400" placeholder="e.g. Sesay" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">Active Phone Number</label>
                      <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400" placeholder="+232 76 123 456" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-widest ml-1">Intended Academic Program</label>
                      <select required value={form.program} onChange={e => setForm({...form, program: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer">
                        {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                    <button type="button" onClick={() => setStep(1)} className="px-6 py-4 text-slate-400 font-bold hover:text-slate-900 transition-colors">Go Back</button>
                    <button type="submit" className="bg-slate-900 hover:bg-black text-white font-bold py-4 px-8 rounded-xl transition-all shadow-xl shadow-slate-900/20 flex items-center gap-2">
                      Proceed to Academics <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Academic Records.</h2>
                  <p className="text-lg text-slate-500 font-medium">Input your WASSCE results accurately. These will be physically verified by the Registry.</p>
                </div>

                {errorMsg && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5" /> {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmitApplication} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <div className="space-y-4 mb-8">
                    {grades.map((gradeRow, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-black text-slate-900 shrink-0 border border-slate-200 shadow-sm hidden sm:flex">
                          {idx + 1}
                        </div>
                        <select required value={gradeRow.subject} onChange={e => updateGrade(idx, 'subject', e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 cursor-pointer">
                          {WASSCE_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                          <option value="Other">Other Subject...</option>
                        </select>
                        <select required value={gradeRow.grade} onChange={e => updateGrade(idx, 'grade', e.target.value)} className="w-full sm:w-28 bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 cursor-pointer text-center">
                          <option value="A1">A1</option>
                          <option value="B2">B2</option>
                          <option value="B3">B3</option>
                          <option value="C4">C4</option>
                          <option value="C5">C5</option>
                          <option value="C6">C6</option>
                          <option value="D7">D7</option>
                          <option value="E8">E8</option>
                          <option value="F9">F9</option>
                        </select>
                        {idx > 1 && (
                          <button type="button" onClick={() => removeGrade(idx)} className="w-full sm:w-12 h-10 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors shrink-0 font-bold">
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {grades.length < 9 && (
                    <button type="button" onClick={addGradeRow} className="text-blue-600 text-sm font-black flex items-center gap-2 hover:text-blue-800 transition-colors py-2 uppercase tracking-widest mx-auto mb-8">
                      + Add Another Subject
                    </button>
                  )}

                  <div className="pt-6 flex items-center justify-between border-t border-slate-100">
                    <button type="button" disabled={isSubmitting} onClick={() => setStep(2)} className="px-6 py-4 text-slate-400 font-bold hover:text-slate-900 transition-colors">Go Back</button>
                    <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50">
                      {isSubmitting ? 'Submitting Data...' : 'Submit Official Application'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 4: Success */}
            {step === 4 && (
              <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 text-center relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-50 rounded-full blur-3xl z-0"></div>
                
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-emerald-50">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Application Received</h2>
                  <p className="text-lg text-slate-500 max-w-md mx-auto mb-10 leading-relaxed font-medium">
                    Thank you. Your application for <span className="text-slate-900 font-bold">{form.program}</span> has been securely submitted to the Registry.
                  </p>
                  
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 mb-10 inline-block text-left mx-auto shadow-sm">
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-4">Verification Steps</p>
                    <ul className="text-sm text-slate-700 space-y-3 font-medium">
                      <li className="flex items-start gap-3"><div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div> Registry staff will audit your WASSCE grades.</li>
                      <li className="flex items-start gap-3"><div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div> You will receive an official decision via email.</li>
                      <li className="flex items-start gap-3"><div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div> If approved, your portal login will be dispatched.</li>
                    </ul>
                  </div>
                  
                  <div>
                    <Link href="/login" className="inline-block px-10 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all shadow-xl shadow-slate-900/20 w-full sm:w-auto">
                      Return to Main Gateway
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
