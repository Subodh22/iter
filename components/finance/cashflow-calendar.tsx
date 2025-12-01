"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cashflow Calendar</CardTitle>
            <CardDescription>
              {format(currentMonth, "MMMM yyyy")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Income</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Expense</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Net Positive</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
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

              return (
                <button
                  key={day.toString()}
                  onClick={() => onDateClick?.(day)}
                  className={cn(
                    // Choose one of these cell size options (uncomment the one you want):
                    "aspect-square border rounded-lg p-1.5 flex flex-col items-start justify-start transition-colors hover:bg-accent relative min-h-[80px]", // Option A: 80px height
                    // "aspect-square border rounded-lg p-2 flex flex-col items-start justify-start transition-colors hover:bg-accent relative min-h-[90px]", // Option B: 90px height
                    // "aspect-square border rounded-lg p-2 flex flex-col items-start justify-start transition-colors hover:bg-accent relative min-h-[100px]", // Option C: 100px height
                    // "aspect-square border rounded-lg p-2.5 flex flex-col items-start justify-start transition-colors hover:bg-accent relative min-h-[110px]", // Option D: 110px height
                    isToday && "ring-2 ring-primary bg-primary/5",
                    hasTransactions && "border-primary/50"
                  )}
                >
                  <span
                    className={cn(
                      // Choose one of these size options (uncomment the one you want):
                      
                      // Option 1: Medium (16px) - Balanced size
                      "text-base font-bold mb-1 leading-none",
                      
                      // Option 2: Large (18px) - More prominent
                      // "text-lg font-bold mb-1 leading-none",
                      
                      // Option 3: Extra Large (20px) - Very visible
                      // "text-xl font-bold mb-1 leading-none",
                      
                      // Option 4: Very Large (24px) - Maximum visibility
                      // "text-2xl font-bold mb-1 leading-none",
                      
                      // Option 5: Custom size (22px) - Between xl and 2xl
                      // "text-[22px] font-bold mb-1 leading-none",
                      
                      isToday 
                        ? "text-primary" 
                        : "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                   {hasTransactions && (
                     <div className="flex-1 w-full flex flex-col items-start justify-start gap-2 mt-auto">
                       {cashflow.income > 0 && (
                         <div className="flex items-center gap-1.5 text-base text-green-600 font-bold leading-tight">
                           <ArrowUp className="h-5 w-5" />
                           <span>${cashflow.income.toFixed(0)}</span>
                         </div>
                       )}
                       {cashflow.expense > 0 && (
                         <div className="flex items-center gap-1.5 text-base text-red-600 font-bold leading-tight">
                           <ArrowDown className="h-5 w-5" />
                           <span>${cashflow.expense.toFixed(0)}</span>
                         </div>
                       )}
                       {cashflow.net !== 0 && (
                         <div
                           className={cn(
                             "text-base font-bold px-2 py-1.5 rounded leading-tight",
                             cashflow.net > 0
                               ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                               : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                           )}
                         >
                           {cashflow.net > 0 ? "+" : ""}
                           {cashflow.net.toFixed(0)}
                         </div>
                       )}
                     </div>
                   )}
                </button>
              );
            })}
          </div>

          {/* Monthly Summary */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="text-lg font-bold text-green-600">
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
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-bold text-red-600">
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
                <p className="text-xs text-muted-foreground">Net Cashflow</p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    daysInMonth.reduce(
                      (sum, day) => sum + getDayCashflow(day).net,
                      0
                    ) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  )}
                >
                  $
                  {daysInMonth
                    .reduce((sum, day) => sum + getDayCashflow(day).net, 0)
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

