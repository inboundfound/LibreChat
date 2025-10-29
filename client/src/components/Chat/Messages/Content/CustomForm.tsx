import React, { useState, useCallback } from 'react';
import { useLocalize } from '~/hooks';
import { Button, Input, Label, TextareaAutosize, SelectDropDown } from '@librechat/client';

interface CustomFormField {
  label: string;
  type: string; // 'text_field', 'bool', 'selector', etc.
  id: string;
  options?: Array<{ label: string; value: string }>; // For selector type
  default?: string; // Default value for selector
}

interface CustomFormData {
  [key: string]: string | boolean;
}

interface CustomFormProps {
  onSubmit?: (data: CustomFormData) => void;
  onCancel?: () => void;
  formFields?: CustomFormField[];
  isSubmitted?: boolean;
  isCancelled?: boolean;
  submittedData?: CustomFormData;
}

const CustomForm: React.FC<CustomFormProps> = ({
  onSubmit,
  onCancel,
  formFields = [],
  isSubmitted = false,
  isCancelled = false,
  submittedData,
}) => {
  const localize = useLocalize();
  const [formData, setFormData] = useState<CustomFormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data with empty values for each field
  React.useEffect(() => {
    const initialData: CustomFormData = {};
    formFields.forEach(field => {
      if (field.type === 'bool') {
        initialData[field.id] = false;
      } else if (field.type === 'selector') {
        // Use default value if provided, otherwise empty string
        initialData[field.id] = field.default || '';
      } else {
        initialData[field.id] = '';
      }
    });
    setFormData(initialData);
  }, [formFields]);

  const handleInputChange = useCallback((fieldId: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Check if all required fields are filled
      const isValid = formFields.every(field => {
        const value = formData[field.id];
        if (field.type === 'bool') {
          return typeof value === 'boolean';
        } else {
          return typeof value === 'string' && value.trim().length > 0;
        }
      });

      if (!isValid) {
        return;
      }

      setIsSubmitting(true);
      try {
        onSubmit?.(formData);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit, formFields],
  );

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  const isValid = formFields.every(field => {
    const value = formData[field.id];
    if (field.type === 'bool') {
      return typeof value === 'boolean';
    } else {
      return typeof value === 'string' && value.trim().length > 0;
    }
  });

  // If form is cancelled, show cancelled state
  if (isCancelled) {
    return (
      <div className="my-4 rounded-xl border border-red-400 bg-red-50 p-4 shadow-lg dark:bg-red-900/20">
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
              ❌ Custom Form Cancelled
            </h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">
            The custom form was cancelled.
          </p>
        </div>
      </div>
    );
  }

  // If form is submitted, show the form with disabled fields and green outline
  if (isSubmitted && submittedData) {
    return (
      <div className="my-4 rounded-xl border-2 border-green-500 bg-gray-800 p-4 shadow-lg">
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <h3 className="text-lg font-semibold text-green-400">
              ✅ Custom Form Submitted
            </h3>
          </div>
          <p className="text-sm text-green-300">
            The form has been submitted and processed.
          </p>
        </div>

        <div className="space-y-6">
          {formFields.map((field) => {
            const value = submittedData[field.id];
            return (
              <div key={field.id}>
                <Label htmlFor={field.id} className="mb-2 block text-sm font-medium text-white">
                  {field.label}
                </Label>
                
                {field.type === 'bool' ? (
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={field.id}
                        value="true"
                        checked={value === true}
                        className="text-green-500 border-green-500"
                        disabled
                      />
                      <span className="text-white opacity-75">Yes</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={field.id}
                        value="false"
                        checked={value === false}
                        className="text-green-500 border-green-500"
                        disabled
                      />
                      <span className="text-white opacity-75">No</span>
                    </label>
                  </div>
                ) : field.type === 'selector' ? (
                  <div className="relative">
                    <select
                      id={field.id}
                      value={String(value)}
                      className="w-full rounded-md border border-green-500 bg-gray-700 px-3 py-2 text-white opacity-75"
                      disabled
                    >
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <Input
                    id={field.id}
                    type="text"
                    value={String(value)}
                    className="w-full border-green-500 bg-gray-700 text-white opacity-75"
                    disabled
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl border border-gray-600 bg-gray-800 p-4 shadow-lg">
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-3 w-3 animate-pulse rounded-full bg-blue-500"></div>
          <h3 className="text-lg font-semibold text-white">Custom Form</h3>
        </div>
        <p className="text-sm text-gray-300">
          Please fill out the form fields below. Chat is disabled until you submit or cancel this form.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {formFields.map((field) => (
          <div key={field.id}>
            <Label htmlFor={field.id} className="mb-2 block text-sm font-medium text-white">
              {field.label}
            </Label>
            
            {field.type === 'bool' ? (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field.id}
                    value="true"
                    checked={formData[field.id] === true}
                    onChange={() => handleInputChange(field.id, true)}
                    className="text-blue-600"
                  />
                  <span className="text-white">Yes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field.id}
                    value="false"
                    checked={formData[field.id] === false}
                    onChange={() => handleInputChange(field.id, false)}
                    className="text-blue-600"
                  />
                  <span className="text-white">No</span>
                </label>
              </div>
            ) : field.type === 'selector' ? (
              <div className="relative">
                <select
                  id={field.id}
                  value={formData[field.id] as string || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>
                    Select {field.label.toLowerCase()}...
                  </option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <Input
                id={field.id}
                type="text"
                value={formData[field.id] as string || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
                className="w-full border-gray-600 bg-gray-700 text-white placeholder-gray-400"
                required
              />
            )}
          </div>
        ))}

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
            disabled={!isValid || isSubmitting}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Submitting...
              </span>
            ) : (
              'Submit Form'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CustomForm; 