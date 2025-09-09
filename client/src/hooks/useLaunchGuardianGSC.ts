import { useState, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { Constants } from 'librechat-data-provider';
import { useChatContext } from '~/Providers';
import store, { ephemeralAgentByConvoId } from '~/store';

export interface LaunchGuardianGSCState {
  isFormVisible: boolean;
  requestContext?: string;
  conversationId?: string;
}

/**
 * Hook for managing Launch Guardian GSC form state in an AI-driven manner.
 * Unlike the previous rule-based approach, this allows the AI to naturally
 * decide when to show the GSC form based on conversation context.
 */
export default function useLaunchGuardianGSC() {
  const { conversation } = useChatContext();
  const [gscState, setGscState] = useState<LaunchGuardianGSCState>({
    isFormVisible: false,
  });

  const conversationKey = conversation?.conversationId ?? Constants.NEW_CONVO;
  const ephemeralAgent = useRecoilValue(ephemeralAgentByConvoId(conversationKey));

  // Check if neo4j_server MCP server is available
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

  // Show the Launch Guardian GSC form (called by AI when needed)
  const showGSCForm = useCallback(
    (requestContext?: string) => {
      if (!hasNeo4jServer()) {
        console.warn('Launch Guardian GSC: neo4j_server not available');
        return false;
      }

      setGscState({
        isFormVisible: true,
        requestContext,
        conversationId: conversation?.conversationId || undefined,
      });

      console.log('Launch Guardian GSC: Form requested by AI', {
        requestContext,
        conversationId: conversation?.conversationId,
        hasNeo4jServer: hasNeo4jServer(),
      });

      return true;
    },
    [hasNeo4jServer, conversation?.conversationId],
  );

  // Hide the Launch Guardian GSC form
  const hideGSCForm = useCallback(() => {
    setGscState({
      isFormVisible: false,
    });
  }, []);

  // Manual trigger for GSC form (for button/UI triggers)
  const triggerGSCForm = useCallback(
    (requestContext = 'Manual GSC Analysis Request') => {
      return showGSCForm(requestContext);
    },
    [showGSCForm],
  );

  return {
    gscState,
    showGSCForm,
    hideGSCForm,
    triggerGSCForm,
    hasNeo4jServer: hasNeo4jServer(),
    setGscState,
  };
}
