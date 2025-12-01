"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type Frequency = "weekly" | "fortnight" | "monthly" | "quarterly" | "annually";

interface BudgetItem {
  id: string;
  category: string;
  amount: number;
  frequency: Frequency;
  dueDate?: string; // Date when expense will be deducted (YYYY-MM-DD format)
}

interface BudgetCategory {
  name: string;
  items: BudgetItem[];
  color: string;
}

const BUDGET_CATEGORIES: BudgetCategory[] = [
  {
    name: "Income",
    color: "bg-blue-600",
    items: [
      { id: "income-1", category: "Your take-home pay", amount: 0, frequency: "monthly" },
      { id: "income-2", category: "Your partner's take-home pay", amount: 0, frequency: "weekly" },
      { id: "income-3", category: "Bonuses / overtime", amount: 0, frequency: "annually" },
      { id: "income-4", category: "Income from savings and investments", amount: 0, frequency: "monthly" },
      { id: "income-5", category: "Centrelink benefits", amount: 0, frequency: "fortnight" },
      { id: "income-6", category: "Family benefit payments", amount: 0, frequency: "fortnight" },
      { id: "income-7", category: "Child support received", amount: 0, frequency: "monthly" },
      { id: "income-8", category: "Other (Income)", amount: 0, frequency: "monthly" },
    ],
  },
  {
    name: "Home & utilities",
    color: "bg-blue-500",
    items: [
      { id: "home-1", category: "Mortgage & rent", amount: 0, frequency: "monthly" },
      { id: "home-2", category: "Body corporate fees", amount: 0, frequency: "quarterly" },
      { id: "home-3", category: "Council rates", amount: 0, frequency: "quarterly" },
      { id: "home-4", category: "Furniture & appliances", amount: 0, frequency: "annually" },
      { id: "home-5", category: "Renovations & maintenance", amount: 0, frequency: "annually" },
      { id: "home-6", category: "Electricity", amount: 0, frequency: "monthly" },
      { id: "home-7", category: "Gas", amount: 0, frequency: "monthly" },
      { id: "home-8", category: "Water", amount: 0, frequency: "monthly" },
      { id: "home-9", category: "Internet", amount: 0, frequency: "monthly" },
      { id: "home-10", category: "Pay TV", amount: 0, frequency: "monthly" },
      { id: "home-11", category: "Home phone", amount: 0, frequency: "monthly" },
      { id: "home-12", category: "Mobile", amount: 0, frequency: "monthly" },
      { id: "home-13", category: "Other (Home & utilities)", amount: 0, frequency: "fortnight" },
    ],
  },
  {
    name: "Groceries",
    color: "bg-blue-400",
    items: [
      { id: "grocery-1", category: "Supermarket", amount: 0, frequency: "monthly" },
      { id: "grocery-2", category: "Butcher", amount: 0, frequency: "weekly" },
      { id: "grocery-3", category: "Fruit & veg market", amount: 0, frequency: "weekly" },
      { id: "grocery-4", category: "Fish shop", amount: 0, frequency: "weekly" },
      { id: "grocery-5", category: "Deli & bakery", amount: 0, frequency: "weekly" },
      { id: "grocery-6", category: "Pet food", amount: 0, frequency: "weekly" },
      { id: "grocery-7", category: "Other", amount: 0, frequency: "monthly" },
    ],
  },
  {
    name: "Personal & medical",
    color: "bg-blue-400",
    items: [
      { id: "personal-1", category: "Cosmetics & toiletries", amount: 0, frequency: "monthly" },
      { id: "personal-2", category: "Hair & beauty", amount: 0, frequency: "monthly" },
      { id: "personal-3", category: "Products", amount: 0, frequency: "monthly" },
      { id: "personal-4", category: "Glasses & eye care", amount: 0, frequency: "monthly" },
      { id: "personal-5", category: "Dental", amount: 0, frequency: "monthly" },
      { id: "personal-6", category: "Doctors & medical", amount: 0, frequency: "monthly" },
      { id: "personal-7", category: "Chatgpt", amount: 0, frequency: "monthly" },
      { id: "personal-8", category: "Clothing & shoes", amount: 0, frequency: "monthly" },
      { id: "personal-9", category: "Jewellery & accessories", amount: 0, frequency: "monthly" },
      { id: "personal-10", category: "Cursor", amount: 0, frequency: "monthly" },
      { id: "personal-11", category: "Sports & gym", amount: 0, frequency: "monthly" },
      { id: "personal-12", category: "Education", amount: 0, frequency: "monthly" },
      { id: "personal-13", category: "Pet care & vet", amount: 0, frequency: "monthly" },
      { id: "personal-14", category: "Other", amount: 0, frequency: "monthly" },
    ],
  },
  {
    name: "Entertainment & eating-out",
    color: "bg-blue-400",
    items: [
      { id: "entertainment-1", category: "Coffee & tea", amount: 0, frequency: "weekly" },
      { id: "entertainment-2", category: "Lunches bought", amount: 0, frequency: "weekly" },
      { id: "entertainment-3", category: "Take-away & snacks", amount: 0, frequency: "weekly" },
      { id: "entertainment-4", category: "Cigarettes", amount: 0, frequency: "weekly" },
      { id: "entertainment-5", category: "Drinks & alcohol", amount: 0, frequency: "weekly" },
      { id: "entertainment-6", category: "Bars & clubs", amount: 0, frequency: "monthly" },
      { id: "entertainment-7", category: "Restaurants", amount: 0, frequency: "monthly" },
      { id: "entertainment-8", category: "Books", amount: 0, frequency: "monthly" },
      { id: "entertainment-9", category: "Newspapers & magazines", amount: 0, frequency: "monthly" },
      { id: "entertainment-10", category: "Movies & music", amount: 0, frequency: "monthly" },
      { id: "entertainment-11", category: "Holidays", amount: 0, frequency: "annually" },
      { id: "entertainment-12", category: "Celebrations & gifts", amount: 0, frequency: "monthly" },
      { id: "entertainment-13", category: "Other", amount: 0, frequency: "monthly" },
    ],
  },
  {
    name: "Insurance & financial",
    color: "bg-blue-600",
    items: [
      { id: "insurance-1", category: "Car insurance", amount: 0, frequency: "annually" },
      { id: "insurance-2", category: "Loan Payments", amount: 0, frequency: "monthly" },
      { id: "insurance-3", category: "At Work", amount: 0, frequency: "monthly" },
      { id: "insurance-4", category: "Health insurance", amount: 0, frequency: "monthly" },
      { id: "insurance-5", category: "Car loan", amount: 0, frequency: "monthly" },
      { id: "insurance-6", category: "Credit card interest", amount: 0, frequency: "monthly" },
      { id: "insurance-7", category: "Other loans", amount: 0, frequency: "monthly" },
      { id: "insurance-8", category: "School tuitions", amount: 0, frequency: "monthly" },
      { id: "insurance-9", category: "Savings", amount: 0, frequency: "monthly" },
      { id: "insurance-10", category: "Investments & super contributions", amount: 0, frequency: "monthly" },
      { id: "insurance-11", category: "Charity donations", amount: 0, frequency: "monthly" },
      { id: "insurance-12", category: "Other", amount: 0, frequency: "monthly" },
    ],
  },
  {
    name: "Transport & auto",
    color: "bg-blue-400",
    items: [
      { id: "transport-1", category: "Bus & train & ferry", amount: 0, frequency: "monthly" },
      { id: "transport-2", category: "Petrol", amount: 0, frequency: "weekly" },
      { id: "transport-3", category: "Road tolls & parking", amount: 0, frequency: "weekly" },
      { id: "transport-4", category: "Rego & licence", amount: 0, frequency: "annually" },
      { id: "transport-5", category: "Repairs & maintenance", amount: 0, frequency: "annually" },
      { id: "transport-6", category: "Fines", amount: 0, frequency: "monthly" },
      { id: "transport-7", category: "Airfares", amount: 0, frequency: "annually" },
      { id: "transport-8", category: "Other", amount: 0, frequency: "monthly" },
    ],
  },
  {
    name: "Children",
    color: "bg-blue-400",
    items: [
      { id: "children-1", category: "Baby products", amount: 0, frequency: "monthly" },
      { id: "children-2", category: "Toys", amount: 0, frequency: "monthly" },
      { id: "children-3", category: "Babysitting", amount: 0, frequency: "monthly" },
      { id: "children-4", category: "Childcare", amount: 0, frequency: "monthly" },
      { id: "children-5", category: "Sports & activities", amount: 0, frequency: "monthly" },
      { id: "children-6", category: "School fees", amount: 0, frequency: "monthly" },
      { id: "children-7", category: "Excursions", amount: 0, frequency: "monthly" },
      { id: "children-8", category: "School uniforms", amount: 0, frequency: "monthly" },
      { id: "children-9", category: "Other school needs", amount: 0, frequency: "monthly" },
      { id: "children-10", category: "Child support payment", amount: 0, frequency: "monthly" },
      { id: "children-11", category: "Other", amount: 0, frequency: "monthly" },
    ],
  },
];

