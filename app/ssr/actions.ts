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

// ============================================
// CONVERSATION HELPERS
// ============================================

/**
 * Create a new conversation
 */
export async function createConversation(
    input: CreateConversationInput
): Promise<Conversation | null> {
    const client = createServerSupabaseClient();

    const { data, error } = await client
        .from("conversations")
        .insert({
            user_id: input.user_id,
            title: input.title ?? null,
            model: input.model ?? "gemini-2.0-flash",
            system_prompt: input.system_prompt ?? null,
            temperature: input.temperature ?? 0.7,
            max_tokens: input.max_tokens ?? 4096,
            metadata: input.metadata ?? {},
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating conversation:", error);
        return null;
    }

    return data as Conversation;
}

/**
 * Get a conversation by ID
 */
export async function getConversation(
    id: string
): Promise<Conversation | null> {
    const client = createServerSupabaseClient();

    const { data, error } = await client
        .from("conversations")
        .select()
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error getting conversation:", error);
        return null;
    }

    return data as Conversation;
}

/**
 * List conversations for a user
 */
export async function listConversations(
    userId: string,
    limit: number = 50,
    offset: number = 0
): Promise<Conversation[]> {
    const client = createServerSupabaseClient();

    const { data, error } = await client
        .from("conversations")
        .select()
        .eq("user_id", userId)
        .eq("status", "active")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error("Error listing conversations:", error);
        return [];
    }

    return data as Conversation[];
}

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

/**
 * Delete a conversation (soft delete - sets status to 'deleted')
 */
export async function deleteConversation(id: string): Promise<boolean> {
    const client = createServerSupabaseClient();

    const { error } = await client
        .from("conversations")
        .update({ status: "deleted" })
        .eq("id", id);

    if (error) {
        console.error("Error deleting conversation:", error);
        return false;
    }

    return true;
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
 * Get messages for a conversation
 */
export async function getMessages(
    conversationId: string,
    limit: number = 100
): Promise<Message[]> {
    const client = createServerSupabaseClient();

    const { data, error } = await client
        .from("messages")
        .select()
        .eq("conversation_id", conversationId)
        .order("sequence_number", { ascending: true })
        .limit(limit);

    if (error) {
        console.error("Error getting messages:", error);
        return [];
    }

    return data as Message[];
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
// ATTACHMENT HELPERS
// ============================================

/**
 * Create a new attachment
 */
export async function createAttachment(
    input: CreateAttachmentInput
): Promise<Attachment | null> {
    const client = createServerSupabaseClient();

    const { data, error } = await client
        .from("attachments")
        .insert({
            conversation_id: input.conversation_id,
            message_id: input.message_id ?? null,
            name: input.name,
            file_url: input.file_url,
            file_type: input.file_type ?? null,
            file_size: input.file_size ?? null,
            metadata: input.metadata ?? {},
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating attachment:", error);
        return null;
    }

    return data as Attachment;
}

/**
 * Get attachments for a conversation
 */
export async function getAttachments(
    conversationId: string
): Promise<Attachment[]> {
    const client = createServerSupabaseClient();

    const { data, error } = await client
        .from("attachments")
        .select()
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error getting attachments:", error);
        return [];
    }

    return data as Attachment[];
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
