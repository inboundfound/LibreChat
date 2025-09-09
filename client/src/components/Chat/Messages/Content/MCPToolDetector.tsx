import React, { useEffect, useMemo } from 'react';
import { Constants } from 'librechat-data-provider';
import { useMessageContext } from '~/Providers';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { crawlFormState, isChatBlockedState, submittedFormsState } from '~/store/crawlForm';
import { useSubmitMessage } from '~/hooks';
import CrawlForm from './CrawlForm';
import CustomForm from './CustomForm';

interface MCPToolDetectorProps {
  toolCall: any; // Tool call data
  output?: string | null;
}

// Configuration for MCP tools that should trigger specific behaviors
const MCP_TOOL_CONFIGS = {
  'render_crawl_form': {
    triggerForm: true,
    formType: 'crawl',
    extractOptions: (output: string) => {
      try {
        // Parse the websites string format: "url1|id1,url2|id2,..."
        // Capture everything after "websites::" until the end of the string or NOTE
        const websitesMatch = output.match(/websites::(.+?)(?:\n|$)/);
        if (!websitesMatch) {
          console.log('No websites found in output');
          return [];
        }

        const websitesString = websitesMatch[1];
        console.log('Raw websites string:', websitesString);
        console.log('Full output for debugging:', output);
        
        const websitePairs = websitesString.split(',');
        console.log('Website pairs:', websitePairs);
        console.log('Number of pairs found:', websitePairs.length);
        
        const options = websitePairs.map(pair => {
          const [url, id] = pair.split('|');
          if (!url || !id) {
            console.log('Invalid pair:', pair);
            return null;
          }
          
          // Clean up any extra text or newlines from the ID
          const cleanId = id.split('\n')[0].split('\\n')[0].replace(/\\n/g, '');
          
          // Extract domain name from URL for display
          let label = url;
          try {
            const domain = new URL(url).hostname.replace('www.', '');
            label = domain;
          } catch (e) {
            // If URL parsing fails, use the URL as is
            label = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
          }
          
          return {
            label: label,
            value: url,
            id: cleanId
          };
        }).filter(Boolean);

        console.log('Extracted website options:', options);
        return options;
      } catch (e) {
        console.error('Failed to parse website options:', e);
        return [];
      }
    }
  },
  'render_custom_form': {
    triggerForm: true,
    formType: 'custom',
    extractOptions: (output: string) => {
      try {
        // Parse the form fields string format: "label:value_type:|:label:value_type:|:..."
        // Capture everything after "form_fields::" until the end of line or NOTE
        const formFieldsMatch = output.match(/form_fields::(.+?)(?:\n|$)/);
        if (!formFieldsMatch) {
          console.log('No form fields found in output');
          return [];
        }

        const formFieldsString = formFieldsMatch[1];
        console.log('Raw form fields string:', formFieldsString);
        console.log('Full output for debugging:', output);
        
        // Split by the new delimiter :|:
        const fieldPairs = formFieldsString.split(':|:');
        console.log('Field pairs:', fieldPairs);
        console.log('Number of fields found:', fieldPairs.length);
        
        const options = fieldPairs.map(pair => {
          const [label, valueType] = pair.split(':');
          if (!label || !valueType) {
            console.log('Invalid field pair:', pair);
            return null;
          }
          
          // Clean up any extra text or newlines from the value type
          const cleanValueType = valueType.split('\n')[0].split('\\n')[0].replace(/\\n/g, '').trim();
          
          return {
            label: label.trim(),
            value: cleanValueType,
            id: label.trim().toLowerCase().replace(/\s+/g, '_')
          };
        }).filter(Boolean);

        console.log('Extracted form field options:', options);
        return options;
      } catch (e) {
        console.error('Failed to parse form field options:', e);
        return [];
      }
    }
  },
  // Add more MCP tool configurations here
};

