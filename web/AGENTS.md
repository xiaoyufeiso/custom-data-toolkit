# Tendata Frontend Project Guide

## Project Stack

- Framework: react
- Builder: vite
- Language: typescript
- Router: react-router-dom
- State: zustand
- Style: less
- i18n: react-intl
- UI: tendata-ui

## Development Rules

1. Prefer existing components before creating new ones.
2. Prefer tendata-ui for UI implementation.
3. Use react-intl for user-facing text.
4. Do not introduce new state management libraries.
5. Do not change build configuration unless explicitly required.
6. Follow existing project directory conventions.
7. Keep business code inside `src/`.

## Commands

- Start UAT: `tdfront start uat`
- Start Mock: `tdfront start mock`
- Build Production: `tdfront build pro`
- Analyze Bundle: `tdfront analyze`

## AI Coding Guidance

Before modifying code:

1. Read related files first.
2. Find similar implementation in the project.
3. Follow existing naming conventions.
4. Keep changes minimal.
5. Run lint or test after modification when possible.
