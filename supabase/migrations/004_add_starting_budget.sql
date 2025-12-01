-- Add starting_budget column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS starting_budget DECIMAL(10, 2) DEFAULT 0;

-- Add comment to explain the field
COMMENT ON COLUMN profiles.starting_budget IS 'Initial/starting budget balance for the user';

