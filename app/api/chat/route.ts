import { streamText, tool, UIMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

// Supabase client for conversation storage
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new Response('Unauthorized', { status: 401 });
        }

        const { messages, conversationId }: { messages: UIMessage[]; conversationId?: string } = await req.json();

        // Create or update conversation in Supabase
        let convId = conversationId;
        if (!convId) {
            const { data, error } = await supabase
                .from('conversations')
                .insert({ user_id: userId, title: messages[0]?.content?.slice(0, 50) || 'New Chat' })
                .select('id')
                .single();

            if (!error && data) {
                convId = data.id;
            }
        }

        const result = streamText({
            model: google('gemini-2.0-flash'),
            system: `You are Jarvis, a helpful AI assistant. You have access to tools to help users.
      
When asked to perform calculations, use the calculator tool.
When asked about the current time or date, use the getCurrentTime tool.
When asked to search for information, use the webSearch tool.

Always be helpful, concise, and friendly. Show your reasoning when solving problems.`,
            messages,
            maxSteps: 5,
            tools: {
                calculator: tool({
                    description: 'Perform mathematical calculations. Use this for any math operations.',
                    parameters: z.object({
                        expression: z.string().describe('The mathematical expression to evaluate, e.g., "15 * 23 + 7"'),
                    }),
                    execute: async ({ expression }) => {
                        try {
                            // Safe math evaluation
                            const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '');
                            const result = Function(`"use strict"; return (${sanitized})`)();
                            return { expression, result: result.toString(), success: true };
                        } catch (error) {
                            return { expression, error: 'Invalid expression', success: false };
                        }
                    },
                }),
                getCurrentTime: tool({
                    description: 'Get the current date and time. Use this when users ask about time or date.',
                    parameters: z.object({
                        timezone: z.string().optional().describe('Timezone like "Asia/Kolkata" or "America/New_York"'),
                    }),
                    execute: async ({ timezone }) => {
                        const now = new Date();
                        const options: Intl.DateTimeFormatOptions = {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZone: timezone || 'Asia/Kolkata',
                        };
                        return {
                            formatted: now.toLocaleDateString('en-US', options),
                            iso: now.toISOString(),
                            timezone: timezone || 'Asia/Kolkata',
                        };
                    },
                }),
                webSearch: tool({
                    description: 'Search the web for information. Use this when users ask about current events, facts, or need up-to-date information.',
                    parameters: z.object({
                        query: z.string().describe('The search query'),
                    }),
                    execute: async ({ query }) => {
                        // Placeholder for web search - integrate with a real API in production
                        return {
                            query,
                            results: [
                                {
                                    title: 'Search Result Placeholder',
                                    snippet: `This is a placeholder for search results about "${query}". In production, integrate with a search API like Tavily, Exa, or Google Custom Search.`,
                                    url: 'https://example.com',
                                },
                            ],
                            note: 'Web search is currently in demo mode.',
                        };
                    },
                }),
            },
            onFinish: async ({ text, usage }) => {
                // Save the assistant response to Supabase
                if (convId) {
                    await supabase.from('messages').insert({
                        conversation_id: convId,
                        role: 'assistant',
                        content: text,
                        tokens_used: usage?.totalTokens || 0,
                    });
                }
            },
        });

        // Return the response with conversation ID in headers
        const response = result.toDataStreamResponse();
        if (convId) {
            response.headers.set('X-Conversation-Id', convId);
        }
        return response;
    } catch (error) {
        console.error('Chat API error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
