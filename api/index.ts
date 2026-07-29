/**
 * Vercel Serverless Function Entry Point
 * 
 * Imports the Express app from the server directory.
 * The server's index.ts already handles VERCEL env check.
 */
import app from '../server/src/index';

export default app;