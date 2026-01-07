# Gym Bro - Next.js Web Application

AI-powered gym routine generator built with Next.js 14, TypeScript, and Tailwind CSS. Deployed on Vercel.

## Features

- 🤖 AI-powered personalized workout routines (Claude & GPT-4)
- 💪 User authentication with JWT sessions
- 📊 Profile management (age, weight, height, experience level)
- 📋 Detailed exercise plans with YouTube tutorials
- 🎨 Modern, responsive UI with Tailwind CSS
- ☁️ Serverless architecture optimized for Vercel
- 🗄️ Vercel Postgres database integration

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless Functions)
- **Database**: Vercel Postgres
- **Authentication**: JWT with `jose` library
- **AI**: LangChain.js with Anthropic & OpenAI

## Prerequisites

- Node.js 18+ and npm
- Vercel account (free tier works)
- Anthropic or OpenAI API key (users enter in UI)

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add:
   - `JWT_SECRET`: A random secure string for session encryption
   - Database URLs (optional for local, required for production)

3. **Run development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

## Deploying to Vercel

### Option 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd web-app
   vercel --prod
   ```

### Option 2: GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js settings

### Database Setup on Vercel

1. **Create Postgres Database**
   - In your Vercel project dashboard, go to "Storage"
   - Click "Create Database" → Select "Postgres"
   - Follow the setup wizard

2. **Environment Variables**
   Vercel will automatically set:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`

3. **Add JWT Secret**
   - In project settings → Environment Variables
   - Add: `JWT_SECRET` with a random secure string

4. **Initialize Database**
   - On first deployment, tables will be created automatically
   - Or use Vercel CLI: `vercel env pull` then run migrations

## Usage

1. **Register/Login**: Create an account or sign in
2. **Complete Profile**: Enter age, weight, height, experience level
3. **Generate Routine**: 
   - Select AI provider (Anthropic or OpenAI)
   - Enter your API key
   - Click "Generate New Routine"
4. **View Routine**: Get personalized weekly workout plans with YouTube tutorials

## Project Structure

```
web-app/
├── app/
│   ├── api/              # API routes (serverless functions)
│   │   ├── auth/         # Authentication endpoints
│   │   ├── profile/      # Profile management
│   │   └── routine/      # AI routine generation
│   ├── login/            # Login/register page
│   ├── dashboard/        # Main app dashboard
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing/redirect page
├── lib/
│   ├── db.ts             # Database utilities
│   ├── auth.ts           # JWT authentication
│   └── ai-agent.ts       # LangChain AI agent
├── types/
│   └── index.ts          # TypeScript definitions
└── components/           # Reusable React components
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | Production | Vercel Postgres connection string |
| `JWT_SECRET` | Yes | Secret key for JWT encryption |
| `ANTHROPIC_API_KEY` | No | Users enter in UI |
| `OPENAI_API_KEY` | No | Users enter in UI |
| `OPENAI_BASE_URL` | No | Override OpenAI API base URL (default `https://api.openai.com`) |
| `OPENAI_MODEL` | No | Override OpenAI model (default `gpt-4o`) |
| `OPENAI_TIMEOUT_MS` | No | Request timeout in ms (default `120000`) |
| `OPENAI_PROXY` | No | Proxy URL for OpenAI requests (e.g. `http://proxy.mycorp:8080`). Falls back to `HTTPS_PROXY`/`HTTP_PROXY` |
| `OPENAI_RETRY_ATTEMPTS` | No | Network retry attempts (default `2`) |

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT sessions with HTTP-only cookies
- API keys never stored in database
- Environment variables secured in Vercel dashboard

## Troubleshooting

### Build Errors
```bash
npm run build
```
Check for TypeScript errors and fix before deploying

### Database Connection Issues
- Ensure Vercel Postgres is properly linked to your project
- Check environment variables are set correctly

### API Key Errors
- Verify users are entering valid API keys in the UI
- Check AI provider is correctly selected

### Custom logo
Place your logo image at:
- `gym/web-app/public/logo.png`

The app will automatically use it in the Login page and Dashboard header. (If the file is missing, it falls back to a simple “G” badge.)

### Connection errors (ECONNRESET / ETIMEDOUT)
If you see `Connection error (ECONNRESET)` or similar, your network is likely blocking or resetting connections to the AI provider.

- Try from a different network (mobile hotspot) to confirm.
- If your company requires a proxy, set one of:
  - `OPENAI_PROXY` (preferred), or
  - `HTTPS_PROXY` / `HTTP_PROXY`
- If your company does SSL interception, you may need to configure Node to trust your corporate CA via `NODE_EXTRA_CA_CERTS` (ask IT).

### Next dev lock (Windows)
If you see “Unable to acquire lock … `.next/dev/lock`”, another `next dev` is still running.

- Stop the other terminal running `npm run dev`, then retry.
- If a stale lock remains, delete `gym/web-app/.next/dev/lock` and restart.

## License

MIT License - see parent project

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js, TypeScript, and AI
