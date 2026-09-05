import React, { useState, useRef } from "react";
import { Profile, Expense, User } from "../types";
import { BudgetCharts } from "./BudgetCharts";
import { FinanceSection } from "./FinanceSection";
import { ProfileEditorModal } from "./ProfileEditorModal";
import { ExpenseModal } from "./ExpenseModal";
import { api } from "../api";
import { processImageFile } from "../utils/imageUtils";
import {
  ExternalLink,
  Copy,
  Check,
  Share2,
  Sparkles,
  Settings,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Camera,
  Loader2
} from "lucide-react";

interface DashboardProps {
  user: User;
  profile: Profile;
  expenses: Expense[];
  onRefreshData: () => Promise<void>;
  onViewPublicProfile: (username: string) => void;
  onUpdateProfileState: (updated: Profile) => void;
  onUpdateExpensesState: (expenses: Expense[]) => void;
  onPasswordChanged?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  profile,
  expenses,
  onRefreshData,
  onViewPublicProfile,
  onUpdateProfileState,
  onUpdateExpensesState,
  onPasswordChanged,
}) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const quickFileInputRef = useRef<HTMLInputElement>(null);

  const publicUrl = `${window.location.origin}/${encodeURIComponent(profile.username)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Quick photo upload from device gallery/files directly on the dashboard
  const handleQuickAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        setIsUploadingPhoto(true);
        const dataUrl = await processImageFile(file, 800, 0.85);
        const res = await api.updateProfile({ profileImage: dataUrl });
        onUpdateProfileState(res.profile);
        showNotification("Profile picture updated from gallery!");
      } catch (err: any) {
        showNotification(err.message || "Failed to upload photo.", "error");
      } finally {
        setIsUploadingPhoto(false);
        if (quickFileInputRef.current) {
          quickFileInputRef.current.value = "";
        }
      }
    }
  };

  // Profile Save
  const handleSaveProfile = async (updatedData: Partial<Profile>) => {
    const res = await api.updateProfile(updatedData);
    onUpdateProfileState(res.profile);
    showNotification("Committee profile and budget updated successfully!");
  };

  // Add or Edit Expense
  const handleSaveExpense = async (data: {
    title: string;
    amount: number;
    category: string;
    date: string;
    notes?: string;
  }) => {
    if (editingExpense) {
      const updated = await api.editExpense(editingExpense.id, data);
      const newExpenses = expenses.map((e) => (e.id === updated.id ? updated : e));
      onUpdateExpensesState(newExpenses);
      showNotification(`Expense "${updated.title}" updated.`);
    } else {
      const added = await api.addExpense(data);
      onUpdateExpensesState([...expenses, added]);
      showNotification(`Expense "${added.title}" added to ledger.`);
    }
    setEditingExpense(null);
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string) => {
    await api.deleteExpense(id);
    const newExpenses = expenses.filter((e) => e.id !== id);
    onUpdateExpensesState(newExpenses);
    showNotification("Expense deleted and removed from public ledger.");
  };

  // Reorder Expenses
  const handleReorderExpenses = async (newOrderedList: Expense[]) => {
    // Optimistic UI update
    onUpdateExpensesState(newOrderedList);
    const orderedIds = newOrderedList.map((e) => e.id);
    try {
      const persisted = await api.reorderExpenses(orderedIds);
      onUpdateExpensesState(persisted);
      showNotification("Expense order updated on public profile.");
    } catch (err: any) {
      showNotification(err.message || "Failed to save reordered list", "error");
      await onRefreshData();
    }
  };

  return (
    <div id="private-dashboard" className="min-h-screen bg-[#FFFDFB] dark:bg-[#121316] pb-16 transition-colors">
      {/* Hidden file input for quick gallery upload */}
      <input
        ref={quickFileInputRef}
        type="file"
        id="quick-gallery-photo-input"
        accept="image/*"
        onChange={handleQuickAvatarChange}
        className="hidden"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Status Notification Toast */}
        {statusMessage && (
          <div
            id="status-notification-toast"
            className={`p-3.5 rounded-xl border text-sm font-semibold flex items-center justify-between transition-all shadow-xs ${
              statusMessage.type === "success"
                ? "bg-[#FFF9F2] dark:bg-[#2E1E0F] border-[#FFE8CC] dark:border-[#543516] text-[#FF9933] dark:text-[#FFB366]"
                : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-400"
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs uppercase font-bold tracking-wider opacity-60 hover:opacity-100 ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Committee Hero Banner & Quick Public Link */}
        <div
          id="dashboard-header-card"
          className="bg-white dark:bg-[#1A1C22] rounded-2xl p-6 sm:p-8 border border-[#F1F2F6] dark:border-[#282B34] shadow-sm relative overflow-hidden transition-colors"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Left Info & Avatar with Gallery Upload */}
            <div className="flex items-start gap-4">
              <div className="relative group flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-xs border-2 border-white dark:border-[#282B34] bg-[#FFE8CC] dark:bg-[#38230D] flex-shrink-0">
                  {isUploadingPhoto ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#FF9933] text-white">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : profile.profileImage ? (
                    <img
                      src={profile.profileImage}
                      alt={profile.displayName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#FF9933] text-white text-2xl font-bold">
                      {profile.displayName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Camera upload badge for device gallery */}
                <button
                  type="button"
                  id="quick-upload-avatar-badge-btn"
                  onClick={() => quickFileInputRef.current?.click()}
                  title="Choose photo from device gallery"
                  aria-label="Upload photo from gallery"
                  className="absolute -bottom-1 -right-1 bg-[#FF9933] hover:bg-[#F28B24] text-white p-1.5 rounded-xl shadow-md border-2 border-white dark:border-[#1A1C22] transition-transform active:scale-90 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-400 font-extrabold block mb-1">
                  Committee Portal
                </span>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-[#F1F2F6] tracking-tight">
                    {profile.displayName}
                  </h1>
                  <span className="text-[9px] uppercase font-black tracking-wider bg-[#FFE8CC] dark:bg-[#38230D] text-[#FF9933] dark:text-[#FFB366] px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-transparent dark:border-[#543516]">
                    <ShieldCheck className="w-3 h-3 text-[#FF9933]" />
                    Admin
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-400 font-mono mb-2">
                  Username: @{profile.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl line-clamp-2 leading-relaxed italic font-serif">
                  &ldquo;{profile.bio || "Vinayaka Chavithi finance tracker and public transparency ledger."}&rdquo;
                </p>
              </div>
            </div>

            {/* Right Quick Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0">
              <button
                id="edit-profile-btn"
                onClick={() => setIsProfileModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-[#1A1A1A] dark:hover:text-white bg-white dark:bg-[#22252D] hover:bg-[#F8F9FA] dark:hover:bg-[#2A2E38] rounded-xl border border-[#F1F2F6] dark:border-[#282B34] shadow-2xs transition-all"
              >
                <Settings className="w-3.5 h-3.5 text-gray-400" />
                <span>Settings & Photo</span>
              </button>

              <button
                id="view-public-url-btn"
                onClick={() => onViewPublicProfile(profile.username)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#FF9933] hover:bg-[#F28B24] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all active:scale-[0.98]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Public Page</span>
              </button>
            </div>
          </div>

          {/* Shareable Public URL Banner (Main Journey Step) */}
          <div className="mt-6 pt-5 border-t border-[#F1F2F6] dark:border-[#282B34] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FFF9F2] dark:bg-[#221B13] p-4 rounded-2xl border border-[#FFE8CC] dark:border-[#422915] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <Share2 className="w-4 h-4 text-[#FF9933] flex-shrink-0" />
              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Public Committee URL:
                </span>
                <code className="text-xs font-mono text-[#FF9933] font-bold bg-white dark:bg-[#1A1C22] px-2.5 py-1 rounded-lg border border-[#FFE8CC] dark:border-[#543516] truncate">
                  /{profile.username}
                </code>
              </div>
            </div>

            <button
              id="copy-shareable-link-banner-btn"
              onClick={handleCopyLink}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#FF9933] hover:bg-[#F28B24] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Public Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Budget & Expense Visualizations (Graph Format) */}
        <BudgetCharts
          capital={profile.capital}
          expenses={expenses}
          currency={profile.currency}
        />

        {/* Finance Management Section (Add, Edit, Reorder, Delete) */}
        <FinanceSection
          expenses={expenses}
          currency={profile.currency}
          onAddExpense={() => {
            setEditingExpense(null);
            setIsExpenseModalOpen(true);
          }}
          onEditExpense={(expense) => {
            setEditingExpense(expense);
            setIsExpenseModalOpen(true);
          }}
          onDeleteExpense={handleDeleteExpense}
          onReorderExpenses={handleReorderExpenses}
        />
      </div>

      {/* Profile Editor Modal */}
      <ProfileEditorModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentProfile={profile}
        onSave={handleSaveProfile}
        onPasswordChanged={onPasswordChanged}
      />

      {/* Expense Add / Edit Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        editingExpense={editingExpense}
        currentExpenseCount={expenses.length}
      />
    </div>
  );
};
