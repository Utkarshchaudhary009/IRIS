import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jarvis AI - Intelligent Assistant',
  description: 'AI-powered assistant with tool execution and conversation memory',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#a855f7',
          colorBackground: '#1a1a2e',
        },
      }}
    >
      <html lang="en">
        <body>
          <header>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">Jarvis AI</span>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'w-9 h-9',
                    },
                  }}
                />
              </div>
            </SignedIn>
          </header>
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
