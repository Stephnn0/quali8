/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable no-console */
/// <reference types="vite/client" />

import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Readonly<EnvSchemaType> {}
  }

  interface ImportMetaEnv extends Readonly<ViteEnvSchemaType> {}

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

type ViteEnvSchemaType = ExtractVITE<EnvSchemaType>;

type ExtractVITE<T> = {
  [K in keyof T as K extends `VITE_${string}` ? K : never]: T[K];
};

type EnvSchemaType = z.infer<typeof envSchema>;

const envSchema = z.object({
  // Node.js
  NODE_ENV: z.enum(["development", "production", "test", "staging"]),

  // Shopify App
  SCOPES: z.string().min(2),
  SHOPIFY_API_SECRET: z.string().min(2),
  SHOPIFY_API_KEY: z.string().min(2),
  SHOPIFY_APP_HANDLE: z.string().min(2),

  // Plans
  SHOPIFY_FREE_PLAN_ID: z.string().min(2),
  SHOPIFY_ADVANCE_PLAN_ID: z.string().min(2).optional(),

  // AI assistant (optional — the dashboard falls back to curated briefs)
  GEMINI_API_KEY: z.string().min(2).optional(),

  // Background jobs heartbeat (optional — /jobs/tick returns 503 without it)
  CRON_SECRET: z.string().min(16).optional(),

  // Vite (client)
  VITE_SHOPIFY_API_KEY: z.string().min(2),

  // Database
  DATABASE_URL: z.string().min(2),
});

const {
  // Node.js
  NODE_ENV,

  // Shopify App
  SCOPES,
  SHOPIFY_API_SECRET,
  SHOPIFY_API_KEY,
  SHOPIFY_APP_HANDLE,

  // Plans
  SHOPIFY_FREE_PLAN_ID,

  // Vite (client)
  VITE_SHOPIFY_API_KEY,

  // Database
  DATABASE_URL,
} = process.env;

const parsedEnv = envSchema.safeParse({
  // Node.js
  NODE_ENV,

  // Shopify App
  SCOPES,
  SHOPIFY_API_SECRET,
  SHOPIFY_API_KEY,
  SHOPIFY_APP_HANDLE,

  // Plans
  SHOPIFY_FREE_PLAN_ID,

  // Vite (client)
  VITE_SHOPIFY_API_KEY,

  // Database
  DATABASE_URL,
});

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables :", parsedEnv.error.format());

  process.exit(1);
}
export const typedSafedEnv = parsedEnv.data;
