# MCP Tool Detection Test

This file demonstrates how the new MCP tool detection system works.

## How It Works

The system now detects when specific MCP tools are used and automatically triggers custom UI forms based on the tool's output.

### Example: `render_crawl_form` Tool

When the LLM uses the `render_crawl_form` MCP tool, the system will:

1. **Detect the MCP tool**: The system identifies that `render_crawl_form` is a configured MCP tool
2. **Parse the output**: It extracts website data from the `websites::` field
3. **Extract options**: It parses the URL|ID pairs and creates website options
4. **Trigger form**: It renders a crawl form with the extracted website options
5. **Block chat**: It prevents further user input until the form is completed

### Configuration

The MCP tool detection is configured in `MCPToolDetector.tsx`:

```typescript
const MCP_TOOL_CONFIGS = {
  'render_crawl_form': {
    triggerForm: true,
    formType: 'crawl',
    extractOptions: (output: string) => {
      // Parse the websites string format: "url1|id1,url2|id2,..."
      const websitesMatch = output.match(/websites::(.+)/);
      if (!websitesMatch) return [];
      
      const websitesString = websitesMatch[1];
      const websitePairs = websitesString.split(',');
      
      return websitePairs.map(pair => {
        const [url, id] = pair.split('|');
        const domain = new URL(url).hostname.replace('www.', '');
        return {
          label: domain,
          value: url,
          id: id
        };
      }).filter(Boolean);
    }
  },
  // Add more MCP tools here...
};
```

### Adding New MCP Tools

To add support for a new MCP tool:

1. Add a new entry to `MCP_TOOL_CONFIGS`
2. Create an `extractOptions` function to parse the tool's output format
3. Add a new form type if needed

### Benefits

✅ **Automatic detection**: No need to manually parse LLM responses  
✅ **Tool-specific behavior**: Different tools can trigger different UI elements  
✅ **Extensible**: Easy to add new MCP tools and form types  
✅ **Consistent**: Uses the same form system as the markdown directive approach  
✅ **Isolated**: Each tool call gets its own unique form instance  

### Example Output

When the `render_crawl_form` tool returns:
```json
{
  "type": "text",
  "text": "request_id::76c62ca2-b99a-4c72-a8c8-8b3ab2fb444b,websites::https://clt3consulting.com/|30302615-e973-4119-b948-bef6853b6db6,https://travelfreak.com/|58e32820-85e3-4330-bcf8-f8b0c516a762,https://inboundfound.com/|6e4f1509-98fd-42e5-b4e1-03a9d4322a64"
}
```

The system will automatically:
1. Extract the `websites::` field
2. Parse the URL|ID pairs
3. Create website options with domain names as labels
4. Render a crawl form with these website options in a dropdown 