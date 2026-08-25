# Hydro AI Assistant addon

This is a non-streaming framework for an OpenAI-compatible AI provider. It adds **AI Q&A** to problem-detail sidebars and **AI Debug** to record-detail sidebars.

## Install

Place this package under the Hydro repository's `packages/` directory (the upstream workspace glob `packages/*` discovers it), install workspace dependencies, then enable it:

```bash
hydrooj addon add @hydrooj/ai-assistant
```

Restart Hydro and configure `ai-assistant` at `/manage/config`: API Base URL, API key, model, maximum reply tokens, feature switch, and per-user request limit.

## Safety boundary

The handlers only send the public problem statement and the requested record's code to the provider. The debug endpoint checks code-read permission, and both endpoints require a logged-in profile plus an atomic per-user minute rate limit. No chat transcript is stored. Provider failures return a friendly 502 response and are logged without prompts or API keys.

Before enabling during a contest, administrators should keep `enabled` off or apply a domain/contest policy. The next implementation phase can add streaming WebSocket output and an explicit domain-level switch.
