import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // The end-to-end suite shares one database, so files must not run in parallel.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: process.env.MONGODB_URI_TEST ?? 'mongodb://127.0.0.1:27017/lms_test',
      JWT_SECRET: 'test-secret-that-is-long-enough-for-tests',
    },
  },
});
