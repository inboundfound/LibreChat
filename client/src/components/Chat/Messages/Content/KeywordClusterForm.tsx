import React, { useState, useCallback } from 'react';
import { Button, Label, TextareaAutosize } from '@librechat/client';
import { Globe, CheckCircle, FileText, Info } from 'lucide-react';
import { useAuthContext } from '~/hooks';

interface WebsiteOption {
  id: string;
  name: string;
  url: string;
}

interface KeywordClusterFormData {
  website_id: string;
  url_data?: string[];
}

interface KeywordClusterFormProps {
  onSubmit?: (data: KeywordClusterFormData & { toolResponse?: any }) => void;
  onCancel?: () => void;
  websiteOptions?: WebsiteOption[];
  serverName?: string;
  isSubmitted?: boolean;
  isCancelled?: boolean;
  submittedData?: KeywordClusterFormData & {
    websiteLabel?: string;
    urlCount?: number;
  };
}

const KeywordClusterForm: React.FC<KeywordClusterFormProps> = ({
  onSubmit,
  onCancel,
  websiteOptions = [],
  serverName = '',
  isSubmitted = false,
  isCancelled = false,
  submittedData,
}) => {
  const { token } = useAuthContext();
  const [formData, setFormData] = useState<{ website_id: string; url_text: string }>({
    website_id: '',
    url_text: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const parseUrls = (urlText: string): string[] => {
    if (!urlText.trim()) return [];

    return urlText
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.website_id) {
        return;
      }

      setIsSubmitting(true);

      try {
        const toolId = `load_keyword_cluster_mcp_${serverName}`;

        const urlArray = parseUrls(formData.url_text);

        const payload: any = {
          website_id: formData.website_id,
        };

        // Only include url_data if URLs were provided
        if (urlArray.length > 0) {
          payload.url_data = urlArray;
        }

        console.log('🔍 Calling load_keyword_cluster:', {
          toolId,
          payload,
          urlCount: urlArray.length,
        });

        const response = await fetch(`/api/agents/tools/${encodeURIComponent(toolId)}/call`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
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
          fullResult: result,
        });

        onSubmit?.({
          website_id: formData.website_id,
          url_data: urlArray.length > 0 ? urlArray : undefined,
          toolResponse: result,
        });
      } catch (error) {
        console.error('❌ Error calling MCP tool:', error);
        console.error('❌ Error details:', {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : 'N/A',
          formData,
          toolId: `load_keyword_cluster_mcp_${serverName}`,
        });

        onSubmit?.({
          website_id: formData.website_id,
          url_data: parseUrls(formData.url_text),
          toolResponse: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
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
    return !!formData.website_id;
  };

  // Cancelled state
  if (isCancelled) {
    return (
      <div className="p-4 my-4 border border-red-400 shadow-lg rounded-xl bg-red-50 dark:bg-red-900/20">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Form Cancelled</h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">
            The keyword clustering has been cancelled.
          </p>
        </div>
      </div>
    );
  }

  // Submitted state
  if (isSubmitted && submittedData) {
    const website = websiteOptions.find((w) => w.id === submittedData.website_id);
    const websiteLabel = website ? `${website.name} (${website.url})` : submittedData.website_id;
    const urlCount = submittedData.url_data?.length || 0;

    return (
      <div className="p-4 my-4 bg-gray-800 border-2 border-green-500 shadow-lg rounded-xl">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold text-green-400">Keyword Clustering Submitted</h3>
          </div>
          <p className="text-sm text-green-300">
            The keyword clustering request has been submitted successfully.
          </p>
        </div>

        <div className="space-y-4">
          {/* Website */}
          <div>
            <Label className="block mb-2 text-sm font-medium text-white">Website</Label>
            <div className="flex items-center gap-2 px-3 py-2 text-white bg-gray-700 border border-green-500 rounded-md opacity-75">
              <Globe className="w-4 h-4" />
              <span>{websiteLabel}</span>
            </div>
          </div>

          {/* URL Scope */}
          <div>
            <Label className="block mb-2 text-sm font-medium text-white">URL Scope</Label>
            <div className="flex items-center gap-2 px-3 py-2 text-white bg-gray-700 border border-green-500 rounded-md opacity-75">
              <FileText className="w-4 h-4" />
              <span>
                {urlCount > 0
                  ? `${urlCount} specific URL${urlCount > 1 ? 's' : ''}`
                  : 'All keywords on website'}
              </span>
            </div>
          </div>

          {/* Show URLs if provided */}
          {urlCount > 0 && submittedData.url_data && (
            <div>
              <Label className="block mb-2 text-sm font-medium text-white">URLs</Label>
              <div className="px-3 py-2 overflow-y-auto text-sm text-white bg-gray-700 border border-green-500 rounded-md opacity-75 max-h-32">
                {submittedData.url_data.map((url, index) => (
                  <div key={index} className="py-1">
                    {url}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active form state
  return (
    <div className="p-4 my-4 bg-gray-800 border border-gray-600 shadow-lg rounded-xl">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <h3 className="text-lg font-semibold text-white">Create Keyword Clusters</h3>
        </div>
        <p className="text-sm text-gray-300">Configure keyword clustering for your website.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Website Selector */}
        <div>
          <Label htmlFor="website_id" className="block mb-2 text-sm font-medium text-white">
            Website <span className="text-red-400">*</span>
          </Label>
          <select
            id="website_id"
            value={formData.website_id}
            onChange={(e) => handleInputChange('website_id', e.target.value)}
            className="w-full px-3 py-2 text-white bg-gray-700 border border-gray-600 rounded-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* URL List (Optional) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label htmlFor="url_text" className="text-sm font-medium text-white">
              URLs (Optional)
            </Label>
            <div className="relative group">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 z-10 hidden w-64 p-3 mb-2 text-xs text-gray-200 bg-gray-900 rounded-lg shadow-lg pointer-events-none bottom-full group-hover:block">
                <p className="mb-1 font-semibold">URL Filter</p>
                <p>
                  Filter keywords to specific pages on your website. If provided, only keywords
                  associated with these URLs will be clustered. If left empty, all keywords across
                  the entire website will be clustered together.
                </p>
              </div>
            </div>
          </div>
          <TextareaAutosize
            id="url_text"
            value={formData.url_text}
            onChange={(e) => handleInputChange('url_text', e.target.value)}
            placeholder="https://example.com/blog/article-1&#10;https://example.com/services/consulting&#10;https://example.com/about"
            className="w-full px-3 py-2 text-white placeholder-gray-400 bg-gray-700 border border-gray-600 rounded-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            minRows={4}
            maxRows={10}
          />
          <p className="mt-1 text-xs text-gray-400">
            Enter full URLs one per line (e.g., https://example.com/blog/article). Leave empty to
            cluster all keywords on the website.
          </p>
        </div>

        {/* Info Box */}
        <div className="p-3 border rounded-md border-blue-500/30 bg-blue-900/20">
          <p className="text-sm text-blue-200">
            {formData.url_text.trim()
              ? '✓ Clustering will be performed for the specified URLs only'
              : 'ℹ All keywords on the website will be clustered'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            onClick={handleCancel}
            variant="outline"
            className="flex-1 text-gray-300 bg-transparent border-gray-600 hover:bg-gray-700"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid() || isSubmitting}
            className="flex-1 text-white bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                Creating Clusters...
              </span>
            ) : (
              'Create Clusters'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default KeywordClusterForm;
