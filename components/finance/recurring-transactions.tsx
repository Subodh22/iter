"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, addDays, addWeeks, addMonths, addYears, isBefore, parseISO } from "date-fns";
import { Repeat, Trash2, Pause, Play } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RecurringTransaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  frequency: "daily" | "weekly" | "fortnight" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date?: string;
  next_occurrence: string;
  is_active: boolean;
}

export default function RecurringTransactions() {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const loadRecurringTransactions = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading recurring transactions:", error);
    } else {
      setRecurringTransactions(data || []);
    }
  }, [supabase]);

  useEffect(() => {
    loadRecurringTransactions();
  }, [loadRecurringTransactions]);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("recurring_transactions")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      console.error("Error updating recurring transaction:", error);
    } else {
      loadRecurringTransactions();
    }
  };

  const deleteRecurring = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recurring transaction? This will also delete all transactions generated from this template.")) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // First, delete all transactions associated with this recurring template
    const { error: deleteTransactionsError } = await supabase
      .from("transactions")
      .delete()
      .eq("recurring_template_id", id)
      .eq("user_id", user.id);

    if (deleteTransactionsError) {
      console.error("Error deleting associated transactions:", deleteTransactionsError);
      alert("Failed to delete associated transactions. Please try again.");
      return;
    }

    // Then delete the recurring transaction template
    const { error } = await supabase
      .from("recurring_transactions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting recurring transaction:", error);
      alert("Failed to delete recurring transaction. Please try again.");
    } else {
      loadRecurringTransactions();
      // Trigger a custom event to notify the finance dashboard to reload transactions
      window.dispatchEvent(new CustomEvent("recurringTransactionDeleted"));
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "Daily";
      case "weekly":
        return "Weekly";
      case "fortnight":
        return "Fortnight";
      case "monthly":
        return "Monthly";
      case "yearly":
        return "Yearly";
      default:
        return frequency;
    }
  };

  // Calculate the next occurrence date from today based on frequency and start date pattern
  const calculateNextOccurrence = (startDate: string, frequency: string, endDate?: string): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day
    
    const start = parseISO(startDate);
    start.setHours(0, 0, 0, 0);
    
    // If there's an end date and it's in the past, return end date
    if (endDate) {
      const end = parseISO(endDate);
      end.setHours(0, 0, 0, 0);
      if (isBefore(end, today)) {
        return end;
      }
    }

    // If start date is in the future, return start date
    if (isBefore(today, start)) {
      return start;
    }

    // Calculate next occurrence based on frequency from the start date pattern
    let nextDate = new Date(start);
    
    // Keep adding intervals until we get a date >= today
    while (isBefore(nextDate, today)) {
      switch (frequency) {
        case "daily":
          nextDate = addDays(nextDate, 1);
          break;
        case "weekly":
          nextDate = addWeeks(nextDate, 1);
          break;
        case "fortnight":
          nextDate = addWeeks(nextDate, 2);
          break;
        case "monthly":
          nextDate = addMonths(nextDate, 1);
          break;
        case "yearly":
          nextDate = addYears(nextDate, 1);
          break;
        default:
          return start;
      }
      
      // Safety check to prevent infinite loop
      if (nextDate.getTime() > today.getTime() + 365 * 24 * 60 * 60 * 1000) {
        return start;
      }
    }

    // If there's an end date and calculated date is after it, return end date
    if (endDate) {
      const end = parseISO(endDate);
      end.setHours(0, 0, 0, 0);
      if (isBefore(end, nextDate)) {
        return end;
      }
    }

    return nextDate;
  };

  if (recurringTransactions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-5 w-5" />
          Recurring Transactions
        </CardTitle>
        <CardDescription>
          Manage your recurring income and expenses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recurringTransactions.map((rt) => (
            <div
              key={rt.id}
              className={`flex items-center justify-between p-4 border rounded-lg ${
                !rt.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${
                      rt.type === "income" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {rt.category}
                  </span>
                  {!rt.is_active && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded">
                      Paused
                    </span>
                  )}
                </div>
                {rt.description && (
                  <p className="text-sm text-muted-foreground">{rt.description}</p>
                )}
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>
                    {rt.type === "income" ? "+" : "-"}${rt.amount.toFixed(2)}
                  </span>
                  <span>•</span>
                  <span>{getFrequencyLabel(rt.frequency)}</span>
                  <span>•</span>
                  <span>Next: {format(calculateNextOccurrence(rt.start_date, rt.frequency, rt.end_date), "MMM dd, yyyy")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleActive(rt.id, rt.is_active)}
                  title={rt.is_active ? "Pause" : "Resume"}
                >
                  {rt.is_active ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteRecurring(rt.id)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

