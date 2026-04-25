# FinTracker — Personal Finance & Retirement Projector

A private, password-protected web app to track monthly finances and project savings all the way to retirement.

## Features

- 📊 **Dashboard** — Monthly income/expenses overview, 12-month trend charts, goal progress
- 📅 **Monthly Entry** — Record income, expenses (14 categories), investments per month
- 📈 **Projections** — Retirement trajectory chart, annual savings growth, life goal milestones
- 🎯 **Life Goals** — College, wedding, house, travel — each tracked with progress and "on track" status
- ⚙️ **Settings** — Current age, retirement age, portfolio value, return rate, inflation assumptions
- 🔒 **Password Protected** — Single password gate, session stored in MongoDB

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas
- **Frontend**: EJS templates + vanilla JS + Chart.js
- **Hosting**: Render.com

---

## Local Setup

```bash
git clone <repo-url>
cd fintracker
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `SESSION_SECRET` | Long random string for session encryption |
| `APP_PASSWORD` | The password to access the app |
| `PORT` | Port (optional, defaults to 3000) |

---

## Deploy to Render.com

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node
5. Add Environment Variables in Render dashboard (same as `.env`)
6. Deploy!

### MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a database user
3. Whitelist `0.0.0.0/0` in Network Access (for Render)
4. Copy the connection string into `MONGODB_URI`

---

## Usage

### First Time Setup

1. Log in with your `APP_PASSWORD`
2. Go to **Settings** → Enter your age, retirement age, current savings/investments, and growth assumptions
3. Go to **Life Goals** → Add your financial goals (college funds, weddings, etc.)
4. Go to **Monthly Entry** → Start logging your monthly finances

### Monthly Workflow

Each month, enter:
- All income sources
- All expense categories
- Investment contributions made that month

The **Projections** page automatically updates based on your last 6 months of data.

---

## Projection Model

- Base savings rate = average of last 6 months of (income − expenses)
- Savings grow by `salaryGrowthRate` per year
- Portfolio compounds at `annualReturnRate` per year
- Life goals are plotted as milestones on the trajectory chart
- "On Track" = projected portfolio at goal year ≥ goal target amount
