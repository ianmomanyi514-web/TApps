import { useState } from 'react';
import { ChevronLeft, Eye, EyeOff, User, Code2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authService, mapSupabaseUser } from '@/lib/auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/auth';

type Step = 'role' | 'email' | 'otp' | 'register' | 'login';

interface AuthPageProps {
  onClose: () => void;
}

const AuthPage = ({ onClose }: AuthPageProps) => {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>('role');
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [role, setRole] = useState<UserRole>('user');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) { toast.error('Enter your email'); return; }
    setLoading(true);
    try {
      await authService.sendOtp(email.trim());
      toast.success('OTP sent to your email');
      setStep('otp');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) { toast.error('Enter the 4-digit OTP'); return; }
    if (!password || password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (!username.trim()) { toast.error('Enter a username'); return; }
    setLoading(true);
    try {
      const user = await authService.verifyOtpAndSetPassword(email, otp, password, username, role);
      // Login immediately from metadata — onAuthStateChange will enrich in background
      login(mapSupabaseUser(user));
      toast.success(`Welcome to T Apps${role === 'developer' ? ' Developer' : ''}!`);
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) { toast.error('Fill in all fields'); return; }
    setLoading(true);
    try {
      const user = await authService.signInWithPassword(email.trim(), password);
      // Login immediately from JWT metadata — useAuth will enrich with DB profile silently
      login(mapSupabaseUser(user));
      toast.success('Welcome back!');
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />

        <div className="px-6 pt-6 pb-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            {step !== 'role' && step !== 'login' && mode === 'signup' && (
              <button onClick={() => setStep(step === 'otp' ? 'email' : step === 'email' ? 'role' : 'otp')}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary hover:bg-accent transition-colors">
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <span className="text-white text-sm font-black">T</span>
              </div>
              <span className="font-bold text-lg text-foreground">
                {mode === 'login' ? 'Sign In' : step === 'role' ? 'Join T Apps' : step === 'email' ? 'Create Account' : step === 'otp' ? 'Verify Email' : 'Set Password'}
              </span>
            </div>
          </div>

          {/* STEP: Role Selection */}
          {step === 'role' && mode === 'signup' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">Who are you joining as?</p>
              <button onClick={() => { setRole('user'); setStep('email'); }}
                className={cn('w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                  role === 'user' ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-accent/30')}>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User size={22} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">User Account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Discover, install apps, write reviews & build wishlists</p>
                </div>
              </button>
              <button onClick={() => { setRole('developer'); setStep('email'); }}
                className={cn('w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                  role === 'developer' ? 'border-primary bg-primary/5' : 'border-border hover:border-border/80 hover:bg-accent/30')}>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Code2 size={22} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Developer Account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Submit apps, track installs, manage your developer portal</p>
                </div>
              </button>
              <div className="pt-2 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button onClick={() => setMode('login')} className="text-primary font-semibold hover:underline">Sign In</button>
                </p>
              </div>
            </div>
          )}

          {/* STEP: Login */}
          {mode === 'login' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  type="email" placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'} placeholder="Your password"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-11"
                    onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPassword ? <EyeOff size={18} className="text-muted-foreground" /> : <Eye size={18} className="text-muted-foreground" />}
                  </button>
                </div>
              </div>
              <button onClick={handleLogin} disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <p className="text-center text-sm text-muted-foreground">
                New to T Apps?{' '}
                <button onClick={() => { setMode('signup'); setStep('role'); }} className="text-primary font-semibold hover:underline">Create Account</button>
              </p>
            </div>
          )}

          {/* STEP: Email */}
          {step === 'email' && mode === 'signup' && (
            <div className="space-y-4">
              <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-2',
                role === 'developer' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>
                {role === 'developer' ? <Code2 size={12} /> : <User size={12} />}
                {role === 'developer' ? 'Developer Account' : 'User Account'}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  type="email" placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()} />
              </div>
              <button onClick={handleSendOtp} disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60">
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          )}

          {/* STEP: OTP + Details */}
          {step === 'otp' && mode === 'signup' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">We sent a 4-digit code to <strong className="text-foreground">{email}</strong></p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Verification Code</label>
                <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  type="text" inputMode="numeric" placeholder="0000"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-center text-lg tracking-widest font-bold" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)}
                  type="text" placeholder="cooluser123"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'} placeholder="At least 6 characters"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/50 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-11" />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPassword ? <EyeOff size={18} className="text-muted-foreground" /> : <Eye size={18} className="text-muted-foreground" />}
                  </button>
                </div>
              </div>
              <button onClick={handleVerifyOtp} disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60">
                {loading ? 'Creating account...' : `Create ${role === 'developer' ? 'Developer' : ''} Account`}
              </button>
              <button onClick={handleSendOtp} disabled={loading} className="w-full text-sm text-primary hover:underline">
                Resend code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
