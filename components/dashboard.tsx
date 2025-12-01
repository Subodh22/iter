"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import FinanceDashboard from "@/components/finance/finance-dashboard";
import HabitsDashboard from "@/components/habits/habits-dashboard";
import GoalsDashboard from "@/components/goals/goals-dashboard";
import { LogOut, Wallet, Target, CheckSquare } from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("finance");
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Jindagi</h1>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="finance" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Finance
            </TabsTrigger>
            <TabsTrigger value="habits" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Habits
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals
            </TabsTrigger>
          </TabsList>
          <TabsContent value="finance">
            <FinanceDashboard />
          </TabsContent>
          <TabsContent value="habits">
            <HabitsDashboard />
          </TabsContent>
          <TabsContent value="goals">
            <GoalsDashboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