export const MCPToolDetector: React.FC<MCPToolDetectorProps> = ({ toolCall, output }) => {
  const { messageId, conversationId } = useMessageContext();
  const [submittedForms, setSubmittedForms] = useRecoilState(submittedFormsState);
  const setChatBlocked = useSetRecoilState(isChatBlockedState);
  const { submitMessage } = useSubmitMessage();

  // Parse MCP tool name and server
  const { function_name, serverName, isMCPToolCall } = useMemo(() => {
    if (!toolCall?.name || typeof toolCall.name !== 'string') {
      return { function_name: '', serverName: '', isMCPToolCall: false };
    }

    if (toolCall.name.includes(Constants.mcp_delimiter)) {
      const [func, server] = toolCall.name.split(Constants.mcp_delimiter);
      return {
        function_name: func || '',
        serverName: server || '',
        isMCPToolCall: true,
      };
    }

    return { function_name: toolCall.name, serverName: '', isMCPToolCall: false };
  }, [toolCall?.name]);

  // Check if this is a configured MCP tool
  const toolConfig = useMemo(() => {
    if (!isMCPToolCall || !function_name) return null;
    return MCP_TOOL_CONFIGS[function_name as keyof typeof MCP_TOOL_CONFIGS] || null;
  }, [isMCPToolCall, function_name]);

  // Extract request ID from tool output
  const requestId = useMemo(() => {
    if (!output) return null;
    const requestMatch = output.match(/request_id::([a-f0-9-]+)/);
    return requestMatch ? requestMatch[1] : null;
  }, [output]);

  // Create unique form identifier using request ID if available
  const formId = useMemo(() => {
    if (requestId) {
      return `${conversationId || 'no-conv'}-${requestId}`;
    }
    // Fallback to message-based ID if no request ID
    return `${conversationId || 'no-conv'}-${messageId || 'no-msg'}-${function_name}`;
  }, [conversationId, messageId, function_name, requestId]);

  // Get form state
  const thisFormState = useMemo(() => {
    return submittedForms[formId] || { isSubmitted: false };
  }, [submittedForms, formId]);

  useEffect(() => {
    if (!toolConfig || !toolConfig.triggerForm || !output) {
      return;
    }

    console.log('🔍 MCP Tool Detector: Processing tool call', {
      function_name,
      serverName,
      requestId,
      formId,
      hasOutput: !!output,
      outputPreview: output.substring(0, 200),
    });

    // Extract options if available
    let options: any[] = [];
    if (toolConfig.extractOptions) {
      options = toolConfig.extractOptions(output);
      console.log('📋 MCP Tool Detector: Extracted options', {
        function_name,
        optionsCount: options.length,
        options,
      });
    }

    // If we have options, trigger the form
    if (options.length > 0) {
      console.log('✅ MCP Tool Detector: Options found, triggering form', {
        function_name,
        requestId,
        formId,
        optionsCount: options.length,
      });

      // Set chat as blocked for this specific conversation
      setChatBlocked(prev => ({
        ...prev,
        [conversationId || 'no-conv']: true
      }));

      // Store form data in state
      setSubmittedForms(prev => ({
        ...prev,
        [formId]: {
          isSubmitted: false,
          isCancelled: false,
          toolName: function_name,
          serverName,
          requestId: requestId || undefined,
          options,
          output,
          formType: toolConfig.formType,
        },
      }));

      console.log('🎯 MCP Tool Detector: Form triggered', {
        formId,
        function_name,
        requestId,
        formType: toolConfig.formType,
        optionsCount: options.length,
      });
    }
  }, [toolConfig, output, function_name, serverName, formId, setChatBlocked, setSubmittedForms]);

  // Cleanup: unblock chat when component unmounts or conversation changes
  useEffect(() => {
    return () => {
      // Only unblock if this component was the one that blocked it
      if (toolConfig && thisFormState && !thisFormState.isSubmitted) {
        setChatBlocked(prev => ({
          ...prev,
          [conversationId || 'no-conv']: false
        }));
      }
    };
  }, [conversationId, toolConfig, thisFormState, setChatBlocked]);

  // Handle form submission
  const handleFormSubmit = React.useCallback(async (data: any) => {
    console.log('📤 MCP Tool Detector: Form submitted', {
      formId,
      function_name,
      requestId,
      data,
    });

    // Update form state
    setSubmittedForms(prev => ({
      ...prev,
      [formId]: {
        ...prev[formId],
        isSubmitted: true,
        submittedData: data,
      },
    }));

    let message: string;

    if (toolConfig?.formType === 'crawl') {
      // Handle crawl form submission with specific field mapping
      const websiteLabel = (thisFormState as any).options?.find((opt: any) => opt.value === data.website)?.label || data.website;
      const launchDate = data.launchDate ? new Date(data.launchDate).toLocaleString() : 'Not specified';
      
      message = `I have submitted the crawl configuration with the following details:\n\n🌐 **Website:** ${websiteLabel}\n📅 **Launch Date:** ${launchDate}\n📝 **Description:** ${data.description || 'Not specified'}\n\nPlease proceed with the crawl based on these details.`;
    } else {
      // Handle custom form submission with dynamic field generation
      const formFields = (thisFormState as any).options || [];
      const fieldDetails = formFields.map((field: any) => {
        const value = data[field.id];
        let displayValue = value;
        
        // Handle boolean values
        if (field.value === 'bool') {
          displayValue = value ? 'Yes' : 'No';
        }
        // Handle date values if they exist
        else if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          try {
            displayValue = new Date(value).toLocaleString();
          } catch {
            displayValue = value;
          }
        }
        
        return `**${field.label}:** ${displayValue}`;
      }).join('\n');

      message = `I have submitted the ${toolConfig?.formType || 'form'} with the following configuration:\n\n${fieldDetails}\n\nPlease proceed based on these details.`;
    }
    
    await submitMessage({ text: message });
    setChatBlocked(prev => ({
      ...prev,
      [conversationId || 'no-conv']: false
    }));
  }, [formId, function_name, toolConfig?.formType, setSubmittedForms, submitMessage, setChatBlocked, thisFormState]);

  // Handle form cancellation
  const handleFormCancel = React.useCallback(async () => {
    console.log('❌ MCP Tool Detector: Form cancelled', {
      formId,
      function_name,
      requestId,
    });

    // Update form state to show cancelled
    setSubmittedForms(prev => ({
      ...prev,
      [formId]: {
        ...prev[formId],
        isSubmitted: false,
        isCancelled: true,
      },
    }));

    await submitMessage({ text: "I decided not to submit the form at this time. Let's continue our conversation." });
    setChatBlocked(prev => ({
      ...prev,
      [conversationId || 'no-conv']: false
    }));
  }, [formId, function_name, submitMessage, setChatBlocked, setSubmittedForms]);

  // If no tool config, don't render anything
  if (!toolConfig) {
    return null;
  }

  // Render the appropriate form based on form type
  if (toolConfig.formType === 'crawl') {
    return (
      <>
        {!thisFormState.isSubmitted && !thisFormState.isCancelled && (
          <div className="my-4 rounded-xl border border-orange-400 bg-orange-50 dark:bg-orange-900/20 p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Chat is disabled - Please complete the form below
              </span>
            </div>
          </div>
        )}
        
        <CrawlForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          websiteOptions={(thisFormState as any).options || []}
          isSubmitted={thisFormState.isSubmitted}
          isCancelled={thisFormState.isCancelled}
          submittedData={thisFormState.submittedData as any}
        />
      </>
    );
  }

  if (toolConfig.formType === 'custom') {
    return (
      <>
        {!thisFormState.isSubmitted && !thisFormState.isCancelled && (
          <div className="my-4 rounded-xl border border-orange-400 bg-orange-50 dark:bg-orange-900/20 p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Chat is disabled - Please complete the form below
              </span>
            </div>
          </div>
        )}
        
        <CustomForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          formFields={(thisFormState as any).options || []}
          isSubmitted={thisFormState.isSubmitted}
          isCancelled={thisFormState.isCancelled}
          submittedData={thisFormState.submittedData}
        />
      </>
    );
  }

  return null;
};

export default MCPToolDetector; 