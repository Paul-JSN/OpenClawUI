# OpenClaw UI Label Freeze Checklist

Source of truth: `openclaw/ui/src/ui/navigation.ts` and `openclaw/ui/src/i18n/locales/en.ts`.

## Navigation Groups

- `chat`
- `control`
- `agent`
- `settings`

## Tabs (IDs and Labels)

- `chat` → `Chat`
- `overview` → `Overview`
- `channels` → `Channels`
- `instances` → `Instances`
- `sessions` → `Sessions`
- `usage` → `Usage`
- `cron` → `Cron Jobs`
- `agents` → `Agents`
- `skills` → `Skills`
- `nodes` → `Nodes`
- `config` → `Config`
- `debug` → `Debug`
- `logs` → `Logs`

## Freeze Rules

- Do not rename tab IDs in `Tab` union or `TAB_PATHS`.
- Do not rename tab labels under `tabs.*` locale keys.
- Do not rename navigation group labels under `nav.*`.
- Keep URL path semantics from `TAB_PATHS` unchanged.
- Keep control-plane behavior for sessions, cron, config, channels, skills, and nodes unchanged.
- `Overview` and `Usage` wording remains upstream vocabulary (no custom tab/page renames).
- Chart/timezone enhancements must not introduce new nav IDs or route aliases.
- Usage chart-mode pills (`Cost / Limits / Activity`) are in-page controls only (not tabs/routes/nav IDs).
