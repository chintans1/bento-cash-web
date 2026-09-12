# Agent Instructions

## Package Manager and Dev Server

- Never use `npm` or `npx` in this repository. Use `pnpm` and `pnpm exec` exclusively.
- Before starting the development server, check whether port 3000 is already in use (for example, with `lsof -nP -iTCP:3000 -sTCP:LISTEN`). The developer usually already has `pnpm dev` running there.
- If port 3000 is already serving the app, reuse that server. Do not start another development server.
- Only run `pnpm dev` when port 3000 is not already in use and a development server is actually needed for the task.
