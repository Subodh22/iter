"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowUp, ArrowDown, Plus } from "lucide-react";

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
}

export default function DateTransactionsDialog({
  open,
  onOpenChange,
  date,
  transactions,
  onAddTransaction,
}: DateTransactionsDialogProps) {
  if (!date) return null;

  const dateKey = format(date, "yyyy-MM-dd");
  const dayTransactions = transactions.filter((t) => t.date === dateKey);

  const dayIncome = dayTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const dayExpense = dayTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const dayNet = dayIncome - dayExpense;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transactions for {format(date, "MMMM dd, yyyy")}</DialogTitle>
          <DialogDescription>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-semibold">
                  Income: ${dayIncome.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-red-600" />
                <span className="text-red-600 font-semibold">
                  Expenses: ${dayExpense.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
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
        <div className="flex justify-end mb-4">
          <Button
            onClick={() => {
              if (date && onAddTransaction) {
                onAddTransaction(date);
                onOpenChange(false);
              }
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>
        <div className="space-y-2 mt-4">
          {dayTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transactions on this date
            </p>
          ) : (
            dayTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      transaction.type === "income"
                        ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"
                        : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.category}</p>
                    {transaction.description && (
                      <p className="text-sm text-muted-foreground">
                        {transaction.description}
                      </p>
                    )}
                  </div>
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
      </DialogContent>
    </Dialog>
  );
}

