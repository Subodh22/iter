"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, addMonths, addWeeks, addDays, addYears, eachMonthOfInterval, isBefore, isAfter, isWithinInterval, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecurringTransaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  frequency: "daily" | "weekly" | "fortnight" | "monthly" | "yearly";
  start_date: string;
  end_date?: string;
  is_active: boolean;
}

interface MonthlyProjection {
  month: string;
  monthKey: string;
  startingBalance: number;
  income: number;
  expenses: number;
  net: number;
  endingBalance: number;
}

export default function CashflowPrediction() {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [startingBudget, setStartingBudget] = useState<number>(0);
  const [allTransactions, setAllTransactions] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [monthsToProject, setMonthsToProject] = useState(6);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Load recurring transactions
    const { data: recurring, error: recurringError } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (recurringError) {
      console.error("Error loading recurring transactions:", recurringError);
    } else {
      setRecurringTransactions(recurring || []);
    }

    // Load current month's starting budget
    const currentMonth = new Date();
    const monthKey = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    
    const { data: monthlyBudget } = await supabase
      .from("monthly_starting_budgets")
      .select("starting_budget")
      .eq("user_id", user.id)
      .eq("month", monthKey)
      .single();

    if (monthlyBudget?.starting_budget !== undefined) {
      setStartingBudget(parseFloat(monthlyBudget.starting_budget.toString()) || 0);
    }

    // Load actual transactions for all months in projection range
    const projectionStart = startOfMonth(currentMonth);
    const projectionEnd = addMonths(projectionStart, monthsToProject);
    const projectionEndDate = new Date(projectionEnd.getFullYear(), projectionEnd.getMonth() + 1, 0);
    
    const { data: transactions } = await supabase
      .from("transactions")
      .select("type, amount, date")
      .eq("user_id", user.id)
      .gte("date", format(projectionStart, "yyyy-MM-dd"))
      .lte("date", format(projectionEndDate, "yyyy-MM-dd"));

    // Group transactions by month
    const transactionsByMonth: Record<string, any[]> = {};
    if (transactions) {
      transactions.forEach((transaction) => {
        const transactionDate = new Date(transaction.date);
        const monthKey = format(startOfMonth(transactionDate), "yyyy-MM-dd");
        if (!transactionsByMonth[monthKey]) {
          transactionsByMonth[monthKey] = [];
        }
        transactionsByMonth[monthKey].push(transaction);
      });
    }

    setAllTransactions(transactionsByMonth);

    setLoading(false);
  }, [supabase, monthsToProject]);

  useEffect(() => {
    loadData();
    
    // Listen for budget updates
    const handleBudgetUpdate = () => {
      loadData();
    };
    
    window.addEventListener("budgetUpdated", handleBudgetUpdate);
    window.addEventListener("recurringTransactionDeleted", handleBudgetUpdate);
    
    return () => {
      window.removeEventListener("budgetUpdated", handleBudgetUpdate);
      window.removeEventListener("recurringTransactionDeleted", handleBudgetUpdate);
    };
  }, [loadData, monthsToProject]);

  // Calculate actual occurrences of a transaction in a specific month
  const getMonthlyAmount = (
    transaction: RecurringTransaction,
    monthStart: Date,
    monthEnd: Date
  ): number => {
    const startDate = parseISO(transaction.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = transaction.end_date ? parseISO(transaction.end_date) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const amount = parseFloat(transaction.amount.toString());
    const frequency = transaction.frequency;

    // If transaction hasn't started yet, return 0
    if (startDate > monthEnd) return 0;

    // If transaction has ended, return 0
    if (endDate && endDate < monthStart) return 0;

    let occurrences = 0;
    let currentDate = new Date(startDate);

    // Skip ahead if start date is before the month we're checking
    // This optimizes the calculation for transactions that started earlier
    if (currentDate < monthStart) {
      // Calculate how many intervals to skip to get to the month we're checking
      if (frequency === "monthly") {
        // Find the first occurrence in or after this month
        while (currentDate < monthStart) {
          currentDate = addMonths(currentDate, 1);
        }
      } else if (frequency === "yearly") {
        while (currentDate < monthStart) {
          currentDate = addYears(currentDate, 1);
        }
      } else if (frequency === "quarterly") {
        while (currentDate < monthStart) {
          currentDate = addMonths(currentDate, 3);
        }
      } else if (frequency === "weekly") {
        while (currentDate < monthStart) {
          currentDate = addWeeks(currentDate, 1);
        }
      } else if (frequency === "fortnight") {
        while (currentDate < monthStart) {
          currentDate = addWeeks(currentDate, 2);
        }
      } else if (frequency === "daily") {
        currentDate = new Date(monthStart);
      }
    }

    // Now count occurrences within this month
    if (frequency === "monthly") {
      // Find the occurrence(s) in this month
      while (currentDate <= monthEnd) {
        if (isWithinInterval(currentDate, { start: monthStart, end: monthEnd })) {
          // Check if transaction is still active
          if (!endDate || currentDate <= endDate) {
            occurrences++;
          }
        }
        // Move to next month
        currentDate = addMonths(currentDate, 1);
        // Stop if we've gone past the month we're checking
        if (currentDate > monthEnd) break;
      }
    } else if (frequency === "yearly") {
      // Find the occurrence in this month (if any)
      while (currentDate <= monthEnd) {
        if (isWithinInterval(currentDate, { start: monthStart, end: monthEnd })) {
          // Check if transaction is still active
          if (!endDate || currentDate <= endDate) {
            occurrences++;
          }
        }
        // Move to next year
        currentDate = addYears(currentDate, 1);
        // Stop if we've gone past the month we're checking
        if (currentDate > monthEnd) break;
      }
    } else if (frequency === "quarterly") {
      // Quarterly means every 3 months
      while (currentDate <= monthEnd) {
        if (isWithinInterval(currentDate, { start: monthStart, end: monthEnd })) {
          // Check if transaction is still active
          if (!endDate || currentDate <= endDate) {
            occurrences++;
          }
        }
        // Move to next quarter (3 months)
        currentDate = addMonths(currentDate, 3);
        // Stop if we've gone past the month we're checking
        if (currentDate > monthEnd) break;
      }
    } else if (frequency === "weekly") {
      // Count all weekly occurrences in this month
      while (currentDate <= monthEnd) {
        if (isWithinInterval(currentDate, { start: monthStart, end: monthEnd })) {
          // Check if transaction is still active
          if (!endDate || currentDate <= endDate) {
            occurrences++;
          }
        }
        // Move to next week
        currentDate = addWeeks(currentDate, 1);
        // Stop if we've gone past the month we're checking
        if (currentDate > monthEnd) break;
      }
    } else if (frequency === "fortnight") {
      // Count all fortnightly occurrences in this month
      while (currentDate <= monthEnd) {
        if (isWithinInterval(currentDate, { start: monthStart, end: monthEnd })) {
          // Check if transaction is still active
          if (!endDate || currentDate <= endDate) {
            occurrences++;
          }
        }
        // Move to next fortnight (2 weeks)
        currentDate = addWeeks(currentDate, 2);
        // Stop if we've gone past the month we're checking
        if (currentDate > monthEnd) break;
      }
    } else if (frequency === "daily") {
      // Count all daily occurrences in this month
      while (currentDate <= monthEnd) {
        if (isWithinInterval(currentDate, { start: monthStart, end: monthEnd })) {
          // Check if transaction is still active
          if (!endDate || currentDate <= endDate) {
            occurrences++;
          }
        }
        // Move to next day
        currentDate = addDays(currentDate, 1);
        // Stop if we've gone past the month we're checking
        if (currentDate > monthEnd) break;
      }
    }

    return amount * occurrences;
  };

  // Generate projections for future months
  const projections = useMemo((): MonthlyProjection[] => {
    if (loading) return [];

    const currentMonth = new Date();
    const startMonth = startOfMonth(currentMonth);
    const endMonth = addMonths(startMonth, monthsToProject);
    const months = eachMonthOfInterval({ start: startMonth, end: endMonth });

    let runningBalance = startingBudget;
    const monthlyData: MonthlyProjection[] = [];

    months.forEach((month, index) => {
      const monthStart = startOfMonth(month);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      const monthKey = format(monthStart, "yyyy-MM-dd");
      const isCurrentMonth = index === 0;

      // Starting balance for this month (carryover from previous month)
      const monthStartingBalance = runningBalance;

      let monthlyIncome = 0;
      let monthlyExpenses = 0;

      // Check if we have actual transactions for this month
      const monthTransactions = allTransactions[monthKey] || [];
      
      if (monthTransactions.length > 0) {
        // Use actual transactions if available
        monthTransactions.forEach((transaction) => {
          if (transaction.type === "income") {
            monthlyIncome += parseFloat(transaction.amount.toString());
          } else {
            monthlyExpenses += parseFloat(transaction.amount.toString());
          }
        });
      } else {
        // If no actual transactions, calculate from recurring transactions
        recurringTransactions.forEach((transaction) => {
          const monthlyAmount = getMonthlyAmount(transaction, monthStart, monthEnd);

          if (transaction.type === "income") {
            monthlyIncome += monthlyAmount;
          } else {
            monthlyExpenses += monthlyAmount;
          }
        });
      }

      const net = monthlyIncome - monthlyExpenses;
      // Ending balance = Starting balance + Income - Expenses
      const monthEndingBalance = monthStartingBalance + net;
      runningBalance = monthEndingBalance;

      monthlyData.push({
        month: format(month, "MMM yyyy"),
        monthKey,
        startingBalance: monthStartingBalance,
        income: monthlyIncome,
        expenses: monthlyExpenses,
        net,
        endingBalance: monthEndingBalance,
      });
    });

    return monthlyData;
  }, [recurringTransactions, startingBudget, monthsToProject, loading, allTransactions]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cashflow Prediction</CardTitle>
          <CardDescription>Loading predictions...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (projections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cashflow Prediction</CardTitle>
          <CardDescription>Projected cashflow based on recurring transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No recurring transactions found. Set up recurring income and expenses to see predictions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Cashflow Prediction</CardTitle>
            <CardDescription>
              Projected balance over the next {monthsToProject} months
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-muted-foreground">Months:</label>
            <select
              value={monthsToProject}
              onChange={(e) => setMonthsToProject(Number(e.target.value))}
              className="h-8 px-2 text-xs sm:text-sm border rounded-md bg-background"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900/30">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Avg Income</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-green-600">
                $
                {(
                  projections.reduce((sum, p) => sum + p.income, 0) / projections.length
                ).toFixed(0)}
              </p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/30">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                <span className="text-[10px] sm:text-xs text-muted-foreground">Avg Expenses</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-red-600">
                $
                {(
                  projections.reduce((sum, p) => sum + p.expenses, 0) / projections.length
                ).toFixed(0)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900/30">
              <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Ending Balance</div>
              <p
                className={cn(
                  "text-sm sm:text-lg font-bold",
                  projections[projections.length - 1]?.endingBalance >= 0
                    ? "text-green-600"
                    : "text-red-600"
                )}
              >
                ${projections[projections.length - 1]?.endingBalance.toFixed(0) || 0}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Net Change</div>
              <p
                className={cn(
                  "text-sm sm:text-lg font-bold",
                  (projections[projections.length - 1]?.endingBalance - startingBudget) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                )}
              >
                {projections[projections.length - 1]?.endingBalance - startingBudget >= 0 ? "+" : ""}
                ${(projections[projections.length - 1]?.endingBalance - startingBudget).toFixed(0)}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="w-full h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projections} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `$${value.toFixed(2)}`,
                    name === "endingBalance"
                      ? "Ending Balance"
                      : name === "income"
                      ? "Income"
                      : name === "expenses"
                      ? "Expenses"
                      : "Net",
                  ]}
                  labelStyle={{ fontSize: 12 }}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="endingBalance"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Balance"
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Income"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Expenses"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Projection Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Month</th>
                  <th className="text-right p-2">Starting Balance</th>
                  <th className="text-right p-2">Income</th>
                  <th className="text-right p-2">Expenses</th>
                  <th className="text-right p-2">Net</th>
                  <th className="text-right p-2 font-semibold">Ending Balance</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((projection, index) => (
                  <tr
                    key={projection.monthKey}
                    className={cn(
                      "border-b hover:bg-muted/50",
                      index === 0 && "bg-primary/5"
                    )}
                  >
                    <td className="p-2 font-medium">{projection.month}</td>
                    <td
                      className={cn(
                        "p-2 text-right font-medium",
                        projection.startingBalance >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      ${projection.startingBalance.toFixed(2)}
                    </td>
                    <td className="p-2 text-right text-green-600">
                      ${projection.income.toFixed(2)}
                    </td>
                    <td className="p-2 text-right text-red-600">
                      ${projection.expenses.toFixed(2)}
                    </td>
                    <td
                      className={cn(
                        "p-2 text-right font-medium",
                        projection.net >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {projection.net >= 0 ? "+" : ""}${projection.net.toFixed(2)}
                    </td>
                    <td
                      className={cn(
                        "p-2 text-right font-bold",
                        projection.endingBalance >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      ${projection.endingBalance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

