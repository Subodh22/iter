"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Table2, ClipboardList, Wallet } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import CashflowCalendar from "./cashflow-calendar";
import DateTransactionsDialog from "./date-transactions-dialog";
import RecurringTransactions from "./recurring-transactions";
import BudgetPlanner from "./budget-planner";
import CashflowPrediction from "./cashflow-prediction";

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  date: string;
  is_recurring?: boolean;
  recurring_template_id?: string;
}

interface RecurringTransaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  frequency: "daily" | "weekly" | "fortnight" | "monthly" | "yearly";
  start_date: string;
  end_date?: string;
  next_occurrence: string;
  is_active: boolean;
}

export default function FinanceDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [view, setView] = useState<"calendar" | "sheets">("calendar");
  const [startingBudget, setStartingBudget] = useState<number>(0);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    category: "",
    amount: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    isRecurring: false,
    frequency: "monthly" as "daily" | "weekly" | "fortnight" | "monthly" | "yearly",
    endDate: "",
  });
  const supabase = createClient();

  const cleanupDuplicateTransactions = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Find and remove duplicate transactions (same category, date, amount, type)
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error || !transactions) return;

    // Group transactions by category, date, amount, and type
    const transactionMap = new Map<string, string[]>();
    transactions.forEach((t) => {
      const key = `${t.category}|${t.date}|${t.amount}|${t.type}`;
      if (!transactionMap.has(key)) {
        transactionMap.set(key, []);
      }
      transactionMap.get(key)!.push(t.id);
    });

    // Find duplicates (more than one transaction with same key)
    const duplicateIds: string[] = [];
    transactionMap.forEach((ids) => {
      if (ids.length > 1) {
        // Keep the first one, mark the rest as duplicates
        duplicateIds.push(...ids.slice(1));
      }
    });

    // Delete duplicates
    if (duplicateIds.length > 0) {
      await supabase.from("transactions").delete().in("id", duplicateIds);
      console.log(`Cleaned up ${duplicateIds.length} duplicate transactions`);
    }
  }, [supabase]);

  const loadTransactions = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Load transactions for a wider range (12 months back and 24 months forward) 
    // to support calendar navigation to any month
    const now = new Date();
    const startDate = format(startOfMonth(subMonths(now, 12)), "yyyy-MM-dd");
    const endDate = format(endOfMonth(addMonths(now, 24)), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error loading transactions:", error);
    } else {
      setTransactions(data || []);
    }
  }, [supabase]);

  const generateMissingRecurringTransactions = useCallback(async (
    template: RecurringTransaction,
    maxDate: Date
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get existing transactions for this template AND for the same category/date combination
    // This prevents duplicates even if there are multiple templates with the same category
    const { data: existingTransactions } = await supabase
      .from("transactions")
      .select("date, category, amount, type")
      .eq("user_id", user.id)
      .eq("recurring_template_id", template.id);

    // Also check for transactions with the same category, date, amount, and type
    // to prevent duplicates from different templates
    const { data: duplicateCheck } = await supabase
      .from("transactions")
      .select("date")
      .eq("user_id", user.id)
      .eq("category", template.category)
      .eq("type", template.type)
      .eq("amount", template.amount);

    const existingDates = new Set(
      existingTransactions?.map((t) => t.date) || []
    );
    
    // Add dates from duplicate check
    duplicateCheck?.forEach((t) => {
      existingDates.add(t.date);
    });

    // Start from the template's start_date or next_occurrence, whichever is later
    let currentDate = new Date(
      template.next_occurrence > template.start_date
        ? template.next_occurrence
        : template.start_date
    );
    const endDate = template.end_date ? new Date(template.end_date) : null;

    const transactionsToCreate = [];
    let iterations = 0;
    const maxIterations = 1000; // Safety limit

    // Generate transactions up to maxDate
    while (iterations < maxIterations && currentDate <= maxDate) {
      // Skip if transaction already exists
      const dateStr = format(currentDate, "yyyy-MM-dd");
      if (!existingDates.has(dateStr)) {
        // Check if we've passed the end date
        if (endDate && currentDate > endDate) break;

        transactionsToCreate.push({
          user_id: user.id,
          type: template.type,
          category: template.category,
          amount: template.amount,
          description: template.description,
          date: dateStr,
          is_recurring: true,
          recurring_template_id: template.id,
        });
      }

      // Calculate next date based on frequency
      switch (template.frequency) {
        case "daily":
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case "weekly":
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case "fortnight":
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case "monthly":
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case "yearly":
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }

      iterations++;
    }

    // Batch insert missing transactions
    if (transactionsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("transactions")
        .insert(transactionsToCreate);

      if (!insertError && transactionsToCreate.length > 0) {
        // Update next_occurrence in the template
        const lastDate = transactionsToCreate[transactionsToCreate.length - 1].date;
        await supabase
          .from("recurring_transactions")
          .update({ next_occurrence: lastDate })
          .eq("id", template.id);
      }
    }
  }, [supabase]);

  const checkAndGenerateRecurringTransactions = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get all active recurring transactions
    const { data: recurringTemplates, error: templatesError } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (templatesError || !recurringTemplates) return;

    const now = new Date();
    const maxFutureDate = addMonths(now, 24); // Generate up to 24 months ahead

    // Check each recurring template and generate missing transactions
    for (const template of recurringTemplates) {
      await generateMissingRecurringTransactions(template, maxFutureDate);
    }

    // Reload transactions after generating
    await loadTransactions();
  }, [supabase, loadTransactions, generateMissingRecurringTransactions]);

  // Load starting budget for the current calendar month
  const loadStartingBudget = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const monthKey = format(startOfMonth(calendarMonth), "yyyy-MM-dd");

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
    } else {
      // If no starting budget exists for this month, calculate from previous month
      const previousMonth = subMonths(calendarMonth, 1);
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
  }, [calendarMonth, supabase]);

  useEffect(() => {
    loadTransactions();
    cleanupDuplicateTransactions();
    checkAndGenerateRecurringTransactions();
    loadStartingBudget();
    
    // Listen for budget updates to regenerate transactions
    const handleBudgetUpdate = () => {
      checkAndGenerateRecurringTransactions();
      loadStartingBudget();
    };
    
    // Listen for recurring transaction deletions to reload transactions
    const handleRecurringTransactionDeleted = () => {
      loadTransactions();
    };
    
    window.addEventListener("budgetUpdated", handleBudgetUpdate);
    window.addEventListener("recurringTransactionDeleted", handleRecurringTransactionDeleted);
    
    return () => {
      window.removeEventListener("budgetUpdated", handleBudgetUpdate);
      window.removeEventListener("recurringTransactionDeleted", handleRecurringTransactionDeleted);
    };
  }, [loadTransactions, cleanupDuplicateTransactions, checkAndGenerateRecurringTransactions, loadStartingBudget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const transactionDate = formData.date;

    // If it's a recurring transaction, create the template first
    let recurringTemplateId: string | null = null;
    if (formData.isRecurring) {
      const { data: recurringData, error: recurringError } = await supabase
        .from("recurring_transactions")
        .insert({
          user_id: user.id,
          type: formData.type,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
          frequency: formData.frequency,
          start_date: transactionDate,
          end_date: formData.endDate || null,
          next_occurrence: transactionDate,
          is_active: true,
        })
        .select()
        .single();

      if (recurringError) {
        console.error("Error creating recurring transaction:", recurringError);
        return;
      }
      recurringTemplateId = recurringData.id;
    }

    // Create the initial transaction
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: formData.type,
      category: formData.category,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: transactionDate,
      is_recurring: formData.isRecurring,
      recurring_template_id: recurringTemplateId,
    });

    if (error) {
      console.error("Error adding transaction:", error);
    } else {
      // Generate future occurrences if it's recurring
      if (formData.isRecurring && recurringTemplateId) {
        await generateRecurringTransactions(recurringTemplateId, transactionDate);
      }

      setIsDialogOpen(false);
      setFormData({
        type: "expense",
        category: "",
        amount: "",
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
        isRecurring: false,
        frequency: "monthly",
        endDate: "",
      });
      await loadTransactions();
      
      // If we added a transaction from the calendar, reopen the date dialog
      if (selectedDate && format(selectedDate, "yyyy-MM-dd") === transactionDate) {
        setIsDateDialogOpen(true);
      }
    }
  };

  const generateRecurringTransactions = async (
    templateId: string,
    startDate: string
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get the recurring template
    const { data: template, error: templateError } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) return;

    // Generate transactions for the next 12 months
    const transactionsToCreate = [];
    let currentDate = new Date(startDate);
    const endDate = template.end_date ? new Date(template.end_date) : null;
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 12); // Generate up to 12 months ahead

    let iterations = 0;
    const maxIterations = 365; // Safety limit

    while (iterations < maxIterations) {
      // Calculate next date based on frequency
      switch (template.frequency) {
        case "daily":
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case "weekly":
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case "fortnight":
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case "monthly":
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case "yearly":
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }

      // Stop if we've reached the end date or max date
      if (endDate && currentDate > endDate) break;
      if (currentDate > maxDate) break;

      transactionsToCreate.push({
        user_id: user.id,
        type: template.type,
        category: template.category,
        amount: template.amount,
        description: template.description,
        date: format(currentDate, "yyyy-MM-dd"),
        is_recurring: true,
        recurring_template_id: templateId,
      });

      iterations++;
    }

    // Batch insert transactions
    if (transactionsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("transactions")
        .insert(transactionsToCreate);

      if (insertError) {
        console.error("Error generating recurring transactions:", insertError);
      } else {
        // Update next_occurrence in the template
        const lastDate = transactionsToCreate[transactionsToCreate.length - 1].date;
        await supabase
          .from("recurring_transactions")
          .update({ next_occurrence: lastDate })
          .eq("id", templateId);
      }
    }
  };

  // Filter transactions for the calendar's selected month for summary cards
  const currentMonthTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.date);
    return (
      transactionDate.getMonth() === calendarMonth.getMonth() &&
      transactionDate.getFullYear() === calendarMonth.getFullYear()
    );
  });

  const totalIncome = currentMonthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const totalExpenses = currentMonthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const balance = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h2 className="text-2xl sm:text-3xl font-bold">Finance Dashboard</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setView("sheets")}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 text-xs sm:text-sm flex-1 sm:flex-initial"
          >
            <ClipboardList className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Create Budget Planner</span>
            <span className="sm:hidden">Budget</span>
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="text-xs sm:text-sm flex-1 sm:flex-initial">
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Starting Budget</CardTitle>
            <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">
                ${startingBudget.toFixed(2)}
              </div>
              <Input
                type="number"
                step="0.01"
                value={startingBudget || ""}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setStartingBudget(value);
                }}
                onBlur={async () => {
                  setIsSavingBudget(true);
                  try {
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (!user) return;

                    const monthKey = format(startOfMonth(calendarMonth), "yyyy-MM-dd");

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
                      // Reload to ensure we have the latest value
                      await loadStartingBudget();
                      // Trigger update in calendar
                      window.dispatchEvent(new CustomEvent("startingBudgetUpdated"));
                    }
                  } finally {
                    setIsSavingBudget(false);
                  }
                }}
                placeholder="0.00"
                className="h-7 sm:h-8 text-xs sm:text-sm"
                disabled={isSavingBudget}
              />
              {isSavingBudget && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">Saving...</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              ${totalIncome.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">
              ${totalExpenses.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Net Balance</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-lg sm:text-2xl font-bold ${
                (startingBudget + balance) >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ${(startingBudget + balance).toFixed(2)}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Starting + Income - Expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button
          variant={view === "calendar" ? "default" : "outline"}
          onClick={() => setView("calendar")}
          className="text-xs sm:text-sm"
        >
          <Calendar className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Calendar View</span>
          <span className="sm:hidden">Calendar</span>
        </Button>
        <Button
          variant={view === "sheets" ? "default" : "outline"}
          onClick={() => setView("sheets")}
          className="text-xs sm:text-sm"
        >
          <Table2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Budget Planner</span>
          <span className="sm:hidden">Budget</span>
        </Button>
      </div>

      {/* Conditional Rendering based on view */}
      {view === "calendar" ? (
        <CashflowCalendar
          transactions={transactions}
          onDateClick={(date) => {
            setSelectedDate(date);
            setIsDateDialogOpen(true);
          }}
          onMonthChange={async (month: Date) => {
            // Update the calendar month state
            setCalendarMonth(month);
            // When calendar month changes, check and generate missing recurring transactions
            await checkAndGenerateRecurringTransactions();
            // Reload starting budget for the new month
            await loadStartingBudget();
          }}
        />
      ) : (
        <BudgetPlanner />
      )}

      <CashflowPrediction />

      <RecurringTransactions />

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your transactions for {format(calendarMonth, "MMMM yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentMonthTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No transactions yet. Add your first transaction!
              </p>
            ) : (
              currentMonthTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{transaction.category}</p>
                      {transaction.is_recurring && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                          Recurring
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {transaction.description || "No description"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.date), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      transaction.type === "income"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}$
                    {parseFloat(transaction.amount.toString()).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Add a new income or expense transaction
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as "income" | "expense" })
                }
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="e.g., Food, Salary, Rent"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) =>
                    setFormData({ ...formData, isRecurring: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isRecurring" className="cursor-pointer">
                  Make this a recurring transaction
                </Label>
              </div>
            </div>
            {formData.isRecurring && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <select
                    id="frequency"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.frequency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        frequency: e.target.value as "daily" | "weekly" | "fortnight" | "monthly" | "yearly",
                      })
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnight">Fortnight (Every 2 weeks)</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    placeholder="Leave empty for no end date"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to continue indefinitely
                  </p>
                </div>
              </>
            )}
            <Button type="submit" className="w-full">
              Add Transaction
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <DateTransactionsDialog
        open={isDateDialogOpen}
        onOpenChange={setIsDateDialogOpen}
        date={selectedDate}
        transactions={transactions}
        onAddTransaction={(date) => {
          setFormData({
            ...formData,
            date: format(date, "yyyy-MM-dd"),
          });
          setIsDialogOpen(true);
        }}
        onTransactionDeleted={async () => {
          await loadTransactions();
        }}
      />
    </div>
  );
}

