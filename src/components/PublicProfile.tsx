import React, { useState, useEffect } from "react";
import { CommitteePublicData } from "../types";
import { api } from "../api";
import {
  Calendar,
  IndianRupee,
  Share2,
  Check,
  TrendingUp,
  Receipt,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowLeft
} from "lucide-react";

interface PublicProfileProps {
  username: string;
  onNavigateHome: () => void;
  onNotFound: (failedUsername: string) => void;
  isLoggedInUser?: boolean;
  onGoToDashboard?: () => void;
}

export const PublicProfile: React.FC<PublicProfileProps> = ({
  username,
  onNavigateHome,
  onNotFound,
  isLoggedInUser,
  onGoToDashboard,
}) => {
  const [data, setData] = useState<CommitteePublicData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadCommittee() {
      setIsLoading(true);
      try {
        const res = await api.getPublicCommittee(username);
        if (isMounted) {
          setData(res);
        }
      } catch (err: any) {
        if (isMounted) {
          onNotFound(username);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCommittee();
    return () => {
      isMounted = false;
    };
  }, [username]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.profile.displayName || "Bappa Transaction Tracker",
          text: `View Vinayaka Chavithi expenses and budget for ${data?.profile.displayName}`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("idol") || cat.includes("pratima")) {
      return "bg-orange-50 dark:bg-orange-950/50 text-[#FF9933] dark:text-[#FFB366] border border-orange-100 dark:border-orange-900/60";
    }
    if (cat.includes("decor") || cat.includes("tent") || cat.includes("pandal")) {
      return "bg-blue-50 dark:bg-blue-950/50 text-blue-500 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60";
    }
    if (cat.includes("prasad") || cat.includes("food")) {
      return "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60";
    }
    if (cat.includes("sound") || cat.includes("light") || cat.includes("dj") || cat.includes("media")) {
      return "bg-purple-50 dark:bg-purple-950/50 text-purple-500 dark:text-purple-400 border border-purple-100 dark:border-purple-900/60";
    }
    if (cat.includes("puja") || cat.includes("priest")) {
      return "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60";
    }
    return "bg-[#F8F9FA] dark:bg-[#252833] text-gray-600 dark:text-gray-300 border border-[#F1F2F6] dark:border-[#2E323D]";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFDFB] dark:bg-[#121316] flex items-center justify-center p-6 transition-colors">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#FF9933] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Loading Committee Ledger...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { profile, expenses, summary } = data;
  const isOverBudget = summary.remainingBudget < 0;

  return (
    <div id="public-profile-page" className="min-h-screen bg-[#FFFDFB] dark:bg-[#121316] text-[#2D3436] dark:text-[#F1F2F6] pb-16 transition-colors">
      {/* Top Navigation Bar */}
      <header className="bg-white/90 dark:bg-[#1A1C22]/90 backdrop-blur-md sticky top-0 z-30 border-b border-[#F1F2F6] dark:border-[#282B34] px-4 py-3.5 transition-colors">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-[#1A1A1A] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" />
            <span>Bappa Transaction Tracker</span>
          </button>

          <div className="flex items-center gap-2">
            {isLoggedInUser && onGoToDashboard && (
              <button
                id="public-return-to-dashboard-btn"
                onClick={onGoToDashboard}
                className="text-xs px-3.5 py-2 bg-white dark:bg-[#22252D] hover:bg-[#F8F9FA] dark:hover:bg-[#282B34] text-gray-700 dark:text-gray-200 font-bold rounded-xl border border-[#F1F2F6] dark:border-[#282B34] shadow-2xs transition-all"
              >
                Dashboard
              </button>
            )}

            <button
              id="share-public-profile-btn"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#FF9933] hover:bg-[#F28B24] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Page</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Committee Identity Card */}
        <div id="public-committee-header-card" className="bg-white dark:bg-[#1A1C22] rounded-2xl p-6 sm:p-8 border border-[#F1F2F6] dark:border-[#282B34] shadow-sm text-center relative overflow-hidden transition-colors">
          {/* Decorative festive badge */}
          <div className="inline-flex items-center gap-1.5 bg-[#FFF9F2] dark:bg-[#2E1E0F] border border-[#FFE8CC] dark:border-[#543516] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-[#FF9933] dark:text-[#FFB366] mb-4">
            <Sparkles className="w-3 h-3 text-[#FF9933] dark:text-[#FFB366]" />
            <span>Vinayaka Chavithi 2026 • Public Record</span>
          </div>

          {/* Profile Image with fallback */}
          <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-xs border-2 border-[#F1F2F6] dark:border-[#282B34] bg-[#FFE8CC] dark:bg-[#38230D] mb-4">
            {profile.profileImage ? (
              <img
                id="public-profile-avatar"
                src={profile.profileImage}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#FF9933] text-white text-3xl font-bold">
                {profile.displayName.charAt(0) || "G"}
              </div>
            )}
          </div>

          {/* Display Name & Username */}
          <h1 id="public-committee-name" className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-[#F1F2F6] tracking-tight mb-1">
            {profile.displayName}
          </h1>
          <p className="text-xs font-mono text-gray-400 dark:text-gray-400 mb-3">
            @{profile.username}
          </p>

          {/* Bio */}
          {profile.bio ? (
            <p id="public-committee-bio" className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed mb-6 italic font-serif">
              &ldquo;{profile.bio}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-400 italic mb-6">
              Official Vinayaka Chavithi financial transparency ledger
            </p>
          )}

          {/* Financial Overview Tiles */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-5 border-t border-[#F1F2F6] dark:border-[#282B34]">
            <div className="bg-[#F8F9FA] dark:bg-[#22252D] rounded-xl p-3 border border-[#F1F2F6] dark:border-[#282B34]">
              <span className="text-[10px] text-gray-400 dark:text-gray-400 uppercase font-bold tracking-wider block mb-0.5">
                Capital
              </span>
              <span className="text-base sm:text-lg font-black text-[#1A1A1A] dark:text-[#F1F2F6]">
                {profile.currency}{summary.capital.toLocaleString()}
              </span>
            </div>

            <div className="bg-[#FFF9F2] dark:bg-[#2E1E0F] rounded-xl p-3 border border-[#FFE8CC] dark:border-[#543516]">
              <span className="text-[10px] text-[#FF9933] dark:text-[#FFB366] uppercase font-bold tracking-wider block mb-0.5">
                Spent
              </span>
              <span className="text-base sm:text-lg font-black text-[#1A1A1A] dark:text-[#F1F2F6]">
                {profile.currency}{summary.totalSpent.toLocaleString()}
              </span>
            </div>

            <div
              className={`rounded-xl p-3 border ${
                isOverBudget
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200"
                  : "bg-white dark:bg-[#22252D] border-[#F1F2F6] dark:border-[#282B34] text-[#2D3436] dark:text-[#F1F2F6] shadow-2xs"
              }`}
            >
              <span className={`text-[10px] uppercase font-bold tracking-wider block mb-0.5 ${isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-gray-400 dark:text-gray-400"}`}>
                {isOverBudget ? "Deficit" : "Available"}
              </span>
              <span className={`text-base sm:text-lg font-black ${isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-[#FF9933]"}`}>
                {isOverBudget
                  ? `-${profile.currency}${Math.abs(summary.remainingBudget).toLocaleString()}`
                  : `${profile.currency}${summary.remainingBudget.toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 pt-2">
            <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-400 mb-1.5 font-semibold">
              <span className="text-[10px] uppercase tracking-wider">Budget Utilization</span>
              <span className="font-mono text-[#FF9933] dark:text-[#FFB366] font-bold">{summary.percentSpent}%</span>
            </div>
            <div className="h-3 w-full bg-[#F8F9FA] dark:bg-[#252833] rounded-full overflow-hidden border border-[#F1F2F6] dark:border-[#2E323D]">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isOverBudget ? "bg-rose-500" : "bg-[#FF9933]"
                }`}
                style={{ width: `${Math.min(100, summary.percentSpent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Expenses List Section (Leader's chosen order) */}
        <div id="public-expenses-container" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-400 font-extrabold block mb-0.5">
                Public Ledger
              </span>
              <h2 className="text-xl font-black text-[#1A1A1A] dark:text-[#F1F2F6] tracking-tight flex items-center gap-2">
                <span>Expenses Breakdown</span>
              </h2>
            </div>
            <span className="text-[9px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-[#F8F9FA] dark:bg-[#22252D] text-gray-500 dark:text-gray-400 border border-[#F1F2F6] dark:border-[#282B34]">
              {expenses.length} records in order
            </span>
          </div>

          {expenses.length === 0 ? (
            <div className="bg-white dark:bg-[#1A1C22] rounded-2xl p-10 text-center border border-[#F1F2F6] dark:border-[#282B34] shadow-sm">
              <div className="w-12 h-12 bg-[#F8F9FA] dark:bg-[#22252D] rounded-2xl border border-[#F1F2F6] dark:border-[#282B34] flex items-center justify-center mx-auto mb-3 text-gray-400">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-[#1A1A1A] dark:text-[#F1F2F6] mb-1">No expenses published yet</h3>
              <p className="text-xs text-gray-400">
                The committee has not logged any public expenses yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {expenses.map((expense, idx) => (
                <div
                  key={expense.id}
                  id={`public-expense-${expense.id}`}
                  className="bg-white dark:bg-[#1A1C22] rounded-2xl p-4.5 border border-[#F1F2F6] dark:border-[#282B34] shadow-2xs hover:border-[#FFE8CC] dark:hover:border-[#543516] transition-all flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-[#F8F9FA] dark:bg-[#22252D] border border-[#F1F2F6] dark:border-[#2E323D] text-gray-400 dark:text-gray-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {(idx + 1).toString().padStart(2, "0")}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F1F2F6] leading-snug">
                        {expense.title}
                      </h3>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${getCategoryBadgeClass(expense.category)}`}>
                          {expense.category}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 dark:text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {expense.date}
                        </span>
                      </div>

                      {expense.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 bg-[#F8F9FA] dark:bg-[#16181E] p-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#282B34] leading-relaxed">
                          {expense.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pt-0.5">
                    <span className="text-base font-mono font-bold text-[#1A1A1A] dark:text-[#F1F2F6] block">
                      {profile.currency}{expense.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Public Visitor Footer & Notice */}
        <div className="text-center pt-8 pb-4 text-xs text-gray-400 dark:text-gray-500 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF9933]" />
            <span>Public Read-Only Transparency View</span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Powered by <strong>Bappa Transaction Tracker</strong> • Vinayaka Chavithi Finance Ledger
          </p>
        </div>
      </main>
    </div>
  );
};
