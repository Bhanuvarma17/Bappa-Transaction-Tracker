import React, { useState, useEffect } from "react";
import { Expense } from "../types";
import { X, Calendar, Tag, FileText, IndianRupee, AlertCircle } from "lucide-react";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    amount: number;
    category: string;
    date: string;
    notes?: string;
  }) => Promise<void>;
  editingExpense?: Expense | null;
  currentExpenseCount: number;
}

const DEFAULT_CATEGORIES = [
  "Idol / Pratima",
  "Decoration & Tent / Pandal",
  "Sound & Lighting",
  "Puja & Priest",
  "Prasadam & Food",
  "Visarjan / Immersion",
  "Permissions & Security",
  "Transportation",
  "Cultural Programs",
  "Miscellaneous",
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingExpense,
  currentExpenseCount,
}) => {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState("Idol / Pratima");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category || "Miscellaneous");
      setDate(editingExpense.date || new Date().toISOString().split("T")[0]);
      setNotes(editingExpense.notes || "");
    } else {
      setTitle("");
      setAmount("");
      setCategory("Idol / Pratima");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
    }
    setError(null);
  }, [editingExpense, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Rule: Empty expense titles should not be accepted
    if (!title.trim()) {
      setError("Expense title is required. Please enter what this expense was for.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    // Rule: Max 90 expenses per profile (only check for new items)
    if (!editingExpense && currentExpenseCount >= 90) {
      setError("Maximum limit reached: You can add up to 90 expenses per committee profile.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        title: title.trim(),
        amount: numAmount,
        category: category.trim(),
        date,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        id="expense-modal"
        className="bg-white dark:bg-[#1A1C22] rounded-2xl max-w-lg w-full overflow-hidden shadow-xl border border-[#F1F2F6] dark:border-[#282B34] animate-in fade-in zoom-in-95 duration-150 transition-colors"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#FFFDFB] dark:bg-[#16181E] border-b border-[#F1F2F6] dark:border-[#282B34] flex items-center justify-between">
          <div>
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#FF9933] dark:text-[#FFB366] font-black block">
              Ledger Entry
            </span>
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F1F2F6]">
              {editingExpense ? "Edit Expense" : "Add New Expense"}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-400">
              {editingExpense
                ? "Update details for this committee expense"
                : `Record a new expenditure (${currentExpenseCount}/90 used)`}
            </p>
          </div>
          <button
            id="close-expense-modal-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252833] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs p-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="expense-title-input" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">
              Expense Item Title <span className="text-[#FF9933]">*</span>
            </label>
            <input
              id="expense-title-input"
              type="text"
              required
              placeholder="e.g. Eco-Friendly Clay Ganesh Idol (14 ft)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="expense-amount-input" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">
                Amount (₹) <span className="text-[#FF9933]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs font-mono font-bold">
                  ₹
                </div>
                <input
                  id="expense-amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="expense-date-input" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">
                Date
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  id="expense-date-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="expense-category-select" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">
              Category
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Tag className="w-4 h-4" />
              </div>
              <select
                id="expense-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] text-[#2D3436] dark:text-[#F1F2F6] text-xs bg-white dark:bg-[#22252D] focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="expense-notes-input" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">
              Notes & Bill / Vendor Details (Optional)
            </label>
            <div className="relative">
              <textarea
                id="expense-notes-input"
                rows={3}
                placeholder="e.g. Paid 50% advance to artisan Srinivas; receipt #402. Remaining due on delivery."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all resize-none"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#F1F2F6] dark:border-[#282B34]">
            <button
              id="cancel-expense-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#252833] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="save-expense-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#FF9933] hover:bg-[#F28B24] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all disabled:opacity-50 flex items-center gap-2 active:scale-[0.98]"
            >
              {isSubmitting ? "Saving..." : editingExpense ? "Update Expense" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
