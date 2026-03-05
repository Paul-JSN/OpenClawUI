# Security Policy

## Supported Versions

This repository tracks active development. Security fixes are applied to the latest `main` branch.

| Version | Supported |
| ------- | --------- |
| latest `main` | ✅ |
| older commits/tags | ❌ |

## Reporting a Vulnerability

If you find a security issue, please report it privately.

Preferred: GitHub Security Advisories (private report)
- Open a private vulnerability report in this repository's **Security** tab.

Fallback (if advisory is unavailable)
- Open an issue with minimal details and mark it clearly as security-related.
- Do **not** post exploit code or secrets publicly.

## Response Expectations

- Initial acknowledgment target: within 72 hours
- Triage and severity assessment target: within 7 days
- Fix timeline depends on severity and reproducibility

## Disclosure Guidelines

Please avoid public disclosure until:
1. the issue is confirmed,
2. a fix or mitigation is available, and
3. maintainers approve coordinated disclosure.

## Scope Notes

This project is a UI fork for OpenClaw. Some risk decisions are inherited from upstream architecture (for example browser-local state handling). Reports are still welcome; we will document, mitigate, or upstream fixes where applicable.
