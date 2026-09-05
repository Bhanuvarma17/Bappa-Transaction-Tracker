import React, { useState, useEffect } from "react";
import { PublicCommitteeSummary } from "../types";
import { api } from "../api";
import { Search, AlertCircle, ArrowLeft, PlusCircle, ExternalLink, Sparkles } from "lucide-react";

interface NotFoundPageProps {
  requestedUsername: string;
  onNavigateHome: () => void;
  onSelectCommittee: (username: string) => void;
  onGoToSignUp: (preferredUsername?: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  requestedUsername,
  onNavigateHome,
  onSelectCommittee,
  onGoToSignUp,
}) => {
  const [committees, setCommittees] = useState<PublicCommitteeSummary[]>([]);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    api.getPublicCommittees().then((list) => {
      setCommittees(list);
    }).catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSelectCommittee(searchInput.trim());
    }
  };

  return (
    <div id="not-found-page" className="min-h-screen bg-[#FFFDFB] dark:bg-[#121316] text-[#2D3436] dark:text-[#F1F2F6] flex flex-col items-center justify-center p-4 transition-colors">
      <div className="max-w-lg w-full bg-white dark:bg-[#1A1C22] rounded-2xl p-6 sm:p-8 border border-[#F1F2F6] dark:border-[#282B34] shadow-sm text-center transition-colors">
        {/* Badge & Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#FFE8CC] dark:bg-[#38230D] text-[#FF9933] flex items-center justify-center mx-auto mb-4 border border-[#F1F2F6] dark:border-[#543516] shadow-xs">
          <AlertCircle className="w-7 h-7" />
        </div>

        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-400 font-extrabold block mb-1">
          404 Record Not Found
        </span>
        <h1 className="text-2xl font-black text-[#1A1A1A] dark:text-[#F1F2F6] tracking-tight mb-2">Committee Not Found</h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          No Vinayaka Chavithi committee is registered under the identifier:
          <br />
          <strong className="inline-block font-mono bg-[#F8F9FA] dark:bg-[#22252D] text-[#1A1A1A] dark:text-[#F1F2F6] px-2.5 py-1 rounded-lg text-xs mt-1 border border-[#F1F2F6] dark:border-[#2E323D]">
            /{requestedUsername}
          </strong>
        </p>

        {/* Claim / Sign Up CTA */}
        <div className="bg-[#FFF9F2] dark:bg-[#2E1E0F] border border-[#FFE8CC] dark:border-[#543516] rounded-2xl p-4.5 mb-6 text-left">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#FF9933] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[10px] font-bold text-[#FF9933] dark:text-[#FFB366] uppercase tracking-wider">
                Are you part of this committee?
              </h4>
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">
                You can create an account right now and claim{" "}
                <strong className="text-[#1A1A1A] dark:text-white">&quot;{requestedUsername}&quot;</strong> as your official public festival page!
              </p>
              <button
                id="claim-committee-btn"
                onClick={() => onGoToSignUp(requestedUsername)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF9933] hover:bg-[#F28B24] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-200/50 dark:shadow-none active:scale-[0.98]"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Register &quot;{requestedUsername}&quot;</span>
              </button>
            </div>
          </div>
        </div>

        {/* Try Another Search */}
        <form onSubmit={handleSearchSubmit} className="mb-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="search-committee-404-input"
              type="text"
              placeholder="Search committees (e.g. SBVMB-Youth or ganesh_utsav)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-20 py-2.5 text-xs rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-[#F8F9FA] dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-[#1A1C22] focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#FF9933] hover:bg-[#F28B24] text-white text-xs font-bold rounded-lg transition-all"
            >
              Go
            </button>
          </div>
        </form>

        {/* Available Sample Committees */}
        {committees.length > 0 && (
          <div className="text-left border-t border-[#F1F2F6] dark:border-[#282B34] pt-4">
            <h5 className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-2">
              Or explore existing committees:
            </h5>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {committees.map((com) => (
                <button
                  key={com.username}
                  onClick={() => onSelectCommittee(com.username)}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#FFFBF5] dark:hover:bg-[#221B13] text-xs border border-transparent hover:border-[#FFE8CC] dark:hover:border-[#543516] transition-colors group"
                >
                  <div className="truncate text-gray-800 dark:text-gray-200 font-bold group-hover:text-[#1A1A1A] dark:group-hover:text-white">
                    {com.displayName || com.username}
                  </div>
                  <div className="text-[11px] text-gray-400 group-hover:text-[#FF9933] dark:group-hover:text-[#FFB366] flex items-center gap-1 font-mono">
                    /{com.username}
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Home Button */}
        <div className="mt-6 pt-4 border-t border-[#F1F2F6] dark:border-[#282B34]">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-gray-400 hover:text-[#1A1A1A] dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Bappa Transaction Tracker Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
