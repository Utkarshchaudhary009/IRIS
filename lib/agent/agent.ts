import { streamText, convertToModelMessages, UIMessage, stepCountIs, ToolSet } from "ai";
import { google } from "@ai-sdk/google";
import { builtinTools, BuiltinToolName } from "@/lib/agent/tools";
import { DEFAULT_AGENT_CONFIG, AgentConfigOverrides } from "@/lib/types";

/**
 * ToolLoopAgent
 * 
 * An agent that uses the "Tool Loop" pattern:
 * 1. Receive user input
 * 2. Model decides to call tools
 * 3. Execute tools
 * 4. Feed results back to model
 * 5. Repeat until final answer or max steps
 */
export class ToolLoopAgent {
    private config: AgentConfigOverrides;

    constructor(config: AgentConfigOverrides = {}) {
        this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    }

    /**
     * Stream a response from the agent given a history of messages
     * 
     * @param messages The conversation history
     * @param callbacks Optional callbacks for lifecycle events
     * @returns A streamable response object from Vercel AI SDK
     */
    async streamResponse(
        messages: UIMessage[],
        callbacks?: {
            onFinish?: (text: string, usage: any) => Promise<void>;
        }
    ) {
        const modelName = this.config.model || DEFAULT_AGENT_CONFIG.model;
        const systemPrompt = this.config.systemPrompt || DEFAULT_AGENT_CONFIG.systemPrompt;
        const maxSteps = this.config.maxSteps || DEFAULT_AGENT_CONFIG.maxSteps;
        const temperature = this.config.temperature ?? DEFAULT_AGENT_CONFIG.temperature;
        const maxTokens = this.config.maxTokens || DEFAULT_AGENT_CONFIG.maxTokens;

        // Configure available tools
        const enabledTools = this.config.tools || Object.keys(builtinTools);
        const tools: ToolSet = {};

        for (const toolName of enabledTools) {
            if (toolName in builtinTools) {
                tools[toolName] = builtinTools[toolName as BuiltinToolName];
            }
        }

        // Execute the tool loop using Vercel AI SDK
        return streamText({
            model: google(modelName),
            system: systemPrompt,
            messages: await convertToModelMessages(messages),
            tools,
            maxSteps,
            temperature,
            maxTokens,
            // Stop after maxSteps to prevent infinite loops
            stopWhen: stepCountIs(maxSteps),

            onFinish: async ({ text, usage }) => {
                if (callbacks?.onFinish && text) {
                    await callbacks.onFinish(text, usage);
                }
            },
        });
    }
}
