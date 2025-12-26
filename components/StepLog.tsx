'use client';

import { useState } from 'react';

interface Step {
    id: string;
    type: 'thinking' | 'tool-call';
    toolName?: string;
    args?: any;
    result?: any;
    state?: string;
    content?: string;
}

interface StepLogProps {
    steps: Step[];
    isLoading: boolean;
}

export default function StepLog({ steps, isLoading }: StepLogProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const getToolIcon = (toolName: string) => {
        switch (toolName) {
            case 'calculator':
                return '🧮';
            case 'getCurrentTime':
                return '🕐';
            case 'webSearch':
                return '🔍';
            default:
                return '⚙️';
        }
    };

    const getStateColor = (state: string) => {
        switch (state) {
            case 'call':
                return 'text-yellow-400';
            case 'result':
                return 'text-green-400';
            default:
                return 'text-gray-400';
        }
    };

    return (
        <div className={`glass-panel flex flex-col transition-all duration-300 ${isExpanded ? 'w-80' : 'w-12'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
                {isExpanded && (
                    <div className="flex items-center gap-2">
                        <span className="text-lg">📋</span>
                        <h3 className="font-medium text-white">Step Log</h3>
                        {isLoading && (
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        )}
                    </div>
                )}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-0' : 'rotate-180'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Steps */}
            {isExpanded && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {steps.length === 0 && !isLoading && (
                        <div className="text-center py-8 text-gray-500">
                            <div className="text-3xl mb-2">🔮</div>
                            <p className="text-sm">Agent steps will appear here</p>
                        </div>
                    )}

                    {isLoading && steps.length === 0 && (
                        <div className="step-card animate-fade-in">
                            <div className="flex items-center gap-2 text-purple-400">
                                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm font-medium">Processing...</span>
                            </div>
                        </div>
                    )}

                    {steps.map((step, index) => (
                        <div
                            key={step.id}
                            className="step-card animate-slide-in"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {step.type === 'thinking' && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-blue-400">
                                        <span>💭</span>
                                        <span className="text-sm font-medium">Thinking</span>
                                    </div>
                                    <p className="text-xs text-gray-400 pl-6">{step.content}</p>
                                </div>
                            )}

                            {step.type === 'tool-call' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span>{getToolIcon(step.toolName || '')}</span>
                                            <span className="text-sm font-medium text-white">{step.toolName}</span>
                                        </div>
                                        <span className={`text-xs ${getStateColor(step.state || '')}`}>
                                            {step.state === 'result' ? '✓ Complete' : '⏳ Running'}
                                        </span>
                                    </div>

                                    {/* Arguments */}
                                    {step.args && (
                                        <div className="pl-6">
                                            <div className="text-xs text-gray-500 mb-1">Input:</div>
                                            <pre className="text-xs bg-black/30 rounded p-2 text-gray-300 overflow-x-auto">
                                                {JSON.stringify(step.args, null, 2)}
                                            </pre>
                                        </div>
                                    )}

                                    {/* Result */}
                                    {step.result && step.state === 'result' && (
                                        <div className="pl-6">
                                            <div className="text-xs text-gray-500 mb-1">Output:</div>
                                            <pre className="text-xs bg-green-500/10 border border-green-500/20 rounded p-2 text-green-300 overflow-x-auto">
                                                {JSON.stringify(step.result, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
