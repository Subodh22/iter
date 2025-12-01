"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Check } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";

interface Habit {
  id: string;
  name: string;
  description: string;
  color: string;
  frequency: string;
  target_count: number;
}

interface HabitLog {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  count: number;
}

export default function HabitsDashboard() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    frequency: "daily",
    target_count: 1,
  });
  const supabase = createClient();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const loadHabits = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading habits:", error);
    } else {
      setHabits(data || []);
    }
  }, [supabase]);

  const loadHabitLogs = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const startDate = format(weekStart, "yyyy-MM-dd");
    const endDate = format(weekEnd, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) {
      console.error("Error loading habit logs:", error);
    } else {
      setHabitLogs(data || []);
    }
  }, [supabase, weekStart, weekEnd]);

  useEffect(() => {
    loadHabits();
    loadHabitLogs();
  }, [loadHabits, loadHabitLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("habits").insert({
      user_id: user.id,
      name: formData.name,
      description: formData.description,
      color: formData.color,
      frequency: formData.frequency,
      target_count: formData.target_count,
    });

    if (error) {
      console.error("Error adding habit:", error);
    } else {
      setIsDialogOpen(false);
      setFormData({
        name: "",
        description: "",
        color: "#3b82f6",
        frequency: "daily",
        target_count: 1,
      });
      loadHabits();
    }
  };

  const toggleHabitLog = async (habitId: string, date: Date) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const dateStr = format(date, "yyyy-MM-dd");
    const existingLog = habitLogs.find(
      (log) => log.habit_id === habitId && log.date === dateStr
    );

    if (existingLog) {
      const { error } = await supabase
        .from("habit_logs")
        .update({ completed: !existingLog.completed })
        .eq("id", existingLog.id);

      if (!error) {
        loadHabitLogs();
      }
    } else {
      const { error } = await supabase.from("habit_logs").insert({
        habit_id: habitId,
        user_id: user.id,
        date: dateStr,
        completed: true,
        count: 1,
      });

      if (!error) {
        loadHabitLogs();
      }
    }
  };

  const isHabitCompleted = (habitId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return habitLogs.some(
      (log) =>
        log.habit_id === habitId &&
        log.date === dateStr &&
        log.completed === true
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Habits Dashboard</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Habit
        </Button>
      </div>

      {habits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No habits yet. Create your first habit to start tracking!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {habits.map((habit) => (
            <Card key={habit.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                  {habit.name}
                </CardTitle>
                {habit.description && (
                  <CardDescription>{habit.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const completed = isHabitCompleted(habit.id, day);
                    return (
                      <button
                        key={day.toString()}
                        onClick={() => toggleHabitLog(habit.id, day)}
                        className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-colors ${
                          completed
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {completed && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-center text-muted-foreground">
                  {weekDays.map((day) => (
                    <div key={day.toString()}>{format(day, "EEE")}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Habit</DialogTitle>
            <DialogDescription>
              Create a new habit to track daily
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Habit Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Exercise, Read, Meditate"
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
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="h-10"
              />
            </div>
            <Button type="submit" className="w-full">
              Add Habit
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

