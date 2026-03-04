import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runAgent } from './agent/agent.js';
import {
  getStockQuote,
  getStockHistory,
  searchStocks,
  getCompanyInfo,
  screenStocks,
} from './tools/stockTools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── GraphQL Schema ────────────────────────────────────────
const typeDefs = `#graphql
  type StockQuote {
    symbol: String
    name: String
    price: Float
    change: Float
    changePercent: Float
    volume: Float
    avgVolume: Float
    marketCap: Float
    peRatio: Float
    forwardPE: Float
    fiftyTwoWeekHigh: Float
    fiftyTwoWeekLow: Float
    dayHigh: Float
    dayLow: Float
    previousClose: Float
    currency: String
    exchange: String
    error: String
  }

  type StockHistory {
    symbol: String
    period: String
    periodChangePercent: Float
    startPrice: Float
    endPrice: Float
    highPrice: Float
    lowPrice: Float
    dataPoints: Int
    summary: String
    error: String
  }

  type SearchResult {
    symbol: String
    name: String
    exchange: String
    sector: String
  }

  type SearchResponse {
    query: String
    results: [SearchResult]
    count: Int
    error: String
  }

  type CompanyInfo {
    symbol: String
    sector: String
    industry: String
    country: String
    employees: String
    website: String
    summary: String
    dividendYield: Float
    beta: Float
    trailingPE: Float
    forwardPE: Float
    priceToBook: Float
    profitMargins: Float
    revenueGrowth: Float
    earningsGrowth: Float
    returnOnEquity: Float
    targetMeanPrice: Float
    recommendationKey: String
    error: String
  }

  type ScreenedStock {
    symbol: String
    name: String
    price: Float
    changePercent: String
    marketCap: String
    peRatio: String
    volume: String
  }

  type ScreenResponse {
    totalScreened: Int
    matchCount: Int
    results: [ScreenedStock]
    error: String
  }

  type ToolCall {
    tool: String
    args: String
    result: String
  }

  type ChatMessage {
    role: String!
    content: String!
  }

  type AgentResponse {
    response: String!
    toolCalls: [ToolCall]
    conversationHistory: [ChatMessage]
  }

  type HealthStatus {
    status: String!
    model: String!
    timestamp: String!
  }

  input ScreenCriteria {
    sector: String
    minPrice: Float
    maxPrice: Float
    minMarketCap: Float
    maxMarketCap: Float
    minChangePercent: Float
    maxChangePercent: Float
    limit: Int
  }

  input ChatMessageInput {
    role: String!
    content: String!
  }

  type Query {
    health: HealthStatus!
    stockQuote(symbol: String!): StockQuote!
    stockHistory(symbol: String!, period: String): StockHistory!
    searchStocks(query: String!): SearchResponse!
    companyInfo(symbol: String!): CompanyInfo!
    screenStocks(criteria: ScreenCriteria): ScreenResponse!
  }

  type Mutation {
    chat(message: String!, conversationHistory: [ChatMessageInput]): AgentResponse!
  }
`;

// ─── GraphQL Resolvers ─────────────────────────────────────
const resolvers = {
  Query: {
    health: () => ({
      status: 'ok',
      model: 'gemini-2.5-flash',
      timestamp: new Date().toISOString(),
    }),
    stockQuote: async (_, { symbol }) => await getStockQuote(symbol),
    stockHistory: async (_, { symbol, period }) => await getStockHistory(symbol, period),
    searchStocks: async (_, { query }) => await searchStocks(query),
    companyInfo: async (_, { symbol }) => await getCompanyInfo(symbol),
    screenStocks: async (_, { criteria }) => await screenStocks(criteria),
  },
  Mutation: {
    chat: async (_, { message, conversationHistory = [] }) => {
      console.log(`\n📨 User: ${message}`);
      const result = await runAgent(message, conversationHistory);
      console.log(`🤖 Agent: ${result.response?.substring(0, 100)}...`);
      console.log(`🔧 Tools used: ${result.toolCalls.length}`);

      return {
        response: result.response,
        toolCalls: result.toolCalls.map(tc => ({
          tool: tc.tool,
          args: JSON.stringify(tc.args),
          result: JSON.stringify(tc.result),
        })),
        conversationHistory: result.conversationHistory.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
      };
    },
  },
};

// ─── Server Bootstrap ──────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Serve static frontend
app.use(express.static(join(__dirname, '..', 'public')));

// Create Apollo Server
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});

await apolloServer.start();

// Manual middleware integration (compatible with Apollo Server v5)
app.use('/graphql', async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  const { query, variables, operationName } = req.body;

  try {
    const response = await apolloServer.executeOperation(
      { query, variables, operationName },
      { contextValue: {} }
    );

    if (response.body.kind === 'single') {
      const result = response.body.singleResult;
      const statusCode = result.errors ? 400 : 200;
      res.status(statusCode).json({
        data: result.data,
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error('GraphQL error:', error);
    res.status(500).json({ errors: [{ message: error.message }] });
  }
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║     🚀 BTrade AI Stock Agent                 ║
  ║     App:     http://localhost:${PORT}            ║
  ║     GraphQL: http://localhost:${PORT}/graphql    ║
  ║     Model:   gemini-2.5-flash via Google AI  ║
  ╚══════════════════════════════════════════════╝
  `);
});
