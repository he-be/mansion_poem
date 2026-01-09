/**
 * Application Configuration
 */

// API Base URL
// For local development with dev-server proxy, this is just empty or '/'
// If pointing directly to a different server, change it here.
export const API_BASE_URL = '/api';

// LLM Configuration
export const LLM_CONFIG = {
    // Default timeout for generation requests (ms)
    TIMEOUT_MS: 120000,
};
