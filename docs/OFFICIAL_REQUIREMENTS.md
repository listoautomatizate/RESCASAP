# Official requirements snapshot

Verified on **August 31, 2026** against the official challenge pages and current WebMCP documentation.

## Deadline

- Submission deadline: **September 3, 2026 at 1:00 PM PDT**.
- Uruguay equivalent: **September 3, 2026 at 5:00 PM UYT**.

## Submission requirements

- Working live URL accessible in ChatGPT's in-app browser or WebMCP-enabled Chrome.
- Public GitHub, GitLab or Bitbucket repository containing source, assets, run instructions and a visible open-source license.
- Text explaining why the use case fits WebMCP, the UX improvement, what humans and agents can now do together and the implementation.
- Public YouTube demo with audio, shorter than three minutes.
- English materials or an English translation.
- Existing projects must document the pre-challenge baseline and meaningful WebMCP work added after the submission period began.
- The project must remain freely accessible through the judging period.
- No third-party marks, music or copyrighted material in the video without permission.

## Judging criteria

The four criteria are equally weighted:

1. WebMCP leverage.
2. Execution.
3. Potential impact.
4. Creativity and ambition.

## Implementation guidance applied

- Imperative tools are registered through `document.modelContext.registerTool()`.
- Tool names are verb-led and non-overlapping.
- Inputs are narrow and validated with bounded JSON schemas.
- Tools update the visible page so results can be verified.
- Read-only and untrusted-content annotations match behavior.
- Lifecycle cleanup uses `AbortSignal`.
- The consequential action stays behind human confirmation.

## Official sources

- [WebMCP Challenge overview and submission requirements](https://webmcp.devpost.com/)
- [Official challenge rules](https://webmcp.devpost.com/rules)
- [OpenAI WebMCP Challenge page](https://openai.com/webmcp-challenge/)
- [OpenAI guide to site tools with WebMCP](https://learn.chatgpt.com/docs/webmcp)
- [Chrome WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [Chrome WebMCP best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices)
- [WebMCP community specification](https://webmachinelearning.github.io/webmcp/)
