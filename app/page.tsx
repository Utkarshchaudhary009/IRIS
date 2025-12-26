'use client';

import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import AIChat from '@/components/AIChat';

export default function Home() {
  return (
    <div className="h-[calc(100vh-104px)]">
      <SignedOut>
        <div className="flex items-center justify-center h-full">
          <div className="glass-panel p-12 text-center max-w-md">
            <div className="text-6xl mb-6">🤖</div>
            <h1 className="text-3xl font-bold gradient-text mb-4">Jarvis AI</h1>
            <p className="text-gray-400 mb-8">
              Your intelligent AI assistant powered by Gemini. Sign in to start a conversation.
            </p>
            <SignInButton mode="modal">
              <button className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity">
                Sign In to Continue
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <AIChat />
      </SignedIn>
    </div>
  );
}
