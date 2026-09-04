import React, { useState } from "react";
import { api } from "../api";
import { Profile, User } from "../types";
import { Sparkles, IndianRupee, Shield, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";

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
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Sign up fields
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState(initialUsername || "");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [signupCapital, setSignupCapital] = useState("50000");

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = signupUsername.trim();
    if (!cleanUsername) {
      setError("Committee name / username is required.");
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

  return (
    <div className="min-h-screen bg-[#FFFDFB] dark:bg-[#121316] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FFE8CC] dark:bg-[#38230D] text-[#FF9933] font-bold text-xl border border-[#F1F2F6] dark:border-[#543516] shadow-xs mb-3">
          🕉️
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-400 font-extrabold block mb-1">
          Authentication
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-[#F1F2F6] tracking-tight">
          Ganesh Tracker
        </h2>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-400">
          Vinayaka Chavithi Committee Finance & Expense Tracker
        </p>

        {/* Mode Switcher Pills */}
        <div className="mt-6 inline-flex p-1 bg-[#F8F9FA] dark:bg-[#1A1C22] border border-[#F1F2F6] dark:border-[#282B34] rounded-xl">
          <button
            id="switch-to-signup-tab"
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
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
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#1A1C22] py-8 px-6 shadow-sm rounded-2xl border border-[#F1F2F6] dark:border-[#282B34] sm:px-10 transition-colors">
          {error && (
            <div className="mb-5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs p-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
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
                  Committee Username <span className="text-[#FF9933]">*</span>
                </label>
                <input
                  id="signup-username"
                  type="text"
                  required
                  placeholder="e.g. SBVMB Youth or Balaji Youth"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                />
                <p className="text-[11px] text-[#FF9933] dark:text-[#FFB366] mt-1 font-medium">
                  Public URL:{" "}
                  <code className="bg-[#FFF9F2] dark:bg-[#2E1E0F] px-1.5 py-0.5 rounded text-[10px] font-mono border border-[#FFE8CC] dark:border-[#543516]">
                    /{encodeURIComponent(signupUsername.trim() || "YourCommittee")}
                  </code>
                </p>
              </div>

              <div>
                <label
                  htmlFor="signup-display-name"
                  className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
                >
                  Banner Display Name (Optional)
                </label>
                <input
                  id="signup-display-name"
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
                  Initial Budget / Capital (₹) <span className="text-[#FF9933]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 text-xs font-bold font-mono">
                    ₹
                  </div>
                  <input
                    id="signup-capital"
                    type="number"
                    min="0"
                    step="500"
                    required
                    placeholder="50000"
                    value={signupCapital}
                    onChange={(e) => setSignupCapital(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                  />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-400 mt-0.5">
                  Total initial fund collected through donations.
                </p>
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
                >
                  Leader Email Address <span className="text-[#FF9933]">*</span>
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  placeholder="leader@gmail.com"
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
                  Password (min 6 chars) <span className="text-[#FF9933]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
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
          ) : (
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
                <label
                  htmlFor="login-password"
                  className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1"
                >
                  Password <span className="text-[#FF9933]">*</span>
                </label>
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

              {/* Demo Account Hint */}
              <div className="mt-4 p-3 bg-[#FFF9F2] dark:bg-[#2E1E0F] border border-[#FFE8CC] dark:border-[#543516] rounded-xl text-xs text-[#FF9933] dark:text-[#FFB366]">
                <span className="font-bold block mb-1 text-gray-800 dark:text-gray-200">Pre-configured Demo Committee:</span>
                <div>Username: <strong className="text-gray-900 dark:text-white font-mono">SBVMB Youth</strong></div>
                <div>Password: <strong className="text-gray-900 dark:text-white font-mono">sbvmb123</strong></div>
              </div>
            </form>
          )}

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
