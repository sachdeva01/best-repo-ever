# MCP Servers Configuration

**Last Updated**: 2026-03-04

## What are MCP Servers?

Model Context Protocol (MCP) servers extend Claude Code's capabilities by connecting to external tools, databases, and services.

---

## Configured Servers

### 1. ✅ Filesystem (ENABLED)

**Status**: Active (restart required)  
**Access**: Desktop and Documents folders

**Capabilities**:
- Search across multiple directories
- Batch file operations
- Advanced filtering and metadata
- Directory watching
- Cross-directory operations

**Accessible Paths**:
- `/Users/ssachdeva/Desktop`
- `/Users/ssachdeva/Documents`

**Example Commands**:
- "Find all Excel files in TD Expenses"
- "Show files modified this week"
- "List largest files on Desktop"

---

### 2. ✅ SQLite (ENABLED)

**Status**: Active (restart required)  
**Database**: `/Users/ssachdeva/Desktop/my-app/backend/portfolio.db`

**Capabilities**:
- Direct SQL queries on portfolio database
- Complex data analysis
- Reports without API layer
- Fast data exploration

**Example Commands**:
- "Show me all expenses over $1000"
- "What's the total in my Fidelity accounts?"
- "List all recurring monthly expenses"
- "Query accounts with highest yields"

---

### 3. 🔴 Google Drive (DISABLED)

**Status**: Waiting for OAuth credentials

**Setup Required**:
1. Google Cloud Console → Create OAuth credentials
2. Get Client ID, Client Secret, Refresh Token
3. Update settings.json
4. Enable the server

**Future Capabilities**:
- Access Google Drive files
- Read TD Expenses spreadsheets
- Query and organize files
- Download/upload documents

---

### 4. 🔴 Slack (DISABLED)

**Status**: Waiting for Bot Token

**Setup Required**:
1. Slack API → Create bot app
2. Get Bot User OAuth Token
3. Get Team ID
4. Update settings.json
5. Enable the server

**Future Capabilities**:
- Send portfolio updates to Slack
- Get alerts on expense changes
- Share reports
- Query data via Slack commands

---

## Configuration File

**Location**: `~/.config/claude-code/settings.json`

**To View**:
```bash
cat ~/.config/claude-code/settings.json
```

**To Edit**:
```bash
nano ~/.config/claude-code/settings.json
```

---

## How to Add More Directories to Filesystem

Edit the "filesystem" args array in settings.json:

```json
{
  "filesystem": {
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-filesystem",
      "/Users/ssachdeva/Desktop",
      "/Users/ssachdeva/Documents",
      "/Users/ssachdeva/Downloads"  // Add more like this
    ],
    "disabled": false
  }
}
```

---

## Activation

**To activate MCP servers:**
1. Exit Claude Code (Ctrl+C or 'exit')
2. Restart Claude Code
3. Servers load automatically

**To check if active:**
- Try filesystem command: "List files in Documents"
- Try SQLite command: "Query expenses table"

---

## Security Notes

- Filesystem MCP can ONLY access configured directories
- SQLite MCP can ONLY access specified database
- No system files or other user directories accessible
- All operations are logged

---

## Next Steps

### To Enable Google Drive:
1. Visit: https://console.cloud.google.com/
2. Create OAuth credentials
3. Share Client ID/Secret with Claude
4. Get refresh token
5. Update settings.json

### To Enable Slack:
1. Visit: https://api.slack.com/apps
2. Create bot app
3. Get Bot Token (xoxb-...)
4. Share with Claude
5. Update settings.json

---

## Troubleshooting

**MCP not loading?**
- Check settings.json syntax (valid JSON)
- Ensure paths exist
- Check "disabled": false
- Restart Claude Code

**Permission errors?**
- Verify directory permissions
- Check paths are accessible
- Try with absolute paths

**SQLite connection failed?**
- Verify database file exists
- Check file permissions
- Ensure no locks on database

---

## Learn More

- MCP Documentation: https://modelcontextprotocol.io/
- Available Servers: https://github.com/modelcontextprotocol
- Claude Code Docs: https://claude.ai/code/docs
