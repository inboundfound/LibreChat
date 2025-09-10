import { useState, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { Constants } from 'librechat-data-provider';
import { useChatContext } from '~/Providers';
import store, { ephemeralAgentByConvoId } from '~/store';

export interface WebsiteOptimizationIntent {
  shouldShowForm: boolean;
  originalQuery: string;
  conversationId?: string;
}

export default function useWebsiteOptimizationIntent() {
  const { conversation } = useChatContext();
  const [intentState, setIntentState] = useState<WebsiteOptimizationIntent>({
    shouldShowForm: false,
    originalQuery: '',
  });

  const conversationKey = conversation?.conversationId ?? Constants.NEW_CONVO;
  const ephemeralAgent = useRecoilValue(ephemeralAgentByConvoId(conversationKey));

  // Check if neo4j_server MCP server is selected
  const hasNeo4jServer = useCallback(() => {
    return (
      ephemeralAgent?.mcp?.some((mcpServer: any) => {
        return (
          mcpServer === 'neo4j_server' ||
          mcpServer?.name === 'neo4j_server' ||
          mcpServer?.mcp_id === 'neo4j_server'
        );
      }) || false
    );
  }, [ephemeralAgent?.mcp]);

  // Detect website optimization intent in user query
  const detectWebsiteOptimizationIntent = useCallback(
    (userQuery: string): boolean => {
      if (!userQuery || !hasNeo4jServer()) {
        return false;
      }

      const query = userQuery.toLowerCase();

      // Check for website-related keywords
      const hasWebsiteKeywords = /\b(website|site|web|page|domain)\b/.test(query);

      // Check for optimization/analysis intent keywords
      const hasOptimizationIntent =
        /\b(optim|analy|audit|improv|seo|perform|traffic|conversion|lead|increase|boost|enhance|review|assess|check)\b/.test(
          query,
        );

      // Check for business/company context
      const hasBusinessContext = /\b(company|business|client|organization|brand)\b/.test(query);

      // Check for traffic and reporting queries
      const hasTrafficReportingIntent =
        /\b(traffic|topics?|report|data|analytics|most.*traffic|generate.*traffic|top.*pages?|popular.*pages?|search.*terms?|keywords?|clicks?|impressions?)\b/.test(
          query,
        );

      // Check for time-based analysis queries
      const hasTimeBasedAnalysis =
        /\b(last.*month|past.*month|this.*month|last.*week|past.*week|last.*quarter|past.*quarter|yesterday|today)\b/.test(
          query,
        );

      // Specific phrases that indicate Launch Guardian GSC analysis intent
      const hasSpecificIntent =
        /\b(help optimize|analyze.*website|website.*optim|increase.*lead|lead.*generation|search console|gsc|google search|traffic analysis|show.*topics|topics.*traffic|generate.*most.*traffic)\b/.test(
          query,
        );

      const result =
        (hasWebsiteKeywords && hasOptimizationIntent) ||
        (hasBusinessContext && hasOptimizationIntent) ||
        (hasTrafficReportingIntent && hasTimeBasedAnalysis) ||
        hasSpecificIntent;

      console.log('WebsiteOptimization: Intent Detection', {
        query: userQuery.substring(0, 100) + '...',
        hasNeo4jServer: hasNeo4jServer(),
        hasWebsiteKeywords,
        hasOptimizationIntent,
        hasBusinessContext,
        hasTrafficReportingIntent,
        hasTimeBasedAnalysis,
        hasSpecificIntent,
        result,
      });

      return result;
    },
    [hasNeo4jServer],
  );

  // Check user query and potentially intercept with Launch Guardian form
  const checkAndInterceptQuery = useCallback(
    (userQuery: string): boolean => {
      const shouldIntercept = detectWebsiteOptimizationIntent(userQuery);

      if (shouldIntercept) {
        setIntentState({
          shouldShowForm: true,
          originalQuery: userQuery,
          conversationId: conversation?.conversationId || undefined,
        });

        console.log('WebsiteOptimization: Intercepting query for Launch Guardian GSC analysis', {
          originalQuery: userQuery,
          conversationId: conversation?.conversationId,
        });

        return true; // Intercept the query
      }

      return false; // Let the query proceed normally
    },
    [detectWebsiteOptimizationIntent, conversation?.conversationId],
  );

  // Clear the intent state
  const clearIntent = useCallback(() => {
    setIntentState({
      shouldShowForm: false,
      originalQuery: '',
    });
  }, []);

  return {
    intentState,
    checkAndInterceptQuery,
    clearIntent,
    hasNeo4jServer: hasNeo4jServer(),
    setIntentState,
  };
}
