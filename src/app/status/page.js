'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Search, Printer, ShieldCheck, CheckCircle2, Clock, XCircle, AlertTriangle, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function StatusPage() {
  const [email, setEmail] = useState('');
  const [searchedEmail, setSearchedEmail] = useState('');
  
  // Only query when searchedEmail is set
  const statusResult = useQuery(api.admissions.checkApplicationStatus, 
    searchedEmail ? { email: searchedEmail } : 'skip'
  );

  const handleSearch = (e) => {
    e.preventDefault();
    if (!email) return;
    setSearchedEmail(email);
  };

  const renderStatusBadge = (status) => {
    if (status === 'pending') {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20 font-bold uppercase tracking-wider text-sm">
          <Clock className="w-4 h-4" /> Pending Review
        </div>
      );
    }
    if (status === 'rejected') {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 font-bold uppercase tracking-wider text-sm">
          <XCircle className="w-4 h-4" /> Application Unsuccessful
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 font-bold uppercase tracking-wider text-sm">
        <CheckCircle2 className="w-4 h-4" /> Application Approved
      </div>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      {/* Header - hide on print */}
      <div className="print:hidden border-b border-slate-900 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">LUSL <span className="text-blue-500">Admissions</span></span>
          </div>
          <Link href="/apply" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
            New Application
          </Link>
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 print:p-0 print:max-w-full">
        
        {/* Search UI - hide on print */}
        <div className="print:hidden mb-12">
          <h1 className="text-3xl font-black text-white mb-4">Check Application Status</h1>
          <p className="text-slate-400 mb-8">Enter the email address you used during your application to check your current admission status.</p>
          
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 transition-all font-bold" 
                placeholder="Applicant Email Address" 
              />
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 rounded-2xl transition-all shadow-lg shadow-blue-500/20">
              Check Status
            </button>
          </form>
        </div>

        {/* Results */}
        {searchedEmail && statusResult === undefined && (
          <div className="print:hidden text-center py-12 text-slate-500 animate-pulse font-bold">
            Searching records...
          </div>
        )}

        {searchedEmail && statusResult && !statusResult.found && (
          <div className="print:hidden bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-black text-white mb-2">No Application Found</h2>
            <p className="text-red-400/80">We could not find an application associated with {searchedEmail}.</p>
          </div>
        )}

        {searchedEmail && statusResult && statusResult.found && (
          <div className="space-y-8">
            
            {/* Status Card - hide on print */}
            <div className="print:hidden bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
              <div>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mb-1">Applicant</p>
                <h2 className="text-2xl font-black text-white">{statusResult.application.firstName} {statusResult.application.lastName}</h2>
                <p className="text-slate-400 mt-1">{statusResult.application.program}</p>
              </div>
              <div className="flex flex-col items-end gap-4">
                {renderStatusBadge(statusResult.application.status)}
                {statusResult.application.status === 'approved' && (
                  <button onClick={handlePrint} className="flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
                    <Printer className="w-4 h-4" /> Print Acceptance Letter
                  </button>
                )}
              </div>
            </div>

            {/* Print Warning for Approved */}
            {statusResult.application.status === 'approved' && (
              <div className="print:hidden bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl flex gap-4">
                <ShieldCheck className="w-8 h-8 text-blue-500 shrink-0" />
                <div>
                  <h3 className="font-bold text-blue-400 mb-1">Next Step: Physical Verification</h3>
                  <p className="text-sm text-blue-200/70">
                    Your application is approved! However, to complete your enrollment and unlock your student portal for payments, 
                    you <strong>MUST</strong> print the Acceptance Letter below and present it to the University Registry for physical verification.
                  </p>
                </div>
              </div>
            )}

            {/* Printable Letter */}
            {statusResult.application.status === 'approved' && (
              <div className="bg-white text-black p-12 rounded-3xl print:p-0 print:rounded-none print:shadow-none shadow-2xl mx-auto" style={{ maxWidth: '800px' }}>
                {/* Letterhead */}
                <div className="border-b-4 border-black pb-6 mb-8 text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mb-4 print:border print:border-black">
                    <GraduationCap className="text-white w-12 h-12" />
                  </div>
                  <h1 className="text-3xl font-black uppercase tracking-tight">Limkokwing University</h1>
                  <p className="text-sm font-bold uppercase tracking-widest text-gray-600 mt-1">Of Creative Technology - Sierra Leone</p>
                  <p className="text-xs text-gray-500 mt-2">Hill Station, Freetown | admissions@limkokwing.edu.sl</p>
                </div>

                <div className="text-right mb-8">
                  <p className="font-bold">Date: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="mb-8">
                  <p className="mb-1">To: <strong>{statusResult.application.firstName} {statusResult.application.lastName}</strong></p>
                  <p className="mb-1">Email: {statusResult.application.email}</p>
                  <p className="mb-1">Phone: {statusResult.application.phone}</p>
                </div>

                <h2 className="text-2xl font-black mb-6 uppercase border-b-2 border-gray-200 pb-2">Letter of Acceptance</h2>

                <div className="space-y-4 text-justify mb-12 leading-relaxed">
                  <p>Dear {statusResult.application.firstName},</p>
                  <p>
                    Congratulations! We are pleased to inform you that your application for admission to Limkokwing University of Creative Technology has been successful. 
                    You have been offered a place in the <strong>{statusResult.application.program}</strong> within the {statusResult.application.faculty} for the upcoming academic year.
                  </p>
                  <p>
                    This is a provisional offer. To finalize your enrollment and gain full access to the University's digital ecosystem, you are required to physically verify your acceptance.
                  </p>
                  <p className="font-bold border border-black p-4 bg-gray-50 rounded-lg">
                    INSTRUCTIONS: Print this letter and bring it to the University Registry at the Hill Station Campus. The Registry staff will use the Cryptographic Verification Code below to authenticate your application and unlock your student portal for fee payments.
                  </p>
                </div>

                {/* Secure Verification Section */}
                <div className="border-2 border-black rounded-2xl p-8 text-center mb-12 bg-gray-50">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Cryptographic Verification Code</p>
                  <p className="text-5xl font-black font-mono tracking-widest">{statusResult.application.verificationCode || 'N/A'}</p>
                  <p className="text-xs text-gray-500 mt-4">Do not share this code with anyone outside the University Registry.</p>
                </div>

                <div className="mt-12 pt-8 border-t-2 border-gray-200">
                  <p className="mb-8">Sincerely,</p>
                  <div className="w-48 h-12 bg-gray-200 mb-2 flex items-center justify-center">
                    <span className="italic text-gray-500">[Digital Signature]</span>
                  </div>
                  <p className="font-bold">University Registrar</p>
                  <p className="text-sm text-gray-600">Limkokwing University, Sierra Leone</p>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
