# UI-only Deploy

This repository can deploy **UI only** via GitHub Pages.

## 1) Push to GitHub

Use your target repo:

`https://github.com/Paul-Jeon-Sion/OpenClawUI`

## 2) GitHub Pages settings

In GitHub:

1. Open `Settings` -> `Pages`
2. Under `Build and deployment`, set `Source` to `GitHub Actions`

## 3) Deploy workflow

Workflow file:

`.github/workflows/deploy-ui-pages.yml`

Trigger:

- push to `main`
- manual run from Actions tab

Build output:

- `dist/control-ui`

## Notes

- This deploys only the frontend bundle.
- No backend/control-plane runtime is deployed by this workflow.
