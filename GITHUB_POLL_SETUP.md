# GitHub Poll Setup

This project now includes a GitHub-backed poll persistence flow:

- [api/poll.js](C:\Users\s457548\OneDrive - Emirates Group\Documents\GitHub\ProfitShareCalculator\api\poll.js) updates the repository JSON through the GitHub Contents API
- [data/poll-results.json](C:\Users\s457548\OneDrive - Emirates Group\Documents\GitHub\ProfitShareCalculator\data\poll-results.json) stores the shared poll totals
- [index_test.html](C:\Users\s457548\OneDrive - Emirates Group\Documents\GitHub\ProfitShareCalculator\index_test.html) now calls `/api/poll`

## Important

This cannot work securely as a plain static GitHub Pages page by itself. The GitHub token must stay on the server side.

Use a platform that supports server-side code, such as:

- Vercel
- Netlify
- Railway
- Render

## Required Environment Variables

```bash
GITHUB_TOKEN=your_repo_token
GITHUB_REPO=owner/repository-name
GITHUB_BRANCH=main
```

`GITHUB_TOKEN` must have permission to update repository contents.

## API Behavior

- `GET /api/poll`
  Returns the current JSON poll data from the repository.

- `POST /api/poll`
  Accepts:

```json
{
  "option": "16-18"
}
```

  Then increments that option and writes the updated JSON back to the repo.
