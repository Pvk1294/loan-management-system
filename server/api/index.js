/**
 * Entry point when the API runs on Vercel.
 *
 * Locally and on a normal host, `src/index.ts` starts a long-lived server. On
 * Vercel there is no server to start: each request is handed to this function.
 * It reuses the same Express app, and opens the database connection once per
 * warm instance instead of once per request.
 *
 * This file is plain JavaScript on purpose: it loads the compiled output of
 * `npm run build`, so Vercel runs exactly the code that `tsc` checked.
 */
const { createApp } = require('../dist/app');
const { connectDatabase } = require('../dist/config/db');

const app = createApp();
let connecting;

module.exports = async (req, res) => {
  try {
    connecting ??= connectDatabase();
    await connecting;
  } catch (err) {
    connecting = undefined; // let the next request try again
    console.error('Database connection failed:', err);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'DATABASE_UNAVAILABLE', message: 'The service is starting up. Please try again in a moment.' } }));
    return;
  }
  return app(req, res);
};
