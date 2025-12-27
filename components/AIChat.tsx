"use client";

import { useChat } from "ai/react";
import { useEffect, useState, useRef } from "react";
import { 
  createConversation, 
  createMessage, 
  getMessages,
  getAttachments,
  getConversation,
  createAttachment,
  getAgentConfig,
  updateMessageTokens
} from "@/app/supabase/actions";
import type { Conversation, Message, Attachment, AgentConfig } from "@/lib/types";

// AI Elements Components
import { Conversation as ConversationContainer } from "@/components/ai-elements/conversation";
import { Message as MessageComponent } from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { PromptInput } from "@/components/ai-elements/prompt-input";
import { Tool } from "@/components/ai-elements/tool";
import { Loader } from "@/components/ai-elements/loader";
import { Actions } from "@/components/ai-elements/actions";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { Reasoning } from "@/components/ai-elements/reasoning";
import { Context } from "@/components/ai-elements/context";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { Queue } from "@/components/ai-elements/queue";
import { ChainOfThought } from "@/components/ai-elements/chain-of-thought";
import { Sources } from "@/components/ai-elements/sources";
import { Branch } from "@/components/ai-elements/branch";

interface ToolLoopChatProps {
  userId: string;
  conversationId?: string;
  agentConfigId?: string;
  initialMessages?: Message[];
}

