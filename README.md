# iter

# Jindagi - Life Dashboard

A comprehensive life dashboard to control your finance, track personal habits, and monitor your goals.

## Features

- 💰 **Finance Management**: Track income, expenses, and budgets
- 📊 **Habit Tracking**: Monitor daily habits and build consistency
- 🎯 **Goal Tracking**: Set and track progress towards your goals
- 🔐 **Authentication**: Secure user authentication with Supabase

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Supabase** - Backend and authentication

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

3. Add your Supabase credentials to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the database migrations (see `supabase/migrations/` folder)

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The app uses the following main tables:
- `transactions` - Financial transactions (income/expenses)
- `budgets` - Budget categories and limits
- `habits` - Habit definitions
- `habit_logs` - Daily habit completions
- `goals` - Goal definitions and progress

See `supabase/migrations/` for the complete schema.

