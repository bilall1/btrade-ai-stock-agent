/**
 * BTrade Stock Tools — Powered by Yahoo Finance V8 API
 * 
 * Uses the stable, unauthenticated V8 chart endpoint which provides
 * rich quote data without requiring crumbs or API keys.
 */

const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

async function fetchYF(symbol, params = {}) {
  const url = new URL(`${BASE_URL}/${encodeURIComponent(symbol)}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.append(key, value);
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    }
  });

  if (!response.ok) {
    if (response.status === 404) throw new Error(`Symbol not found: ${symbol}`);
    throw new Error(`API error ${response.status} for ${symbol}`);
  }

  const data = await response.json();
  if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
    throw new Error(`No data returned for ${symbol}`);
  }

  return data.chart.result[0];
}

/**
 * Get current stock quote with key metrics
 */
export async function getStockQuote(symbol) {
  try {
    const sym = symbol.toUpperCase();
    const [data, history] = await Promise.all([
      fetchYF(sym, { interval: '1d', range: '1d' }),
      getStockHistory(sym).catch(() => ({})) // Fallback if history fails
    ]);
    
    const meta = data.meta;

    return {
      symbol: meta.symbol,
      name: meta.longName || meta.shortName || sym,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.chartPreviousClose,
      changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      previousClose: meta.chartPreviousClose,
      exchange: meta.exchangeName,
      currency: meta.currency,
      volume: meta.regularMarketVolume,
      // Aggregated from history
      fiftyTwoWeekHigh: history.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: history.fiftyTwoWeekLow,
      marketCap: MOCK_DATA[sym]?.marketCap || null,
      peRatio: null,
    };
  } catch (error) {
    return { error: `Failed to get quote for ${symbol}: ${error.message}` };
  }
}

/**
 * Get historical price data using 1-year range
 */
export async function getStockHistory(symbol) {
  try {
    const sym = symbol.toUpperCase();
    const data = await fetchYF(sym, { interval: '1d', range: '1y' });
    const meta = data.meta;
    const quotes = data.indicators.quote[0];
    
    const highs = (quotes.high || []).filter(v => v !== null);
    const lows = (quotes.low || []).filter(v => v !== null);
    
    const fiftyTwoWeekHigh = highs.length ? Math.max(...highs) : null;
    const fiftyTwoWeekLow = lows.length ? Math.min(...lows) : null;
    const price = meta.regularMarketPrice;

    return {
      symbol: sym,
      period: '1 Year Trend (52-week)',
      currentPrice: price,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      fiftyTwoWeekRange: `$${fiftyTwoWeekLow?.toFixed(2) || 'N/A'} - $${fiftyTwoWeekHigh?.toFixed(2) || 'N/A'}`,
      distanceFromHigh: fiftyTwoWeekHigh ? ((price - fiftyTwoWeekHigh) / fiftyTwoWeekHigh * 100).toFixed(2) + '%' : 'N/A',
      distanceFromLow: fiftyTwoWeekLow ? ((price - fiftyTwoWeekLow) / fiftyTwoWeekLow * 100).toFixed(2) + '%' : 'N/A',
      summary: `${sym} is trading at $${price?.toFixed(2)}. Its 52-week range is $${fiftyTwoWeekLow?.toFixed(2)} - $${fiftyTwoWeekHigh?.toFixed(2)}.`,
    };
  } catch (error) {
    return { error: `Failed to get history for ${symbol}: ${error.message}` };
  }
}

/**
 * Search fallback
 */
export async function searchStocks(query) {
  const sym = query.toUpperCase();
  const tickers = Object.values(SECTORS).flat();
  const matches = tickers.filter(t => t.includes(sym)).slice(0, 5);
  
  return { 
    query, 
    results: matches.map(t => ({ symbol: t, name: `Company ${t}`, exchange: 'Unknown' })), 
    count: matches.length 
  };
}

/**
 * Get company info
 */
export async function getCompanyInfo(symbol) {
  try {
    const sym = symbol.toUpperCase();
    const quote = await getStockQuote(sym);
    if (quote.error) return quote;

    const mock = MOCK_DATA[sym] || { sector: 'Industrial', industry: 'General' };

    return {
      symbol: quote.symbol,
      name: quote.name,
      exchange: quote.exchange,
      price: quote.price,
      currency: quote.currency,
      sector: mock.sector || 'Technology',
      industry: mock.industry || 'Software',
      marketCapFormatted: formatCap(mock.marketCap) || 'N/A',
      summary: `Real-time data for ${quote.name}. Fundamentals are mocked for demonstration.`,
    };
  } catch (error) {
    return { error: `Failed to get info for ${symbol}: ${error.message}` };
  }
}

/**
 * Screen stocks with advanced filters
 */
const SECTORS = {
  technology: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'AMD', 'INTC', 'CSCO', 'ADBE', 'CRM', 'ORCL', 'TXN', 'AVGO', 'SHOP', 'TDOC', 'ROKU', 'PLTR', 'SNOW', 'MDB', 'CRWD', 'ZS', 'DDOG', 'NET', 'OKTA', 'PANW', 'FTNT', 'SPLK', 'DOCU', 'PYPL', 'SQ', 'COIN', 'RIOT', 'MARA', 'HOOD', 'PATH', 'AI', 'C3.ai', 'U', 'AFRM', 'UPST', 'LMND'],
  energy: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PXD', 'VLO', 'HES', 'PSX', 'OXY', 'HAL', 'DVN', 'MRO', 'APA', 'RIG', 'CHK', 'SWN', 'RRC', 'AR', 'EQT', 'XLE', 'OIH', 'XOP'],
  healthcare: ['JNJ', 'UNH', 'PFE', 'ABBV', 'LLY', 'MRK', 'TMO', 'DHR', 'ABT', 'AMGN', 'BMY', 'GILD', 'VRTX', 'REGN', 'ISRG', 'ZTS', 'MTD', 'ILMN', 'BIIB', 'ALGN', 'TDOC', 'MRNA', 'BNTX'],
  financial: ['JPM', 'BAC', 'WFC', 'C', 'MS', 'GS', 'HSBC', 'AXP', 'V', 'MA', 'PYPL', 'SQ', 'COIN', 'HOOD'],
  consumer: ['TSLA', 'WMT', 'HD', 'PG', 'KO', 'PEP', 'NKE', 'COST', 'MCD', 'SBUX', 'TGT', 'LOW', 'TJX', 'DG', 'EL', 'LULU', 'PTON', 'ETSY', 'CHWY', 'DKNG'],
  industrials: ['BA', 'GE', 'HON', 'UPS', 'FDX', 'CAT', 'DE', 'LMT', 'NOC', 'GD', 'MMM', 'RTX', 'WM', 'NSC', 'UNP'],
};

// Simplified Market Cap Mock (since V8 Chart endpoint doesn't return it)
const MOCK_DATA = {
  AAPL: { marketCap: 3.4e12, sector: 'technology' },
  MSFT: { marketCap: 3.1e12, sector: 'technology' },
  NVDA: { marketCap: 3.2e12, sector: 'technology' },
  TSLA: { marketCap: 7.8e11, sector: 'consumer' },
  AMD: { marketCap: 2.8e11, sector: 'technology' },
  SHOP: { marketCap: 9.8e10, sector: 'technology' },
  PLTR: { marketCap: 8.5e10, sector: 'technology' },
  ROKU: { marketCap: 9.5e9, sector: 'technology' },
  TDOC: { marketCap: 1.5e9, sector: 'technology' },
  PATH: { marketCap: 1.1e10, sector: 'technology' },
  AI: { marketCap: 2.5e9, sector: 'technology' },
  UPST: { marketCap: 4.2e9, sector: 'technology' },
  AFRM: { marketCap: 1.5e10, sector: 'technology' },
  COIN: { marketCap: 5.5e10, sector: 'technology' },
  RIOT: { marketCap: 2.5e9, sector: 'technology' },
  MARA: { marketCap: 3.2e9, sector: 'technology' },
  XOM: { marketCap: 5.2e11, sector: 'energy' },
  CVX: { marketCap: 2.8e11, sector: 'energy' },
  COP: { marketCap: 1.2e11, sector: 'energy' },
  OXY: { marketCap: 5.2e10, sector: 'energy' },
  RIG: { marketCap: 3.5e9, sector: 'energy' },
  APA: { marketCap: 7.5e9, sector: 'energy' },
  DVN: { marketCap: 2.5e10, sector: 'energy' },
  MRO: { marketCap: 1.8e10, sector: 'energy' },
  EQT: { marketCap: 1.6e10, sector: 'energy' },
  CHWY: { marketCap: 1.2e10, sector: 'consumer' },
  PTON: { marketCap: 1.1e9, sector: 'consumer' },
};

export async function screenStocks(criteria) {
  const { 
    sector, 
    minPrice, 
    maxPrice, 
    minMarketCap, 
    maxMarketCap, 
    minChangePercent, 
    maxChangePercent, 
    limit = 10 
  } = criteria || {};

  console.log(`🔍 [SERVER] Screening with criteria:`, JSON.stringify(criteria));

  // Helper to check if a filter is actually set (not null or undefined)
  const isSet = (val) => val !== undefined && val !== null && val !== '';

  // If sector is a stringified array (happens with some model results), parse it
  let targetSectors = [];
  if (sector) {
    if (typeof sector === 'string') {
      try {
        if (sector.startsWith('[') && sector.endsWith(']')) {
          targetSectors = JSON.parse(sector.replace(/""/g, '"'));
        } else {
          targetSectors = [sector];
        }
      } catch (e) {
        targetSectors = [sector];
      }
    } else if (Array.isArray(sector)) {
      targetSectors = sector;
    }
  }

  // Ticker pool: either matching sectors or a general top list
  let tickerPool = [];
  if (targetSectors.length > 0) {
    targetSectors.forEach(s => {
      const sLower = s.toLowerCase();
      if (SECTORS[sLower]) tickerPool.push(...SECTORS[sLower]);
    });
  } else {
    // If no sector, use all known tickers
    Object.values(SECTORS).forEach(tickers => tickerPool.push(...tickers));
  }
  
  // Deduplicate
  tickerPool = [...new Set(tickerPool)];

  try {
    const results = [];
    
    // Process top 50 to avoid massive latency/rate limits
    const maxToTest = 50;
    const testPool = tickerPool.slice(0, maxToTest);
    
    for (const sym of testPool) {
      if (results.length >= limit) break;

      try {
        const quote = await getStockQuote(sym);
        if (quote.error) continue;

        // Apply Price filters (only if value is set)
        if (isSet(minPrice) && quote.price < minPrice) continue;
        if (isSet(maxPrice) && quote.price > maxPrice) continue;

        // Apply ChangePercent filters
        if (isSet(minChangePercent) && quote.changePercent < minChangePercent) continue;
        if (isSet(maxChangePercent) && quote.changePercent > maxChangePercent) continue;

        // Apply Mock Market Cap filters (real cap is hard to get via V8 Chart)
        const mock = MOCK_DATA[sym] || { marketCap: 5e9, sector: 'other' };
        if (isSet(minMarketCap) && mock.marketCap < minMarketCap) continue;
        if (isSet(maxMarketCap) && mock.marketCap > maxMarketCap) continue;

        results.push({
          symbol: sym,
          name: quote.name,
          price: quote.price,
          changePercent: quote.changePercent?.toFixed(2) + '%',
          marketCap: formatCap(mock.marketCap),
          peRatio: 'N/A', // Fundamentals require another endpoint
          volume: formatVolume(quote.volume),
        });

        // Small delay to respect YF (they are lenient but good practice)
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        console.error('Screening error for', sym, e.message);
      }
    }

    // Sort by largest losers if user asked for "worst" (implied by maxChangePercent <= 0)
    if (maxChangePercent <= 0) {
      results.sort((a, b) => parseFloat(a.changePercent) - parseFloat(b.changePercent));
    }

    return {
      criteria,
      totalScreened: testPool.length,
      matchCount: results.length,
      results,
    };
  } catch (error) {
    return { error: `Screening failed: ${error.message}` };
  }
}

function formatVolume(vol) {
  if (!vol) return 'N/A';
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
  return `${vol}`;
}

function formatCap(cap) {
  if (!cap) return 'N/A';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap}`;
}
