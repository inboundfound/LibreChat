import React, { useState, useCallback } from 'react';
import { Button, Label } from '@librechat/client';
import { User, Users, Mail, FileText, Check, ChevronRight, Loader2, Search, Target } from 'lucide-react';
import { useAuthContext } from '~/hooks';

interface SenderOption {
  id: string;
  name: string;
  occupation: string | null;
  company_name: string;
  sender_group_id: string;
}

interface ListOption {
  id: string;
  list_name: string;
  leads_count: number;
}

interface CampaignOption {
  id: string;
  name: string;
  campaign_goal?: string;
  description?: string;
}

interface TemplateOption {
  id: string;
  name: string;
  subject_line?: string;
  body?: string;
}

interface ICPOption {
  element_id: string;
  title: string;
  manual_query?: string;
  target_industry?: string[];
  target_level?: string[];
  target_dept?: string[];
}

interface PersonOption {
  element_id: string;
  name: string;
  linkedin_url: string;
  industry?: string[];
  job_titles?: string[];
  company?: string;
  score?: string;
}

interface OutreachFormData {
  sender_id: string;
  sender_group_id: string;
  list_id?: string;
  icp_id?: string;
  campaign_id: string;
  template_id: string;
  selected_people?: string[]; // Array of element_ids for ICP matches
  manual_urls?: string; // Newline-separated LinkedIn URLs
  audience_type?: 'existing' | 'manual'; // Track which audience option was selected
}

interface OutreachFormProps {
  onSubmit?: (data: OutreachFormData) => void;
  onCancel?: () => void;
  senderOptions?: SenderOption[];
  listOptions?: ListOption[];
  campaignOptions?: CampaignOption[];
  templateOptions?: TemplateOption[];
  icpOptions?: ICPOption[];
  serverName?: string;
  isSubmitted?: boolean;
  isCancelled?: boolean;
  submittedData?: OutreachFormData & {
    senderLabel?: string;
    listLabel?: string;
    icpLabel?: string;
    campaignLabel?: string;
    templateLabel?: string;
    peopleCount?: number;
  };
}

