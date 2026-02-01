import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  dbPath: process.env.DB_PATH || './data/sage.db',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // OAuth (stub for now)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || 'stub-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'stub-google-client-secret',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
  },

  apple: {
    clientId: process.env.APPLE_CLIENT_ID || 'stub-apple-client-id',
    teamId: process.env.APPLE_TEAM_ID || 'stub-apple-team-id',
    keyId: process.env.APPLE_KEY_ID || 'stub-apple-key-id',
    privateKey: process.env.APPLE_PRIVATE_KEY || '',
  },

  // OpenAI (legacy, kept for fallback)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'stub-openai-api-key',
  },

  // Anthropic Claude (primary AI provider)
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || 'stub-anthropic-api-key',
  },

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:19006',
    'http://localhost:8081',
    'http://localhost:8082',
    'https://sage-duk.pages.dev',
    'https://sagestudy.app',
    'https://www.sagestudy.app',
  ],
};
