import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Constants, QueryKeys } from 'librechat-data-provider';
import type { TUpdateUserPlugins } from 'librechat-data-provider';
import { useUpdateUserPluginsMutation } from 'librechat-data-provider/react-query';
import { Label, Input, Button } from '@librechat/client';
import { useToastContext } from '@librechat/client';
import { useLocalize } from '~/hooks';

interface Neo4jServerPanelProps {
  serverName: string;
  onBack: () => void;
  isQueryForm?: boolean;
  onSubmitQuery?: (websiteId: string, startDate: string, endDate: string) => void;
}

export default function Neo4jServerPanel({
  serverName,
  onBack,
  isQueryForm = false,
  onSubmitQuery,
}: Neo4jServerPanelProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const [websiteId, setWebsiteId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const updateUserPluginsMutation = useUpdateUserPluginsMutation({
    onSuccess: async () => {
      showToast({
        message:
          localize('com_nav_mcp_vars_updated') || 'Neo4j server variables updated successfully',
        status: 'success',
      });

      await Promise.all([
        queryClient.refetchQueries([QueryKeys.tools]),
        queryClient.refetchQueries([QueryKeys.mcpAuthValues]),
        queryClient.refetchQueries([QueryKeys.mcpConnectionStatus]),
      ]);
    },
    onError: (error: unknown) => {
      console.error('Error updating Neo4j MCP variables:', error);
      showToast({
        message:
          localize('com_nav_mcp_vars_update_error') || 'Failed to update Neo4j server variables',
        status: 'error',
      });
    },
  });

  const handleSave = useCallback(() => {
    if (isQueryForm) {
      // Handle query form submission
      if (!websiteId.trim() || !startDate || !endDate) {
        showToast({
          message: 'Please fill in all required fields',
          status: 'error',
        });
        return;
      }

      if (onSubmitQuery) {
        onSubmitQuery(websiteId.trim(), startDate, endDate);
      }
      return;
    }

    // Handle configuration save
    if (!websiteId.trim()) {
      showToast({
        message: 'Please enter a valid website ID',
        status: 'error',
      });
      return;
    }

    const pluginKey = `${Constants.mcp_prefix}${serverName}`;
    const updateData: TUpdateUserPlugins = {
      pluginKey,
      action: 'install',
      auth: {
        website_id: websiteId.trim(),
      },
    };

    console.log(`[Neo4j Panel] Saving website_id for ${serverName}:`, websiteId.trim());
    updateUserPluginsMutation.mutate(updateData);
  }, [
    websiteId,
    startDate,
    endDate,
    isQueryForm,
    onSubmitQuery,
    serverName,
    updateUserPluginsMutation,
    showToast,
  ]);

  const handleWebsiteIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setWebsiteId(e.target.value);
  }, []);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  }, []);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  }, []);

  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  const isWebsiteIdValid = websiteId.trim() && isValidUUID(websiteId.trim());
  const isFormValid = isQueryForm ? isWebsiteIdValid && startDate && endDate : isWebsiteIdValid;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-light pb-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Button>
        <h3 className="text-lg font-semibold">
          {isQueryForm ? 'Website Analysis Parameters' : 'Neo4j Server Configuration'}
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 py-4">
        <div className="space-y-2">
          <Label htmlFor="website-id-input" className="text-sm font-medium">
            Website ID
          </Label>
          <Input
            id="website-id-input"
            type="text"
            value={websiteId}
            onChange={handleWebsiteIdChange}
            placeholder="e.g., 72c0e6fc-9c32-46e2-afc1-75bc567959a0"
            className={`w-full ${
              websiteId.trim() && !isWebsiteIdValid ? 'border-red-500 focus:border-red-500' : ''
            }`}
          />
          <p className="text-xs text-text-secondary">
            Enter the UUID of the website you want to analyze. This will be used for website
            optimization queries.
          </p>
          {websiteId.trim() && !isWebsiteIdValid && (
            <p className="text-xs text-red-500">
              Please enter a valid UUID format (e.g., 72c0e6fc-9c32-46e2-afc1-75bc567959a0)
            </p>
          )}
        </div>

        {/* Date Range Inputs - Only show in query form mode */}
        {isQueryForm && (
          <>
            <div className="space-y-2">
              <Label htmlFor="start-date-input" className="text-sm font-medium">
                Start Date
              </Label>
              <Input
                id="start-date-input"
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className="w-full"
              />
              <p className="text-xs text-text-secondary">
                Select the start date for your analysis period.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date-input" className="text-sm font-medium">
                End Date
              </Label>
              <Input
                id="end-date-input"
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                className="w-full"
              />
              <p className="text-xs text-text-secondary">
                Select the end date for your analysis period.
              </p>
            </div>
          </>
        )}

        {/* Example Usage */}
        <div className="rounded-lg bg-surface-secondary p-4">
          <h4 className="mb-2 text-sm font-medium">
            {isQueryForm ? 'Query Information' : 'Example Usage'}
          </h4>
          <div className="space-y-2 text-xs text-text-secondary">
            {isQueryForm ? (
              <>
                <p>This will analyze website data for the specified date range:</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Traffic patterns and trends</li>
                  <li>Most trafficked main topics</li>
                  <li>Search term performance</li>
                  <li>Click-through rates and impressions</li>
                </ul>
              </>
            ) : (
              <>
                <p>Once configured, you can ask questions like:</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>"What are the most trafficked main topics this past quarter?"</li>
                  <li>"Analyze website performance for the last 30 days"</li>
                  <li>"Show me the top performing pages by clicks"</li>
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Current Configuration */}
        {websiteId.trim() && (
          <div className="rounded-lg bg-surface-tertiary p-4">
            <h4 className="mb-2 text-sm font-medium">
              {isQueryForm ? 'Query Parameters' : 'Current Configuration'}
            </h4>
            <div className="space-y-1 text-xs">
              <p>
                <span className="font-medium">Server:</span> {serverName}
              </p>
              <p>
                <span className="font-medium">Website ID:</span> {websiteId}
              </p>
              {isQueryForm && startDate && (
                <p>
                  <span className="font-medium">Start Date:</span> {startDate}
                </p>
              )}
              {isQueryForm && endDate && (
                <p>
                  <span className="font-medium">End Date:</span> {endDate}
                </p>
              )}
              <p>
                <span className="font-medium">Status:</span>
                <span className={`ml-1 ${isFormValid ? 'text-green-600' : 'text-red-500'}`}>
                  {isFormValid ? 'Ready' : isQueryForm ? 'Incomplete' : 'Invalid UUID'}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border-light pt-4">
        <Button
          onClick={handleSave}
          disabled={!isFormValid || updateUserPluginsMutation.isLoading}
          className="w-full"
        >
          {updateUserPluginsMutation.isLoading
            ? 'Processing...'
            : isQueryForm
              ? 'Run Analysis'
              : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
