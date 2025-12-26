import { createClient } from '@supabase/supabase-js';

// Types for our database
export interface Conversation {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokens_used?: number;
    created_at: string;
}

// Server-side Supabase client (for API routes)
export function createServerSupabaseClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

// Client-side Supabase client with Clerk token
export function createClerkSupabaseClient(getToken: () => Promise<string | null>) {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_KEY!,
        {
            async accessToken() {
                return await getToken();
            },
        }
    );
}

// Helper functions for conversation operations
export async function getConversations(userId: string) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as Conversation[];
}

export async function getConversationMessages(conversationId: string) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Message[];
}

export async function saveMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    tokensUsed?: number
) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            role,
            content,
            tokens_used: tokensUsed || 0,
        })
        .select()
        .single();

    if (error) throw error;

    // Update conversation's updated_at
    await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    return data as Message;
}
