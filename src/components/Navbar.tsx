import React, { useState } from "react";
import { Profile } from "../types";
import {
  Sparkles,
  ExternalLink,
  Settings,
  LogOut,
  Copy,
  Check,
  User,
  Share2
} from "lucide-react";
import { ThemeToggle } from "../context/ThemeContext";

interface NavbarProps {
  profile: Profile | null;
  onOpenProfileEditor: () => void;
  onViewPublicProfile: (username: string) => void;
  onLogout: () => void;
  onGoToAuth: (mode: "login" | "signup") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  onOpenProfileEditor,
  onViewPublicProfile,
  onLogout,
  onGoToAuth,
}) => {
  const [copied, setCopied] = useState(false);

  const publicUrl = profile
    ? `${window.location.origin}/${encodeURIComponent(profile.username)}`
    : "";

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <header className="bg-white dark:bg-[#1A1C22] border-b border-[#F1F2F6] dark:border-[#282B34] sticky top-0 z-40 shadow-xs transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF9933] text-white flex items-center justify-center font-black text-lg shadow-inner select-none flex-shrink-0">
            B
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[#1A1A1A] dark:text-[#F1F2F6] tracking-tight text-base sm:text-lg leading-none">
                Bappa Transaction <span className="text-[#FF9933]">Tracker</span>
              </span>
              <span className="text-[9px] uppercase font-black tracking-wider bg-[#FFE8CC] dark:bg-[#38230D] text-[#FF9933] dark:text-[#FFB366] px-2 py-0.5 rounded-full border border-transparent dark:border-[#543516]">
                Portal v1.0
              </span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-widest uppercase hidden sm:block mt-0.5">
              Committee Finance & Public Ledger
            </p>
          </div>
        </div>

        {/* Right Section: Profile, Theme Toggle & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Theme Toggle (always accessible) */}
          <ThemeToggle />

          {profile ? (
            <>
              {/* Public Link Pill */}
              <div className="hidden md:flex items-center bg-[#F8F9FA] dark:bg-[#22252D] rounded-xl p-1 border border-[#F1F2F6] dark:border-[#282B34] text-xs transition-colors">
                <span className="px-2.5 text-gray-400 dark:text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
                  Public URL:
                </span>
                <span className="pr-2 text-[#FF9933] font-bold truncate max-w-[150px]">
                  /{profile.username}
                </span>
                <button
                  id="copy-public-link-nav-btn"
                  onClick={handleCopyLink}
                  title="Copy public committee URL"
                  className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#1A1C22] hover:bg-[#FFFBF5] dark:hover:bg-[#2A2E38] text-[#1A1A1A] dark:text-[#F1F2F6] rounded-lg shadow-2xs text-[11px] font-semibold border border-[#F1F2F6] dark:border-[#2E323D] transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-gray-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  id="view-public-page-nav-btn"
                  onClick={() => onViewPublicProfile(profile.username)}
                  title="View Public Page"
                  className="ml-1 p-1 hover:text-[#FF9933] text-gray-400 rounded transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* View Public Page Mobile Button */}
              <button
                id="mobile-view-public-btn"
                onClick={() => onViewPublicProfile(profile.username)}
                className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-[#FF9933] hover:bg-[#F8F9FA] dark:hover:bg-[#22252D] rounded-xl transition-colors border border-[#F1F2F6] dark:border-[#282B34]"
                title="View Public Committee Page"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              {/* Profile Settings */}
              <button
                id="open-profile-settings-btn"
                onClick={onOpenProfileEditor}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-[#1A1A1A] dark:hover:text-white bg-white dark:bg-[#22252D] hover:bg-[#F8F9FA] dark:hover:bg-[#2A2E38] border border-[#F1F2F6] dark:border-[#282B34] rounded-xl transition-all shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5 text-gray-400" />
                <span className="hidden sm:inline">Settings</span>
              </button>

              {/* Committee Avatar Badge */}
              <div
                onClick={onOpenProfileEditor}
                title={`Logged in as ${profile.displayName}`}
                className="w-9 h-9 rounded-full overflow-hidden bg-[#FFE8CC] dark:bg-[#38230D] border-2 border-white dark:border-[#282B34] shadow-xs flex items-center justify-center text-[#FF9933] font-bold text-xs cursor-pointer select-none transition-transform active:scale-95"
              >
                {profile.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt={profile.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profile.displayName.slice(0, 2).toUpperCase()
                )}
              </div>

              {/* Logout */}
              <button
                id="logout-btn"
                onClick={onLogout}
                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                title="Logout from committee account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="nav-login-btn"
                onClick={() => onGoToAuth("login")}
                className="px-3.5 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-[#1A1A1A] dark:hover:text-white hover:bg-[#F8F9FA] dark:hover:bg-[#22252D] rounded-xl transition-colors border border-[#F1F2F6] dark:border-[#282B34]"
              >
                Log In
              </button>
              <button
                id="nav-signup-btn"
                onClick={() => onGoToAuth("signup")}
                className="px-4 py-1.5 bg-[#FF9933] hover:bg-[#F28B24] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all active:scale-[0.98]"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
