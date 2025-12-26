import { streamText, convertToModelMessages, UIMessage, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import { auth } from "@clerk/nextjs/server";
import {
    createConversation,
    getConversation,
    getMessages,
    createMessage,
} from "@/app/ssr/actions";
import { builtinTools } from "@/lib/agent/tools";
import { DEFAULT_AGENT_CONFIG } from "@/lib/types";
import type { Message, AgentRequest } from "@/lib/types";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

/**
 * ToolLoopAgent API Route
 * 
 * Implements a tool-in-loop pattern where the AI can call tools
 * multiple times before generating a final response.
 */
export async function POST(req: Request) {
    try {
        // 1. Authenticate with Clerk
        const { userId } = await auth();

        if (!userId) {
            return new Response("Unauthorized", { status: 401 });
        }

        // 2. Parse request
        const body: AgentRequest = await req.json();
        const { messages, conversationId, config } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response("Messages are required", { status: 400 });
        }

        // 3. Load or create conversation
        let conversation;
        let messageHistory: Message[] = [];

        if (conversationId) {
            // Load existing conversation
            conversation = await getConversation(conversationId);

            if (!conversation) {
                return new Response("Conversation not found", { status: 404 });
            }

            // Verify ownership
            if (conversation.user_id !== userId) {
                return new Response("Unauthorized", { status: 403 });
            }

            // Load message history
            messageHistory = await getMessages(conversationId);
        } else {
            // Create new conversation
            const firstUserMessage = messages.find((m) => m.role === "user");
            const title = firstUserMessage?.content?.slice(0, 100) || "New Conversation";

            conversation = await createConversation({
                user_id: userId,
                title,
                model: config?.model || DEFAULT_AGENT_CONFIG.model,
                system_prompt: config?.systemPrompt || DEFAULT_AGENT_CONFIG.systemPrompt,
                temperature: config?.temperature || DEFAULT_AGENT_CONFIG.temperature,
                max_tokens: config?.maxTokens || DEFAULT_AGENT_CONFIG.maxTokens,
            });

            if (!conversation) {
                return new Response("Failed to create conversation", { status: 500 });
            }
        }

        // 4. Save incoming user messages to database
        for (const msg of messages) {
            if (msg.role === "user") {
                await createMessage({
                    conversation_id: conversation.id,
                    role: msg.role,
                    content: msg.content,
                });
            }
        }

        // 5. Convert message history to AI SDK format
        const historyMessages: UIMessage[] = messageHistory.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content || "",
            parts: msg.content ? [{ type: "text" as const, text: msg.content }] : [],
        }));

        // Add new messages
        const newMessages: UIMessage[] = messages.map((msg, index) => ({
            id: `new-${index}`,
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
            parts: [{ type: "text" as const, text: msg.content }],
        }));

        const allMessages = [...historyMessages, ...newMessages];

        // 6. Determine which tools to use
        const enabledTools = config?.tools || Object.keys(builtinTools);
        const tools: Record<string, typeof builtinTools[keyof typeof builtinTools]> = {};

        for (const toolName of enabledTools) {
            if (toolName in builtinTools) {
                tools[toolName] = builtinTools[toolName as keyof typeof builtinTools];
            }
        }

        // 7. Call streamText with tool-in-loop pattern
        const result = streamText({
            model: google(config?.model || DEFAULT_AGENT_CONFIG.model),
            system: config?.systemPrompt || conversation.system_prompt || DEFAULT_AGENT_CONFIG.systemPrompt,
            messages: await convertToModelMessages(allMessages),
            stopWhen: stepCountIs(config?.maxSteps || DEFAULT_AGENT_CONFIG.maxSteps),
            tools,
            onFinish: async ({ text, usage }) => {
                // Save assistant response to database
                if (text) {
                    await createMessage({
                        conversation_id: conversation!.id,
                        role: "assistant",
                        content: text,
                        model: config?.model || DEFAULT_AGENT_CONFIG.model,
                        input_tokens: usage?.promptTokens,
                        output_tokens: usage?.completionTokens,
                    });
                }
            },
        });

        // 8. Return streaming response with conversation ID in header
        const response = result.toUIMessageStreamResponse();

        // Add conversation ID to response headers
        const headers = new Headers(response.headers);
        headers.set("X-Conversation-Id", conversation.id);

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    } catch (error) {
        console.error("Agent API error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}

/**
 * GET endpoint to retrieve conversation info
 */
export async function GET(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new Response("Unauthorized", { status: 401 });
        }

        const url = new URL(req.url);
        const conversationId = url.searchParams.get("conversationId");

        if (!conversationId) {
            return new Response("conversationId is required", { status: 400 });
        }

        const conversation = await getConversation(conversationId);

        if (!conversation) {
            return new Response("Conversation not found", { status: 404 });
        }

        if (conversation.user_id !== userId) {
            return new Response("Unauthorized", { status: 403 });
        }

        const messages = await getMessages(conversationId);

        return new Response(
            JSON.stringify({
                conversation,
                messages,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Agent API error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}
