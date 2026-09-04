import React from "react";
import { Expense } from "../types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, AlertCircle, CheckCircle2, IndianRupee } from "lucide-react";

interface BudgetChartsProps {
  capital: number;
  expenses: Expense[];
  currency?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Idol / Pratima": "#FF9933",
  "Decoration & Tent / Pandal": "#3b82f6",
  "Sound & Lighting": "#8b5cf6",
  "Puja & Priest": "#f59e0b",
  "Prasadam & Food": "#10b981",
  "Visarjan / Immersion": "#06b6d4",
  "Permissions & Security": "#64748b",
  "Transportation": "#6366f1",
  "Cultural Programs": "#ec4899",
  "Miscellaneous": "#94a3b8",
};

export const BudgetCharts: React.FC<BudgetChartsProps> = ({
  capital,
  expenses,
  currency = "₹",
}) => {
  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = capital - totalSpent;
  const percentSpent = capital > 0 ? Math.min(100, Math.round((totalSpent / capital) * 100)) : 0;
  const isOverBudget = remaining < 0;

  // Group by category
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((exp) => {
    const cat = exp.category || "Miscellaneous";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
  });

  const categoryData = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || "#FF9933",
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div id="budget-charts-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Visual Budget Meter & Remaining Card */}
      <div id="budget-summary-card" className="lg:col-span-2 bg-white dark:bg-[#1A1C22] rounded-2xl p-6 border border-[#F1F2F6] dark:border-[#282B34] shadow-sm flex flex-col justify-between transition-colors">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-400 font-extrabold block mb-1">
                Capital Progress
              </span>
              <h3 className="text-xl font-black text-[#1A1A1A] dark:text-[#F1F2F6] tracking-tight">Capital vs. Total Spent</h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider block">Budget Used</span>
              <div className="text-lg font-black text-[#FF9933]">{percentSpent}%</div>
            </div>
          </div>

          {/* Progress Bar Gauge */}
          <div className="space-y-2 mb-6">
            <div className="h-3.5 w-full bg-[#F8F9FA] dark:bg-[#252833] rounded-full overflow-hidden border border-[#F1F2F6] dark:border-[#2E323D]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverBudget
                    ? "bg-rose-500"
                    : "bg-[#FF9933]"
                }`}
                style={{ width: `${Math.min(100, percentSpent)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-400 font-medium">
              <span>{currency}0 spent</span>
              <span className="font-semibold text-gray-600 dark:text-gray-300">Total Capital: {currency}{capital.toLocaleString()}</span>
            </div>
          </div>

          {/* Key Stat Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-[#F8F9FA] dark:bg-[#22252D] rounded-xl p-4 border border-[#F1F2F6] dark:border-[#282B34]">
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <IndianRupee className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                <span>Total Capital</span>
              </div>
              <div className="text-xl font-black text-[#1A1A1A] dark:text-[#F1F2F6]">
                {currency}{capital.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#FFF9F2] dark:bg-[#2E1E0F] rounded-xl p-4 border border-[#FFE8CC] dark:border-[#543516]">
              <div className="flex items-center gap-1.5 text-[#FF9933] dark:text-[#FFB366] text-[10px] font-bold uppercase tracking-wider mb-1">
                <TrendingUp className="w-3 h-3 text-[#FF9933] dark:text-[#FFB366]" />
                <span>Total Spent</span>
              </div>
              <div className="text-xl font-black text-[#1A1A1A] dark:text-[#F1F2F6]">
                {currency}{totalSpent.toLocaleString()}
              </div>
            </div>

            <div
              className={`rounded-xl p-4 border ${
                isOverBudget
                  ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200"
                  : "bg-white dark:bg-[#22252D] border-[#F1F2F6] dark:border-[#282B34] text-[#2D3436] dark:text-[#F1F2F6] shadow-2xs"
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1">
                {isOverBudget ? (
                  <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                )}
                <span className={isOverBudget ? "text-rose-700 dark:text-rose-400" : "text-gray-400 dark:text-gray-400"}>
                  {isOverBudget ? "Deficit" : "Available"}
                </span>
              </div>
              <div className={`text-xl font-black ${isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-[#FF9933]"}`}>
                {isOverBudget
                  ? `-${currency}${Math.abs(remaining).toLocaleString()}`
                  : `${currency}${remaining.toLocaleString()}`}
              </div>
            </div>
          </div>
        </div>

        {isOverBudget && (
          <div className="mt-4 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            <span>Committee has exceeded planned capital budget by {currency}{Math.abs(remaining).toLocaleString()}. Consider updating capital or adjusting expenses.</span>
          </div>
        )}
      </div>

      {/* Category Breakdown Chart */}
      <div id="category-distribution-card" className="bg-white dark:bg-[#1A1C22] rounded-2xl p-6 border border-[#F1F2F6] dark:border-[#282B34] shadow-sm flex flex-col transition-colors">
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-400 font-extrabold block mb-1">
          Allocation
        </span>
        <h3 className="text-base font-black text-[#1A1A1A] dark:text-[#F1F2F6] tracking-tight mb-2">Category Distribution</h3>
        {categoryData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-400 py-8 text-center text-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#F8F9FA] dark:bg-[#22252D] border border-[#F1F2F6] dark:border-[#282B34] flex items-center justify-center mb-2 text-gray-400 font-bold text-lg">
              ₹
            </div>
            <p className="font-semibold text-gray-600 dark:text-gray-300">No expenses recorded</p>
            <span className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">Add an expense to view distribution</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            <div className="h-44 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${currency}${Number(val).toLocaleString()}`, "Spent"]}
                    contentStyle={{
                      borderRadius: "12px",
                      fontSize: "12px",
                      border: "1px solid #282B34",
                      backgroundColor: "#1A1C22",
                      color: "#F1F2F6",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-gray-400 dark:text-gray-400 font-bold uppercase tracking-wider">Categories</span>
                <span className="text-sm font-black text-[#1A1A1A] dark:text-[#F1F2F6]">{categoryData.length}</span>
              </div>
            </div>

            {/* Compact Legend */}
            <div className="mt-2 space-y-2 max-h-32 overflow-y-auto pr-1 text-xs">
              {categoryData.slice(0, 4).map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-gray-600 dark:text-gray-300 hover:text-[#1A1A1A] dark:hover:text-white transition-colors">
                  <div className="flex items-center gap-2 truncate max-w-[65%]">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-2xs"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate font-medium text-xs text-[#2D3436] dark:text-gray-200">{cat.name}</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-[#1A1A1A] dark:text-[#F1F2F6]">
                    {currency}{cat.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
