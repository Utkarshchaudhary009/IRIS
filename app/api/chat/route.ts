import { streamText, tool, UIMessage } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from "@/app/ssr/client";