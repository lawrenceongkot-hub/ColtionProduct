/**
 * Vercel Serverless Function Entry Point
 * 
 * This file imports the Express app from the server directory.
 * Vercel routes /api/* requests to this handler.
 * The server's index.ts already handles VERCEL env check (line 140).
 */
import app from '../server/src/index';

export default app;