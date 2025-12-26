'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import StepLog from './StepLog';
import { useUser } from '@clerk/nextjs';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    parts?: any[];
}

export default function AIChat() {
    const { user } = useUser();
    const [conversationId, setConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
        api: '/api/chat',
        body: { conversationId },
        onResponse: (response) => {
            const newConvId = response.headers.get('X-Conversation-Id');
            if (newConvId && !conversationId) {
                setConversationId(newConvId);
            }
        },
    });

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Extract steps for the step log
    const extractSteps = () => {
        const steps: any[] = [];
        messages.forEach((message) => {
            if (message.parts) {
                message.parts.forEach((part: any, index: number) => {
                    if (part.type === 'tool-invocation') {
                        steps.push({
                            id: `${message.id}-tool-${index}`,
                            type: 'tool-call',
                            toolName: part.toolInvocation?.toolName || part.toolName,
                            args: part.toolInvocation?.args || part.args,
                            result: part.toolInvocation?.result || part.result,
                            state: part.toolInvocation?.state || part.state,
                        });
                    } else if (part.type === 'reasoning' || part.type === 'thinking') {
                        steps.push({
                            id: `${message.id}-thinking-${index}`,
                            type: 'thinking',
                            content: part.content || part.text,
                        });
                    }
                });
            }
        });
        return steps;
    };

    if (!user) {
        return (
            <div className="glass-panel p-8 text-center">
                <h2 className="text-xl font-semibold text-white mb-4">Welcome to Jarvis AI</h2>
                <p className="text-gray-300">Please sign in to start chatting.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full gap-4">
            {/* Chat Panel */}
            <div className="flex-1 flex flex-col glass-panel">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {messages.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-4">🤖</div>
                            <h2 className="text-xl font-semibold text-white mb-2">Hello, {user.firstName || 'there'}!</h2>
                            <p className="text-gray-400">I'm Jarvis, your AI assistant. Ask me anything!</p>
                            <div className="mt-6 flex flex-wrap justify-center gap-2">
                                {['What time is it?', 'Calculate 25 * 47', 'Search for AI news'].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        onClick={() => {
                                            const fakeEvent = { target: { value: suggestion } } as any;
                                            handleInputChange(fakeEvent);
                                        }}
                                        className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                        : 'glass-message text-gray-100'
                                    }`}
                            >
                                <div className="text-xs text-white/60 mb-1">
                                    {message.role === 'user' ? 'You' : 'Jarvis'}
                                </div>
                                <div className="whitespace-pre-wrap">{message.content}</div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="glass-message rounded-2xl px-4 py-3">
                                <div className="flex items-center gap-2 text-gray-300">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex justify-center">
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-2 text-red-300">
                                Error: {error.message}
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
                    <div className="flex gap-3">
                        <input
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Ask Jarvis anything..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            {isLoading ? '...' : 'Send'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Step Log Panel */}
            <StepLog steps={extractSteps()} isLoading={isLoading} />
        </div>
    );
}
