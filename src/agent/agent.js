import { GoogleGenerativeAI } from '@google/generative-ai';
import { toolDefinitions } from './toolDefinitions.js';
import {
  getStockQuote,
  getStockHistory,
  searchStocks,
  getCompanyInfo,
  screenStocks,
} from '../tools/stockTools.js';

const SYSTEM_PROMPT = `You are BTrade, an expert AI stock market analyst. You have access to LIVE, REAL-TIME stock market tools.

CRITICAL RULES:
1. When you call a tool, you WILL receive REAL live data back. The data in tool responses is REAL and CURRENT — trust it completely.
2. NEVER say "I don't have access" or "I cannot get real-time data" — you DO have access through your tools.
3. ALWAYS report the EXACT numbers from tool results. Never make up or estimate prices.
4. If you need data, YOU MUST use a tool call to get the information.

AVAILABLE TOOLS:
- get_stock_quote: Get live price, change, volume, market cap, PE ratio for any stock
- get_stock_history: Get price history and trend data over various time periods
- search_stocks: Search companies by name or keyword
- get_company_info: Get fundamentals, analyst recommendations, growth metrics
- screen_stocks: Screen stocks by sector, price, market cap, performance

HOW TO RESPOND:
1. Determine if you need tool data. If yes, generate the tool call IMMEDIATELY.
2. Once you have the data, present the EXACT data from the tool response.
3. Add brief analysis or context.
4. Use markdown: **bold** for key metrics, bullet points for lists.
5. End with a brief disclaimer that this is not financial advice.

IMPORTANT: The tool results you receive contain LIVE MARKET DATA. Always use the exact values from tool results.`;

const MODEL = 'gemini-2.5-flash';
const MAX_ITERATIONS = 10;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Convert technical API errors into user-friendly messages
 */
function formatUserFriendlyError(error) {
  const errorMessage = error.message || '';
  
  // Rate limit errors
  if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
    return '⏰ **Free tier limit reached!** Our AI agent has handled many requests today. Please try again in a few minutes, or come back later. Thank you for understanding!';
  }
  
  // Authentication errors
  if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('API key')) {
    return '🔑 **Connection issue.** We\'re having trouble connecting to our AI service. Please try again shortly.';
  }
  
  // Network/timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch')) {
    return '🌐 **Network issue.** Unable to reach our AI service. Please check your connection and try again.';
  }
  
  // Model not found
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return '⚙️ **Service temporarily unavailable.** Our AI model is updating. Please try again in a few moments.';
  }
  
  // Generic fallback
  return '❌ **Oops!** Something went wrong. Please try your question again. If the issue persists, try refreshing the page.';
}

// Map tool names to actual functions
const toolExecutors = {
  get_stock_quote: async (args) => await getStockQuote(args.symbol),
  get_stock_history: async (args) => await getStockHistory(args.symbol, args.period),
  search_stocks: async (args) => await searchStocks(args.query),
  get_company_info: async (args) => await getCompanyInfo(args.symbol),
  screen_stocks: async (args) => await screenStocks(args),
};

/**
 * Format tool result into clear, readable text so the model can easily parse it
 */
