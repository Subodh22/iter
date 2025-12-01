"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Target, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  target_value: number;
  current_value: number;
  unit: string;
  deadline: string | null;
  status: "active" | "completed" | "paused" | "cancelled";
}

export default function GoalsDashboard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    target_value: "",
    current_value: "0",
    unit: "",
    deadline: "",
  });
  const supabase = createClient();

  const loadGoals = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading goals:", error);
    } else {
      setGoals(data || []);
    }
  }, [supabase]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("goals").insert({
      user_id: user.id,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      target_value: formData.target_value ? parseFloat(formData.target_value) : null,
      current_value: parseFloat(formData.current_value) || 0,
      unit: formData.unit,
      deadline: formData.deadline || null,
      status: "active",
    });

    if (error) {
      console.error("Error adding goal:", error);
    } else {
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "",
        target_value: "",
        current_value: "0",
        unit: "",
        deadline: "",
      });
      loadGoals();
    }
  };

  const updateProgress = async (goalId: string, newValue: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const status =
      newValue >= goal.target_value ? "completed" : goal.status;

    const { error } = await supabase
      .from("goals")
      .update({ current_value: newValue, status })
      .eq("id", goalId);

    if (!error) {
      loadGoals();
    }
  };

  const getProgressPercentage = (goal: Goal) => {
    if (!goal.target_value || goal.target_value === 0) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Goals Dashboard</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No goals yet. Create your first goal to start tracking progress!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const progress = getProgressPercentage(goal);
            const isCompleted = goal.status === "completed";

            return (
              <Card key={goal.id} className={isCompleted ? "opacity-75" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Target className="h-5 w-5" />
                      )}
                      {goal.title}
                    </span>
                  </CardTitle>
                  {goal.description && (
                    <CardDescription>{goal.description}</CardDescription>
                  )}
                  {goal.category && (
                    <span className="text-xs text-muted-foreground">
                      {goal.category}
                    </span>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {goal.target_value && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>
                          {goal.current_value} / {goal.target_value}{" "}
                          {goal.unit}
                        </span>
                        <span className="font-medium">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isCompleted ? "bg-green-600" : "bg-primary"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {goal.deadline && (
                    <p className="text-xs text-muted-foreground">
                      Deadline: {format(new Date(goal.deadline), "MMM dd, yyyy")}
                    </p>
                  )}
                  {!isCompleted && goal.target_value && (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Update progress"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const value = parseFloat(e.currentTarget.value);
                            if (!isNaN(value)) {
                              updateProgress(goal.id, value);
                              e.currentTarget.value = "";
                            }
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={(e) => {
                          const input = e.currentTarget
                            .previousElementSibling as HTMLInputElement;
                          const value = parseFloat(input.value);
                          if (!isNaN(value)) {
                            updateProgress(goal.id, value);
                            input.value = "";
                          }
                        }}
                      >
                        Update
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        goal.status === "completed"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : goal.status === "active"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : goal.status === "paused"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                      }`}
                    >
                      {goal.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Goal</DialogTitle>
            <DialogDescription>
              Create a new goal to track your progress
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Goal Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Save $5000, Read 20 books"
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
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="e.g., Finance, Health, Learning"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_value">Target Value</Label>
                <Input
                  id="target_value"
                  type="number"
                  step="0.01"
                  value={formData.target_value}
                  onChange={(e) =>
                    setFormData({ ...formData, target_value: e.target.value })
                  }
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  placeholder="e.g., $, books, kg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline (Optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
              />
            </div>
            <Button type="submit" className="w-full">
              Add Goal
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

