import React, { useState } from "react";
import { Expense } from "../types";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Search,
  Filter,
  Receipt,
  FileText,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";

interface FinanceSectionProps {
  expenses: Expense[];
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => Promise<void>;
  onReorderExpenses: (newOrderedList: Expense[]) => Promise<void>;
  currency?: string;
}

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

export const FinanceSection: React.FC<FinanceSectionProps> = ({
  expenses,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onReorderExpenses,
  currency = "₹",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Authoritative sort by persisted order property
  const sortedExpenses = [...expenses].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const categories = Array.from(new Set(sortedExpenses.map((e) => e.category || "Miscellaneous")));

  const filteredExpenses = sortedExpenses.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (direction === "up" && index <= 0) return;
    if (direction === "down" && index >= sortedExpenses.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newExpenses = [...sortedExpenses];
    const [movedItem] = newExpenses.splice(index, 1);
    newExpenses.splice(targetIndex, 0, movedItem);

    // Update each item's order field deterministically to match its new array index
    const reorderedList = newExpenses.map((item, idx) => ({
      ...item,
      order: idx,
    }));

    try {
      setIsReordering(true);
      await onReorderExpenses(reorderedList);
    } catch (err) {
      console.error("Failed to reorder expenses:", err);
    } finally {
      setIsReordering(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? It will immediately disappear from your public committee page.`)) {
      try {
        setDeletingId(id);
        await onDeleteExpense(id);
      } catch (err) {
        console.error("Failed to delete expense:", err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div id="finance-management-section" className="bg-white dark:bg-[#1A1C22] rounded-2xl border border-[#F1F2F6] dark:border-[#282B34] shadow-sm overflow-hidden flex flex-col transition-colors">
      {/* Header bar */}
      <div className="p-6 sm:p-8 border-b border-[#F1F2F6] dark:border-[#282B34] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-400 font-extrabold block mb-1">
            Financial Records
          </span>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-[#F1F2F6] tracking-tight">
              Expense Ledger
            </h2>
            <span
              id="expense-counter-badge"
              className={`text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-black ${
                expenses.length >= 90
                  ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60"
                  : "bg-[#F8F9FA] dark:bg-[#22252D] text-gray-500 dark:text-gray-400 border border-[#F1F2F6] dark:border-[#282B34]"
              }`}
            >
              {expenses.length} / 90
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
            A live, leader-arranged record of all 2026 Vinayaka Chavithi expenses.
          </p>
        </div>

        <button
          id="add-expense-btn"
          onClick={onAddExpense}
          disabled={expenses.length >= 90}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF9933] hover:bg-[#F28B24] disabled:bg-gray-200 dark:disabled:bg-gray-800 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all active:scale-[0.98] flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Expense</span>
        </button>
      </div>

      {/* Filter and Search controls */}
      {expenses.length > 0 && (
        <div className="px-6 py-3.5 bg-[#FCFDFF] dark:bg-[#16181E] border-b border-[#F1F2F6] dark:border-[#282B34] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="search-expenses-input"
              type="text"
              placeholder="Search by title, description, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] bg-white dark:bg-[#22252D] text-[#2D3436] dark:text-[#F1F2F6] placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 focus:border-[#FF9933] transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <select
              id="category-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-[#F1F2F6] dark:border-[#2E323D] text-gray-700 dark:text-gray-200 bg-white dark:bg-[#22252D] focus:outline-hidden focus:ring-2 focus:ring-[#FF9933]/30 font-medium"
            >
              <option value="all">Filter: All Categories ({expenses.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c} ({expenses.filter((x) => x.category === c).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Expenses List */}
      {expenses.length === 0 ? (
        /* Empty state: User has no expenses yet */
        <div
          id="empty-expenses-state"
          className="py-16 text-center flex flex-col items-center justify-center p-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#FFE8CC] dark:bg-[#38230D] text-[#FF9933] flex items-center justify-center font-bold text-xl mb-3 shadow-inner">
            <Receipt className="w-7 h-7" />
          </div>
          <h4 className="text-base font-black text-[#1A1A1A] dark:text-[#F1F2F6] mb-1">No expenses recorded yet</h4>
          <p className="text-xs text-gray-400 dark:text-gray-400 max-w-sm mb-5 leading-relaxed">
            Start tracking idol booking, pandal setup, sound systems, pooja supplies, and prasadam costs.
          </p>
          <button
            id="empty-add-expense-btn"
            onClick={onAddExpense}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF9933] hover:bg-[#F28B24] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-200/50 dark:shadow-none transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Expense</span>
          </button>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-xs font-medium">
          No expenses match your search or filter criteria.
        </div>
      ) : (
        <div id="expenses-table-list" className="flex flex-col">
          {/* Table Column Headers */}
          <div className="hidden sm:grid grid-cols-12 bg-[#F8F9FA] dark:bg-[#16181E] px-6 py-3 border-b border-[#F1F2F6] dark:border-[#282B34] text-[10px] font-black uppercase tracking-widest text-gray-400 select-none">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table Rows */}
          {filteredExpenses.map((expense) => {
            const rawIndex = sortedExpenses.findIndex((e) => e.id === expense.id);
            const isFirst = rawIndex <= 0;
            const isLast = rawIndex >= sortedExpenses.length - 1;

            return (
              <div
                key={expense.id}
                id={`expense-item-${expense.id}`}
                className="group px-6 py-4 border-b border-[#F8F9FA] dark:border-[#22252D] hover:bg-[#FFFBF5] dark:hover:bg-[#221B13] transition-colors flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-3"
              >
                {/* # Col */}
                <div className="col-span-1 flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono font-bold">
                    {(rawIndex + 1).toString().padStart(2, "0")}
                  </span>
                </div>

                {/* Description Col */}
                <div className="col-span-5 min-w-0">
                  <h4 className="font-bold text-sm text-[#1A1A1A] dark:text-[#F1F2F6] leading-snug truncate">
                    {expense.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {expense.date}
                    </span>
                    {expense.notes && (
                      <span className="truncate max-w-xs text-gray-500 dark:text-gray-400 italic text-[11px]">
                        {expense.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Category Col */}
                <div className="col-span-2">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${getCategoryBadgeClass(expense.category)}`}>
                    {expense.category}
                  </span>
                </div>

                {/* Amount Col */}
                <div className="col-span-2 text-left sm:text-right font-mono font-bold text-sm text-[#1A1A1A] dark:text-[#F1F2F6]">
                  {currency}{expense.amount.toLocaleString()}
                </div>

                {/* Actions & Reorder Col */}
                <div className="col-span-2 flex items-center justify-between sm:justify-end gap-2">
                  {/* Reorder Up/Down */}
                  <div className="flex items-center gap-1 bg-[#F8F9FA] dark:bg-[#22252D] p-0.5 rounded-lg border border-[#F1F2F6] dark:border-[#2E323D]">
                    <button
                      id={`move-up-${expense.id}`}
                      title="Move expense up in order"
                      disabled={isFirst || isReordering}
                      onClick={() => handleMove(rawIndex, "up")}
                      className="p-1 text-gray-400 hover:text-[#FF9933] disabled:opacity-20 rounded transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`move-down-${expense.id}`}
                      title="Move expense down in order"
                      disabled={isLast || isReordering}
                      onClick={() => handleMove(rawIndex, "down")}
                      className="p-1 text-gray-400 hover:text-[#FF9933] disabled:opacity-20 rounded transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Edit & Delete Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-expense-${expense.id}`}
                      onClick={() => onEditExpense(expense)}
                      title="Edit this expense"
                      className="p-1.5 text-gray-400 hover:text-[#1A1A1A] dark:hover:text-white hover:bg-white dark:hover:bg-[#282B34] rounded-lg border border-transparent hover:border-[#F1F2F6] dark:hover:border-[#2E323D] transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-expense-${expense.id}`}
                      onClick={() => handleDelete(expense.id, expense.title)}
                      disabled={deletingId === expense.id}
                      title="Delete this expense"
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Table Footer Summary Banner */}
          <div className="bg-[#FFF9F2] dark:bg-[#221B13] px-6 py-3 border-t border-[#F1F2F6] dark:border-[#282B34] flex justify-between items-center transition-colors">
            <span className="text-[10px] font-bold text-[#FF9933] dark:text-[#FFB366] uppercase tracking-wider">
              Leader-Arranged Ledger
            </span>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
              Showing {filteredExpenses.length} of {expenses.length} Expenses
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
