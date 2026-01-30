import { math, isEnabled } from '~/utils';

/**
 * Centralized configuration for MCP-related environment variables.
 * Provides typed access to MCP settings with default values.
 */
export const mcpConfig = {
  OAUTH_ON_AUTH_ERROR: isEnabled(process.env.MCP_OAUTH_ON_AUTH_ERROR ?? true),
  OAUTH_DETECTION_TIMEOUT: math(process.env.MCP_OAUTH_DETECTION_TIMEOUT ?? 5000),
  CONNECTION_CHECK_TTL: math(process.env.MCP_CONNECTION_CHECK_TTL ?? 60000),
  /**
   * Interval for client-side keepalive pings (ms). Defaults to 90s which is below common 120s idle timeouts.
   */
  KEEPALIVE_INTERVAL_MS: math(process.env.MCP_KEEPALIVE_INTERVAL_MS ?? 90000),
  /** Idle timeout (ms) after which user connections are disconnected. Default: 15 minutes */
  USER_CONNECTION_IDLE_TIMEOUT: math(
    process.env.MCP_USER_CONNECTION_IDLE_TIMEOUT ?? 15 * 60 * 1000,
  ),
};
