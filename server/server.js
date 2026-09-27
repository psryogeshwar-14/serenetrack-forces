import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';

import profileRouter from './routes/profile.js';
import logsRouter from './routes/logs.js';
import analyticsRouter from './routes/analytics.js';
import backupRouter from './routes/backup.js';
import aiRouter from './routes/ai.js';
import forcesRouter from './routes/forces.js';
import './db.js'; // Ensure database initialization & auto-seeding
import './forcesDb.js'; // Initialize forces personnel & welfare database for PS #26186

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'SereneTrack - Uniformed Forces Stress & Welfare Monitoring System',
    sihProblemStatementId: '26186',
    organization: 'Ministry of Home Affairs / CRPF Police II Division',
    version: '2.0.0-forces',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    node: process.version
  });
});

// Mount API Routers
app.use('/api/profile', profileRouter);
app.use('/api/logs', logsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/backup', backupRouter);
app.use('/api/ai', aiRouter);
app.use('/api/forces', forcesRouter);

// Serve Frontend Static Assets
app.use(express.static(PUBLIC_DIR));

// Fallback to index.html for SPA client navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Start Server when executed directly
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===================================================`);
    console.log(`  🌿 SereneTrack Server running at: http://localhost:${PORT}`);
    console.log(`  📊 REST API available at:       http://localhost:${PORT}/api/health`);
    console.log(`  💾 Persistent SQLite Database:  server/data/serenetrack.db`);
    console.log(`===================================================`);
  });
}

export default app;
