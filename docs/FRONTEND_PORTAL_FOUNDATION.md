# Frontend Portal Foundation

## What this stage delivers
A responsive React + TypeScript + Vite web shell for the standalone online competition portal. It introduces overview, registration information, competition lifecycle and participant help sections.

## Security boundaries
- No student personal data is collected or stored by this shell.
- Registration is intentionally informational until Supabase Auth and server-side registration endpoints are deployed and tested.
- No question papers, answer keys, scoring logic or attempt payloads are shipped to the browser.
- Browser Supabase configuration accepts only the project URL and publishable key.
- Never add a service-role or secret key to a VITE_ environment variable.
- The frontend must not calculate official results or trust client-provided exam deadlines.

## Local commands
- npm install
- npm run typecheck
- npm run build

## Not production connected
No Supabase project ref or credentials are configured. The frontend is not connected to a live database or Auth service. The current UI labels registration and exam services as in development; it does not claim that live registration or an exam is available.
