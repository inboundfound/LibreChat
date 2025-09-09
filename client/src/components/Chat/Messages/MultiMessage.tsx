import { useRecoilState } from 'recoil';
import { useEffect, useCallback } from 'react';
import { isAssistantsEndpoint } from 'librechat-data-provider';
import type { TMessage } from 'librechat-data-provider';
import type { TMessageProps } from '~/common';
import MessageContent from '~/components/Messages/MessageContent';
import MessageParts from './MessageParts';
import Message from './Message';
import store from '~/store';

export default function MultiMessage({
  // messageId is used recursively here
  messageId,
  messagesTree,
  currentEditId,
  setCurrentEditId,
}: TMessageProps) {
  const [siblingIdx, setSiblingIdx] = useRecoilState(store.messagesSiblingIdxFamily(messageId));

  const setSiblingIdxRev = useCallback(
    (value: number) => {
      setSiblingIdx((messagesTree?.length ?? 0) - value - 1);
    },
    [messagesTree?.length, setSiblingIdx],
  );

  useEffect(() => {
    // reset siblingIdx when the tree changes, mostly when a new message is submitting.
    setSiblingIdx(0);
  }, [messagesTree?.length]);

  useEffect(() => {
    if (messagesTree?.length && siblingIdx >= messagesTree.length) {
      setSiblingIdx(0);
    }
  }, [siblingIdx, messagesTree?.length, setSiblingIdx]);

  if (!(messagesTree && messagesTree.length)) {
    return null;
  }

  const message = messagesTree[messagesTree.length - siblingIdx - 1] as TMessage | undefined;

  if (!message) {
    return null;
  }

  // Debug: Log MultiMessage processing
  console.log('🟡 MultiMessage PROCESSING MESSAGE', {
    messageId: message.messageId,
    isCreatedByUser: message.isCreatedByUser,
    endpoint: message.endpoint,
    textPreview: message.text?.substring(0, 200),
    hasContent: !!message.content,
    contentType: Array.isArray(message.content) ? 'array' : typeof message.content,
    messageType: message.isCreatedByUser ? 'USER' : 'AI',
    isAssistantsEndpoint: isAssistantsEndpoint(message.endpoint),
    timestamp: new Date().toISOString(),
  });

  if (isAssistantsEndpoint(message.endpoint) && message.content) {
    console.log('🟡 MultiMessage -> MessageParts (Assistants endpoint)', {
      messageId: message.messageId,
      messageType: message.isCreatedByUser ? 'USER' : 'AI',
    });
    return (
      <MessageParts
        key={message.messageId}
        message={message}
        currentEditId={currentEditId}
        setCurrentEditId={setCurrentEditId}
        siblingIdx={messagesTree.length - siblingIdx - 1}
        siblingCount={messagesTree.length}
        setSiblingIdx={setSiblingIdxRev}
      />
    );
  } else if (message.content) {
    console.log('🟡 MultiMessage -> MessageContent (Direct)', {
      messageId: message.messageId,
      messageType: message.isCreatedByUser ? 'USER' : 'AI',
    });
    return (
      <MessageContent
        key={message.messageId}
        message={message}
        currentEditId={currentEditId}
        setCurrentEditId={setCurrentEditId}
        siblingIdx={messagesTree.length - siblingIdx - 1}
        siblingCount={messagesTree.length}
        setSiblingIdx={setSiblingIdxRev}
      />
    );
  }

  console.log('🟡 MultiMessage -> Message (No content)', {
    messageId: message.messageId,
    messageType: message.isCreatedByUser ? 'USER' : 'AI',
  });
  return (
    <Message
      key={message.messageId}
      message={message}
      currentEditId={currentEditId}
      setCurrentEditId={setCurrentEditId}
      siblingIdx={messagesTree.length - siblingIdx - 1}
      siblingCount={messagesTree.length}
      setSiblingIdx={setSiblingIdxRev}
    />
  );
}
