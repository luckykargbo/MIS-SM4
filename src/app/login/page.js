'use client';

import { useState, useEffect, useRef } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Loader2, KeyRound, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { sha256 } from 'js-sha256';

// Multi-environment SHA-256 (works on IP addresses, local networks, and HTTPS)
async function hashPassword(password) {
  return sha256(password);
}

const ALLOWED_EMAILS = [
  '@limkokwing.edu.sl',   // Institutional domain
  '@gmail.com',            // Allow admin external email
  '@icloud.com',           // Allow finance external email
];

export default function LoginPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockTimer, setLockTimer] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);  // 50-second countdown
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [ipAddress, setIpAddress] = useState('127.0.0.1');
  const otpRefs = useRef([]);

  useEffect(() => { setMounted(true); }, []);

  // Fetch client IP address on load
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setIpAddress(data.ip))
      .catch(() => setIpAddress('127.0.0.1'));
  }, []);

  // Handle Google OAuth callback redirect from backend gateway
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session') || params.get('user') || params.get('token');
    if (sessionParam) {
      setIsLoading(true);
      setError('');
      try {
        let parsedUser = null;
        if (sessionParam.startsWith('{')) {
          parsedUser = JSON.parse(sessionParam);
        } else {
          try {
            const decoded = atob(sessionParam);
            if (decoded.startsWith('{')) {
              parsedUser = JSON.parse(decoded);
            }
          } catch {}
        }
        
        if (parsedUser && parsedUser.email) {
          sessionStorage.setItem('lusl_session', JSON.stringify(parsedUser));
          window.location.href = '/dashboard';
        } else {
          const emailParam = params.get('email');
          const roleParam = params.get('role') || 'student';
          const nameParam = params.get('name') || 'Google User';
          
          if (emailParam) {
            const userData = {
              userId: sessionParam,
              name: nameParam,
              email: emailParam,
              role: roleParam,
            };
            sessionStorage.setItem('lusl_session', JSON.stringify(userData));
            window.location.href = '/dashboard';
          } else {
            setError('Google authentication succeeded, but user data is missing in callback.');
          }
        }
      } catch (e) {
        console.error('Error parsing session param:', e);
        setError('Failed to process Google authentication callback.');
      } finally {
        setIsLoading(false);
      }
    }
  }, []);


  // Countdown timer for lockout
  useEffect(() => {
    if (lockTimer <= 0) return;
    const interval = setInterval(() => {
      setLockTimer(prev => {
        if (prev <= 1) { setError(''); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockTimer]);

  // Countdown timer for OTP expiry (50 seconds)
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const interval = setInterval(() => {
      setOtpCountdown(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCountdown]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const validateEmail = (email) => {
    return ALLOWED_EMAILS.some(domain => email.endsWith(domain));
  };

  // CONVEX INTEGRATION
  const loginStep1 = useMutation(api.users.loginStep1);
  const verifyOtpMutation = useMutation(api.users.verifyOtp);

  const handleOtpInput = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').slice(0, 6).split('');
    const newOtp = [...otp];
    let focusedIndex = 0;
    pasted.forEach((char, i) => {
      if (/^\d$/.test(char) && i < 6) {
        newOtp[i] = char;
        focusedIndex = i;
      }
    });
    setOtp(newOtp);
    if (focusedIndex < 5) {
      otpRefs.current[focusedIndex + 1]?.focus();
    } else {
      otpRefs.current[5]?.focus();
    }
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (lockTimer > 0) return;
    setError('');

    if (!validateEmail(email)) {
      setError('Unauthorized institutional domain. Please use @limkokwing.edu.sl or your registered admin account.');
      return;
    }

    setIsLoading(true);
    try {
      const hashed = await hashPassword(password);
      const result = await loginStep1({ email, passwordHash: hashed, ipAddress });
      if (result.error) {
        throw new Error(result.error);
      }
      sessionStorage.setItem('temp_session_id', result.sessionId);
      setOtpCountdown(50); // Start 50-second countdown
      setStep(2);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errMsg);
      if (errMsg.includes('locked')) {
        setLockTimer(15 * 60);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP — generates a brand new unique code and sends to email
  const handleResendOtp = async () => {
    if (isResending) return;
    setIsResending(true);
    setError('');
    setResendSuccess(false);

    try {
      const hashed = await hashPassword(password);
      const result = await loginStep1({ email, passwordHash: hashed, ipAddress });
      if (result.error) {
        throw new Error(result.error);
      }
      sessionStorage.setItem('temp_session_id', result.sessionId);
      setOtpCountdown(50); // Reset 50-second countdown
      setOtp(['', '', '', '', '', '']);
      setResendSuccess(true);
      otpRefs.current[0]?.focus();
      // Clear success message after 3 seconds
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to resend';
      setError(errMsg);
      if (errMsg.includes('locked')) {
        setLockTimer(15 * 60);
      }
    } finally {
      setIsResending(false);
    }
  };

  const getBrowserAndDevice = () => {
    if (typeof window === 'undefined') return { browser: 'Chrome', device: 'Desktop' };
    const ua = window.navigator.userAgent;
    let browser = "Chrome";
    let device = "Desktop";

    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";
    else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

    if (ua.includes("Mobi") || ua.includes("Android") || ua.includes("iPhone")) {
      device = "Mobile";
    } else if (ua.includes("Tablet") || ua.includes("iPad")) {
      device = "Tablet";
    }

    return { browser, device };
  };

  const verifyOtp = async () => {
    if (lockTimer > 0) return;
    const entered = otp.join('');
    if (entered.length < 6) { setError('Please enter all 6 digits.'); return; }

    setIsLoading(true);
    try {
      const sessionId = sessionStorage.getItem('temp_session_id');
      const { browser, device } = getBrowserAndDevice();
      const result = await verifyOtpMutation({ sessionId, code: entered, ipAddress, browser, device });
      if (result.error) {
        throw new Error(result.error);
      }
      
      // ✅ SUCCESS
      sessionStorage.setItem('lusl_session', JSON.stringify(result.user));
      window.location.href = '/dashboard';
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Verification failed';
      setError(errMsg);
      
      if (errMsg.includes('locked')) {
        setLockTimer(15 * 60);
      }
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };


  const handleGoogleLogin = () => {
    setError('');
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '609900502887-vsb671mls9vsc15pjnahjo3ip1137cvu.apps.googleusercontent.com';
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/v1/auth/google/callback';
    
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    
    const options = {
      redirect_uri: redirectUri,
      client_id: clientId,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
      state: 'lusl_mis_google_oauth',
    };
    
    const queryString = new URLSearchParams(options).toString();
    const googleAuthUrl = `${rootUrl}?${queryString}`;
    
    window.location.href = googleAuthUrl;
  };


  if (!mounted) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Calculate OTP timer color
  const otpTimerColor = otpCountdown > 20 ? 'text-emerald-400' : otpCountdown > 10 ? 'text-amber-400' : 'text-red-400';
  const otpTimerBorder = otpCountdown > 20 ? 'border-emerald-500/20' : otpCountdown > 10 ? 'border-amber-500/20' : 'border-red-500/20';
  const otpTimerBg = otpCountdown > 20 ? 'bg-emerald-500/10' : otpCountdown > 10 ? 'bg-amber-500/10' : 'bg-red-500/10';
  const otpExpired = otpCountdown <= 0 && step === 2;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Full-screen Zoomed Campus Banner Background */}
      <div 
        className="absolute inset-0 z-0 bg-no-repeat bg-cover pointer-events-none filter brightness-[0.45]" 
        style={{ 
          backgroundImage: "url('/campus_banner.jpg')",
          backgroundPosition: "center 30%",
          transform: "scale(1.25)",
        }}
      />



      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        {/* Card */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/60 rounded-3xl p-8 shadow-2xl">
          {/* Logo & Sub-header Branding */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-full max-w-[280px] bg-black p-3.5 rounded-xl border border-slate-800/80 mb-3.5 flex items-center justify-center shadow-md">
              <img src="/limkokwing_logo.jpg" alt="Limkokwing University" className="w-full h-auto object-contain" />
            </div>
            <h2 className="text-emerald-400 text-lg font-black tracking-wider uppercase">LUSL MIS</h2>
            <p className="text-slate-400 text-[11px] font-bold mt-0.5 uppercase tracking-widest text-center">Limkokwing MIS Sierra Leone</p>
            <div className="w-12 h-0.5 bg-blue-500 mt-2.5 rounded-full" />
            
            {/* Step Indicators */}
            <div className="flex gap-1.5 mt-3">
              {[1, 2].map(s => (
                <div key={s} className={`h-0.5 rounded-full transition-all duration-500 ${step === s ? 'w-6 bg-blue-500' : 'w-3 bg-slate-800'}`} />
              ))}
            </div>
          </div>
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Credentials ── */}
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleCredentialsSubmit}
                className="space-y-5"
              >
                <div>
                  <p className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-2">Institutional Email</p>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@limkokwing.edu.sl"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-white text-sm placeholder:text-slate-700 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-2">Gateway Secret</p>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl py-3.5 pl-11 pr-12 text-white text-sm placeholder:text-slate-700 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </motion.div>
                )}

                {lockTimer > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <p className="text-sm text-orange-400 font-bold font-mono">{formatTimer(lockTimer)}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || lockTimer > 0}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/30"
                >
                  {isLoading
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <><span>Initialize Session</span><ArrowRight className="w-4 h-4" /></>
                  }
                </button>

                <div className="flex items-center my-4">
                  <div className="flex-grow border-t border-slate-800" />
                  <span className="mx-4 text-xs font-black text-slate-650 uppercase tracking-widest">OR</span>
                  <div className="flex-grow border-t border-slate-800" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>


              </motion.form>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 text-center"
              >
                <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  {lockTimer > 0 ? <Clock className="w-8 h-8 text-orange-400" /> : <KeyRound className="w-8 h-8 text-emerald-400" />}
                </div>

                {lockTimer > 0 ? (
                  <div>
                    <h3 className="text-xl font-bold text-white">Account Locked</h3>
                    <p className="text-slate-400 text-sm mt-1">Too many failed attempts.</p>
                    <div className="mt-4 py-4 px-6 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                      <p className="text-3xl font-black text-orange-400 font-mono">{formatTimer(lockTimer)}</p>
                      <p className="text-xs text-slate-500 mt-1">Try again after this timer</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-xl font-bold text-white">Authentication Code</h3>
                      <p className="text-slate-400 text-sm mt-1">
                        A unique 6-digit code was sent to<br />
                        <span className="text-blue-400 font-semibold">{email}</span>
                      </p>
                    </div>

                    {/* Live OTP Countdown Timer */}
                    <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border ${otpTimerBg} ${otpTimerBorder}`}>
                      <Clock className={`w-4 h-4 ${otpTimerColor}`} />
                      {otpExpired ? (
                        <span className="text-sm font-bold text-red-400">Code expired — request a new one</span>
                      ) : (
                        <>
                          <span className={`text-lg font-black font-mono ${otpTimerColor}`}>
                            0:{otpCountdown.toString().padStart(2, '0')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">remaining</span>
                        </>
                      )}
                    </div>

                    <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => otpRefs.current[i] = el}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpInput(i, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(i, e)}
                          disabled={otpExpired}
                          className={`w-11 h-14 bg-slate-950/60 border rounded-xl text-center text-xl font-black text-white focus:ring-4 outline-none transition-all ${
                            otpExpired 
                              ? 'border-red-500/30 opacity-40 cursor-not-allowed' 
                              : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/10'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Success message after resend */}
                    {resendSuccess && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-emerald-400 font-semibold"
                      >
                        ✓ New code sent to your email!
                      </motion.p>
                    )}

                    {error && (
                      <p className="text-sm text-red-400 font-medium">{error}</p>
                    )}

                    {/* Verify Button */}
                    {!otpExpired && (
                      <button
                        onClick={verifyOtp}
                        disabled={isLoading || otp.includes('')}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/30"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Authorize Access'}
                      </button>
                    )}

                    {/* Resend OTP Button */}
                    <button
                      onClick={handleResendOtp}
                      disabled={isResending || (otpCountdown > 0 && !otpExpired)}
                      className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all border ${
                        otpExpired
                          ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-xl shadow-blue-900/30'
                          : otpCountdown > 0
                            ? 'bg-transparent text-slate-700 border-slate-800 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {isResending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          {otpExpired ? 'Send New Code' : otpCountdown > 0 ? `Resend in 0:${otpCountdown.toString().padStart(2, '0')}` : 'Resend Code'}
                        </>
                      )}
                    </button>
                  </>
                )}

                <button onClick={() => { setStep(1); setError(''); setOtp(['','','','','','']); setLockTimer(0); setOtpCountdown(0); setResendSuccess(false); }} className="text-xs text-slate-600 hover:text-slate-400 font-medium transition-colors">
                  Return to credentials
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-slate-700 text-xs mt-6">
          © 2026 Limkokwing University Sierra Leone · All sessions are audited
        </p>
      </motion.div>
    </div>
  );
}
