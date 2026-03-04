/**
 * Gemini-compatible tool definitions for the stock agent.
 * Each tool has function declarations with name, description, and parameters schema.
 */
export const toolDefinitions = {
  functionDeclarations: [
    {
      name: 'get_stock_quote',
      description: 'Get the current stock quote for a given ticker symbol. Returns price, change, volume, market cap, PE ratio, 52-week range. Use this when the user asks about a specific stock price or current market data.',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'The stock ticker symbol (e.g., AAPL, TSLA, GOOGL)',
          },
        },
        required: ['symbol'],
      },
    },
    {
      name: 'get_stock_history',
      description: 'Get historical price data for a stock over a specified time period. Returns start/end prices, period change percentage, high/low range. Use this when the user asks about stock performance over time, trends, or price movement.',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'The stock ticker symbol (e.g., AAPL, TSLA)',
          },
          period: {
            type: 'string',
            description: 'Time period: "1w" (1 week), "1mo" (1 month), "3mo" (3 months), "6mo" (6 months), "1y" (1 year), "5y" (5 years). Default is "1mo".',
            enum: ['1w', '1mo', '3mo', '6mo', '1y', '5y'],
          },
        },
        required: ['symbol'],
      },
    },
    {
      name: 'search_stocks',
      description: 'Search for stocks by company name, industry keyword, or partial name. Use this when the user mentions a company by name rather than ticker, or when looking for companies in a specific industry.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query — company name, keyword, or partial match (e.g., "electric vehicles", "Apple", "artificial intelligence")',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_company_info',
      description: 'Get detailed company information including sector, industry, business summary, financial ratios, analyst targets, and growth metrics. Use this when the user wants to understand a company\'s fundamentals or business.',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'The stock ticker symbol (e.g., AAPL, TSLA)',
          },
        },
        required: ['symbol'],
      },
    },
    {
      name: 'screen_stocks',
      description: 'Screen stocks across a universe of ~120 popular tickers using filters. Use this when the user wants to find stocks matching specific criteria like sector, price range, or market cap. Good for questions like "find me tech stocks under $50" or "show me large-cap energy stocks".',
      parameters: {
        type: 'object',
        properties: {
          sector: {
            type: 'string',
            description: 'Filter by sector: "technology", "healthcare", "financial", "consumer", "energy", "industrials"',
            enum: ['technology', 'healthcare', 'financial', 'consumer', 'energy', 'industrials'],
          },
          minPrice: {
            type: 'number',
            description: 'Minimum stock price in USD. DO NOT set this unless the user explicitly mentions a price range.',
          },
          maxPrice: {
            type: 'number',
            description: 'Maximum stock price in USD. DO NOT set this unless the user explicitly mentions a price range.',
          },
          minMarketCap: {
            type: 'number',
            description: 'Minimum market cap in USD (e.g., 1000000000 for $1B). DO NOT set this unless the user asks for "Large Cap" or a specific value.',
          },
          maxMarketCap: {
            type: 'number',
            description: 'Maximum market cap in USD. DO NOT set this unless the user asks for "Small Cap" or a specific value.',
          },
          minChangePercent: {
            type: 'number',
            description: 'Minimum daily change percentage. Set to a positive number for "Gainers".',
          },
          maxChangePercent: {
            type: 'number',
            description: 'Maximum daily change percentage. Set to a negative number for "Losers".',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default 10)',
          },
        },
      },
    },
  ],
};

