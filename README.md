# 🚀 BTrade - AI Stock Screening Agent

An intelligent, agentic AI-powered stock market assistant that provides real-time stock analysis, company fundamentals, and market screening capabilities. Built with Google Gemini 2.5 Flash and Yahoo Finance API.

![BTrade Demo](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node](https://img.shields.io/badge/Node.js-v20.18.0-green)

## ✨ Features

- **🤖 Agentic AI**: Gemini autonomously decides which tools to call and synthesizes data
- **📊 Real-time Stock Data**: Live prices, volume, market cap, and technical indicators
- **🏢 Company Fundamentals**: Sector, industry, P/E ratios, dividend yields, and more
- **🔍 Smart Stock Screening**: Filter stocks by sector, price, market cap, and performance
- **📈 Historical Analysis**: Track price movements over multiple time periods
- **🔎 Company Search**: Find stocks by name or industry keywords
- **💬 Natural Language Interface**: Ask questions in plain English

## 🎯 Example Queries

```
"What's the current price of AAPL?"
"Compare NVDA and AMD — which is the better buy?"
"Find me undervalued tech stocks under $100"
"Show me the top performing energy stocks"
"Give me a detailed analysis of MSFT"
"Why is TSLA's stock moving today?"
```

## 🏗️ Architecture Overview

BTrade implements a modern **agentic AI architecture** where the AI model doesn't just respond — it **acts**:

```
┌─────────────────────────────────────────────────────────────┐
│                         User Query                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Vanilla JS + GraphQL)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│         Backend (Node.js + Express + Apollo Server)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   AI Agent (Gemini 2.5 Flash)               │
│  • Analyzes user intent                                     │
│  • Decides which tools to call                              │
│  • Plans multi-step reasoning                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              ↓                 ↓
    ┌──────────────┐   ┌──────────────┐
    │ Tool Executor│   │Yahoo Finance │
    │  (Node.js)   │───│     API      │
    └──────────────┘   └──────────────┘
```

### How Agentic AI Works

1. **User asks a question** → GraphQL mutation sent to backend
2. **Gemini analyzes intent** → Decides which of 5 tools to use
3. **Backend executes tools** → Fetches real data from Yahoo Finance
4. **Gemini synthesizes** → Creates natural language response with exact data
5. **User receives answer** → Formatted, markdown-rich response

**Key Insight:** Gemini is the "brain" (decides what to do), your backend is the "hands" (executes actions).

## 🛠️ Available Tools

The AI agent has access to 5 autonomous tools:

| Tool | Description | Example |
|------|-------------|---------|
| `get_stock_quote` | Live price, change, volume, market cap | Price of AAPL |
| `get_stock_history` | Historical trends over time periods | TSLA performance over 6 months |
| `search_stocks` | Find companies by name/keyword | Search "electric vehicles" |
| `get_company_info` | Fundamentals, ratios, analyst data | Detailed analysis of MSFT |
| `screen_stocks` | Filter by sector, price, market cap | Tech stocks under $50 |

## 📊 Request Flow Example

**Query:** "Compare NVDA and AMD"

```
🌐 [API CALL #1] User query → Gemini
   Gemini decides: "I need 4 tools"
   
   Returns:
   - get_stock_quote(NVDA)
   - get_company_info(NVDA)
   - get_stock_quote(AMD)
   - get_company_info(AMD)

🔧 [TOOL EXECUTION] Backend runs all 4 tools locally
   - Fetches from Yahoo Finance API
   - Formats results
   
🌐 [API CALL #2] Tool results → Gemini
   Gemini synthesizes comparison
   
✨ [FINAL RESPONSE] Natural language answer with exact data
```

**Total Gemini API Calls:** 2 per query  
**Total Tool Executions:** As many as needed (runs on your server)

## 🚀 Getting Started

### Prerequisites

- Node.js v20+ 
- Google Gemini API Key (free tier: 1,500 requests/day)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/btrade.git
cd btrade

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your Gemini API key to .env
echo "GEMINI_API_KEY=your_api_key_here" >> .env
```

### Get Your Free Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIza...`)
5. Add to `.env` file

### Run Locally

```bash
npm start
```

Server will start at `http://localhost:3001`

## 📦 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express** - Web server framework
- **Apollo Server v5** - GraphQL API
- **@google/generative-ai** - Gemini SDK
- **dotenv** - Environment variables

### Frontend
- **Vanilla JavaScript** - No framework overhead
- **GraphQL** - Type-safe API queries
- **CSS3** - Modern, responsive design

