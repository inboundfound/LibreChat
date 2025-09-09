import React, { useState, useCallback } from 'react';
import { Label, Input, Button } from '~/components/ui';
import { useChatContext } from '~/Providers';

interface LaunchGuardianFormProps {
  originalQuery: string;
  onSubmit: (formattedQuery: string) => void;
  onCancel: () => void;
}

export default function LaunchGuardianForm({
  originalQuery,
  onSubmit,
  onCancel,
}: LaunchGuardianFormProps) {
  const [websiteId, setWebsiteId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UUID validation
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const isFormValid = websiteId.trim() && isValidUUID(websiteId.trim()) && startDate && endDate;

  const handleSubmit = useCallback(async () => {
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Format the query for Launch Guardian GSC analysis
      const formattedQuery = `
        Launch Guardian GSC Data Analysis Request:

        Website ID: ${websiteId.trim()}
        Start Date: ${startDate}
        End Date: ${endDate}

        Please analyze the Google Search Console data for this website and date range, focusing on:
        - Most trafficked main topics and pages
        - Search term performance and keyword rankings
        - Traffic patterns and trends
        - Click-through rates and impressions
        - Opportunities for lead generation optimization

        Original request: ${originalQuery}
      `;

      console.log('LaunchGuardian: Submitting GSC analysis request', {
        websiteId: websiteId.trim(),
        startDate,
        endDate,
        originalQuery: originalQuery.substring(0, 100) + '...',
      });

      onSubmit(formattedQuery);
    } catch (error) {
      console.error('LaunchGuardian: Error submitting form', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [websiteId, startDate, endDate, originalQuery, onSubmit, isFormValid, isSubmitting]);

  // Set default date range (last 30 days)
  React.useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-border-light bg-surface-primary p-6 shadow-lg">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-text-primary">
          Launch Guardian GSC Data Analysis
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          We detected you want to analyze website performance. Let's set up a detailed GSC analysis.
        </p>
      </div>

      {/* Original Query Display */}
      <div className="mb-6 rounded-lg bg-surface-secondary p-4">
        <Label className="text-sm font-medium text-text-primary">Your Request:</Label>
        <p className="mt-1 text-sm italic text-text-secondary">"{originalQuery}"</p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Website ID */}
        <div>
          <Label htmlFor="website-id" className="text-sm font-medium">
            Website ID <span className="text-red-500">*</span>
          </Label>
          <Input
            id="website-id"
            type="text"
            value={websiteId}
            onChange={(e) => setWebsiteId(e.target.value)}
            placeholder="e.g., 72c0e6fc-9c32-46e2-afc1-75bc567959a0"
            className={`mt-1 w-full ${
              websiteId.trim() && !isValidUUID(websiteId.trim())
                ? 'border-red-500 focus:border-red-500'
                : ''
            }`}
          />
          {websiteId.trim() && !isValidUUID(websiteId.trim()) && (
            <p className="mt-1 text-xs text-red-500">Please enter a valid UUID format</p>
          )}
          <p className="mt-1 text-xs text-text-secondary">
            Enter the UUID of the website you want to analyze from the Launch Guardian database.
          </p>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="start-date" className="text-sm font-medium">
              Start Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
          <div>
            <Label htmlFor="end-date" className="text-sm font-medium">
              End Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full"
            />
          </div>
        </div>
      </div>

      {/* Analysis Preview */}
      {isFormValid && (
        <div className="mt-6 rounded-lg bg-surface-tertiary p-4">
          <h4 className="mb-2 text-sm font-medium text-text-primary">Analysis Preview</h4>
          <div className="space-y-1 text-xs text-text-secondary">
            <p>
              <span className="font-medium">Website:</span> {websiteId.trim()}
            </p>
            <p>
              <span className="font-medium">Period:</span> {startDate} to {endDate}
            </p>
            <p>
              <span className="font-medium">Analysis Type:</span> Google Search Console Data
              Analysis
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? 'Starting Analysis...' : 'Start GSC Analysis'}
        </Button>
        <Button onClick={onCancel} variant="outline" disabled={isSubmitting} className="flex-1">
          Use Normal Chat Instead
        </Button>
      </div>

      {/* Help Text */}
      <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Tip:</strong> This will analyze your website's Google Search Console data using
          the Launch Guardian database. The analysis will provide insights on traffic patterns,
          keyword performance, and optimization opportunities.
        </p>
      </div>
    </div>
  );
}
