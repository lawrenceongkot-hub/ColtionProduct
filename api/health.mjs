/**
 * Minimal health check - NO Express, NO Prisma, NO dependencies
 * Pure Vercel serverless function format.
 */
export default function handler(req, res) {
  const body = JSON.stringify({
    status: 'ok',
    server: 'raw-function',
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV || 'not set',
    }
  });
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}