function formatToolResult(toolName, result) {
  if (result.error) {
    return `ERROR: ${result.error}`;
  }

  switch (toolName) {
    case 'get_stock_quote':
      return `LIVE STOCK DATA for ${result.symbol} (${result.name}):
- Current Price: $${result.price}
- Change: ${result.change >= 0 ? '+' : ''}${result.change?.toFixed(2)} (${result.changePercent >= 0 ? '+' : ''}${result.changePercent?.toFixed(2)}%)
- Volume: ${formatNum(result.volume)} (Avg: ${formatNum(result.avgVolume)})
- Market Cap: ${formatCap(result.marketCap)}
- P/E Ratio: ${result.peRatio?.toFixed(2) || 'N/A'} | Forward P/E: ${result.forwardPE?.toFixed(2) || 'N/A'}
- 52-Week Range: $${result.fiftyTwoWeekLow?.toFixed(2)} - $${result.fiftyTwoWeekHigh?.toFixed(2)}
- Day Range: $${result.dayLow?.toFixed(2)} - $${result.dayHigh?.toFixed(2)}
- Previous Close: $${result.previousClose?.toFixed(2)}
- Exchange: ${result.exchange} | Currency: ${result.currency}`;

    case 'get_stock_history':
      return `PRICE TEND DATA for ${result.symbol}:
- Current Price: $${result.currentPrice?.toFixed(2)}
- 50-Day Average: $${result.fiftyDayAverage?.toFixed(2)} (${result.fiftyDayChangePercent > 0 ? '+' : ''}${result.fiftyDayChangePercent}% from avg)
- 200-Day Average: $${result.twoHundredDayAverage?.toFixed(2)} (${result.twoHundredDayChangePercent > 0 ? '+' : ''}${result.twoHundredDayChangePercent}% from avg)
- 52-Week Range: ${result.fiftyTwoWeekRange}
- Distance from 52w High: ${result.distanceFromHigh}
- Distance from 52w Low: ${result.distanceFromLow}
- Summary: ${result.summary}`;

    case 'search_stocks':
      if (!result.results || result.results.length === 0) {
        return `No stocks found for "${result.query}".`;
      }
      return `SEARCH RESULTS for "${result.query}" (${result.count} found):
${result.results.map((s, i) => `${i + 1}. ${s.symbol} — ${s.name} (${s.exchange})`).join('\n')}`;

    case 'get_company_info':
      return `COMPANY INFO for ${result.symbol} (${result.name} on ${result.exchange}):
- Sector: ${result.sector} | Industry: ${result.industry}
- Market Cap: ${result.marketCapFormatted}
- P/E: ${result.peRatio?.toFixed(2) || 'N/A'} | Forward P/E: ${result.forwardPE?.toFixed(2) || 'N/A'}
- EPS (Trailing 12m): $${result.epsTrailing?.toFixed(2) || 'N/A'} | EPS (Forward): $${result.epsForward?.toFixed(2) || 'N/A'}
- Dividend Yield: ${result.dividendYield ? (result.dividendYield * 100).toFixed(2) + '%' : 'N/A'}
- Beta: ${result.beta?.toFixed(2) || 'N/A'}
- Price to Book: ${result.priceToBook?.toFixed(2) || 'N/A'}`;

    case 'screen_stocks':
      if (!result.results || result.results.length === 0) {
        return `No stocks matched the screening criteria. Screened ${result.totalScreened} stocks.`;
      }
      return `SCREENING RESULTS (${result.matchCount} matches from ${result.totalScreened} stocks):
${result.results.map((s, i) =>
  `${i + 1}. ${s.symbol} (${s.name}) — Price: $${s.price?.toFixed(2)} | Change: ${s.changePercent} | MCap: ${s.marketCap} | P/E: ${s.peRatio} | Vol: ${s.volume}`
).join('\n')}`;

    default:
      return JSON.stringify(result, null, 2);
  }
}

function formatNum(n) {
  if (!n) return 'N/A';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return String(n);
}

function formatCap(cap) {
  if (!cap) return 'N/A';
  if (cap >= 1e12) return '$' + (cap / 1e12).toFixed(2) + 'T';
  if (cap >= 1e9) return '$' + (cap / 1e9).toFixed(2) + 'B';
  if (cap >= 1e6) return '$' + (cap / 1e6).toFixed(2) + 'M';
  return '$' + cap;
}

/**
 * Run the agent loop: send message to Gemini, execute tool calls, repeat until final answer.
 */