export default function ToolLoopChat({
  userId,
  conversationId: initialConversationId,
  agentConfigId,
  initialMessages = []
}: ToolLoopChatProps) {
  // State Management
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 });
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [branches, setBranches] = useState<Map<string, Message[]>>(new Map());

  const conversationRef = useRef<HTMLDivElement>(null);

  // Suggestion prompts
  const suggestions = [
    "Explain this concept in detail",
    "Show me an example",
    "What are the best practices?",
    "Help me debug this issue"
  ];

  // useChat hook for streaming
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
    append,
    setMessages,
  } = useChat({
    api: "/api/agent/chat",
    body: {
      conversationId,
      agentConfigId,
      userId,
    },
    initialMessages: initialMessages.map(msg => ({
      id: msg.id,
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content || "",
      toolInvocations: msg.tool_calls?.map(tc => ({
        toolCallId: tc.id,
        toolName: tc.function.name,
        args: JSON.parse(tc.function.arguments),
        state: "result" as const,
        result: null,
      })),
    })),
    onResponse: async (response) => {
      // Handle response metadata
      const metadata = response.headers.get("x-metadata");
      if (metadata) {
        const data = JSON.parse(metadata);
        if (data.inputTokens && data.outputTokens) {
          setTokenUsage(prev => ({
            input: prev.input + data.inputTokens,
            output: prev.output + data.outputTokens,
          }));
        }
      }
    },
    onFinish: async (message) => {
      // Save message to database
      if (conversationId) {
        const savedMessage = await createMessage({
          conversation_id: conversationId,
          role: message.role as "user" | "assistant" | "system",
          content: message.content,
          tool_calls: message.toolInvocations?.map(ti => ({
            id: ti.toolCallId,
            type: "function" as const,
            function: {
              name: ti.toolName,
              arguments: JSON.stringify(ti.args),
            },
          })),
        });

        // Update token counts
        if (savedMessage && tokenUsage.input > 0) {
          await updateMessageTokens(savedMessage.id, tokenUsage.input, tokenUsage.output);
        }
      }
    },
  });

  // Initialize conversation and load history
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoadingHistory(true);

        // Load or create conversation
        if (conversationId) {
          const conv = await getConversation(conversationId);
          setConversation(conv);
          
          // Load messages if not already loaded
          if (initialMessages.length === 0) {
            const msgs = await getMessages(conversationId);
            setMessages(msgs.map(msg => ({
              id: msg.id,
              role: msg.role as "user" | "assistant" | "system",
              content: msg.content || "",
              toolInvocations: msg.tool_calls?.map(tc => ({
                toolCallId: tc.id,
                toolName: tc.function.name,
                args: JSON.parse(tc.function.arguments),
                state: "result" as const,
                result: null,
              })),
            })));
          }

          // Load attachments
          const atts = await getAttachments(conversationId);
          setAttachments(atts);
        } else {
          // Create new conversation
          const newConv = await createConversation({
            user_id: userId,
            title: "New Conversation",
            model: agentConfig?.model || "gemini-2.0-flash",
            system_prompt: agentConfig?.system_prompt,
          });
          
          if (newConv) {
            setConversationId(newConv.id);
            setConversation(newConv);
          }
        }

        // Load agent config
        if (agentConfigId) {
          const config = await getAgentConfig(agentConfigId);
          setAgentConfig(config);
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    initialize();
  }, [conversationId, userId, agentConfigId]);

  // Handle file attachments
  const handleAttachment = async (file: File) => {
    if (!conversationId) return;

    try {
      // In production, upload to storage and get URL
      const fileUrl = URL.createObjectURL(file);
      
      const attachment = await createAttachment({
        conversation_id: conversationId,
        name: file.name,
        file_url: fileUrl,
        file_type: file.type,
        file_size: file.size,
      });

      if (attachment) {
        setAttachments(prev => [...prev, attachment]);
      }
    } catch (error) {
      console.error("Error uploading attachment:", error);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    append({
      role: "user",
      content: suggestion,
    });
  };

  // Handle message actions (copy, regenerate, etc.)
  const handleMessageAction = async (messageId: string, action: string) => {
    switch (action) {
      case "copy":
        const message = messages.find(m => m.id === messageId);
        if (message) {
          await navigator.clipboard.writeText(message.content);
        }
        break;
      case "regenerate":
        await reload();
        break;
      case "branch":
        // Create a new branch from this message
        const branchPoint = messages.findIndex(m => m.id === messageId);
        if (branchPoint !== -1) {
          const branchedMessages = messages.slice(0, branchPoint + 1);
          setBranches(prev => new Map(prev).set(messageId, branchedMessages));
        }
        break;
    }
  };

  // Calculate context usage percentage
  const contextUsagePercent = conversation 
    ? Math.min((tokenUsage.input + tokenUsage.output) / conversation.max_tokens * 100, 100)
    : 0;

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader text="Loading conversation..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with Context Usage */}
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ToolLoop Agent</h1>
          <p className="text-sm text-muted-foreground">
            {conversation?.title || "New Conversation"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Context 
            current={tokenUsage.input + tokenUsage.output}
            max={conversation?.max_tokens || 4096}
            percentage={contextUsagePercent}
          />
          {agentConfig && (
            <div className="text-sm text-muted-foreground">
              Model: {agentConfig.model}
            </div>
          )}
        </div>
      </div>

      {/* Message Queue */}
      {messageQueue.length > 0 && (
        <div className="border-b p-2">
          <Queue 
            items={messageQueue}
            onRemove={(index) => {
              setMessageQueue(prev => prev.filter((_, i) => i !== index));
            }}
          />
        </div>
      )}

      {/* Conversation Container */}
      <div className="flex-1 overflow-hidden">
        <ConversationContainer ref={conversationRef}>
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold">Start a conversation</h2>
                <p className="text-muted-foreground">
                  Ask me anything or try one of the suggestions below
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={message.id} className="group">
              <MessageComponent
                role={message.role}
                avatar={message.role === "assistant" ? "🤖" : "👤"}
              >
                {/* Main message content */}
                <Response content={message.content} />

                {/* Tool invocations */}
                {message.toolInvocations && message.toolInvocations.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {message.toolInvocations.map((tool) => (
                      <Tool
                        key={tool.toolCallId}
                        toolName={tool.toolName}
                        args={tool.args}
                        result={tool.result}
                        state={tool.state}
                      />
                    ))}
                  </div>
                )}

                {/* Reasoning display (for reasoning models) */}
                {message.role === "assistant" && message.content.includes("[REASONING]") && (
                  <Reasoning 
                    content={message.content.match(/\[REASONING\](.*?)\[\/REASONING\]/s)?.[1] || ""}
                  />
                )}

                {/* Chain of thought */}
                {message.role === "assistant" && message.toolInvocations && message.toolInvocations.length > 1 && (
                  <ChainOfThought 
                    steps={message.toolInvocations.map(ti => ({
                      title: ti.toolName,
                      content: JSON.stringify(ti.args, null, 2),
                    }))}
                  />
                )}

                {/* Message actions */}
                <Actions
                  onCopy={() => handleMessageAction(message.id, "copy")}
                  onRegenerate={message.role === "assistant" ? () => handleMessageAction(message.id, "regenerate") : undefined}
                  onBranch={() => handleMessageAction(message.id, "branch")}
                />

                {/* Branch indicator */}
                {branches.has(message.id) && (
                  <Branch 
                    branches={[
                      { id: "main", label: "Main conversation" },
                      { id: message.id, label: "Branched conversation" }
                    ]}
                    onSelect={(branchId) => {
                      if (branchId === message.id) {
                        const branchedMsgs = branches.get(message.id);
                        if (branchedMsgs) {
                          setMessages(branchedMsgs);
                        }
                      }
                    }}
                  />
                )}
              </MessageComponent>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <MessageComponent role="assistant" avatar="🤖">
              <Loader text="Thinking..." />
            </MessageComponent>
          )}

          {/* Error display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-destructive font-semibold">Error</p>
              <p className="text-sm">{error.message}</p>
            </div>
          )}
        </ConversationContainer>
      </div>

      {/* Suggestions */}
      {messages.length === 0 && !isLoading && (
        <div className="border-t p-4">
          <div className="flex gap-2 flex-wrap justify-center">
            {suggestions.map((suggestion, index) => (
              <Suggestion
                key={index}
                text={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Attachments display */}
      {attachments.length > 0 && (
        <div className="border-t p-2 flex gap-2 overflow-x-auto">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md text-sm">
              <span>📎</span>
              <span>{att.name}</span>
              <span className="text-muted-foreground">
                ({(att.file_size! / 1024).toFixed(1)} KB)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <PromptInput
            value={input}
            onChange={handleInputChange}
            onAttachment={handleAttachment}
            placeholder="Ask ToolLoop Agent anything..."
            disabled={isLoading}
            showModelSelector
            models={["gemini-2.0-flash", "gpt-4", "claude-3-opus"]}
            selectedModel={conversation?.model || "gemini-2.0-flash"}
            onModelChange={async (model) => {
              // Update conversation model
              if (conversation) {
                // This would need an updateConversation function
                setConversation({ ...conversation, model });
              }
            }}
          />
        </form>

        {/* Stop generation button */}
        {isLoading && (
          <div className="flex justify-center mt-2">
            <button
              onClick={stop}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
            >
              Stop generating
            </button>
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
        <div>
          Messages: {messages.length} | 
          Tokens: {tokenUsage.input.toLocaleString()} in / {tokenUsage.output.toLocaleString()} out
        </div>
        <div>
          {conversation && `Conversation ID: ${conversation.id.slice(0, 8)}...`}
        </div>
      </div>
    </div>
  );
}
