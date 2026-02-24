# Sync with GitHub

Synchronize local repository with GitHub by pulling latest changes and pushing local updates.

## What this does
1. Fetches latest changes from GitHub
2. Checks for conflicts
3. Pulls remote changes (if any)
4. Stages and commits local changes (if any)
5. Pushes to GitHub
6. Shows sync status

## Usage
Invoke with: `/sync`
Or with custom commit message: `/sync "Your commit message"`

## Implementation

```bash
#!/bin/bash

echo "🔄 Synchronizing with GitHub"
echo "=============================="
echo ""

# Fetch latest from GitHub
echo "1️⃣  Fetching from GitHub..."
git fetch origin
if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch from GitHub. Check your connection."
    exit 1
fi
echo "   ✅ Fetch complete"
echo ""

# Check if local branch is behind remote
BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")

echo "2️⃣  Sync Status:"
echo "   📥 Commits behind remote: $BEHIND"
echo "   📤 Commits ahead of remote: $AHEAD"
echo ""

# Pull if behind
if [ "$BEHIND" -gt 0 ]; then
    echo "3️⃣  Pulling latest changes..."

    # Check for uncommitted changes that might conflict
    if [ -n "$(git status --porcelain)" ]; then
        echo "   ⚠️  You have uncommitted changes. Stashing temporarily..."
        git stash push -m "Auto-stash before sync"
        STASHED=true
    fi

    git pull origin main --rebase
    PULL_RESULT=$?

    # Restore stashed changes if any
    if [ "$STASHED" = true ]; then
        echo "   🔄 Restoring your uncommitted changes..."
        git stash pop
        if [ $? -ne 0 ]; then
            echo "   ⚠️  Merge conflicts detected in stashed changes!"
            echo "   Please resolve conflicts and run /sync again."
            exit 1
        fi
    fi

    if [ $PULL_RESULT -eq 0 ]; then
        echo "   ✅ Pulled $BEHIND commit(s) from GitHub"
    else
        echo "   ❌ Pull failed. Please resolve conflicts manually."
        exit 1
    fi
    echo ""
fi

# Check for local changes to commit
if [ -n "$(git status --porcelain)" ]; then
    echo "4️⃣  Local changes detected:"
    git status --short
    echo ""

    # Get commit message from arguments or use default
    COMMIT_MSG="${1:-Sync: Update portfolio tracker}"

    echo "   📝 Committing with message: $COMMIT_MSG"
    git add .
    git commit -m "$COMMIT_MSG"

    if [ $? -eq 0 ]; then
        echo "   ✅ Changes committed"
    else
        echo "   ❌ Commit failed"
        exit 1
    fi
    echo ""
fi

# Push if ahead of remote
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
if [ "$AHEAD" -gt 0 ]; then
    echo "5️⃣  Pushing $AHEAD commit(s) to GitHub..."
    git push origin main

    if [ $? -eq 0 ]; then
        echo "   ✅ Successfully pushed to GitHub!"
    else
        echo "   ❌ Push failed. You may need to re-authenticate."
        echo "   Run: git push origin main"
        exit 1
    fi
    echo ""
fi

# Final status
echo "✅ Repositories are in sync!"
echo ""
git log --oneline -3
echo ""
echo "🔗 View on GitHub: https://github.com/sachdeva01/best-repo-ever"
```

## Examples
- `/sync` - Sync with default commit message
- `/sync "Add new expense tracking feature"`
- `/sync "Fix account balance calculations"`

## Notes
- Always syncs bidirectionally (pull then push)
- Automatically stashes uncommitted changes during pull if needed
- Uses rebase to keep clean commit history
- Requires GitHub authentication (token or SSH)
- Safe to run anytime - won't lose your work

## When to use
- Before starting new work (to get latest changes)
- After completing a feature (to push your changes)
- When switching devices
- End of work session to backup progress
