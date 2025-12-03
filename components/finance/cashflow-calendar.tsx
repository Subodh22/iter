"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface CashflowCalendarProps {
  transactions: Transaction[];
  onDateClick?: (date: Date) => void;
  onMonthChange?: (month: Date) => void;
}

export default function CashflowCalendar({ transactions, onDateClick, onMonthChange }: CashflowCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startingBudget, setStartingBudget] = useState<number>(0);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [isBudgetManuallySaved, setIsBudgetManuallySaved] = useState<boolean>(false);
  const supabase = createClient();

  // Load starting budget for current month and calculate carryover
  const loadStartingBudget = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const monthKey = format(startOfMonth(currentMonth), "yyyy-MM-dd");

    // Try to load starting budget for this month
    const { data: monthlyBudget, error } = await supabase
      .from("monthly_starting_budgets")
      .select("starting_budget")
      .eq("user_id", user.id)
      .eq("month", monthKey)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error loading starting budget:", error);
    }

    if (monthlyBudget?.starting_budget !== undefined) {
      setStartingBudget(parseFloat(monthlyBudget.starting_budget.toString()) || 0);
      // Don't assume it's manually saved on load - only show indicator when user explicitly saves
      // This prevents showing indicator for auto-calculated budgets that were saved
    } else {
        // If no starting budget exists for this month, calculate from previous month
        const previousMonth = subMonths(currentMonth, 1);
        const previousMonthKey = format(startOfMonth(previousMonth), "yyyy-MM-dd");
        const previousMonthEnd = endOfMonth(previousMonth);
        const previousMonthStart = startOfMonth(previousMonth);

        // Get previous month's starting budget
        const { data: prevMonthlyBudget } = await supabase
          .from("monthly_starting_budgets")
          .select("starting_budget")
          .eq("user_id", user.id)
          .eq("month", previousMonthKey)
          .single();

        const prevStartingBudget = prevMonthlyBudget?.starting_budget 
          ? parseFloat(prevMonthlyBudget.starting_budget.toString()) 
          : 0;

        // Calculate previous month's transactions
        const { data: prevTransactions } = await supabase
          .from("transactions")
          .select("type, amount")
          .eq("user_id", user.id)
          .gte("date", format(previousMonthStart, "yyyy-MM-dd"))
          .lte("date", format(previousMonthEnd, "yyyy-MM-dd"));

        let prevIncome = 0;
        let prevExpenses = 0;

        if (prevTransactions) {
          prevIncome = prevTransactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
          
          prevExpenses = prevTransactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        }

        // Calculate ending balance (carryover)
        const endingBalance = prevStartingBudget + prevIncome - prevExpenses;

        // Set as starting budget for current month
        setStartingBudget(endingBalance);

        // Save to database
        await supabase
          .from("monthly_starting_budgets")
          .upsert({
            user_id: user.id,
            month: monthKey,
            starting_budget: endingBalance,
          });
      }
  }, [currentMonth, supabase]);

  useEffect(() => {
    loadStartingBudget();
    
    // Listen for starting budget updates from dashboard
    const handleStartingBudgetUpdate = () => {
      loadStartingBudget();
    };
    
    window.addEventListener("startingBudgetUpdated", handleStartingBudgetUpdate);
    
    return () => {
      window.removeEventListener("startingBudgetUpdated", handleStartingBudgetUpdate);
    };
  }, [loadStartingBudget]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of month to calculate offset
  const firstDayOfMonth = getDay(monthStart);
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Monday = 0

  // Filter transactions for current month and group by date
  const transactionsByDate = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    const monthStartStr = format(monthStart, "yyyy-MM-dd");
    const monthEndStr = format(monthEnd, "yyyy-MM-dd");
    
    transactions.forEach((transaction) => {
      // Only include transactions in the current month being viewed
      if (transaction.date >= monthStartStr && transaction.date <= monthEndStr) {
        const dateKey = transaction.date;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(transaction);
      }
    });
    return grouped;
  }, [transactions, monthStart, monthEnd]);

  // Calculate daily cashflow
  const getDayCashflow = (date: Date): { income: number; expense: number; net: number } => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dayTransactions = transactionsByDate[dateKey] || [];

    const income = dayTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const expense = dayTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    return {
      income,
      expense,
      net: income - expense,
    };
  };

  // Calculate running balance up to a specific date (inclusive)
  // Memoize for performance
  const runningBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    let balance = startingBudget;
    
    daysInMonth.forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const dayTransactions = transactionsByDate[dayKey] || [];
      
      const income = dayTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      
      const expense = dayTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      
      balance += (income - expense);
      balances[dayKey] = balance;
    });
    
    return balances;
  }, [daysInMonth, startingBudget, transactionsByDate]);

  const getRunningBalance = (date: Date): number => {
    const dateKey = format(date, "yyyy-MM-dd");
    return runningBalances[dateKey] ?? startingBudget;
  };

  const previousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const nextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl">Cashflow Calendar</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {format(currentMonth, "MMMM yyyy")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={previousMonth}>
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={nextMonth}>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend - Simplified */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-6 text-[10px] sm:text-sm pb-2 sm:pb-3 border-b">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded border border-green-200 bg-green-50/30 dark:bg-green-950/10" />
              <span className="text-muted-foreground">Positive</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded border border-red-200 bg-red-50/30 dark:bg-red-950/10" />
              <span className="text-muted-foreground">Negative</span>
            </div>
            <div className="text-muted-foreground/70 text-[9px] sm:text-xs hidden sm:block">
              Click any day for details
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-[10px] sm:text-sm font-medium text-muted-foreground py-0.5 sm:py-2"
              >
                {day}
              </div>
            ))}

            {/* Empty cells for offset */}
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Calendar days */}
            {daysInMonth.map((day) => {
              const cashflow = getDayCashflow(day);
              const dayTransactions = transactionsByDate[format(day, "yyyy-MM-dd")] || [];
              const hasTransactions = dayTransactions.length > 0;
              const isToday = isSameDay(day, new Date());
              const isSunday = getDay(day) === 0; // Sunday = 0
              const runningBalance = getRunningBalance(day);
              const netAmount = cashflow.net;

              return (
                <button
                  key={day.toString()}
                  onClick={() => onDateClick?.(day)}
                  className={cn(
                    "aspect-square border rounded sm:rounded-lg p-0.5 sm:p-1.5 flex flex-col items-center justify-center transition-all hover:shadow-sm relative",
                    "min-h-[40px] sm:min-h-[70px]",
                    isToday && "ring-1 sm:ring-2 ring-primary",
                    // Subtle background color based on net cashflow
                    netAmount > 0 && "bg-green-50/30 dark:bg-green-950/10 border-green-100 dark:border-green-900/30",
                    netAmount < 0 && "bg-red-50/30 dark:bg-red-950/10 border-red-100 dark:border-red-900/30",
                    !hasTransactions && "bg-muted/20 border-border/50"
                  )}
                >
                  {/* Date number - top */}
                  <span
                    className={cn(
                      "text-[9px] sm:text-sm font-medium absolute top-0.5 left-0.5 sm:top-1.5 sm:left-1.5",
                      isToday 
                        ? "text-primary font-bold" 
                        : "text-muted-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Main content - centered */}
                  <div className="flex flex-col items-center justify-center gap-0 sm:gap-0.5 w-full mt-1 sm:mt-0">
                    {/* Sunday: Show running balance */}
                    {isSunday ? (
                      <>
                        <div className="text-[7px] sm:text-[10px] text-muted-foreground/70 font-medium leading-tight">
                          Balance
                        </div>
                        <div className={cn(
                          "text-[10px] sm:text-base font-bold leading-tight",
                          runningBalance >= 0
                            ? "text-green-600 dark:text-green-500"
                            : "text-red-600 dark:text-red-500"
                        )}>
                          ${runningBalance.toFixed(0)}
                        </div>
                      </>
                    ) : hasTransactions ? (
                      /* Regular days: Show net amount only */
                      <div
                        className={cn(
                          "text-[10px] sm:text-base font-semibold leading-tight",
                          netAmount > 0
                            ? "text-green-600 dark:text-green-500"
                            : netAmount < 0
                            ? "text-red-600 dark:text-red-500"
                            : "text-muted-foreground"
                        )}
                      >
                        {netAmount > 0 ? "+" : ""}${Math.abs(netAmount).toFixed(0)}
                      </div>
                    ) : (
                      /* Empty days: Show nothing */
                      null
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Monthly Summary */}
          <div className="pt-4 border-t">
            {/* Starting Budget Input */}
            <div className="mb-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="starting-budget-calendar" className="text-xs sm:text-sm font-medium">
                      Starting Budget
                    </Label>
                    {isBudgetManuallySaved && (
                      <span title="Manually saved">
                        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                    {isBudgetManuallySaved ? "Manually saved budget" : "Your initial budget balance for this month"}
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    id="starting-budget-calendar"
                    type="number"
                    step="0.01"
                    value={startingBudget || ""}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setStartingBudget(value);
                    }}
                    onBlur={async () => {
                      // Save starting budget when user leaves the input
                      setIsSavingBudget(true);
                      try {
                        const {
                          data: { user },
                        } = await supabase.auth.getUser();
                        if (!user) return;

                        const monthKey = format(startOfMonth(currentMonth), "yyyy-MM-dd");

                        const { error } = await supabase
                          .from("monthly_starting_budgets")
                          .upsert({
                            user_id: user.id,
                            month: monthKey,
                            starting_budget: startingBudget,
                          }, {
                            onConflict: "user_id,month"
                          });

                        if (error) {
                          console.error("Error saving starting budget:", error);
                          alert("Failed to save starting budget. Please try again.");
                        } else {
                          // Mark as manually saved
                          setIsBudgetManuallySaved(true);
                          // Reload to ensure we have the latest value
                          await loadStartingBudget();
                        }
                      } finally {
                        setIsSavingBudget(false);
                      }
                    }}
                    placeholder="0.00"
                    className="w-full sm:w-32 text-right font-semibold text-sm sm:text-base"
                    disabled={isSavingBudget}
                  />
                  {isSavingBudget && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Saving...</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Starting Budget</p>
                <p className="text-sm sm:text-lg font-bold text-blue-600">
                  ${startingBudget.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Income</p>
                <p className="text-sm sm:text-lg font-bold text-green-600">
                  $
                  {daysInMonth
                    .reduce(
                      (sum, day) => sum + getDayCashflow(day).income,
                      0
                    )
                    .toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-sm sm:text-lg font-bold text-red-600">
                  $
                  {daysInMonth
                    .reduce(
                      (sum, day) => sum + getDayCashflow(day).expense,
                      0
                    )
                    .toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Net Cashflow</p>
                <p
                  className={cn(
                    "text-sm sm:text-lg font-bold",
                    (startingBudget + daysInMonth.reduce(
                      (sum, day) => sum + getDayCashflow(day).net,
                      0
                    )) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  )}
                >
                  $
                  {(startingBudget + daysInMonth
                    .reduce((sum, day) => sum + getDayCashflow(day).net, 0))
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

