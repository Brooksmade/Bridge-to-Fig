# Code Connect — Figma ↔ Code Component Mapping

A bidirectional mapping system that links Figma design components to their code implementations. Enables accurate design-to-code handoff and keeps Figma and code in sync.

## Mapping File

Mappings are stored in `.figma/code-connect.json` at the project root. This file is version-controlled and shared with the team.

### Schema

```json
{
  "$schema": "https://bridge-to-fig.dev/schemas/code-connect.json",
  "version": "1.0",
  "lastUpdated": "2026-03-27T00:00:00Z",
  "mappings": [
    {
      "figmaComponentKey": "abc123def456",
      "figmaComponentName": "Button",
      "figmaFileKey": "FILE_KEY",
      "figmaNodeId": "1:234",
      "codeComponent": {
        "path": "src/components/Button/Button.tsx",
        "exportName": "Button",
        "framework": "react"
      },
      "propertyMapping": {
        "Size": {
          "figmaValues": ["Small", "Medium", "Large"],
          "codeProp": "size",
          "codeValues": ["sm", "md", "lg"]
        },
        "State": {
          "figmaValues": ["Default", "Hover", "Pressed", "Disabled"],
          "codeProp": "disabled",
          "codeTransform": "value === 'Disabled'"
        },
        "Show Icon": {
          "codeProp": "icon",
          "codeTransform": "value ? <Icon /> : undefined"
        },
        "Label": {
          "codeProp": "children",
          "codeTransform": "value"
        }
      },
      "imports": ["import { Button } from '@/components/Button'"],
      "codeExample": "<Button size=\"md\" disabled={false}>Click me</Button>",
      "status": "connected",
      "lastVerified": "2026-03-27T00:00:00Z"
    }
  ]
}
```

### Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `figmaComponentKey` | Yes | Figma component key (from `getComponents`) |
| `figmaComponentName` | Yes | Human-readable component name |
| `figmaFileKey` | No | Figma file key for cross-file references |
| `figmaNodeId` | Yes | Node ID for direct linking |
| `codeComponent.path` | Yes | Relative path from project root |
| `codeComponent.exportName` | Yes | Named or default export |
| `codeComponent.framework` | Yes | `react`, `vue`, `svelte`, `angular`, `html` |
| `propertyMapping` | No | Maps Figma variant properties to code props |
| `imports` | No | Import statements for code generation |
| `codeExample` | No | Example usage snippet |
| `status` | Yes | `connected`, `stale`, `unmapped`, `deprecated` |
| `lastVerified` | No | ISO timestamp of last verification |

### Status Lifecycle

```
unmapped → connected → stale → connected (re-verified)
                    ↘ deprecated
```

- **unmapped**: Figma component exists but no code mapping
- **connected**: Active, verified mapping
- **stale**: Code or Figma component changed since last verification
- **deprecated**: Component is being phased out

## Workflows

### 1. Initial Mapping (from Figma)

```bash
# Get all components from Figma file
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getComponents", "payload": {}}'

# For each component, search codebase for matching component
# grep -r "export.*Button" src/components/
```

### 2. Initial Mapping (from Code)

```bash
# Scan codebase for component files
find src/components -name "*.tsx" -o -name "*.vue" | sort

# For each component, search Figma for matching component
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "query", "payload": {"queryType": "find", "query": "Button"}}'
```

### 3. Verification

```bash
# For each mapping, verify both sides exist:
# 1. Check code file exists
test -f "src/components/Button/Button.tsx"

# 2. Check Figma component exists
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "query", "payload": {"queryType": "node"}, "target": "1:234"}'

# 3. Check property alignment
# Compare Figma variant properties with code prop types
```

### 4. Code Generation from Mapping

Given a Figma component instance, generate the code:

```tsx
// From mapping: Button with Size=Medium, State=Default, Label="Click me"
import { Button } from '@/components/Button';

<Button size="md" disabled={false}>
  Click me
</Button>
```

## Integration with Engineering Handoff

The `engineering-handoff` agent uses code-connect mappings to:

1. **Generate accurate imports** instead of guessing from component names
2. **Map variant properties** to actual code props with correct values
3. **Include real code examples** instead of generic snippets
4. **Flag unmapped components** that need code implementation

## Integration with Design System Validation

The `design-system-validator` agent can:

1. **Check coverage**: What % of Figma components have code mappings?
2. **Detect drift**: Are mapped components still in sync?
3. **Flag orphans**: Code components with no Figma counterpart

## Agent Usage

The `code-connect-mapper` agent manages this system. See `.claude/agents/code-connect-mapper.md`.
