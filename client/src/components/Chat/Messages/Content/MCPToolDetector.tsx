import React, { useEffect, useMemo } from 'react';
import { Constants } from 'librechat-data-provider';
import { useMessageContext } from '~/Providers';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { crawlFormState, isChatBlockedState, submittedFormsState } from '~/store/crawlForm';
import { useSubmitMessage } from '~/hooks';
import CrawlForm from './CrawlForm';
import CustomForm from './CustomForm';
import OutreachForm from './OutreachForm';

interface MCPToolDetectorProps {
  toolCall: any; // Tool call data
  output?: string | null;
}

// Configuration for MCP tools that should trigger specific behaviors
const MCP_TOOL_CONFIGS = {
  render_crawl_form: {
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

        const options = websitePairs
          .map((pair) => {
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
              id: cleanId,
            };
          })
          .filter(Boolean);

        console.log('Extracted website options:', options);
        return options;
      } catch (e) {
        console.error('Failed to parse website options:', e);
        return [];
      }
    },
  },
  render_custom_form: {
    triggerForm: true,
    formType: 'custom',
    extractOptions: (output: string) => {
      try {
        console.log('🔍 Parsing custom form output:', output);
        console.log('🔍 Output type:', typeof output);

        // The output might be wrapped in an array with a text field, or plain text with NOTE
        let parsedData;
        let jsonString = output;

        try {
          // First try to parse as JSON array (TextContent format)
          const outputArray = JSON.parse(output);
          console.log('🔍 Parsed as array:', Array.isArray(outputArray));

          if (Array.isArray(outputArray) && outputArray.length > 0 && outputArray[0].text) {
            // Extract the text field and parse again
            console.log('🔍 Extracting from text field');
            jsonString = outputArray[0].text;
          } else {
            // It's already parsed JSON
            parsedData = outputArray;
          }
        } catch {
          // Not a JSON array, treat as plain text
          console.log('🔍 Not a JSON array, parsing as plain text');
        }

        // If we haven't parsed yet, extract JSON from plain text
        if (!parsedData) {
          // Remove NOTE section if present
          const noteIndex = jsonString.indexOf('\n\nNOTE:');
          if (noteIndex > 0) {
            jsonString = jsonString.substring(0, noteIndex);
            console.log('🔍 Removed NOTE section, JSON string:', jsonString);
          }

          // Now try to parse the cleaned JSON string
          parsedData = JSON.parse(jsonString.trim());
        }

        console.log('🔍 Final parsed data:', parsedData);

        // Extract form fields
        const formFields = (parsedData.form_fields || []).map((field: any) => {
          const fieldData: any = {
            label: field.label,
            type: field.type,
            id: field.label.toLowerCase().replace(/\s+/g, '_'),
          };

          // Add selector-specific properties
          if (field.type === 'selector') {
            fieldData.options = field.options || [];
            if (field.default) {
              fieldData.default = field.default;
            }
          }

          return fieldData;
        });

        console.log('✅ Extracted custom form fields:', formFields);

        return {
          formFields,
          requestId: parsedData.request_id,
          functionToolName: parsedData.function_tool_name,
        };
      } catch (e) {
        console.error('❌ Failed to parse custom form options:', e);
        console.error('❌ Output was:', output);
        return {
          formFields: [],
          requestId: null,
          functionToolName: null,
        };
      }
    },
  },
  render_outreach_generate_form: {
    triggerForm: true,
    formType: 'outreach',
    extractOptions: (output: string) => {
      try {
        console.log('🔍 Parsing outreach form output:', output);
        console.log('🔍 Output type:', typeof output);

        // The output might be wrapped in an array with a text field
        let parsedData;

        try {
          // First try to parse as JSON array
          const outputArray = JSON.parse(output);
          console.log('🔍 Parsed as array:', Array.isArray(outputArray));

          if (Array.isArray(outputArray) && outputArray.length > 0 && outputArray[0].text) {
            // Extract the text field and parse again
            console.log('🔍 Extracting from text field');
            parsedData = JSON.parse(outputArray[0].text);
          } else {
            parsedData = outputArray;
          }
        } catch {
          // If that fails, try parsing directly
          console.log('🔍 Parsing directly');
          parsedData = JSON.parse(output);
        }

        console.log('🔍 Final parsed data:', parsedData);

        // Extract senders with company information and sender_group_id
        const senders = (parsedData.sender_group_list || []).flatMap((group: any) =>
          (group.senders || []).map((sender: any) => ({
            id: sender.id,
            name: sender.name,
            occupation: sender.occupation,
            company_name: group.company_details?.name || 'Unknown Company',
            sender_group_id: group.sender_group_id || '',
          })),
        );

        // Extract lists
        const lists = (parsedData.upload_list_list || []).map((list: any) => ({
          id: list.id,
          list_name: list.list_name,
          leads_count: list.leads_count || 0,
        }));

        // Extract campaigns
        const campaigns = (parsedData.campaign_list || []).map((campaign: any) => ({
          id: campaign.id,
          name: campaign.name,
          campaign_goal: campaign.campaign_goal,
          description: campaign.description,
        }));

        // Extract templates
        const templates = (parsedData.email_template_list || []).map((template: any) => ({
          id: template.id,
          name: template.name,
          subject_line: template.subject_line,
          body: template.body,
        }));

        // Extract ICPs
        const icps = (parsedData.icp_list || []).map((icp: any) => ({
          element_id: icp.element_id,
          title: icp.title,
          manual_query: icp.manual_query,
          target_industry: icp.target_industry,
          target_level: icp.target_level,
          target_dept: icp.target_dept,
        }));

        console.log('✅ Extracted outreach options:', {
          senders: senders.length,
          lists: lists.length,
          campaigns: campaigns.length,
          templates: templates.length,
          icps: icps.length,
          sendersData: senders,
          listsData: lists,
          campaignsData: campaigns,
          templatesData: templates,
          icpsData: icps,
        });

        return {
          senders,
          lists,
          campaigns,
          templates,
          icps,
        };
      } catch (e) {
        console.error('❌ Failed to parse outreach form options:', e);
        console.error('❌ Output was:', output);
        return {
          senders: [],
          lists: [],
          campaigns: [],
          templates: [],
          icps: [],
        };
      }
    },
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
    let options: any = [];
    if (toolConfig.extractOptions) {
      options = toolConfig.extractOptions(output);
      console.log('📋 MCP Tool Detector: Extracted options', {
        function_name,
        options,
      });
    }

    // Check if we have valid options (array with length or object with data)
    const hasValidOptions = Array.isArray(options)
      ? options.length > 0
      : options &&
        typeof options === 'object' &&
        Object.keys(options).length > 0 &&
        // For object-based options (like outreach and custom), check if at least one property has data
        Object.values(options).some((val: any) => (Array.isArray(val) ? val.length > 0 : !!val));

    // If we have options, trigger the form
    if (hasValidOptions) {
      console.log('✅ MCP Tool Detector: Options found, triggering form', {
        function_name,
        requestId,
        formId,
        options,
      });

      // Set chat as blocked for this specific conversation
      setChatBlocked((prev) => ({
        ...prev,
        [conversationId || 'no-conv']: true,
      }));

      // Store form data in state
      setSubmittedForms((prev) => ({
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
      });
    } else {
      console.warn('⚠️ MCP Tool Detector: No valid options found, form not triggered', {
        function_name,
        hasOptions: !!options,
        options,
        isArray: Array.isArray(options),
        hasKeys: options && typeof options === 'object' ? Object.keys(options).length : 0,
      });
    }
  }, [toolConfig, output, function_name, serverName, formId, setChatBlocked, setSubmittedForms]);

  // Cleanup: unblock chat when component unmounts or conversation changes
  useEffect(() => {
    return () => {
      // Only unblock if this component was the one that blocked it
      if (toolConfig && thisFormState && !thisFormState.isSubmitted) {
        setChatBlocked((prev) => ({
          ...prev,
          [conversationId || 'no-conv']: false,
        }));
      }
    };
  }, [conversationId, toolConfig, thisFormState, setChatBlocked]);

  // Handle form submission
  const handleFormSubmit = React.useCallback(
    async (data: any) => {
      console.log('📤 MCP Tool Detector: Form submitted', {
        formId,
        function_name,
        requestId,
        data,
      });

      // Prepare submitted data with labels based on form type
      let submittedDataWithLabels = { ...data };

      if (toolConfig?.formType === 'outreach') {
        const options = (thisFormState as any).options || {};
        const sender = options.senders?.find((s: any) => s.id === data.sender_id);
        const list = options.lists?.find((l: any) => l.id === data.list_id);
        const campaign = options.campaigns?.find((c: any) => c.id === data.campaign_id);
        const template = options.templates?.find((t: any) => t.id === data.template_id);

        submittedDataWithLabels = {
          ...data,
          senderLabel: sender
            ? `${sender.name} (${sender.occupation || 'No title'}) at ${sender.company_name}`
            : undefined,
          listLabel: list
            ? `${list.list_name} (${Math.floor(list.leads_count)} contacts)`
            : undefined,
          campaignLabel: campaign?.name,
          templateLabel: template?.name,
        };
      } else if (toolConfig?.formType === 'crawl') {
        const websiteLabel = (thisFormState as any).options?.find(
          (opt: any) => opt.value === data.website,
        )?.label;
        if (websiteLabel) {
          submittedDataWithLabels = {
            ...data,
            websiteLabel,
          };
        }
      }

      // Update form state
      setSubmittedForms((prev) => ({
        ...prev,
        [formId]: {
          ...prev[formId],
          isSubmitted: true,
          submittedData: submittedDataWithLabels,
        },
      }));

      let message: string;

      if (toolConfig?.formType === 'crawl') {
        // Handle crawl form submission with specific field mapping
        const websiteLabel =
          (thisFormState as any).options?.find((opt: any) => opt.value === data.website)?.label ||
          data.website;
        const launchDate = data.launchDate
          ? new Date(data.launchDate).toLocaleString()
          : 'Not specified';

        message = `I have submitted the crawl configuration with the following details:\n\n🌐 **Website:** ${websiteLabel}\n📅 **Launch Date:** ${launchDate}\n📝 **Description:** ${data.description || 'Not specified'}\n\nPlease proceed with the crawl based on these details.`;
      } else if (toolConfig?.formType === 'outreach') {
        // Handle outreach form submission with tool response
        const options = (thisFormState as any).options || {};
        const sender = options.senders?.find((s: any) => s.id === data.sender_id);
        const campaign = options.campaigns?.find((c: any) => c.id === data.campaign_id);
        const template = options.templates?.find((t: any) => t.id === data.template_id);

        // Parse the tool response to extract operation IDs or error
        let operationInfo = '';
        if (data.toolResponse?.result) {
          try {
            const result =
              typeof data.toolResponse.result === 'string'
                ? JSON.parse(data.toolResponse.result)
                : data.toolResponse.result;

            // Check if it's a successful response with operation IDs
            if (result.if_pm?.create_sequential_operation?.success) {
              const opData = result.if_pm.create_sequential_operation.data;
              operationInfo = `\n\n✅ **Operation Status:** Successfully created\n📋 **Main Operation ID:** ${opData.mainOpId}\n🚀 **Outreach Operation ID:** ${opData.outreachOpId}`;
            } else if (result.if_pm?.create_sequential_operation?.success === false) {
              // Failed operation
              const errorMsg = result.if_pm.create_sequential_operation.error || 'Unknown error';
              operationInfo = `\n\n❌ **Operation Status:** Failed\n⚠️ **Error:** ${errorMsg}`;
            } else {
              // If result is just an error string
              operationInfo = `\n\n❌ **Operation Status:** Failed\n⚠️ **Error:** ${result}`;
            }
          } catch (parseError) {
            // If parsing fails, treat the result as an error message
            operationInfo = `\n\n❌ **Operation Status:** Failed\n⚠️ **Error:** ${data.toolResponse.result}`;
          }
        }

        const audienceInfo =
          data.audience_type === 'existing'
            ? `${data.selected_people?.length || 0} selected contacts`
            : `Manual LinkedIn URLs`;

        message = `I have submitted the outreach campaign configuration:\n\n👤 **Sender:** ${sender?.name || 'Unknown'} (${sender?.occupation || 'No title'}) at ${sender?.company_name || 'Unknown Company'}\n👥 **Audience:** ${audienceInfo}\n🎯 **Campaign:** ${campaign?.name || 'Unknown'}\n✉️ **Email Template:** ${template?.name || 'Unknown'}${operationInfo}`;
      } else {
        // Handle custom form submission with dynamic field generation
        const formFields = (thisFormState as any).options?.formFields || [];
        const fieldDetails = formFields
          .map((field: any) => {
            const value = data[field.id];
            let displayValue = value;

            // Handle boolean values
            if (field.type === 'bool') {
              displayValue = value ? 'Yes' : 'No';
            }
            // Handle selector values - show the label instead of value
            else if (field.type === 'selector' && field.options) {
              const selectedOption = field.options.find((opt: any) => opt.value === value);
              displayValue = selectedOption?.label || value;
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
          })
          .join('\n');

        message = `I have submitted the ${toolConfig?.formType || 'form'} with the following configuration:\n\n${fieldDetails}\n\nPlease proceed based on these details.`;
      }

      await submitMessage({ text: message });

      setChatBlocked((prev) => ({
        ...prev,
        [conversationId || 'no-conv']: false,
      }));
    },
    [
      formId,
      function_name,
      toolConfig?.formType,
      setSubmittedForms,
      submitMessage,
      setChatBlocked,
      thisFormState,
    ],
  );

  // Handle form cancellation
  const handleFormCancel = React.useCallback(async () => {
    console.log('❌ MCP Tool Detector: Form cancelled', {
      formId,
      function_name,
      requestId,
    });

    // Update form state to show cancelled
    setSubmittedForms((prev) => ({
      ...prev,
      [formId]: {
        ...prev[formId],
        isSubmitted: false,
        isCancelled: true,
      },
    }));

    await submitMessage({
      text: "I decided not to submit the form at this time. Let's continue our conversation.",
    });
    setChatBlocked((prev) => ({
      ...prev,
      [conversationId || 'no-conv']: false,
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
          <div className="my-4 rounded-xl border border-orange-400 bg-orange-50 p-4 shadow-lg dark:bg-orange-900/20">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500"></div>
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
          <div className="my-4 rounded-xl border border-orange-400 bg-orange-50 p-4 shadow-lg dark:bg-orange-900/20">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Chat is disabled - Please complete the form below
              </span>
            </div>
          </div>
        )}

        <CustomForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          formFields={(thisFormState as any).options?.formFields || []}
          isSubmitted={thisFormState.isSubmitted}
          isCancelled={thisFormState.isCancelled}
          submittedData={thisFormState.submittedData}
        />
      </>
    );
  }

  if (toolConfig.formType === 'outreach') {
    const options = (thisFormState as any).options || {};
    return (
      <>
        {!thisFormState.isSubmitted && !thisFormState.isCancelled && (
          <div className="my-4 rounded-xl border border-orange-400 bg-orange-50 p-4 shadow-lg dark:bg-orange-900/20">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Chat is disabled - Please complete the form below
              </span>
            </div>
          </div>
        )}

        <OutreachForm
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          senderOptions={options.senders || []}
          listOptions={options.lists || []}
          campaignOptions={options.campaigns || []}
          templateOptions={options.templates || []}
          icpOptions={options.icps || []}
          isSubmitted={thisFormState.isSubmitted}
          isCancelled={thisFormState.isCancelled}
          submittedData={thisFormState.submittedData as any}
          serverName={serverName}
        />
      </>
    );
  }

  return null;
};

export default MCPToolDetector;
