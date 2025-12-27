"use server";

import { createServerSupabaseClient } from "./client";
import type {
    Conversation,
    CreateConversationInput,
    UpdateConversationInput,
    Message,
    CreateMessageInput,
    Attachment,
    CreateAttachmentInput,
    AgentConfig,
} from "@/lib/types";

/**
 * Update a conversation
 */
export async function updateConversation(
    id: string,
    updates: UpdateConversationInput
): Promise<Conversation | null> {
    const client = createServerSupabaseClient();

    const { data, error } = await client
        .from("conversations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating conversation:", error);
        return null;
    }

    return data as Conversation;
}

// ============================================
// MESSAGE HELPERS
// ============================================

/**
 * Create a new message
 */
export async function createMessage(
    input: CreateMessageInput
): Promise<Message | null> {
    const client = createServerSupabaseClient();

    const { data, error } = await client
        .from("messages")
        .insert({
            conversation_id: input.conversation_id,
            role: input.role,
            content: input.content ?? null,
            tool_call_id: input.tool_call_id ?? null,
            tool_calls: input.tool_calls ?? null,
            model: input.model ?? null,
            input_tokens: input.input_tokens ?? null,
            output_tokens: input.output_tokens ?? null,
            metadata: input.metadata ?? {},
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating message:", error);
        return null;
    }

    return data as Message;
}

/**
 * Update message token counts
 */
export async function updateMessageTokens(
    messageId: string,
    inputTokens: number,
    outputTokens: number
): Promise<Message | null> {
    const client = createServerSupabaseClient();

    const { data, error } = await client
        .from("messages")
        .update({
            input_tokens: inputTokens,
            output_tokens: outputTokens,
        })
        .eq("id", messageId)
        .select()
        .single();

    if (error) {
        console.error("Error updating message tokens:", error);
        return null;
    }

    return data as Message;
}


// ============================================
// AGENT CONFIG HELPERS
// ============================================

/**
 * Get an agent config by ID
 */
export async function getAgentConfig(
    id: string
): Promise<AgentConfig | null> {
    const client = createServerSupabaseClient();

    const { data, error } = await client
        .from("agent_configs")
        .select()
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error getting agent config:", error);
        return null;
    }

    return data as AgentConfig;
}

/**
 * List agent configs (global and user-specific)
 */
export async function listAgentConfigs(
    userId?: string
): Promise<AgentConfig[]> {
    const client = createServerSupabaseClient();

    let query = client.from("agent_configs").select();

    if (userId) {
        // Get global configs (user_id is null) and user-specific configs
        query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    } else {
        // Get only global configs
        query = query.is("user_id", null);
    }

    const { data, error } = await query.order("name", { ascending: true });

    if (error) {
        console.error("Error listing agent configs:", error);
        return [];
    }

    return data as AgentConfig[];
}
