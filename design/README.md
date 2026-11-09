# Design tokens

`tokens.json` and `schemes.json` come from the **Hotseat Headline** design system
(https://claude.ai/artifact/TVVuU5x2ZvQ9rWGbcNBozH), its single source of truth.
Change them there, copy them here, then run `bun run tokens` to regenerate
`app/styles/tokens.generated.css` (`bun run tokens:check` fails when it's stale).

Components use the role tokens only (`bg-surface-raised`, `text-text-muted`,
`bg-action-primary`, `z-(--layer-card)`…), never base colours.
