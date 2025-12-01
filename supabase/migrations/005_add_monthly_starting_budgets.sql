-- Create monthly_starting_budgets table to store starting budget for each month
CREATE TABLE IF NOT EXISTS monthly_starting_budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL, -- First day of the month (YYYY-MM-01)
  starting_budget DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, month)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_monthly_starting_budgets_user_id ON monthly_starting_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_starting_budgets_month ON monthly_starting_budgets(month);

-- Enable Row Level Security
ALTER TABLE monthly_starting_budgets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own monthly starting budgets" ON monthly_starting_budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly starting budgets" ON monthly_starting_budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly starting budgets" ON monthly_starting_budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly starting budgets" ON monthly_starting_budgets
  FOR DELETE USING (auth.uid() = user_id);

