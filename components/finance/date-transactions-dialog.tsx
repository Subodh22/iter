"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface DateTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  transactions: Transaction[];
  onAddTransaction?: (date: Date) => void;
  onTransactionDeleted?: () => void;
}

export default function DateTransactionsDialog({
  open,
  onOpenChange,
  date,
  transactions,
  onAddTransaction,
  onTransactionDeleted,
}: DateTransactionsDialogProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  if (!date) return null;

  const dateKey = format(date, "yyyy-MM-dd");
  const dayTransactions = transactions.filter((t) => t.date === dateKey);

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    setDeletingId(transactionId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting transaction:", error);
        alert("Failed to delete transaction. Please try again.");
      } else {
        // Notify parent to reload transactions
        onTransactionDeleted?.();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const dayIncome = dayTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const dayExpense = dayTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const dayNet = dayIncome - dayExpense;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl w-[95vw] sm:w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0 pb-2 sm:pb-4">
          <DialogTitle className="text-base sm:text-lg">Transactions for {format(date, "MMMM dd, yyyy")}</DialogTitle>
          <DialogDescription>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                <span className="text-green-600 font-semibold">
                  Income: ${dayIncome.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 flex-shrink-0" />
                <span className="text-red-600 font-semibold">
                  Expenses: ${dayExpense.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className={`font-semibold ${
                    dayNet >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  Net: ${dayNet >= 0 ? "+" : ""}${dayNet.toFixed(2)}
                </span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end mb-2 sm:mb-4 flex-shrink-0">
          <Button
            onClick={() => {
              if (date && onAddTransaction) {
                onAddTransaction(date);
                onOpenChange(false);
              }
            }}
            className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10"
            size="sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
        <div className="space-y-1.5 sm:space-y-2 flex-1 overflow-y-auto min-h-0">
          {dayTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
              No transactions on this date
            </p>
          ) : (
            dayTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-2 sm:p-3 border rounded-lg hover:bg-accent transition-colors gap-2 sm:gap-3"
              >
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div
                    className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                      transaction.type === "income"
                        ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
                        : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm sm:text-base">{transaction.category}</p>
                    {transaction.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {transaction.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                  <div
                    className={`text-sm sm:text-lg font-bold ${
                      transaction.type === "income"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}$
                    {parseFloat(transaction.amount.toString()).toFixed(2)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(transaction.id)}
                    disabled={deletingId === transaction.id}
                    className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

