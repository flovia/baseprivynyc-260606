# baseprivynyc

A TypeScript monorepo starter powered by [Bun](https://bun.sh).

## Structure

```
.
├── packages/
│   └── example/        # Example package
├── package.json        # Root workspace config
└── tsconfig.json       # Shared TypeScript config
```

## Requirements

- [Bun](https://bun.sh) v1.0+

## Getting Started

```bash
# Install dependencies
bun install

# Run all packages in dev mode
bun run dev

# Build all packages
bun run build

# Run all tests
bun run test

# Type-check all packages
bun run typecheck
```

## Adding a Package

1. Create a new directory under `packages/`
2. Add a `package.json` with a `name` in the `@baseprivynyc/*` scope
3. Add a `tsconfig.json` that extends `../../tsconfig.json`
4. The root workspace will automatically pick it up

## License

MIT
