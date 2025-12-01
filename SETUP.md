# Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for your project to be fully provisioned
3. Go to Project Settings > API
4. Copy your Project URL and anon/public key

## Step 3: Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Set Up Database

1. In your Supabase dashboard, go to SQL Editor
2. Copy and run the migrations in order:
   - First, run `supabase/migrations/001_initial_schema.sql` - This creates all necessary tables, indexes, and Row Level Security policies
   - Then, run `supabase/migrations/002_add_recurring_transactions.sql` - This adds recurring transaction support
3. Make sure both migrations run successfully

## Step 5: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 6: Create Your First Account

1. Navigate to the auth page (you'll be redirected automatically if not logged in)
2. Sign up with your email
3. Check your email for the confirmation link (if email confirmation is enabled)
4. Sign in and start using the dashboard!

## Features

### Finance Dashboard
- Track income and expenses
- View monthly summaries
- Categorize transactions
- See balance calculations

### Habits Dashboard
- Create daily habits
- Track completion with a weekly calendar view
- Visual progress indicators
- Customizable habit colors

### Goals Dashboard
- Set goals with target values
- Track progress with progress bars
- Set deadlines
- Mark goals as completed

## Troubleshooting

### Database Connection Issues
- Verify your Supabase URL and keys are correct in `.env.local`
- Make sure you've run the migration SQL script
- Check that Row Level Security policies are enabled

### Authentication Issues
- Ensure email confirmation is set up correctly in Supabase
- Check Supabase Auth settings for email templates
- Verify redirect URLs are configured in Supabase dashboard

### Build Errors
- Make sure all dependencies are installed: `npm install`
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

