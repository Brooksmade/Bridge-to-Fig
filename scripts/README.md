# Reusable Script Templates

Pre-built, tested JSON payload templates for common Bridge to Fig operations. These are the building blocks that agents and orchestrators compose together.

## Usage

Each script is a self-contained JSON template. Use with curl:

```bash
# Direct use
curl -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d @scripts/inspect-file-structure.json

# With variable substitution (use envsubst or sed)
export FILE_SCOPE="file"
envsubst < scripts/inspect-file-structure.json | curl -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" -d @-
```

## Scripts

| Script | Purpose |
|--------|---------|
| `inspect-file-structure.json` | Phase 0 discovery — pages, variables, components, styles |
| `create-variable-collection.json` | Create a collection with named modes |
| `create-semantic-tokens.json` | Batch create variables with aliases and scopes |
| `create-component-with-variants.json` | Component set with Cartesian product of variant axes |
| `validate-creation.json` | Verify nodes exist and match expected properties |
| `cleanup-orphans.json` | Find/remove nodes tagged with a run_id |
| `rehydrate-state.json` | Scan file for tagged nodes to reconstruct state |
| `bind-variables-to-component.json` | Bind design tokens to component visual properties |
| `create-documentation-page.json` | Create page with standardized documentation layout |

## Conventions

- All scripts use `{{PLACEHOLDER}}` for values that must be substituted
- `run_id` field enables state recovery — always include it for multi-step operations
- Scripts return standardized result shapes for easy chaining
