import React, { useState, useCallback } from 'react';
import { useLocalize } from '~/hooks';
import { Button, Input, Label, TextareaAutosize, SelectDropDown } from '@librechat/client';

interface CrawlFormData {
  website: string;
  launchDate: string;
  description: string;
}

interface WebsiteOption {
  label: string;
  value: string;
}

interface CrawlFormProps {
  onSubmit?: (data: CrawlFormData) => void;
  onCancel?: () => void;
  websiteOptions?: WebsiteOption[];
  isSubmitted?: boolean;
  isCancelled?: boolean;
  submittedData?: CrawlFormData & { websiteLabel?: string };
}

const CrawlForm: React.FC<CrawlFormProps> = ({
  onSubmit,
  onCancel,
  websiteOptions = [],
  isSubmitted = false,
  isCancelled = false,
  submittedData,
}) => {
  const localize = useLocalize();
  const [formData, setFormData] = useState<CrawlFormData>({
    website: '',
    launchDate: '',
    description: '',
  });

  // Find the selected website option for dropdown display
  const selectedWebsiteOption = websiteOptions.find((option) => option.value === formData.website);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = useCallback((field: keyof CrawlFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.website || !formData.launchDate || !formData.description) {
        return;
      }

      setIsSubmitting(true);
      try {
        onSubmit?.(formData);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit],
  );

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  const isValid = formData.website && formData.launchDate && formData.description;

  // If form is cancelled, show cancelled state
  if (isCancelled) {
    return (
      <div className="p-4 my-4 border border-red-400 shadow-lg rounded-xl bg-red-50 dark:bg-red-900/20">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
              ❌ Crawl Configuration Cancelled
            </h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">
            The crawl configuration form was cancelled.
          </p>
        </div>
      </div>
    );
  }

  // If form is submitted, show the form with disabled fields and green outline
  if (isSubmitted && submittedData) {
    return (
      <div className="p-4 my-4 bg-gray-800 border-2 border-green-500 shadow-lg rounded-xl">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-green-400">
              ✅ Crawl Configuration Submitted
            </h3>
          </div>
          <p className="text-sm text-green-300">
            The crawl configuration has been submitted and processed.
          </p>
        </div>

        <div className="space-y-6">
          {/* Website Field */}
          <div>
            <Label htmlFor="website" className="block mb-2 text-sm font-medium text-white">
              Website
            </Label>
            {websiteOptions.length > 0 ? (
              <div className="w-full px-3 py-2 text-white bg-gray-700 border border-green-500 rounded-md opacity-75">
                {submittedData.websiteLabel || submittedData.website}
              </div>
            ) : (
              <Input
                id="website"
                type="url"
                value={submittedData.website}
                className="w-full text-white bg-gray-700 border-green-500 opacity-75"
                disabled
              />
            )}
          </div>

          {/* Launch Date Field */}
          <div>
            <Label htmlFor="launchDate" className="block mb-2 text-sm font-medium text-white">
              Launch Date
            </Label>
            <Input
              id="launchDate"
              type="datetime-local"
              value={submittedData.launchDate}
              className="w-full text-white bg-gray-700 border-green-500 opacity-75"
              disabled
            />
          </div>

          {/* Description Field */}
          <div>
            <Label htmlFor="description" className="block mb-2 text-sm font-medium text-white">
              Description
            </Label>
            <TextareaAutosize
              id="description"
              value={submittedData.description}
              minRows={3}
              maxRows={6}
              className="w-full text-white bg-gray-700 border-green-500 opacity-75 resize-none"
              disabled
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 my-4 bg-gray-800 border border-gray-600 shadow-lg rounded-xl">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <h3 className="text-lg font-semibold text-white">Website Crawl Configuration</h3>
        </div>
        <p className="text-sm text-gray-300">
          Please provide the details for the website crawl.
          {websiteOptions.length > 0 &&
            ` Select from ${websiteOptions.length} available website${websiteOptions.length > 1 ? 's' : ''}.`}{' '}
          Chat is disabled until you submit or cancel this form.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Website Selector */}
        <div>
          <Label htmlFor="website" className="block mb-2 text-sm font-medium text-white">
            Website
          </Label>
          {websiteOptions.length > 0 ? (
            <SelectDropDown
              id="website"
              value={
                selectedWebsiteOption
                  ? { value: selectedWebsiteOption.value, label: selectedWebsiteOption.label }
                  : formData.website
              }
              setValue={(value) => {
                // Handle both string and object values
                const websiteValue = typeof value === 'string' ? value : value?.value || '';
                handleInputChange('website', websiteValue);
              }}
              placeholder="Select a website..."
              containerClassName="w-full"
              availableValues={websiteOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              showLabel={false}
              emptyTitle={true}
            />
          ) : (
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://example.com"
              className="w-full text-white placeholder-gray-400 bg-gray-700 border-gray-600"
              required
            />
          )}
        </div>

        {/* Launch Date Picker */}
        <div>
          <Label htmlFor="launchDate" className="block mb-2 text-sm font-medium text-white">
            Launch Date
          </Label>
          <Input
            id="launchDate"
            type="datetime-local"
            value={formData.launchDate}
            onChange={(e) => handleInputChange('launchDate', e.target.value)}
            className="w-full text-white bg-gray-700 border-gray-600"
            required
          />
        </div>

        {/* Description Text Field */}
        <div>
          <Label htmlFor="description" className="block mb-2 text-sm font-medium text-white">
            Description
          </Label>
          <TextareaAutosize
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe what you want to crawl..."
            minRows={3}
            maxRows={6}
            className="w-full text-white placeholder-gray-400 bg-gray-700 border-gray-600 resize-none"
            required
          />
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
            disabled={!isValid || isSubmitting}
            className="flex-1 text-white bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                Submitting...
              </span>
            ) : (
              'Confirm Crawl'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CrawlForm;
