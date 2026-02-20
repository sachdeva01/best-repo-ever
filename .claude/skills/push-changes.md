# Push Changes to GitHub

Commit and push all changes to your GitHub repository.

## What this does
1. Shows current git status
2. Stages all changes
3. Creates a commit with provided message
4. Pushes to GitHub (sachdeva01/best-repo-ever)

## Usage
Invoke with: `/push-changes "Your commit message here"`

## Implementation

```bash
# Check if there are changes
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ No changes to commit - working tree is clean"
    exit 0
fi

echo "📝 Current changes:"
git status --short
echo ""

# Get commit message from arguments or use default
COMMIT_MSG="${1:-Update portfolio tracker}"

echo "Committing changes with message: $COMMIT_MSG"
echo ""

# Stage all changes
git add .

# Create commit
git commit -m "$COMMIT_MSG"

# Push to GitHub
echo ""
echo "Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🔗 View at: https://github.com/sachdeva01/best-repo-ever"
else
    echo ""
    echo "❌ Push failed. You may need to re-authenticate."
    echo "Run: git push origin main"
fi
```

## Examples
- `/push-changes "Add expense totals to calculations"`
- `/push-changes "Fix retirement projection calculations"`
- `/push-changes "Update UI styling"`

## Notes
- Requires GitHub authentication (token or SSH)
- Always review changes before pushing
- Use meaningful commit messages
