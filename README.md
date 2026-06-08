# Prediction Market Arbitrage Scanner

A production-style arbitrage scanner and dashboard that compares **Kalshi** and **Polymarket** markets, identifies cross-platform pricing inefficiencies, and presents ranked opportunities with risk analysis.

**This tool is for analytics, research, paper trading, and manual decision support only. It does not place live trades.**

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 14 + React + Tailwind | Full-stack TypeScript, fast SSR for dashboard |
| Backend | Next.js API routes + Node | Same codebase, easy deployment |
| Database | SQLite (Drizzle ORM) | Zero-config local dev, Postgres-ready schema |
| Validation | Zod | Runtime type safety for settings and markets |
| Matching | string-similarity + date/resolution scoring | Fast, no ML dependency for v1 |
| Jobs | node-cron | Simple scheduled scanning |
| Tests | Vitest | Fast unit tests for arbitrage math |

## How Arbitrage Works

When you can buy opposite outcomes across two platforms for less than $1 total payout:

```
total_cost = kalshi_ask + polymarket_ask
gross_profit = 1 - total_cost
gross_return = gross_profit / total_cost
```

**Example (included in mock data):**
- Kalshi YES ask = 0.42
- Polymarket NO ask = 0.55
- total_cost = 0.97 → gross_profit = 0.03 → **3.09% return**

### Why Ask Prices?

Ask prices are what you actually pay to buy. Midpoints and last-traded prices may not be executable. This scanner uses **ask prices only** for arbitrage detection.

### Adjusted Profit

```
adjusted_cost = total_cost + fees + slippage + gas + conversion
adjusted_profit = 1 - adjusted_cost
```

Only opportunities where `adjusted_profit > 0` are classified as **net profitable**.

### Market Matching

Hybrid scoring across matched pairs:

```
match_score = 0.40 × title + 0.25 × description + 0.20 × date + 0.15 × resolution
```

Matches below the configurable threshold (default 0.80) are rejected.

### Outcome Mapping

For each matched pair, the system evaluates all four side combinations (YES/YES, YES/NO, NO/YES, NO/NO) and classifies as:
- `opposite_outcome` — valid arbitrage candidate
- `same_outcome` — not an opposite-side arb
- `unclear` — ambiguous wording, requires manual review
- `not_comparable` — missing executable prices

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
cd PredictionMarketArbitrage
npm install
cp .env.example .env.local
```

### Run (Mock Mode — no API keys needed)

```bash
npm run dev
```

Open **http://localhost:3000**

The app auto-runs a scan on first load using 8 Kalshi + 8 Polymarket mock markets covering:
- Clear arbitrage (Team A championship)
- Near-arbitrage (thin edge)
- No arbitrage
- Mismatched events
- Different expiration dates
- Different settlement rules
- Low liquidity
- Ambiguous wording

### Run Tests

```bash
npm test
```

### Background Scanner

```bash
npm run scanner
```

Runs scans on a cron schedule (default: every 60 seconds).

## Dashboard Pages

| Page | Description |
|------|-------------|
| Overview | Summary cards + top opportunities |
| Live Opportunities | Filterable ranked table with detail panel |
| Market Matches | All matched pairs, even without arbitrage |
| Scan History | Every scanner run with stats |
| Opportunity History | Detected opportunities over time |
| Trade Journal | Manual action log (not auto-trading) |
| Settings | Thresholds, fees, mock/live toggle |
| API Status | Connection health (no secrets shown) |

## Connecting Real APIs

### Kalshi

1. Create API keys at [kalshi.com/account/api-keys](https://kalshi.com/account/api-keys)
2. Docs: [docs.kalshi.com](https://docs.kalshi.com)
3. Set in `.env.local`:
   ```
   USE_MOCK_DATA=false
   KALSHI_API_KEY_ID=your_key_id
   KALSHI_PRIVATE_KEY_PATH=/path/to/private_key.pem
   KALSHI_BASE_URL=https://external-api.kalshi.com/trade-api/v2
   ```
4. Public market data (`GET /markets`) works without auth. Order books and trading require RSA-PSS signing.

### Polymarket

1. Docs: [docs.polymarket.com](https://docs.polymarket.com)
2. Gamma API (metadata): `https://gamma-api.polymarket.com` — no auth for public data
3. CLOB API (order books): `https://clob.polymarket.com`
4. Set in `.env.local`:
   ```
   USE_MOCK_DATA=false
   POLYMARKET_GAMMA_URL=https://gamma-api.polymarket.com
   POLYMARKET_CLOB_URL=https://clob.polymarket.com
   POLYMARKET_API_KEY=...
   POLYMARKET_API_SECRET=...
   POLYMARKET_API_PASSPHRASE=...
   ```
5. Authenticated CLOB endpoints use EIP-712 wallet signing or API key credentials.

## CSV Export

From the Live Opportunities page, click **Export CSV**, or:

```
GET /api/opportunities?format=csv
```

## Project Structure

```
src/
  app/              # Next.js pages + API routes
  components/       # Dashboard UI
  lib/              # Config, DB, settings, utils
  server/
    markets/        # API clients, normalization, mock data
    arbitrage/      # Matcher, calculator, sizing, risk, scoring
    scanner.ts      # Full scan pipeline
    scheduler.ts    # Cron worker
  tests/            # Vitest tests
  types/            # TypeScript types
```

## Deployment Notes

- SQLite works for single-instance deployment
- For production: switch `DATABASE_URL` to PostgreSQL and update Drizzle dialect
- Run `npm run build && npm start` for production
- Consider running `npm run scanner` as a separate process for background scans
- Never commit `.env.local` or API keys

## Limitations & Risks

Real-world arbitrage is **not guaranteed** because of:

- Execution risk and latency
- Partial fills and price movement during execution
- API delays and stale data
- Platform-specific rules and account restrictions
- Settlement differences between platforms
- Fees, slippage, and liquidity constraints
- Withdrawal delays and gas costs
- Regulatory restrictions by jurisdiction
- Ambiguous market wording causing false positive matches
- Market resolution disputes

**This tool does not execute trades.** Any future execution module must be isolated with legal, compliance, and risk checks.

## License

Private / internal use.
