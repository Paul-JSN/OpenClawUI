# OpenClaw UI

Custom UI package for OpenClaw Control UI.

Primary repo:
- https://github.com/Paul-JSN/OpenClawUI

## 0) Backup First (Required)
Before install/update, back up your current UI.

### Quick backup (Windows PowerShell)
```powershell
$src = "C:\path\to\openclaw\ui"
$dst = "C:\path\to\backups\openclaw-ui-$(Get-Date -Format yyyyMMdd-HHmmss).zip"
Compress-Archive -Path $src -DestinationPath $dst
```

## 1) Manual Install (UI repo)

### Prerequisites
- Node.js 20+
- npm 10+

### Steps
```bash
git clone https://github.com/Paul-JSN/OpenClawUI.git
cd OpenClawUI
npm ci
npm run build
```

### Local run
```bash
npm run dev -- --host
```

## 2) Prevent rollback after `openclaw update`

If OpenClaw is updated, default packaged UI assets can overwrite what is served unless `gateway.controlUi.root` is pinned to your custom bundle path.

### Recommended (one command)
```bash
./scripts/reapply-openclaw-ui.sh
```

What it does:
1. builds this UI (`npm ci && npm run build`)
2. sets `gateway.controlUi.root` in `~/.openclaw/openclaw.json`
3. restarts gateway

Default target root:
- `<repo-parent>/dist/control-ui`

Optional overrides:
- `OPENCLAW_CONTROL_UI_DIST=/absolute/path/to/dist/control-ui`
- `OPENCLAW_CONFIG_PATH=/absolute/path/to/openclaw.json`

## 3) Auto-reapply workflow (recommended)

Wrap OpenClaw updates so custom UI is re-pinned every time:

```bash
openclaw update
/path/to/OpenClawUI/scripts/reapply-openclaw-ui.sh
```

Example alias:
```bash
alias openclaw-update-ui='openclaw update && /path/to/OpenClawUI/scripts/reapply-openclaw-ui.sh'
```

## 4) OpenClaw Install Prompt (for agent automation)

```text
Install this UI into my OpenClaw instance.

Source repo:
https://github.com/Paul-JSN/OpenClawUI

Target OpenClaw path:
<YOUR_OPENCLAW_ROOT>

Requirements:
1) BACKUP first before changing anything.
2) Replace ONLY UI files with this repo contents.
3) Run build.
4) Pin gateway.controlUi.root to the built dist/control-ui path.
5) Restart gateway.
6) Show exact command output/logs.
```

## 5) Deploy (UI-only)
This repo includes GitHub Pages workflow:
- `.github/workflows/deploy-ui-pages.yml`

Enable in GitHub:
1. `Settings -> Pages`
2. `Source = GitHub Actions`

Push to `main` to deploy UI-only.
