import { z } from "zod";

// ============================================
// Agent Types - For ToolLoopAgent API
// ============================================

// Tool Definition Schema
export const toolParameterSchema = z.object({
    type: z.string(),
    description: z.string().optional(),
    enum: z.array(z.string()).optional(),
});

export const toolInputSchema = z.object({
    type: z.literal("object"),
    properties: z.record(toolParameterSchema),
    required: z.array(z.string()).optional(),
});

export type ToolInputSchema = z.infer<typeof toolInputSchema>;

// Agent Request/Response Types
export interface AgentRequest {
    messages: AgentMessage[];
    conversationId?: string;
    config?: AgentConfigOverrides;
}

export interface AgentMessage {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    toolCallId?: string;
    toolCalls?: AgentToolCall[];
}

export interface AgentToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}

export interface AgentConfigOverrides {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    maxSteps?: number;
    tools?: string[];
}

// Tool Execution Types
export interface ToolExecutionResult {
    success: boolean;
    data?: unknown;
    error?: string;
}

// Streaming Response Parts
export interface TextPart {
    type: "text";
    text: string;
}

export interface ToolCallPart {
    type: "tool-call";
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    state: "partial-call" | "call" | "result";
    result?: unknown;
}

export type MessagePart = TextPart | ToolCallPart;

// Default Configuration
export const DEFAULT_AGENT_CONFIG = {
    model: "gemini-2.0-flash",
    systemPrompt: `You are an intelligent AI assistant with access to tools. Use the tools when helpful to answer the user's questions. Be concise and helpful.`,
    temperature: 0.7,
    maxTokens: 4096,
    maxSteps: 10,
} as const;
