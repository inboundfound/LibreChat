import React, { useState, useCallback, useEffect } from 'react';
import { Button, Label } from '@librechat/client';
import { Database, Globe, Calendar, CheckCircle } from 'lucide-react';
import { useAuthContext } from '~/hooks';
import DateRangePicker from './DateRangePicker';

interface ServiceAccountOption {
  id: string;
  email: string;
}

interface WebsiteOption {
  id: string;
  name: string;
  url: string;
}

interface SiteKeywordFormData {
  keywords_source: 'gsc' | 'dataforseo' | '';
  website_id: string;
  service_account?: string;
  start_date?: string;
  end_date?: string;
}

interface SiteKeywordFormProps {
  onSubmit?: (data: SiteKeywordFormData & { toolResponse?: any }) => void;
  onCancel?: () => void;
  serviceAccountOptions?: ServiceAccountOption[];
  websiteOptions?: WebsiteOption[];
  keywordSources?: string[];
  serverName?: string;
  isSubmitted?: boolean;
  isCancelled?: boolean;
  submittedData?: SiteKeywordFormData & {
    websiteLabel?: string;
    serviceAccountLabel?: string;
    sourceLabel?: string;
  };
}

const SiteKeywordForm: React.FC<SiteKeywordFormProps> = ({
  onSubmit,
  onCancel,
  serviceAccountOptions = [],
  websiteOptions = [],
  keywordSources = ['gsc', 'dataforseo'],
  serverName = '',
  isSubmitted = false,
  isCancelled = false,
  submittedData,
}) => {
  const { token } = useAuthContext();
  const [formData, setFormData] = useState<SiteKeywordFormData>({
    keywords_source: '',
    website_id: '',
    service_account: '',
    start_date: '',
    end_date: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize default dates (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    setFormData((prev) => ({
      ...prev,
      start_date: formatDate(thirtyDaysAgo),
      end_date: formatDate(today),
    }));
  }, []);

  const handleInputChange = useCallback((field: keyof SiteKeywordFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validation
      if (!formData.keywords_source || !formData.website_id) {
        return;
      }

      if (formData.keywords_source === 'gsc') {
        if (!formData.service_account || !formData.start_date || !formData.end_date) {
          return;
        }
      }

      setIsSubmitting(true);

      try {
        // Make direct API call to the MCP tool
        const toolId = `load_site_keyword_data_mcp_${serverName}`;
        
        const payload: any = {
          keywords_source: formData.keywords_source,
          website_id: formData.website_id,
        };
        
        if (formData.keywords_source === 'gsc') {
          payload.service_account = formData.service_account;
          payload.start_date = formData.start_date;
          payload.end_date = formData.end_date;
        }
        
        console.log('🔍 Calling load_site_keyword_data_tool:', {
          toolId,
          payload,
        });

        const response = await fetch(`/api/agents/tools/${encodeURIComponent(toolId)}/call`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ HTTP error response:', {
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText,
          });
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ MCP tool response:', result);
        console.log('📊 Response details:', {
          status: response.status,
          statusText: response.statusText,
          hasResult: !!result.result,
          resultType: typeof result.result,
          resultPreview: typeof result.result === 'string' 
            ? result.result.substring(0, 200) 
            : JSON.stringify(result.result).substring(0, 200),
          fullResult: result,
        });

        // Call onSubmit with both form data and tool response
        onSubmit?.({ ...formData, toolResponse: result });
      } catch (error) {
        console.error('❌ Error calling MCP tool:', error);
        console.error('❌ Error details:', {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : 'N/A',
          formData,
          toolId: `load_site_keyword_data_tool_mcp_${serverName}`,
        });
        // Still call onSubmit but with error info
        onSubmit?.({ 
          ...formData, 
          toolResponse: { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          } 
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit, serverName, token],
  );

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  const isFormValid = () => {
    if (!formData.keywords_source || !formData.website_id) {
      return false;
    }
    
    if (formData.keywords_source === 'gsc') {
      return !!(
        formData.service_account &&
        formData.start_date &&
        formData.end_date &&
        formData.start_date <= formData.end_date
      );
    }
    
    return true;
  };

  // Cancelled state
  if (isCancelled) {
    return (
      <div className="my-4 rounded-xl border border-red-400 bg-red-50 p-4 shadow-lg dark:bg-red-900/20">
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
              Form Cancelled
            </h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">
            The site keyword data loading has been cancelled.
          </p>
        </div>
      </div>
    );
  }

  // Submitted state
  if (isSubmitted && submittedData) {
    const sourceLabel = submittedData.keywords_source === 'gsc' ? 'Google Search Console' : 'DataForSEO';
    const website = websiteOptions.find((w) => w.id === submittedData.website_id);
    const websiteLabel = website ? `${website.name} (${website.url})` : submittedData.website_id;
    const serviceAccount = serviceAccountOptions.find((sa) => sa.id === submittedData.service_account);
    const serviceAccountLabel = serviceAccount ? serviceAccount.email : submittedData.service_account;
    
    return (
      <div className="my-4 rounded-xl border-2 border-green-500 bg-gray-800 p-4 shadow-lg">
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold text-green-400">
              Keyword Data Loading Submitted
            </h3>
          </div>
          <p className="text-sm text-green-300">
            The keyword data loading request has been submitted successfully.
          </p>
        </div>

        <div className="space-y-4">
          {/* Data Source */}
          <div>
            <Label className="mb-2 block text-sm font-medium text-white">Data Source</Label>
            <div className="flex items-center gap-2 rounded-md border border-green-500 bg-gray-700 px-3 py-2 text-white opacity-75">
              <Database className="h-4 w-4" />
              <span>{sourceLabel}</span>
            </div>
          </div>

          {/* Website */}
          <div>
            <Label className="mb-2 block text-sm font-medium text-white">Website</Label>
            <div className="flex items-center gap-2 rounded-md border border-green-500 bg-gray-700 px-3 py-2 text-white opacity-75">
              <Globe className="h-4 w-4" />
              <span>{websiteLabel}</span>
            </div>
          </div>

          {/* GSC-specific fields */}
          {submittedData.keywords_source === 'gsc' && (
            <>
              {submittedData.service_account && (
                <div>
                  <Label className="mb-2 block text-sm font-medium text-white">
                    Service Account
                  </Label>
                  <div className="rounded-md border border-green-500 bg-gray-700 px-3 py-2 text-white opacity-75">
                    {serviceAccountLabel}
                  </div>
                </div>
              )}

              {submittedData.start_date && submittedData.end_date && (
                <div>
                  <Label className="mb-2 block text-sm font-medium text-white">
                    Date Range
                  </Label>
                  <div className="flex items-center gap-2 rounded-md border border-green-500 bg-gray-700 px-3 py-2 text-white opacity-75">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {submittedData.start_date} to {submittedData.end_date}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Active form state
  return (
    <div className="my-4 rounded-xl border border-gray-600 bg-gray-800 p-4 shadow-lg">
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded-full bg-blue-500"></div>
          <h3 className="text-lg font-semibold text-white">Load Site Keyword Data</h3>
        </div>
        <p className="text-sm text-gray-300">
          Configure the data source and parameters for loading keyword data.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Data Source Selector */}
        <div>
          <Label htmlFor="keywords_source" className="mb-2 block text-sm font-medium text-white">
            Data Source
          </Label>
          <select
            id="keywords_source"
            value={formData.keywords_source}
            onChange={(e) => handleInputChange('keywords_source', e.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a data source...</option>
            {keywordSources.includes('gsc') && (
              <option value="gsc">Google Search Console (GSC)</option>
            )}
            {keywordSources.includes('dataforseo') && (
              <option value="dataforseo">DataForSEO</option>
            )}
          </select>
        </div>

        {/* Website Selector */}
        {formData.keywords_source && (
          <div>
            <Label htmlFor="website_id" className="mb-2 block text-sm font-medium text-white">
              Website
            </Label>
            <select
              id="website_id"
              value={formData.website_id}
              onChange={(e) => handleInputChange('website_id', e.target.value)}
              className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a website...</option>
              {websiteOptions.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.name} ({website.url})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* GSC-specific fields */}
        {formData.keywords_source === 'gsc' && (
          <>
            {/* Service Account Selector */}
            <div>
              <Label htmlFor="service_account" className="mb-2 block text-sm font-medium text-white">
                Service Account
              </Label>
              <select
                id="service_account"
                value={formData.service_account}
                onChange={(e) => handleInputChange('service_account', e.target.value)}
                className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a service account...</option>
                {serviceAccountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Picker */}
            <DateRangePicker
              startDate={formData.start_date || ''}
              endDate={formData.end_date || ''}
              onStartDateChange={(date) => handleInputChange('start_date', date)}
              onEndDateChange={(date) => handleInputChange('end_date', date)}
              required
            />
          </>
        )}

        {/* Info message for DataForSEO */}
        {formData.keywords_source === 'dataforseo' && (
          <div className="rounded-md border border-blue-500/30 bg-blue-900/20 p-3">
            <p className="text-sm text-blue-200">
              DataForSEO will load the most recent keyword data available for the selected website.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            onClick={handleCancel}
            variant="outline"
            className="flex-1 border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Loading Data...
              </span>
            ) : (
              'Load Keyword Data'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SiteKeywordForm;
