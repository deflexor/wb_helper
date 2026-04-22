# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd prime` for full workflow context.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work atomically
bd close <id>         # Complete work
bd dolt push          # Push beads data to remote
```

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

**Other commands that may prompt:**
- `scp` - use `-o BatchMode=yes` for non-interactive
- `ssh` - use `-o BatchMode=yes` to fail instead of prompting
- `apt-get` - use `-y` flag
- `brew` - use `HOMEBREW_NO_AUTO_UPDATE=1` env var

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->

# Project Context: Marketplace Seller Optimizer (WB/Ozon)

## Tech Stack
- **Backend:** Haskell (GHC 9.x+)
  - Core libraries: `effectful` (for effect system), `lens` (for data manipulation), `aeson` (JSON), `http-client`/`req` (HTTP), `persistent` + `sqlite-simple` (DB), `vector` (data processing).
  - Architecture: Modular, functional core with imperative shell where necessary. Strict TDD.
- **Frontend:** React + TypeScript + Vite + TailwindCSS + ShadCN UI + Zustand + TanStack Query + react-i18next.
- **Database:** SQLite (file-based, single file for simplicity on VDS).
- **AI Integration:** Direct HTTP calls from Haskell to OpenRouter API (no separate Python service).
- **Testing:** 
  - Backend: `hspec` or `tasty` (Unit/Integration).
  - Frontend: Vitest + React Testing Library + Playwright (E2E).
- **Deployment:** Docker Compose (Nginx, Haskell App, SQLite volume) on Linux VDS.
- **Task Management:** Beads (`bd` CLI). All tasks must be tracked via `bd`.

## Design Principles
- **Simplicity & Performance:** Lightweight, fast startup, low memory footprint.
- **Type Safety:** Leverage Haskell's type system to prevent runtime errors.
- **UX:** Clean, intuitive, beautiful UI (ShadCN + Tailwind). Fully i18n (EN/RU).
- **TDD:** Red-Green-Refactor cycle is mandatory for every feature.

## Workflow
1. Ensure all code is covered by tests before marking tasks complete.
2. Create retro of what was done before each commit

## Build & Test Commands

### Backend (Haskell)

```bash
# Build the project
cabal build

# Run all tests
cabal test

# Run a specific test suite
cabal test <test-suite-name>

# Run tests with verbose output
cabal test --test-show-details=direct

# Repl for interactive development
cabal repl

# Linting
hlint .

# Format code
.ormolu # if configured
```

### Frontend (React/TypeScript)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run E2E tests (Playwright)
npm run test:e2e

# Run linter
npm run lint

# Type check
npm run typecheck
```

### Docker

```bash
# Build Docker image
docker compose build

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild and restart
docker compose up -d --build
```

## TDD Workflow

**Red-Green-Refactor** is mandatory for every feature:

### 1. Red Phase - Write a Failing Test
```bash
# Create test file first
touch test/Spec.hs
# Write the expected behavior before implementation
```

### 2. Green Phase - Make it Pass
- Write minimal code to satisfy the test
- Focus on correctness, not optimization

### 3. Refactor Phase - Improve Code
- Remove duplication
- Simplify interfaces
- Ensure tests still pass

### TDD Rules
- **Never skip the Red phase** - tests must fail before implementation
- **One test at a time** - focus on single behavior
- **Refactor after Green** - don't mix refactoring with new functionality
- **Run full test suite** before marking task complete

### Haskell TDD Pattern
```haskell
-- test/Spec.hs
module Spec where

import Test.Hspec
import MyModule (myFunction)

main :: IO ()
main = hspec $ do
  describe "myFunction" $ do
    it "should return expected output for valid input" $ do
      myFunction validInput `shouldBe` expectedOutput
    
    it "should throw appropriate error for invalid input" $ do
      myFunction invalidInput `shouldThrow` expectedException
```

### Frontend TDD Pattern
```typescript
// src/components/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render expected content', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```

## Quality Gates

Before any commit:
1. ✅ All tests pass (backend + frontend)
2. ✅ No linting errors
3. ✅ Type checking passes
4. ✅ Code follows project standards

## Code Standards

Follow modular, functional principles:
- Pure functions where possible
- Immutable data structures
- Small functions (< 50 lines)
- Explicit dependency injection
- Clear naming conventions

**Golden Rule**: If you can't easily test it, refactor it.
