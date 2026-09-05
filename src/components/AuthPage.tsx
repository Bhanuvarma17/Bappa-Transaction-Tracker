import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { Profile, User } from "../types";
import {
  Sparkles,
  IndianRupee,
  Shield,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Mail,
  Lock,
} from "lucide-react";

interface AuthPageProps {
  initialMode?: "login" | "signup";
  initialUsername?: string;
  onSuccess: (user: User, profile: Profile) => void;
  onExploreCommittees: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = "signup",
  initialUsername = "",
  onSuccess,
  onExploreCommittees,
}) => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot-password">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sign up fields
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState(initialUsername || "");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [signupCapital, setSignupCapital] = useState("50000");

  // Live username validation state for signup
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [usernameStatusMsg, setUsernameStatusMsg] = useState<string | null>(null);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Forgot Password fields & state
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [genericNotice, setGenericNotice] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Resend cooldown timer countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Validate and debounce username availability check on signup form
  const handleUsernameChange = (raw: string) => {
    // Strip invalid characters immediately (block typing them)
    const clean = raw.replace(/[^A-Za-z0-9_-]/g, "");
    setSignupUsername(clean);

    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);

    if (!clean) {
      setUsernameStatus("idle");
      setUsernameStatusMsg(null);
      return;
    }
    if (clean.length < 3) {
      setUsernameStatus("invalid");
      setUsernameStatusMsg("Committee name must be at least 3 characters.");
      return;
    }
    if (clean.length > 40) {
      setUsernameStatus("invalid");
      setUsernameStatusMsg("Committee name must be 40 characters or fewer.");
      return;
    }

    setUsernameStatus("checking");
    setUsernameStatusMsg(null);

    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const res = await api.checkUsernameAvailability(clean);
        if (res.available) {
          setUsernameStatus("available");
          setUsernameStatusMsg("Username is available!");
        } else {
          setUsernameStatus("taken");
          setUsernameStatusMsg(res.error || "This committee name is already taken.");
        }
      } catch {
        setUsernameStatus("idle");
        setUsernameStatusMsg(null);
      }
    }, 600);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanUsername = signupUsername.trim();
    if (!cleanUsername) {
      setError("Committee name / username is required.");
      return;
    }

    if (!/^[A-Za-z0-9_-]+$/.test(cleanUsername)) {
      setError("Use only letters, numbers, hyphens (-), and underscores (_). Spaces are not allowed.");
      return;
    }

    if (cleanUsername.length < 3) {
      setError("Committee name must be at least 3 characters.");
      return;
    }

    if (cleanUsername.length > 40) {
      setError("Committee name must be 40 characters or fewer.");
      return;
    }

    if (usernameStatus === "taken") {
      setError(usernameStatusMsg || "This committee name is already taken.");
      return;
    }

    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    const numCapital = parseFloat(signupCapital);
    if (isNaN(numCapital) || numCapital < 0) {
      setError("Please enter a valid initial capital/budget amount.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.signup({
        email: signupEmail.trim(),
        password: signupPassword,
        username: cleanUsername,
        displayName: signupDisplayName.trim() || cleanUsername,
        capital: numCapital,
      });
      onSuccess(res.user, res.profile);
    } catch (err: any) {
      setError(err.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!loginIdentifier.trim() || !loginPassword) {
      setError("Please enter your email or committee username and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.login({
        identifier: loginIdentifier.trim(),
        password: loginPassword,
      });
      onSuccess(res.user, res.profile);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please check your password.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password: Step 1 - Send 6-digit OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.forgotPassword(cleanEmail);
      setGenericNotice(res.message || "If an account exists with this email, an OTP has been sent.");
      setForgotStep(2);
      setResendCooldown(60); // 60-second cooldown
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password: Step 2 - Verify 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otpCode.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError("OTP must be exactly 6 digits.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.verifyOtp({
        email: forgotEmail.trim(),
        otp: cleanOtp,
      });
      setResetToken(res.resetToken);
      setForgotStep(3);
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password: Step 3 - Create New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("Password must be at least 8 characters long and contain both letters and numbers.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setLoading(true);
      await api.resetPassword({
        email: forgotEmail.trim(),
        resetToken,
        newPassword,
        confirmPassword,
      });

      // Clear forgot password state and transition back to Login
      const recoveredEmail = forgotEmail.trim();
      setForgotStep(1);
      setForgotEmail("");
      setOtpCode("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setGenericNotice(null);
      setLoginIdentifier(recoveredEmail);
      setLoginPassword("");
      setMode("login");
      setSuccessMessage("Password changed successfully. Please log in with your new password.");
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please start the recovery process again.");
    } finally {
      setLoading(false);
    }
  };

  const switchToForgotPassword = () => {
    setMode("forgot-password");
    setForgotStep(1);
    setError(null);
    setSuccessMessage(null);
    setGenericNotice(null);
    if (loginIdentifier.includes("@")) {
      setForgotEmail(loginIdentifier.trim());
    }
  };

  const switchToLogin = () => {
    setMode("login");
    setError(null);
    setForgotStep(1);
  };

  return (
    <div className="min-h-screen bg-[#FFFDFB] dark:bg-[#121316] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FFE8CC] dark:bg-[#38230D] text-[#FF9933] font-bold text-xl border border-[#F1F2F6] dark:border-[#543516] shadow-xs mb-3">
          🕉️
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-400 font-extrabold block mb-1">
          {mode === "forgot-password" ? "Security Recovery" : "Authentication"}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-[#F1F2F6] tracking-tight">
          Bappa Transaction Tracker
        </h2>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-400">
          Vinayaka Chavithi Committee Finance & Expense Tracker
        </p>

        {/* Mode Switcher Pills (Only shown when not in forgot-password flow) */}
        {mode !== "forgot-password" ? (
          <div className="mt-6 inline-flex p-1 bg-[#F8F9FA] dark:bg-[#1A1C22] border border-[#F1F2F6] dark:border-[#282B34] rounded-xl">
            <button
              id="switch-to-signup-tab"
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setSuccessMessage(null);
              }}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === "signup"
                  ? "bg-white dark:bg-[#252833] text-[#1A1A1A] dark:text-[#F1F2F6] shadow-xs"
                  : "text-gray-400 dark:text-gray-400 hover:text-[#1A1A1A] dark:hover:text-white"
              }`}
            >
              New Committee
            </button>
            <button
              id="switch-to-login-tab"
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccessMessage(null);
              }}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === "login"
                  ? "bg-white dark:bg-[#252833] text-[#1A1A1A] dark:text-[#F1F2F6] shadow-xs"
                  : "text-gray-400 dark:text-gray-400 hover:text-[#1A1A1A] dark:hover:text-white"
              }`}
            >
              Sign In
            </button>
          </div>
        ) : (
          <div className="mt-6 inline-flex items-center gap-1 text-xs">
            <button
              onClick={switchToLogin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-[#FF9933] dark:hover:text-[#FFB366] font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </div>
        )}
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#1A1C22] py-8 px-6 shadow-sm rounded-2xl border border-[#F1F2F6] dark:border-[#282B34] sm:px-10 transition-colors">
          {/* Error Banner */}
          {error && (
            <div className="mb-5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs p-3 rounded-xl flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Generic Notice for OTP Sent */}
          {genericNotice && mode === "forgot-password" && (
            <div className="mb-5 bg-[#FFF9F2] dark:bg-[#2E1E0F] border border-[#FFE8CC] dark:border-[#543516] text-[#FF9933] dark:text-[#FFB366] text-xs p-3 rounded-xl flex items-start gap-2">
              <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{genericNotice}</span>
            </div>
          )}

          {mode === "signup" ? (
            /* Sign-up Form */
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label
                  htmlFor="signup-username"
                  className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
                >
                  Committee Name / Public URL <span className="text-[#FF9933]">*</span>
                </label>
                <input
                  id="signup-username"
                  type="text"
                  required
                  placeholder="ganesh_utsav"
                  value={signupUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  maxLength={40}
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    usernameStatus === "available"
                      ? "border-emerald-400 dark:border-emerald-600"
                      : usernameStatus === "taken" || usernameStatus === "invalid"
                      ? "border-rose-400 dark:border-rose-600"
                      : "border-[#F1F2F6] dark:border-[#2E323D]"
                  } bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all`}
                />
                {/* Helper hint */}
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  Use only letters, numbers, - or _
                </p>
                {/* Live status badge */}
                {usernameStatus !== "idle" && (
                  <p
                    className={`text-[11px] mt-1 font-semibold ${
                      usernameStatus === "available"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : usernameStatus === "checking"
                        ? "text-gray-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {usernameStatus === "checking"
                      ? "Checking availability..."
                      : usernameStatusMsg}
                  </p>
                )}
                {/* Dynamic URL preview */}
                <p className="text-[11px] text-[#FF9933] dark:text-[#FFB366] mt-1 font-medium">
                  Public URL:{" "}
                  <code className="bg-[#FFF9F2] dark:bg-[#2E1E0F] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#FFE8CC] dark:border-[#543516]">
                    /{signupUsername.trim() || "your-committee"}
                  </code>
                </p>
              </div>

              <div>
                <label
                  htmlFor="signup-displayname"
                  className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
                >
                  Display Name (Committee Banner)
                </label>
                <input
                  id="signup-displayname"
                  type="text"
                  placeholder="e.g. SBVMB Youth Ganesh Utsav Committee"
                  value={signupDisplayName}
                  onChange={(e) => setSignupDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-capital"
                  className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
                >
                  Initial Budget / Capital Collected (₹)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-bold font-mono text-xs">
                    ₹
                  </div>
                  <input
                    id="signup-capital"
                    type="number"
                    min="0"
                    placeholder="50000"
                    value={signupCapital}
                    onChange={(e) => setSignupCapital(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
                >
                  Email Address <span className="text-[#FF9933]">*</span>
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  placeholder="leader@ganeshutsav.org"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
                >
                  Password <span className="text-[#FF9933]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="signup-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-[#FF9933] hover:bg-[#F28B24] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <span>{loading ? "Creating Committee Account..." : "Create Committee & Start"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : mode === "login" ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
                >
                  Email or Committee Username <span className="text-[#FF9933]">*</span>
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  required
                  placeholder="e.g. SBVMB Youth or leader@example.com"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="login-password"
                    className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400"
                  >
                    Password <span className="text-[#FF9933]">*</span>
                  </label>
                  <button
                    id="forgot-password-link-btn"
                    type="button"
                    onClick={switchToForgotPassword}
                    className="text-[11px] font-bold text-[#FF9933] hover:text-[#F28B24] dark:text-[#FFB366] transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-[#FF9933] hover:bg-[#F28B24] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <span>{loading ? "Signing In..." : "Open Dashboard"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            /* Forgot Password Multi-step Flow */
            <div>
              {/* Step 1: Enter Email */}
              {forgotStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#FFE8CC] dark:bg-[#38230D] text-[#FF9933] mb-2">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F1F2F6]">
                      Forgot Password?
                    </h3>
                    <p className="text-[11px] text-gray-400 dark:text-gray-400 mt-1">
                      Enter your committee email address to receive a 6-digit verification code.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="forgot-email"
                      className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
                    >
                      Registered Email <span className="text-[#FF9933]">*</span>
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      placeholder="committee@ganeshutsav.org"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      id="send-otp-btn"
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 bg-[#FF9933] hover:bg-[#F28B24] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <span>{loading ? "Sending OTP..." : "Send OTP"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Verify 6-digit OTP */}
              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#FFE8CC] dark:bg-[#38230D] text-[#FF9933] mb-2">
                      <Mail className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F1F2F6]">
                      Enter Verification Code
                    </h3>
                    <p className="text-[11px] text-gray-400 dark:text-gray-400 mt-1">
                      Enter the 6-digit OTP code sent to{" "}
                      <strong className="text-gray-700 dark:text-gray-200 font-mono">
                        {forgotEmail}
                      </strong>
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="otp-code-input"
                      className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1 text-center"
                    >
                      6-Digit OTP Code <span className="text-[#FF9933]">*</span>
                    </label>
                    <input
                      id="otp-code-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      placeholder="••••••"
                      value={otpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtpCode(val);
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] text-center text-xl font-black font-mono tracking-[0.4em] placeholder:tracking-normal focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                    />
                    <p className="text-[10px] text-gray-400 text-center mt-1">
                      Code expires in 10 minutes (single-use).
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      id="verify-otp-btn"
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="w-full py-3 px-4 bg-[#FF9933] hover:bg-[#F28B24] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <span>{loading ? "Verifying..." : "Verify OTP"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Resend Cooldown Controls */}
                  <div className="pt-3 border-t border-[#F1F2F6] dark:border-[#282B34] flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-[11px]"
                    >
                      Change Email
                    </button>

                    <button
                      id="resend-otp-btn"
                      type="button"
                      disabled={resendCooldown > 0 || loading}
                      onClick={() => handleSendOtp()}
                      className="inline-flex items-center gap-1 font-bold text-[#FF9933] hover:text-[#F28B24] disabled:opacity-50 disabled:cursor-not-allowed text-[11px] transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                      <span>
                        {resendCooldown > 0
                          ? `Resend OTP (${resendCooldown}s)`
                          : "Resend OTP"}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Create New Password */}
              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#FFE8CC] dark:bg-[#38230D] text-[#FF9933] mb-2">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F1F2F6]">
                      Create New Password
                    </h3>
                    <p className="text-[11px] text-gray-400 dark:text-gray-400 mt-1">
                      Choose a strong, secure password for your committee account.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="reset-new-password"
                      className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
                    >
                      New Password <span className="text-[#FF9933]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reset-new-password"
                        type={showNewPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reset-confirm-password"
                      className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
                    >
                      Confirm New Password <span className="text-[#FF9933]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reset-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Checklist */}
                  <div className="bg-[#F8F9FA] dark:bg-[#1E2028] p-3 rounded-xl space-y-1 text-[11px] border border-[#F1F2F6] dark:border-[#282B34]">
                    <span className="font-bold text-gray-600 dark:text-gray-300 block mb-1">
                      Password Requirements:
                    </span>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <span className={newPassword.length >= 8 ? "text-emerald-500" : ""}>
                        {newPassword.length >= 8 ? "✓" : "•"}
                      </span>
                      <span>At least 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <span className={/[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword) ? "text-emerald-500" : ""}>
                        {/[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword) ? "✓" : "•"}
                      </span>
                      <span>Contains letters and numbers</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <span className={confirmPassword && newPassword === confirmPassword ? "text-emerald-500" : ""}>
                        {confirmPassword && newPassword === confirmPassword ? "✓" : "•"}
                      </span>
                      <span>Passwords match</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      id="reset-password-submit-btn"
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 bg-[#FF9933] hover:bg-[#F28B24] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <span>{loading ? "Updating Password..." : "Update Password"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Footer link to public profiles */}
          <div className="mt-6 pt-4 border-t border-[#F1F2F6] dark:border-[#282B34] text-center">
            <button
              onClick={onExploreCommittees}
              className="text-xs font-bold text-gray-400 dark:text-gray-400 hover:text-[#FF9933] dark:hover:text-[#FFB366] transition-colors"
            >
              Explore sample public committees without logging in →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
