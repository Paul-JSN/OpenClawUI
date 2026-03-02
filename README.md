# OpenClaw UI

Custom UI package for OpenClaw Control UI.

## 0) Backup First (Required)
Before any install/update, create a backup.

### Quick backup (Windows PowerShell)
```powershell
$src = "C:\path\to\openclaw\ui"
$dst = "C:\path\to\backups\openclaw-ui-$(Get-Date -Format yyyyMMdd-HHmmss).zip"
Compress-Archive -Path $src -DestinationPath $dst
```

## 1) Manual Install

### Prerequisites
- Node.js 20+
- npm 10+

### Steps
```bash
git clone https://github.com/Paul-Jeon-Sion/OpenClawUI.git
cd OpenClawUI
npm ci
npm run build
```

### Local run
```bash
npm run dev -- --host
```

## 2) OpenClaw Install (Prompt)
Copy the prompt below and send it to OpenClaw/Codex.

```text
Install this UI into my OpenClaw instance.

Source repo:
https://github.com/Paul-Jeon-Sion/OpenClawUI

Target OpenClaw path:
<YOUR_OPENCLAW_ROOT>

Requirements:
1) BACKUP first before changing anything.
   - Backup folder: <YOUR_OPENCLAW_ROOT>\ui
   - Save backup with timestamp.
2) Replace ONLY the UI files with this repo contents.
3) Run npm ci and npm run build in the UI directory.
4) Do not touch backend/control-plane code.
5) Show me exactly what changed and where.
```

## Deploy (UI-only)
This repo includes GitHub Pages workflow:
- `.github/workflows/deploy-ui-pages.yml`

Enable it in GitHub:
1. `Settings -> Pages`
2. `Source = GitHub Actions`

Push to `main` to deploy UI-only.
