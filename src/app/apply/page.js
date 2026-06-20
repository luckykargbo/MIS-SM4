'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
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
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Header */}
      <div className="border-b border-slate-900 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">LUSL <span className="text-blue-500">Admissions</span></span>
          </div>
          <Link href="/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
            Existing Student? Login
          </Link>
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-12">
        
        {/* Progress Bar */}
        {step < 4 && (
          <div className="flex items-center justify-between mb-12">
            <div className={`flex flex-col items-center gap-2 ${step >= 1 ? 'text-blue-500' : 'text-slate-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${step >= 1 ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900'}`}>1</div>
              <span className="text-[10px] uppercase tracking-widest font-bold">Verification</span>
            </div>
            <div className={`h-1 flex-1 mx-4 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-slate-900'}`}></div>
            <div className={`flex flex-col items-center gap-2 ${step >= 2 ? 'text-blue-500' : 'text-slate-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${step >= 2 ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900'}`}>2</div>
              <span className="text-[10px] uppercase tracking-widest font-bold">Personal Info</span>
            </div>
            <div className={`h-1 flex-1 mx-4 rounded-full ${step >= 3 ? 'bg-blue-500' : 'bg-slate-900'}`}></div>
            <div className={`flex flex-col items-center gap-2 ${step >= 3 ? 'text-blue-500' : 'text-slate-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${step >= 3 ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900'}`}>3</div>
              <span className="text-[10px] uppercase tracking-widest font-bold">Academics</span>
            </div>
          </div>
        )}

        {/* Step 1: Verification */}
        {step === 1 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white mb-2">Verify Your Identity</h2>
              <p className="text-slate-400">To prevent spam, please verify your email address before starting your application.</p>
            </div>
            
            {errorMsg && (
              <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {errorMsg}
              </div>
            )}

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 transition-all" placeholder="you@example.com" />
                  </div>
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? 'Sending...' : 'Send Verification Code'} <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Enter 6-Digit Code</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                    <input type="text" maxLength={6} required value={otpCode} onChange={e => setOtpCode(e.target.value)} className="w-full bg-slate-950 border border-emerald-500/50 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-emerald-500 transition-all text-center tracking-[0.5em] font-black text-xl" placeholder="••••••" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">For this demo, just enter any 6 digits to proceed.</p>
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                  Verify & Continue
                </button>
              </form>
            )}
          </div>
        )}

        {/* Step 2: Personal Info */}
        {step === 2 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white mb-2">Personal Details</h2>
              <p className="text-slate-400">Tell us a bit about yourself and the program you wish to apply for.</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">First Name</label>
                  <input required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50" placeholder="e.g. John" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Last Name</label>
                  <input required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50" placeholder="e.g. Sesay" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Phone Number</label>
                  <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50" placeholder="+232 76 123 456" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Program of Choice</label>
                  <select required value={form.program} onChange={e => setForm({...form, program: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50 font-bold">
                    {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="pt-4 flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="px-6 py-4 text-slate-400 font-bold hover:text-white transition-colors">Back</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
                  Next Step <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: WASSCE Grades */}
        {step === 3 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-white mb-2">WASSCE Results</h2>
              <p className="text-slate-400">Please provide your WASSCE subjects and the grades you obtained. Minimum requirement is usually 5 credits including English and Math.</p>
            </div>

            {errorMsg && (
              <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitApplication} className="space-y-6">
              
              <div className="space-y-3">
                {grades.map((gradeRow, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 border border-slate-800">
                      {idx + 1}
                    </div>
                    <select required value={gradeRow.subject} onChange={e => updateGrade(idx, 'subject', e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-500/50">
                      {WASSCE_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="Other">Other Subject...</option>
                    </select>
                    <select required value={gradeRow.grade} onChange={e => updateGrade(idx, 'grade', e.target.value)} className="w-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-500/50 font-bold text-center">
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
                      <button type="button" onClick={() => removeGrade(idx)} className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-xl transition-colors shrink-0">
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {grades.length < 9 && (
                <button type="button" onClick={addGradeRow} className="text-blue-400 text-sm font-bold flex items-center gap-2 hover:text-blue-300 transition-colors py-2">
                  + Add Another Subject
                </button>
              )}

              <div className="pt-8 flex justify-between border-t border-slate-800">
                <button type="button" disabled={isSubmitting} onClick={() => setStep(2)} className="px-6 py-4 text-slate-400 font-bold hover:text-white transition-colors">Back</button>
                <button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-2xl">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Application Received!</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
              Thank you for applying to Limkokwing University of Creative Technology. Your application for <strong>{form.program}</strong> has been successfully submitted and is pending review by the Registry.
            </p>
            <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 mb-8 inline-block text-left mx-auto">
              <p className="text-xs text-slate-500 font-bold uppercase mb-1">What happens next?</p>
              <ul className="text-sm text-slate-300 space-y-2 mt-4 list-disc list-inside">
                <li>Registry staff will verify your WASSCE grades.</li>
                <li>You will receive an email notifying you of the decision.</li>
                <li>If approved, your official Student ID and Portal Login will be emailed to you!</li>
              </ul>
            </div>
            <div>
              <Link href="/login" className="inline-block px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all">
                Return to Login
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