const OutreachForm: React.FC<OutreachFormProps> = ({
  onSubmit,
  onCancel,
  senderOptions = [],
  listOptions = [],
  campaignOptions = [],
  templateOptions = [],
  icpOptions = [],
  serverName = '',
  isSubmitted = false,
  isCancelled = false,
  submittedData,
}) => {
  const [currentStep, setCurrentStep] = useState<'sender' | 'audience' | 'campaign'>('sender');
  const [audienceOption, setAudienceOption] = useState<'existing' | 'manual'>('existing');
  const [selectedIcp, setSelectedIcp] = useState<ICPOption | null>(null);
  const [searchResults, setSearchResults] = useState<PersonOption[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<PersonOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualUrls, setManualUrls] = useState('');
  
  const [formData, setFormData] = useState<OutreachFormData>({
    sender_id: '',
    sender_group_id: '',
    list_id: '',
    icp_id: '',
    campaign_id: '',
    template_id: '',
    selected_people: [],
    manual_urls: '',
    audience_type: 'existing',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hook for authentication (needed for API calls)
  const { token } = useAuthContext();

  // Debug logging
  React.useEffect(() => {
    console.log('📋 OutreachForm received options:', {
      senders: senderOptions.length,
      lists: listOptions.length,
      campaigns: campaignOptions.length,
      templates: templateOptions.length,
      icps: icpOptions.length,
      senderOptions,
      listOptions,
      campaignOptions,
      templateOptions,
      icpOptions
    });
  }, [senderOptions, listOptions, campaignOptions, templateOptions, icpOptions]);

  // Group senders by company
  const groupedSenders = senderOptions.reduce((acc, sender) => {
    const company = sender.company_name;
    if (!acc[company]) {
      acc[company] = [];
    }
    acc[company].push(sender);
    return acc;
  }, {} as Record<string, SenderOption[]>);

  const handleFieldChange = useCallback((field: keyof OutreachFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handle sender selection - set both sender_id and sender_group_id
  const handleSenderSelect = useCallback((sender: SenderOption) => {
    setFormData((prev) => ({ 
      ...prev, 
      sender_id: sender.id,
      sender_group_id: sender.sender_group_id
    }));
  }, []);

  // Handle ICP search - directly calls the MCP tool via API
  const handleSearchIcp = useCallback(async () => {
    if (!formData.list_id || !formData.icp_id) {
      console.warn('⚠️ List or ICP not selected');
      return;
    }

    if (!token) {
      console.error('❌ No authentication token available');
      return;
    }

    setSearching(true);
    
    // Construct the MCP tool ID - the server name is already baked into the tool name
    const toolId = `get_icp_recommendations_mcp_${serverName}`;
    
    console.log('🔍 Triggering get_icp_recommendations MCP tool:', {
      toolId,
      icpId: formData.icp_id,
      uploadListId: formData.list_id,
    });

    try {
      // Make direct API call to trigger the MCP tool
      // No messageId required for MCP tools after backend modification
      // Arguments are sent at the top level of the request body
      const response = await fetch(`/api/agents/tools/${encodeURIComponent(toolId)}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          icpId: formData.icp_id,
          uploadListId: formData.list_id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ MCP tool response:', data);

      // Parse the response - the result should be in data.result
      let peopleResults: PersonOption[] = [];
      
      if (data.result) {
        try {
          // The result might be a string that needs parsing
          const parsedResult = typeof data.result === 'string' 
            ? JSON.parse(data.result) 
            : data.result;
          
          // Handle array format
          if (Array.isArray(parsedResult)) {
            peopleResults = parsedResult;
          }
          
          console.log('📊 Parsed people results:', peopleResults);
          setSearchResults(peopleResults);
        } catch (parseError) {
          console.error('❌ Error parsing MCP tool results:', parseError);
          console.error('Raw result:', data.result);
        }
      }

      if (peopleResults.length === 0) {
        console.warn('⚠️ No people found in results');
      }

    } catch (error) {
      console.error('❌ Error calling MCP tool:', error);
    } finally {
      setSearching(false);
    }
  }, [formData.list_id, formData.icp_id, serverName, token]);

  // Toggle person selection
  const togglePersonSelection = useCallback((person: PersonOption) => {
    setSelectedPeople(prev => {
      const isSelected = prev.find(p => p.element_id === person.element_id);
      if (isSelected) {
        return prev.filter(p => p.element_id !== person.element_id);
      } else {
        return [...prev, person];
      }
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const hasValidAudience = audienceOption === 'existing' 
      ? selectedPeople.length > 0
      : manualUrls.trim() !== '';

    if (!formData.sender_id || !hasValidAudience || !formData.campaign_id || !formData.template_id) {
      return;
    }

    if (!token) {
      console.error('❌ No authentication token available');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare the identifier array based on audience type
      let identifier: string[] = [];
      let identifier_type: 'ELEMENT_ID' | 'LINKEDIN_URL';
      
      if (audienceOption === 'existing') {
        // Use element_ids from selected people
        identifier = selectedPeople.map(p => p.element_id);
        identifier_type = 'ELEMENT_ID';
      } else {
        // Parse LinkedIn URLs from manual input (split by newlines, filter empty)
        identifier = manualUrls
          .split('\n')
          .map(url => url.trim())
          .filter(url => url !== '');
        identifier_type = 'LINKEDIN_URL';
      }

      // Construct the JSON payload according to the API specification
      const campaignPayload = {
        campaign_id: formData.campaign_id,
        identifier: identifier,
        identifier_type: identifier_type,
        sender_group_id: formData.sender_group_id,
        sender_id: formData.sender_id,
        template_id: formData.template_id,
      };

      // Console log the formatted JSON
      console.log('🚀 Generate Campaign Payload:', JSON.stringify(campaignPayload, null, 2));

      // Trigger the outreach email generation MCP tool
      const toolId = `outreach_email_generation_mcp_${serverName}`;
      
      console.log('📧 Triggering outreach_email_generation MCP tool:', {
        toolId,
        payload: campaignPayload,
      });

      const response = await fetch(`/api/agents/tools/${encodeURIComponent(toolId)}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(campaignPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('✅ Outreach email generation response:', data);
      
      // Parse and log the result if it exists
      if (data.result) {
        try {
          const parsedResult = typeof data.result === 'string' 
            ? JSON.parse(data.result) 
            : data.result;
          
          console.log('📧 Parsed result:', parsedResult);
          console.log('📊 Result summary:', {
            type: typeof parsedResult,
            isArray: Array.isArray(parsedResult),
            length: Array.isArray(parsedResult) ? parsedResult.length : 'N/A',
            data: parsedResult
          });
        } catch (parseError) {
          console.error('❌ Error parsing result:', parseError);
          console.log('📄 Raw result:', data.result);
        }
      } else {
        console.warn('⚠️ No result field in response');
      }

      // Update form data with audience info and tool response for the onSubmit callback
      const finalFormData: any = {
        ...formData,
        audience_type: audienceOption,
        selected_people: audienceOption === 'existing' ? selectedPeople.map(p => p.element_id) : undefined,
        manual_urls: audienceOption === 'manual' ? manualUrls : undefined,
        toolResponse: data, // Include the tool response
      };
      
      // Call onSubmit after successful tool execution
      onSubmit?.(finalFormData);
    } catch (error) {
      console.error('❌ Error generating outreach emails:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, audienceOption, selectedPeople, manualUrls, token, serverName]);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  const canProceedFromSender = formData.sender_id !== '';
  const canProceedFromAudience = audienceOption === 'existing' 
    ? selectedPeople.length > 0
    : (manualUrls.trim() !== '' && manualUrls.split('\n').some(url => url.trim()));
  const canSubmit = formData.sender_id && canProceedFromAudience && formData.campaign_id && formData.template_id;

  // If form is cancelled, show cancelled state
  if (isCancelled) {
    return (
      <div className="p-4 my-4 border border-red-400 shadow-lg rounded-xl bg-red-50 dark:bg-red-900/20">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
              ❌ Outreach Campaign Cancelled
            </h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">
            The outreach campaign configuration form was cancelled.
          </p>
        </div>
      </div>
    );
  }

  // If form is submitted, show success state
  if (isSubmitted && submittedData) {
    return (
      <div className="p-6 my-4 bg-gray-800 border-2 border-green-500 shadow-lg rounded-xl">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-400">Campaign Generated!</h3>
              <p className="text-sm text-green-300">
                Your personalized outreach campaign is ready to review
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-gray-900/50 p-4 rounded-lg">
          <div>
            <Label className="block mb-1 text-sm font-medium text-gray-300">Sender</Label>
            <div className="text-white">{submittedData.senderLabel || submittedData.sender_id}</div>
          </div>

          <div>
            <Label className="block mb-1 text-sm font-medium text-gray-300">Target List</Label>
            <div className="text-white">{submittedData.listLabel || submittedData.list_id}</div>
          </div>

          <div>
            <Label className="block mb-1 text-sm font-medium text-gray-300">Campaign</Label>
            <div className="text-white">{submittedData.campaignLabel || submittedData.campaign_id}</div>
          </div>

          <div>
            <Label className="block mb-1 text-sm font-medium text-gray-300">Email Template</Label>
            <div className="text-white">{submittedData.templateLabel || submittedData.template_id}</div>
          </div>
        </div>
      </div>
    );
  }

  // Processing state - shown while MCP tool is executing
  if (isSubmitting && !isSubmitted) {
    return (
      <div className="p-8 my-4 bg-gray-800 border border-gray-600 shadow-lg rounded-xl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-white">Generating Outreach Campaign...</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span>Enriching recipient profiles</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span>Generating personalized emails</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span>Processing campaign...</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">This may take a few moments</p>
        </div>
      </div>
    );
  }

  const steps = ['sender', 'audience', 'campaign'] as const;
  const stepIndex = steps.indexOf(currentStep);

  return (
    <div className="p-6 my-4 bg-gray-800 border border-gray-600 shadow-lg rounded-xl space-y-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <h3 className="text-lg font-semibold text-white">Outreach Campaign Configuration</h3>
        </div>
        <p className="text-sm text-gray-300">
          Configure your personalized outreach campaign. Chat is disabled until you submit or cancel this form.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, idx) => (
          <React.Fragment key={step}>
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  currentStep === step
                    ? 'bg-orange-500 text-white'
                    : idx < stepIndex
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-700 text-gray-400'
                }`}
              >
                {idx < stepIndex ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span className="text-sm font-medium capitalize hidden sm:inline text-gray-300">
                {step}
              </span>
            </div>
            {idx < 2 && <div className="flex-1 h-0.5 bg-gray-700 mx-2"></div>}
          </React.Fragment>
        ))}
      </div>

      {/* Sender Selection Step */}
      {currentStep === 'sender' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-1 text-white">Select Sender Profile</h3>
            <p className="text-sm text-gray-400">Who will these emails be sent from?</p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {senderOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-400 bg-gray-900/50 rounded-lg">
                No sender profiles available
              </div>
            ) : (
              Object.entries(groupedSenders).map(([company, senders]) => (
                <div key={company} className="space-y-2">
                  <div className="text-sm font-medium text-gray-400 px-1">{company}</div>
                  {senders.map((sender) => (
                    <button
                      key={sender.id}
                      onClick={() => handleSenderSelect(sender)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        formData.sender_id === sender.id
                          ? 'border-orange-500 bg-orange-500/10'
                          : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-orange-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{sender.name}</div>
                          <div className="text-sm text-gray-400 truncate">
                            {sender.occupation || 'No title'}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              className="flex-1 text-gray-300 bg-transparent border-gray-600 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => setCurrentStep('audience')}
              disabled={!canProceedFromSender}
              className="flex-1 text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Audience Selection Step */}
      {currentStep === 'audience' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-1 text-white">Select Target Audience</h3>
            <p className="text-sm text-gray-400">Who should receive these emails?</p>
          </div>

          {/* Audience Type Toggle */}
          <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setAudienceOption('existing')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                audienceOption === 'existing' ? 'bg-gray-700 shadow-lg text-gray-100' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Existing List
            </button>
            <button
              onClick={() => setAudienceOption('manual')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                audienceOption === 'manual' ? 'bg-gray-700 shadow-lg text-gray-100' : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Manual URLs
            </button>
          </div>

          {audienceOption === 'existing' ? (
            <div className="space-y-4">
              {/* Step 1: Select List */}
              <div>
                <Label className="block text-sm font-medium mb-2 text-gray-300">Step 1: Select List</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {listOptions.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 bg-gray-900/50 rounded-lg">
                      No contact lists available
                    </div>
                  ) : (
                    listOptions.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => handleFieldChange('list_id', list.id)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                          formData.list_id === list.id
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-100">{list.list_name}</div>
                              <div className="text-sm text-gray-400">{Math.floor(list.leads_count)} contacts</div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Step 2: Select ICP */}
              {formData.list_id && (
                <div>
                  <Label className="block text-sm font-medium mb-2 text-gray-300">Step 2: Select ICP</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {icpOptions.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 bg-gray-900/50 rounded-lg">
                        No ICPs available
                      </div>
                    ) : (
                      icpOptions.map((icp) => (
                        <button
                          key={icp.element_id}
                          onClick={() => {
                            setSelectedIcp(icp);
                            handleFieldChange('icp_id', icp.element_id);
                          }}
                          className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                            formData.icp_id === icp.element_id
                              ? 'border-orange-500 bg-orange-500/10'
                              : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-100">{icp.title}</div>
                          {icp.manual_query && (
                            <div className="text-xs text-gray-400 mt-1">{icp.manual_query}</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Find Matches Button */}
              {formData.list_id && formData.icp_id && (
                <Button
                  type="button"
                  onClick={handleSearchIcp}
                  disabled={searching}
                  className="w-full text-white bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Finding Matches...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Find Matches
                    </>
                  )}
                </Button>
              )}

              {/* Step 3: Select People */}
              {searchResults.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold text-gray-100">Step 3: Select People (max 30)</Label>
                    <span className="text-xs text-gray-400">{selectedPeople.length} selected</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map((person) => (
                      <button
                        key={person.element_id}
                        onClick={() => togglePersonSelection(person)}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          selectedPeople.find(p => p.element_id === person.element_id)
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm text-gray-100">{person.name}</div>
                            <div className="text-xs text-gray-400">
                              {person.job_titles?.[0] || 'Unknown title'} at {person.company || 'Unknown company'}
                            </div>
                          </div>
                          {person.score && (
                            <div className="text-xs font-semibold text-green-400">
                              {Math.round(parseFloat(person.score) * 100)}% match
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="block text-sm font-medium mb-2 text-gray-300">LinkedIn Profile URLs</Label>
                <p className="text-xs text-gray-400 mb-3">Enter one LinkedIn profile URL per line</p>
                <textarea
                  value={manualUrls}
                  onChange={(e) => setManualUrls(e.target.value)}
                  placeholder="https://linkedin.com/in/john-doe&#10;https://linkedin.com/in/jane-smith&#10;https://linkedin.com/in/alex-johnson"
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none text-gray-100 placeholder-gray-500 text-sm"
                />
                <div className="mt-2 text-xs text-gray-400">
                  {manualUrls.split('\n').filter(url => url.trim()).length} URL(s) entered
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={() => setCurrentStep('sender')}
              variant="outline"
              className="px-6 text-gray-300 bg-transparent border-gray-600 hover:bg-gray-700"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setCurrentStep('campaign')}
              disabled={!canProceedFromAudience}
              className="flex-1 text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Campaign & Template Selection Step */}
      {currentStep === 'campaign' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-1 text-white">Campaign Settings</h3>
            <p className="text-sm text-gray-400">Select campaign and email template</p>
          </div>

          <div>
            <Label className="block text-sm font-medium mb-2 text-gray-300">Campaign</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {campaignOptions.length === 0 ? (
                <div className="p-4 text-center text-gray-400 bg-gray-900/50 rounded-lg">
                  No campaigns available
                </div>
              ) : (
                campaignOptions.map((campaign) => (
                  <button
                    key={campaign.id}
                    onClick={() => handleFieldChange('campaign_id', campaign.id)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      formData.campaign_id === campaign.id
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{campaign.name}</div>
                        {campaign.description && (
                          <div className="text-xs text-gray-400 truncate">{campaign.description}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <Label className="block text-sm font-medium mb-2 text-gray-300">Email Template</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {templateOptions.length === 0 ? (
                <div className="p-4 text-center text-gray-400 bg-gray-900/50 rounded-lg">
                  No email templates available
                </div>
              ) : (
                templateOptions.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleFieldChange('template_id', template.id)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      formData.template_id === template.id
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{template.name}</div>
                        {template.subject_line && (
                          <div className="text-xs text-gray-400 truncate">
                            Subject: {template.subject_line}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={() => setCurrentStep('audience')}
              variant="outline"
              className="px-6 text-gray-300 bg-transparent border-gray-600 hover:bg-gray-700"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex-1 text-white bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Campaign'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutreachForm;

