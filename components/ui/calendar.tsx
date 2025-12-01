"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  className?: string;
}

export function Calendar({
  selected,
  onSelect,
  month: controlledMonth,
  onMonthChange,
  className,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState(new Date());
  const month = controlledMonth || internalMonth;

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfMonth = getDay(monthStart);
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const handleMonthChange = (newMonth: Date) => {
    if (controlledMonth) {
      onMonthChange?.(newMonth);
    } else {
      setInternalMonth(newMonth);
    }
  };

  const previousMonth = () => {
    handleMonthChange(subMonths(month, 1));
  };

  const nextMonth = () => {
    handleMonthChange(addMonths(month, 1));
  };

  const handleDateClick = (day: Date) => {
    onSelect?.(day);
  };

  return (
    <div className={cn("p-3", className)}>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={previousMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold text-sm">
          {format(month, "MMMM yyyy")}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={nextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {daysInMonth.map((day) => {
          const isSelected = selected && isSameDay(day, selected);
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toString()}
              onClick={() => handleDateClick(day)}
              className={cn(
                "aspect-square text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                isToday && !isSelected && "bg-accent font-semibold",
                !isSameMonth(day, month) && "text-muted-foreground opacity-50"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

