# Portfolio Tracker Skills

Custom Claude Code skills for managing the portfolio tracker application.

## Available Skills

### 🚀 `/start-servers`
Start both backend (port 8000) and frontend (port 5173) development servers with auto-reload.

### 📊 `/init-database`
Initialize or reset the database with fresh schema and seed data. Creates backup of existing data.

### 💾 `/backup-data`
Create a timestamped backup of your portfolio database.

### 🔍 `/status`
Check project health: database status, dependencies, running servers, and recent backups.

### 📤 `/push-changes`
Commit and push all changes to GitHub with a custom message.

## How to Use Skills

When working with Claude Code, you can invoke these skills by typing the skill name:

```
/status
```

Or with arguments:

```
/push-changes "Add new retirement calculation feature"
```

## Creating New Skills

To create a new skill:

1. Create a markdown file in `.claude/skills/`
2. Define the skill name (filename without .md)
3. Add description and implementation
4. Use code blocks with `bash` for shell commands

Example structure:
```markdown
# Skill Name

Brief description of what this skill does.

## Usage
Invoke with: `/skill-name`

## Implementation
\`\`\`bash
# Your bash commands here
\`\`\`
```

## Common Workflows

**Starting fresh work session:**
```
/status
/start-servers
```

**After making changes:**
```
/backup-data
/push-changes "Describe your changes"
```

**Resetting the database:**
```
/backup-data
/init-database
```

## Notes

- Skills are defined in markdown files in `.claude/skills/`
- Skills can contain bash commands that Claude Code will execute
- Use meaningful names and clear documentation
- Always backup before destructive operations
