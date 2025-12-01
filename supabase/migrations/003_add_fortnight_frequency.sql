-- Drop the existing frequency check constraint
ALTER TABLE recurring_transactions
DROP CONSTRAINT IF EXISTS recurring_transactions_frequency_check;

-- Add the updated constraint with fortnight included
ALTER TABLE recurring_transactions
ADD CONSTRAINT recurring_transactions_frequency_check
CHECK (frequency IN ('daily', 'weekly', 'fortnight', 'monthly', 'yearly'));

-- Update the function to handle fortnight
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