export async function runAgent(userMessage, conversationHistory = []) {
  const toolCallLog = [];

  try {
    // Initialize Gemini model with tools
    const model = genAI.getGenerativeModel({
      model: MODEL,
      tools: [toolDefinitions],
    });

    // Convert conversation history to Gemini format
    const history = convertToGeminiHistory(conversationHistory);

    // Start chat with history
    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    // Add system prompt to the first user message
    const messageWithSystem = conversationHistory.length === 0
      ? `${SYSTEM_PROMPT}\n\n${userMessage}`
      : userMessage;

    // Send initial message
    let result;
    try {
      console.log(`\n🌐 [API CALL #1] Sending to Gemini:`);
      console.log(`   Message: ${messageWithSystem.substring(0, 150)}...`);
      console.log(`   Tools available: ${Object.keys(toolExecutors).length} functions`);
      
      result = await chat.sendMessage(messageWithSystem);
      
      console.log(`\n✅ [API RESPONSE #1] Received from Gemini`);
    } catch (error) {
      console.error('❌ Gemini API error:', error.message);
      const userMessage = formatUserFriendlyError(error);
      throw new Error(userMessage);
    }

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = result.response;
      const functionCalls = response.functionCalls();

      console.log(`\n📋 [ITERATION ${i + 1}] Analyzing Gemini response...`);
      if (functionCalls && functionCalls.length > 0) {
        console.log(`   → Gemini requested ${functionCalls.length} tool call(s)`);
      } else {
        console.log(`   → Gemini provided final text response`);
      }

      // If no function calls, we have the final answer
      if (!functionCalls || functionCalls.length === 0) {
        const finalText = response.text();
        console.log(`\n✨ [FINAL RESPONSE] Text length: ${finalText.length} chars`);
        console.log(`   Preview: ${finalText.substring(0, 100)}...`);
        console.log(`   Total API calls made: ${i + 1}\n`);
        return {
          response: finalText,
          toolCalls: toolCallLog,
          conversationHistory: buildFinalHistory(conversationHistory, userMessage, finalText, toolCallLog),
        };
      }

      // Execute each function call
      const functionResponses = [];
      for (const functionCall of functionCalls) {
        const toolName = functionCall.name;
        const toolArgs = functionCall.args;

        console.log(`\n🔧 [TOOL EXECUTION] ${toolName}(${JSON.stringify(toolArgs)})`);

        const executor = toolExecutors[toolName];
        let toolResult;
        if (executor) {
          try {
            toolResult = await executor(toolArgs);
            console.log(`   ✓ Tool executed successfully`);
          } catch (error) {
            toolResult = { error: `Tool execution failed: ${error.message}` };
            console.log(`   ✗ Tool execution failed: ${error.message}`);
          }
        } else {
          toolResult = { error: `Unknown tool: ${toolName}` };
          console.log(`   ✗ Unknown tool: ${toolName}`);
        }

        // Format result as readable text for the model
        const formattedResult = formatToolResult(toolName, toolResult);
        console.log(`📊 [TOOL RESULT] Formatted for Gemini (${formattedResult.length} chars):\n${formattedResult}`);

        toolCallLog.push({
          tool: toolName,
          args: toolArgs,
          result: toolResult,
        });

        // Add function response in Gemini format
        functionResponses.push({
          functionResponse: {
            name: toolName,
            response: {
              content: formattedResult,
            },
          },
        });
      }

      // Send all function responses back to continue the conversation
      try {
        console.log(`\n🌐 [API CALL #${i + 2}] Sending tool results back to Gemini`);
        console.log(`   Function responses: ${functionResponses.length} result(s)`);
        
        result = await chat.sendMessage(functionResponses);
        
        console.log(`✅ [API RESPONSE #${i + 2}] Received from Gemini`);
      } catch (error) {
        console.error('❌ Gemini API error on tool response:', error.message);
        const userMessage = formatUserFriendlyError(error);
        throw new Error(userMessage);
      }
    }

    // If we hit max iterations, return what we have
    return {
      response: 'I gathered a lot of data but reached my analysis limit. Here\'s what I found so far — please try a more specific question for deeper analysis.',
      toolCalls: toolCallLog,
      conversationHistory: buildFinalHistory(conversationHistory, userMessage, 'Max iterations reached', toolCallLog),
    };
  } catch (error) {
    console.error('❌ Agent error:', error);
    throw error;
  }
}

/**
 * Convert OpenAI-style conversation history to Gemini format
 */
function convertToGeminiHistory(messages) {
  const geminiHistory = [];
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      // Skip system messages - we'll prepend to first user message
      continue;
    } else if (msg.role === 'user') {
      geminiHistory.push({
        role: 'user',
        parts: [{ text: msg.content }],
      });
    } else if (msg.role === 'assistant') {
      geminiHistory.push({
        role: 'model',
        parts: [{ text: msg.content }],
      });
    }
    // Skip 'tool' role messages as they're handled differently in Gemini
  }
  
  return geminiHistory;
}

/**
 * Build final conversation history in OpenAI format for GraphQL response
 */
function buildFinalHistory(conversationHistory, userMessage, assistantResponse, toolCallLog) {
  const history = [...conversationHistory];
  history.push({ role: 'user', content: userMessage });
  history.push({ role: 'assistant', content: assistantResponse });
  return history;
}

