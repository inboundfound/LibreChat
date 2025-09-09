# Custom Form Tool Test

This file demonstrates how the new `render_custom_form` MCP tool works.

## How It Works

The system now detects when the `render_custom_form` MCP tool is used and automatically triggers a custom UI form based on the tool's output.

### Example: `render_custom_form` Tool

When the LLM uses the `render_custom_form` MCP tool, the system will:

1. **Detect the MCP tool**: The system identifies that `render_custom_form` is a configured MCP tool
2. **Parse the output**: It extracts form field definitions from the `form_fields::` field
3. **Extract options**: It parses the label:value_type pairs and creates form field options
4. **Trigger form**: It renders a custom form with the extracted field definitions
5. **Block chat**: It prevents further user input until the form is completed

### Configuration

The MCP tool detection is configured in `MCPToolDetector.tsx`:

```typescript
const MCP_TOOL_CONFIGS = {
  'render_custom_form': {
    triggerForm: true,
    formType: 'custom',
    extractOptions: (output: string) => {
      // Parse the form fields string format: "label:value_type:|:label:value_type:|:..."
      const formFieldsMatch = output.match(/form_fields::(.+?)(?:\n|$)/);
      if (!formFieldsMatch) return [];
      
      const formFieldsString = formFieldsMatch[1];
      const fieldPairs = formFieldsString.split(':|:');
      
      return fieldPairs.map(pair => {
        const [label, valueType] = pair.split(':');
        return {
          label: label.trim(),
          value: valueType.trim(),
          id: label.trim().toLowerCase().replace(/\s+/g, '_')
        };
      }).filter(Boolean);
    }
  },
  // ... other tools
};
```

### Supported Field Types

The custom form supports two field types:

1. **`text_field`**: Renders as a text input field
2. **`bool`**: Renders as radio buttons (Yes/No)

### Adding New MCP Tools

To add support for a new MCP tool:

1. Add a new entry to `MCP_TOOL_CONFIGS`
2. Create an `extractOptions` function to parse the tool's output format
3. Add a new form type if needed

### Benefits

✅ **Dynamic form generation**: Forms are created based on MCP tool output  
✅ **Flexible field types**: Supports text and boolean fields  
✅ **Automatic detection**: No need to manually parse LLM responses  
✅ **Consistent UI**: Uses the same form system as other MCP tools  
✅ **Extensible**: Easy to add new field types and form behaviors  

### Example Output

When the `render_custom_form` tool returns:
```json
{
  "type": "text",
  "text": "request_id::a34ff967-a623-43db-a925-63a6bab8f330,form_fields::Organization Name:text_field:|:Google Search Console URI:text_field:|:Website Name:text_field:|:Homepage URL:text_field\n\nNOTE: The UI will be automatically rendered in the client for the function 'add_website_mcp_lg-mcp'. You only need to ask the user to fill out the form fields."
}
```

The system will automatically:
1. Extract the `form_fields::` field (until newline or end)
2. Parse the label:value_type pairs using `:|:` delimiter
3. Create form field definitions
4. Render a custom form with:
   - Organization Name (text input)
   - Google Search Console URI (text input)
   - Website Name (text input)
   - Homepage URL (text input)

### Form Behavior

- **Chat blocking**: Chat is disabled until form completion
- **Validation**: All fields must be filled before submission
- **Dynamic rendering**: Form fields are generated based on MCP output
- **Type-specific inputs**: Different input types based on field definitions
- **Success state**: Shows submitted data after completion 