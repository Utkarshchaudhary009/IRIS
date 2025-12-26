// ============================================
// Database Types - Matching Supabase Schema
// ============================================

// Conversation Types
export interface Conversation {
    id: string;
    user_id: string;
    title: string | null;
    model: string;
    system_prompt: string | null;
    temperature: number;
    max_tokens: number;
    status: "active" | "archived" | "deleted";
    created_at: string;
    updated_at: string;
    last_message_at: string | null;
    total_input_tokens: number;
    total_output_tokens: number;
    metadata: Record<string, unknown>;
}

export interface CreateConversationInput {
    user_id: string;
    title?: string;
    model?: string;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    metadata?: Record<string, unknown>;
}

export interface UpdateConversationInput {
    title?: string;
    model?: string;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    status?: "active" | "archived" | "deleted";
    metadata?: Record<string, unknown>;
}

// Message Types
export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
    id: string;
    conversation_id: string;
    role: MessageRole;
    content: string | null;
    tool_call_id: string | null;
    tool_calls: ToolCall[] | null;
    model: string | null;
    input_tokens: number | null;
    output_tokens: number | null;
    created_at: string;
    sequence_number: number;
    metadata: Record<string, unknown>;
}

export interface ToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}

export interface CreateMessageInput {
    conversation_id: string;
    role: MessageRole;
    content?: string;
    tool_call_id?: string;
    tool_calls?: ToolCall[];
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
    metadata?: Record<string, unknown>;
}

// Attachment Types
export interface Attachment {
    id: string;
    conversation_id: string;
    message_id: string | null;
    name: string;
    file_url: string;
    file_type: string | null;
    file_size: number | null;
    created_at: string;
    metadata: Record<string, unknown>;
}

export interface CreateAttachmentInput {
    conversation_id: string;
    message_id?: string;
    name: string;
    file_url: string;
    file_type?: string;
    file_size?: number;
    metadata?: Record<string, unknown>;
}

// MCP Server Types
export type McpAuthType = "none" | "api_key" | "oauth";
export type McpServerStatus = "active" | "inactive";

export interface McpServer {
    id: string;
    user_id: string | null;
    name: string;
    description: string | null;
    server_url: string;
    auth_type: McpAuthType | null;
    auth_config: Record<string, unknown>;
    status: McpServerStatus;
    created_at: string;
    updated_at: string;
}

export interface CreateMcpServerInput {
    user_id?: string;
    name: string;
    description?: string;
    server_url: string;
    auth_type?: McpAuthType;
    auth_config?: Record<string, unknown>;
    status?: McpServerStatus;
}

// MCP Tool Types
export interface McpTool {
    id: string;
    server_id: string;
    tool_name: string;
    description: string | null;
    input_schema: Record<string, unknown>;
    enabled: boolean;
    created_at: string;
}

export interface CreateMcpToolInput {
    server_id: string;
    tool_name: string;
    description?: string;
    input_schema: Record<string, unknown>;
    enabled?: boolean;
}

// Agent Configuration Types
export interface AgentConfig {
    id: string;
    user_id: string | null;
    name: string;
    description: string | null;
    model: string;
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    max_steps: number;
    enabled_tools: string[];
    created_at: string;
    updated_at: string;
}

export interface CreateAgentConfigInput {
    user_id?: string;
    name: string;
    description?: string;
    model?: string;
    system_prompt: string;
    temperature?: number;
    max_tokens?: number;
    max_steps?: number;
    enabled_tools?: string[];
}
