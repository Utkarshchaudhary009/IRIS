import { ToolLoopAgent, stepCountIs, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// ======================
// Tool Definitions
// ======================

const webSearchTool = tool({
  description: 'Search the web for current information',
  parameters: z.object({
    query: z.string().describe('The search query'),
    numResults: z.number().optional().default(5),
  }),
  execute: async ({ query, numResults }) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      results: [
        { title: `Result 1 for "${query}"`, url: 'https://example.com/1', snippet: 'Mock result...' },
        { title: `Result 2 for "${query}"`, url: 'https://example.com/2', snippet: 'Another result...' },
      ].slice(0, numResults),
    };
  },
});

const calculatorTool = tool({
  description: 'Perform mathematical calculations',
  parameters: z.object({
    expression: z.string().describe('Math expression to evaluate'),
  }),
  execute: async ({ expression }) => {
    try {
      const result = eval(expression);
      return { result, expression };
    } catch (error) {
      return { error: 'Invalid expression', expression };
    }
  },
});

const memorySearchTool = tool({
  description: 'Search conversation history and knowledge base',
  parameters: z.object({
    query: z.string().describe('What to search for'),
  }),
  execute: async ({ query }) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      matches: [
        { content: `Memory: ${query}`, similarity: 0.89 },
      ],
    };
  },
});

// ======================
// Agent Initialization
// ======================

const agent = new ToolLoopAgent({
  model: google('gemini-2.0-flash-exp'),
  tools: {
    webSearch: webSearchTool,
    calculator: calculatorTool,
    memorySearch: memorySearchTool,
  },
  system: `You are an intelligent AI assistant with access to tools. 
Use them when helpful to answer questions accurately. 
Be concise and cite your sources when using web search.`,
  temperature: 0.7,
  maxTokens: 4096,
  maxSteps: 10,
});

// ======================
// API Route
// ======================

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  return agent.createAgentUIStreamResponse({ 
    messages,
    onError: (error) => error instanceof Error ? error.message : 'Error occurred'
  });
}

export const maxDuration = 60;
