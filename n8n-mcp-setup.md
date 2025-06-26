# Setting up n8n MCP Server Integration with LibreChat

## Overview
The n8n MCP Server Trigger allows n8n workflows to act as Model Context Protocol (MCP) servers, making tools and workflows available to MCP clients like LibreChat.

## Step 1: Create n8n Workflow with MCP Server Trigger

1. In n8n, create a new workflow
2. Add the **MCP Server Trigger** node
3. Configure the trigger:
   - **Authentication**: Set up bearer auth if needed
   - **Path**: Note the generated path or create a custom one
   - The node will show two URLs at the top:
     - **Test URL**: For testing (workflow doesn't need to be active)
     - **Production URL**: For production use (workflow must be active)

## Step 2: Add Tool Nodes to Your Workflow

Connect tool nodes to the MCP Server Trigger. These will be exposed as tools that LibreChat can call. Examples:
- Custom n8n Workflow Tool nodes
- Code nodes that perform specific actions
- Integration nodes wrapped as tools

## Step 3: Get the Correct MCP URL

The MCP URL format for n8n should be:
- For SSE: `https://[your-n8n-domain]/mcp/[path]/sse`
- For Streamable HTTP: `https://[your-n8n-domain]/mcp/[path]`

Where `[path]` is either:
- The auto-generated path from the MCP Server Trigger node
- Your custom path if you set one

## Step 4: Configure LibreChat

Update your `librechat.yaml`:

```yaml
mcpServers:
  draftOrSendEmail:
    type: sse  # or streamable-http
    url: "https://inboundfound.app.n8n.cloud/mcp/[YOUR-PATH]/sse"
    timeout: 30000
    serverInstructions: "Use this to draft or send emails through the n8n MCP workflow"
    # If using authentication:
    # headers:
    #   Authorization: "Bearer YOUR_TOKEN"
```

## Step 5: Troubleshooting 404 Errors

If you're getting 404 errors:

1. **Check workflow is active**: The production URL only works when the workflow is activated
2. **Verify the path**: Copy the exact path from the MCP Server Trigger node
3. **Test the URL**: Try accessing the base MCP URL in a browser (should return an error, not 404)
4. **Check n8n logs**: Look for MCP-related errors in n8n logs

## Example Working Configuration

Here's what a working setup looks like:

1. **n8n Workflow**:
   - MCP Server Trigger with path: `email-automation`
   - Connected to a Code node that handles email operations
   - Workflow is activated

2. **LibreChat config**:
```yaml
mcpServers:
  emailAutomation:
    type: sse
    url: "https://inboundfound.app.n8n.cloud/mcp/email-automation/sse"
    timeout: 30000
    serverInstructions: |
      This MCP server handles email operations. Available tools:
      - draft_email: Creates a draft email
      - send_email: Sends an email immediately
      
      Parameters:
      - to: recipient email address
      - subject: email subject
      - compose: email body content
      - draft_or_send: "draft" or "send"
```

## Converting from Webhook to MCP

If you're converting from a webhook-based approach:

1. Replace the Webhook trigger with MCP Server Trigger
2. Modify your workflow to expose tools instead of handling HTTP requests
3. Update LibreChat to use the MCP server configuration instead of actions

## Testing Your Setup

1. First test with n8n's built-in testing:
   - Click "Listen for Test Event" in the MCP Server Trigger
   - Use the test URL in your client

2. Then activate the workflow and use the production URL

3. Check LibreChat logs for connection status:
   - Look for "Creating SSE transport" messages
   - Check for successful initialization

## Common Issues

1. **Multiple webhook replicas**: If running n8n in queue mode with multiple webhook replicas, route all `/mcp*` requests to a single replica

2. **Reverse proxy configuration**: If using nginx, disable proxy buffering for MCP endpoints:
```nginx
location /mcp/ {
    proxy_http_version          1.1;
    proxy_buffering             off;
    gzip                        off;
    chunked_transfer_encoding   off;
    proxy_set_header            Connection '';
    # other proxy settings...
}
```

3. **Authentication**: If using bearer auth, ensure the token is correctly set in both n8n and LibreChat configurations
