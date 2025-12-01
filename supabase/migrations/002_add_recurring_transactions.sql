-- Add recurring fields to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_template_id UUID,
ADD COLUMN IF NOT EXISTS next_occurrence DATE;

-- Create recurring_transactions table to store recurring transaction templates
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'fortnight', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_occurrence DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add foreign key constraint for recurring_template_id
ALTER TABLE transactions
ADD CONSTRAINT fk_recurring_template
FOREIGN KEY (recurring_template_id) REFERENCES recurring_transactions(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_occurrence ON recurring_transactions(next_occurrence);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_is_active ON recurring_transactions(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_template_id ON transactions(recurring_template_id);

-- Enable Row Level Security for recurring_transactions
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for recurring_transactions
CREATE POLICY "Users can view own recurring transactions" ON recurring_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring transactions" ON recurring_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring transactions" ON recurring_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring transactions" ON recurring_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Function to generate next occurrence date
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  input_date DATE,
  frequency TEXT
) RETURNS DATE AS $$
BEGIN
  CASE frequency
    WHEN 'daily' THEN
      RETURN input_date + INTERVAL '1 day';
    WHEN 'weekly' THEN
      RETURN input_date + INTERVAL '1 week';
    WHEN 'fortnight' THEN
      RETURN input_date + INTERVAL '2 weeks';
    WHEN 'monthly' THEN
      RETURN input_date + INTERVAL '1 month';
    WHEN 'yearly' THEN
      RETURN input_date + INTERVAL '1 year';
    ELSE
      RETURN input_date;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