export default function BudgetPlanner() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [budgetData, setBudgetData] = useState<BudgetCategory[]>(BUDGET_CATEGORIES);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startingBudget, setStartingBudget] = useState<number>(0);
  const supabase = createClient();

  const loadBudgetData = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Load starting budget from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("starting_budget")
        .eq("id", user.id)
        .single();

      if (profile?.starting_budget) {
        setStartingBudget(parseFloat(profile.starting_budget.toString()) || 0);
      }

      const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      // Load recurring transactions for this month
      const { data: recurringTransactions, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_date", monthStart)
        .lte("start_date", monthEnd);

      if (error) {
        console.error("Error loading budget data:", error);
        setIsLoading(false);
        return;
      }

      // Populate budget data with existing transactions
      const updatedBudgetData = BUDGET_CATEGORIES.map((category) => ({
        ...category,
        items: category.items.map((item) => {
          // Find matching recurring transaction
          const matchingTransaction = recurringTransactions?.find(
            (rt) => rt.category === item.category
          );

          if (matchingTransaction) {
            // Convert frequency back to original format
            let frequency: Frequency = "monthly";
            let amount = matchingTransaction.amount;

            switch (matchingTransaction.frequency) {
              case "weekly":
                frequency = "weekly";
                break;
              case "fortnight":
                frequency = "fortnight";
                break;
              case "monthly":
                frequency = "monthly";
                break;
              case "yearly":
                frequency = "annually";
                break;
            }

            // If it was quarterly, we need to detect it (amount * 3)
            // This is a heuristic - we'll check if amount * 3 matches a common quarterly pattern
            return {
              ...item,
              amount: parseFloat(amount.toString()),
              frequency,
              dueDate: matchingTransaction.start_date || matchingTransaction.next_occurrence,
            };
          }
          return item;
        }),
      }));

      setBudgetData(updatedBudgetData);
    } catch (error) {
      console.error("Error loading budget:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, supabase]);

  // Load existing budget data when month changes
  useEffect(() => {
    // Reset to default first
    setBudgetData(BUDGET_CATEGORIES);
    loadBudgetData();
  }, [currentMonth, loadBudgetData]);

  // Convert frequency to monthly amount
  const convertToMonthly = (amount: number, frequency: Frequency): number => {
    switch (frequency) {
      case "weekly":
        return amount * 4.33; // Average weeks per month
      case "fortnight":
        return amount * 2.17; // Average fortnights per month
      case "monthly":
        return amount;
      case "quarterly":
        return amount / 3;
      case "annually":
        return amount / 12;
      default:
        return amount;
    }
  };

  // Calculate category total
  const getCategoryTotal = useCallback((items: BudgetItem[]): number => {
    return items.reduce((sum, item) => {
      const monthlyAmount = convertToMonthly(item.amount, item.frequency);
      return sum + monthlyAmount;
    }, 0);
  }, []);

  // Calculate overall totals
  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;

    budgetData.forEach((category) => {
      const categoryTotal = getCategoryTotal(category.items);
      if (category.name === "Income") {
        totalIncome += categoryTotal;
      } else {
        totalExpenses += categoryTotal;
      }
    });

    return {
      income: totalIncome,
      expenses: totalExpenses,
      balance: totalIncome - totalExpenses,
    };
  }, [budgetData, getCategoryTotal]);

  const updateBudgetItem = (
    categoryIndex: number,
    itemIndex: number,
    field: "amount" | "frequency" | "dueDate",
    value: number | Frequency | string | undefined
  ) => {
    const newBudgetData = [...budgetData];
    const item = newBudgetData[categoryIndex].items[itemIndex];
    
    // Type-safe assignment based on field type
    if (field === "amount") {
      item.amount = value as number;
    } else if (field === "frequency") {
      item.frequency = value as Frequency;
    } else if (field === "dueDate") {
      item.dueDate = value as string | undefined;
    }
    
    setBudgetData(newBudgetData);
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const saveBudget = async () => {
    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Save budget items as recurring transactions
      const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      // Get all existing recurring transactions that match budget categories
      const { data: allExistingTransactions } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", user.id)
        .like("description", "Budget:%");

      // Create a map of category to existing transaction
      // If there are duplicates, keep the most recent one
      const existingByCategory = new Map<string, any>();
      const duplicateTemplateIds: string[] = [];
      
      if (allExistingTransactions) {
        allExistingTransactions.forEach((t) => {
          // Extract category from description (format: "Budget: Category Name")
          const category = t.description.replace("Budget: ", "");
          const existing = existingByCategory.get(category);
          
          if (existing) {
            // Compare created_at dates, keep the newer one
            const existingDate = new Date(existing.created_at);
            const currentDate = new Date(t.created_at);
            
            if (currentDate > existingDate) {
              // Current is newer, mark old one for deletion
              duplicateTemplateIds.push(existing.id);
              existingByCategory.set(category, t);
            } else {
              // Existing is newer or same, mark current for deletion
              duplicateTemplateIds.push(t.id);
            }
          } else {
            existingByCategory.set(category, t);
          }
        });
      }

      // Delete duplicate recurring transaction templates
      if (duplicateTemplateIds.length > 0) {
        await supabase
          .from("recurring_transactions")
          .delete()
          .in("id", duplicateTemplateIds);
      }

      // Prepare transactions to create/update
      const transactionsToCreate = [];
      const transactionsToUpdate = [];
      const categoriesToKeep = new Set<string>();

      for (const category of budgetData) {
        for (const item of category.items) {
          if (item.amount > 0) {
            const type = category.name === "Income" ? "income" : "expense";
            const frequencyMap: Record<Frequency, string> = {
              weekly: "weekly",
              fortnight: "fortnight",
              monthly: "monthly",
              quarterly: "monthly", // Convert quarterly to monthly with adjusted amount
              annually: "yearly",
            };

            let amount = item.amount;
            let frequency = frequencyMap[item.frequency];

            // Adjust amount for quarterly
            if (item.frequency === "quarterly") {
              amount = item.amount / 3;
            }

            // Use dueDate if available, otherwise use monthStart
            const transactionDate = item.dueDate || monthStart;
            
            const transactionData = {
              type,
              category: item.category,
              amount,
              description: `Budget: ${item.category}`,
              frequency,
              start_date: transactionDate,
              next_occurrence: transactionDate,
              is_active: true,
            };

            // Check if this category already exists
            const existing = existingByCategory.get(item.category);
            if (existing) {
              // Store old amount for deletion
              const oldAmount = existing.amount;
              const oldType = existing.type;
              
              // Update existing transaction
              transactionsToUpdate.push({
                id: existing.id,
                oldAmount: oldAmount, // Store old amount to delete old transactions
                oldType: oldType, // Store old type
                ...transactionData,
              });
              categoriesToKeep.add(item.category);
            } else {
              // Create new transaction
              transactionsToCreate.push({
                user_id: user.id,
                ...transactionData,
              });
              categoriesToKeep.add(item.category);
            }
          }
        }
      }

      // Update existing transactions
      for (const transaction of transactionsToUpdate) {
        const { id, oldAmount, oldType, ...updateData } = transaction;
        
        // Delete all existing transactions generated from this template
        // This ensures old transactions are removed when the budget is updated
        const { error: deleteError1 } = await supabase
          .from("transactions")
          .delete()
          .eq("user_id", user.id)
          .eq("recurring_template_id", id);
        
        if (deleteError1) {
          console.error("Error deleting old transactions by template ID:", deleteError1);
        }
        
        // Also delete transactions with the same category, type, and old amount
        // This handles cases where the template was recreated or changed
        if (oldAmount !== undefined && oldType) {
          const { error: deleteError2 } = await supabase
            .from("transactions")
            .delete()
            .eq("user_id", user.id)
            .eq("category", updateData.category)
            .eq("type", oldType)
            .eq("amount", oldAmount)
            .like("description", `Budget: ${updateData.category}`);
          
          if (deleteError2) {
            console.error("Error deleting old transactions by amount:", deleteError2);
          }
        }
        
        // Reset next_occurrence to start_date so transactions will be regenerated from the beginning
        updateData.next_occurrence = updateData.start_date;
        
        // Update the recurring transaction template
        const { error } = await supabase
          .from("recurring_transactions")
          .update(updateData)
          .eq("id", id);
        if (error) throw error;
      }

      // Create new transactions
      if (transactionsToCreate.length > 0) {
        const { error } = await supabase.from("recurring_transactions").insert(transactionsToCreate);
        if (error) throw error;
      }

      // Delete any budget transactions that are no longer in the budget
      // (categories that were removed or set to 0)
      if (allExistingTransactions) {
        const idsToDelete = allExistingTransactions
          .filter((t) => {
            const category = t.description.replace("Budget: ", "");
            return !categoriesToKeep.has(category);
          })
          .map((t) => t.id);

        if (idsToDelete.length > 0) {
          await supabase
            .from("recurring_transactions")
            .delete()
            .in("id", idsToDelete);
        }
      }

      // After updating templates, regenerate transactions
      // This will create new transactions with updated amounts/dates
      // We need to trigger the transaction generation from the finance dashboard
      // For now, we'll reload the page to trigger regeneration
      // In a production app, you might want to call the generation function directly
      
      // Delete old transactions for newly created templates too
      if (transactionsToCreate.length > 0) {
        // Get the IDs of the newly created templates
        const { data: newTemplates } = await supabase
          .from("recurring_transactions")
          .select("id, category")
          .eq("user_id", user.id)
          .like("description", "Budget:%")
          .in("category", transactionsToCreate.map(t => t.category));
        
        // For each new template, check if there are old transactions with the same category
        // and delete them (in case there were old templates with the same category)
        if (newTemplates) {
          for (const template of newTemplates) {
            // Find and delete old transactions with same category, type, and amount
            const matchingCreate = transactionsToCreate.find(t => t.category === template.category);
            if (matchingCreate) {
              await supabase
                .from("transactions")
                .delete()
                .eq("user_id", user.id)
                .eq("category", template.category)
                .eq("type", matchingCreate.type)
                .eq("amount", matchingCreate.amount)
                .is("recurring_template_id", null); // Delete orphaned transactions
            }
          }
        }
      }

      // Save starting budget to profile
      await supabase
        .from("profiles")
        .update({ starting_budget: startingBudget })
        .eq("id", user.id);

      alert("Budget saved successfully! Old transactions have been removed and new ones will be generated.");
      
      // Reload budget data to reflect changes
      await loadBudgetData();
      
      // Trigger a custom event to notify the finance dashboard to regenerate transactions
      window.dispatchEvent(new CustomEvent("budgetUpdated"));
    } catch (error) {
      console.error("Error saving budget:", error);
      alert("Error saving budget. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Budget Planner</CardTitle>
            <CardDescription>{format(currentMonth, "MMMM yyyy")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="view-select" className="text-sm">View:</Label>
              <select
                id="view-select"
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value="monthly"
              >
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  selected={currentMonth}
                  onSelect={(date) => {
                    if (date) {
                      setCurrentMonth(date);
                    }
                  }}
                  month={currentMonth}
                  onMonthChange={(month) => setCurrentMonth(month)}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={saveBudget} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Budget"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading budget data...</div>
        ) : (
          <div className="space-y-6">
          {budgetData.map((category, categoryIndex) => {
            const categoryTotal = getCategoryTotal(category.items);
            const isIncome = category.name === "Income";

            return (
              <div key={category.name} className="space-y-2">
                <div
                  className={cn(
                    "flex items-center justify-between px-4 py-2 rounded-t-lg text-white font-bold",
                    category.color
                  )}
                >
                  <span>{category.name}</span>
                  <span>
                    {isIncome ? "+" : "-"}${Math.abs(categoryTotal).toFixed(2)}
                  </span>
                </div>
                <div className="border rounded-b-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 p-2 bg-muted/50 font-medium text-sm">
                    <div className="col-span-4">Category</div>
                    <div className="col-span-2 text-right">$</div>
                    <div className="col-span-2">Frequency</div>
                    <div className="col-span-2">Due Date</div>
                    <div className="col-span-2 text-right">Monthly</div>
                  </div>
                  {category.items.map((item, itemIndex) => {
                    const monthlyAmount = convertToMonthly(item.amount, item.frequency);
                    const dueDate = item.dueDate ? new Date(item.dueDate) : undefined;
                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 gap-2 p-2 border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <div className="col-span-4 flex items-center text-sm">
                          {item.category}
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.amount || ""}
                            onChange={(e) =>
                              updateBudgetItem(
                                categoryIndex,
                                itemIndex,
                                "amount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0.00"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            value={item.frequency}
                            onChange={(e) =>
                              updateBudgetItem(
                                categoryIndex,
                                itemIndex,
                                "frequency",
                                e.target.value as Frequency
                              )
                            }
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                          >
                            <option value="weekly">Weekly</option>
                            <option value="fortnight">Fortnight</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="annually">Annually</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "h-8 w-full justify-start text-left font-normal text-sm",
                                  !dueDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-3 w-3" />
                                {dueDate ? format(dueDate, "MMM d") : "Pick date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                selected={dueDate}
                                onSelect={(date) => {
                                  updateBudgetItem(
                                    categoryIndex,
                                    itemIndex,
                                    "dueDate",
                                    date ? format(date, "yyyy-MM-dd") : undefined
                                  );
                                }}
                                month={dueDate || currentMonth}
                                onMonthChange={(month) => setCurrentMonth(month)}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="col-span-2 flex items-center justify-end text-sm font-medium">
                          ${monthlyAmount.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Summary */}
          <div className="border-t-2 border-red-500 pt-4 mt-6">
            <div className="space-y-4">
              <div className="text-xl font-bold">Summary</div>
              
              {/* Starting Budget Input */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label htmlFor="starting-budget" className="text-sm font-medium">
                      Starting Budget
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your initial budget balance for this month
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="starting-budget"
                      type="number"
                      step="0.01"
                      value={startingBudget || ""}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setStartingBudget(value);
                      }}
                      onBlur={async () => {
                        // Save starting budget when user leaves the input
                        const {
                          data: { user },
                        } = await supabase.auth.getUser();
                        if (!user) return;

                        await supabase
                          .from("profiles")
                          .update({ starting_budget: startingBudget })
                          .eq("id", user.id);
                      }}
                      placeholder="0.00"
                      className="w-32 text-right font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Total Income</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${totals.income.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Total Expenses</div>
                  <div className="text-2xl font-bold text-red-600">
                    ${totals.expenses.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Balance</div>
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      totals.balance >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    ${totals.balance.toFixed(2)}
                  </div>
                </div>
              </div>
              {totals.balance >= 0 ? (
                <div className="text-green-600 font-medium">
                  Congratulations! Your budget is in surplus.
                </div>
              ) : (
                <div className="text-red-600 font-medium">
                  Warning: Your budget is in deficit. Consider reducing expenses.
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
}

