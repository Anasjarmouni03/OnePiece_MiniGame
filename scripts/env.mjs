import nextEnv from '@next/env';

// Use Next's own parser, including quoted values and .env.local precedence.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV === 'development');
