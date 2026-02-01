import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { initializeDatabase } from './db/index.js';
import apiRouter from './api/index.js';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Production route restriction - only allow waitlist and health endpoints
if (config.nodeEnv === 'production') {
  app.use('/api', (req, res, next) => {
    const allowedPaths = ['/health', '/waitlist', '/waitlist/count'];
    const isAllowed = allowedPaths.some(path => req.path === path || req.path.startsWith(path + '/'));

    if (isAllowed) {
      next();
    } else {
      res.status(403).json({ success: false, error: 'Endpoint not available' });
    }
  });
}

// API routes
app.use('/api', apiRouter);

// Serve OpenAPI spec for ChatGPT plugin
app.get('/openapi.yaml', (_req, res) => {
  res.sendFile('openapi/spec.yaml', { root: './src' });
});

// Serve plugin manifest for ChatGPT
app.get('/.well-known/ai-plugin.json', (_req, res) => {
  res.sendFile('openapi/plugin.json', { root: './src' });
});

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Initialize database and start server
async function start() {
  try {
    initializeDatabase();
    console.log('Database initialized');

    app.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🎴 Sage API Server                                     ║
║                                                          ║
║   Running at: http://localhost:${config.port}                   ║
║   Environment: ${config.nodeEnv.padEnd(40)}║
║                                                          ║
║   API Endpoints:                                         ║
║   • GET  /api/health          - Health check             ║
║   • POST /api/auth/google     - Google OAuth             ║
║   • POST /api/auth/apple      - Apple OAuth              ║
║   • GET  /api/auth/me         - Current user profile     ║
║   • GET  /api/decks           - List decks               ║
║   • POST /api/decks           - Create deck              ║
║   • GET  /api/study/due       - Get due cards            ║
║   • POST /api/study/review    - Submit review            ║
║   • POST /api/ai/generate-from-topic - AI generation     ║
║   • GET  /api/public/decks    - Browse public decks      ║
║                                                          ║
║   ChatGPT Plugin:                                        ║
║   • GET /.well-known/ai-plugin.json                      ║
║   • GET /openapi.yaml                                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