### AI & Data
- **Google Gemini 2.5 Flash** - Agentic AI model
- **Yahoo Finance V8 API** - Real-time stock data

## 🌍 Deployment

### Environment Variables

```bash
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variable in Vercel dashboard
# Settings → Environment Variables → Add GEMINI_API_KEY
```

### Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway up

# Add environment variable
railway variables set GEMINI_API_KEY=your_key
```

### Deploy to Render

1. Connect your GitHub repository
2. Select "Web Service"
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variable: `GEMINI_API_KEY`

## 💰 Free Tier Limits

### Google Gemini 2.5 Flash (FREE Forever)
- ✅ **1,500 requests per day**
- ✅ **15 requests per minute (RPM)**
- ✅ **No credit card required**
- ✅ **Persistent free tier**

### Yahoo Finance API (FREE)
- ✅ **Unlimited requests**
- ✅ **No authentication required**
- ✅ **Real-time data**

**Total Cost:** $0/month for typical usage 🎉

## 📁 Project Structure

```
BTrade/
├── src/
│   ├── server.js              # Express + Apollo GraphQL server
│   ├── agent/
│   │   ├── agent.js           # Gemini agent logic + tool execution
│   │   └── toolDefinitions.js # Function calling schemas
│   └── tools/
│       └── stockTools.js      # Yahoo Finance API integration
├── public/
│   ├── index.html             # Frontend UI
│   ├── app.js                 # GraphQL client + chat logic
│   └── styles.css             # Styling
├── .env                       # Environment variables (gitignored)
├── .env.example               # Template for environment setup
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies
├── ARCHITECTURE.md            # Detailed architecture guide
└── README.md                  # This file
```

## 🔧 API Documentation

### GraphQL Endpoint

`POST /graphql`

### Mutations

#### Chat (Main Agent Interaction)

```graphql
mutation {
  chat(message: "What is the price of AAPL?", conversationHistory: []) {
    response
    toolCalls {
      tool
      args
      result
    }
    conversationHistory {
      role
      content
    }
  }
}
```

### Queries

#### Health Check

```graphql
query {
  health {
    status
    model
    timestamp
  }
}
```

#### Direct Stock Quote

```graphql
query {
  stockQuote(symbol: "AAPL") {
    symbol
    name
    price
    change
    changePercent
    volume
    marketCap
  }
}
```

## 🧪 Testing

```bash
# Start server
npm start

# In another terminal, test GraphQL endpoint
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { chat(message: \"What is the price of AAPL?\") { response } }"}'
```

## 🎨 Features Breakdown

### Autonomous Tool Selection
The AI decides which tools to call based on user intent. No hard-coded logic.

```javascript
// User: "Compare NVDA and AMD"
// AI automatically calls:
✓ get_stock_quote("NVDA")
✓ get_company_info("NVDA")
✓ get_stock_quote("AMD")
✓ get_company_info("AMD")
```

### Multi-Step Reasoning
The agent can iterate up to 10 times, calling tools multiple times if needed.

### Natural Language Synthesis
Raw data is transformed into markdown-formatted, human-friendly responses.

## 📈 Performance

- **Response Time:** ~2-4 seconds (including tool execution)
- **Gemini Latency:** ~1 second per API call
- **Yahoo Finance Latency:** ~500ms per request
- **Concurrent Requests:** Supports multiple users

## 🔒 Security

- ✅ API keys stored in environment variables
- ✅ `.env` file gitignored
- ✅ No credentials in code
- ✅ Tools executed server-side (not exposed to client)
- ✅ Input validation on GraphQL layer

## 🐛 Troubleshooting

### "Quota exceeded" Error

**Issue:** Hit Gemini's rate limit (15 RPM)  
**Solution:** Wait 1 minute or upgrade to paid tier

### "Symbol not found" Error

**Issue:** Invalid stock ticker  
**Solution:** Check ticker symbol on Yahoo Finance first

### Port Already in Use

**Issue:** Port 3001 is occupied  
**Solution:** 
```bash
# Kill existing process
pkill -9 node

# Or change PORT in .env
echo "PORT=3002" >> .env
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Google Gemini** for the powerful AI model with function calling
- **Yahoo Finance** for free, real-time stock market data
- **Apollo GraphQL** for the excellent API framework

## 📧 Contact

**Muhammad Bilal**  
GitHub: [@yourusername](https://github.com/yourusername)  
LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)

---

⭐ If you found this helpful, please star the repository!

**Built with ❤️ for portfolio and learning purposes. Not financial advice.**
