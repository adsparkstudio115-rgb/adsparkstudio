# AdSpark LeadFlow AI

Internal AI-assisted lead acquisition workspace for AdSpark Studio. Initial vertical: photography studios in Chennai.

## Stack
- Next.js App Router + TypeScript
- Supabase PostgreSQL, Auth and Storage
- Google Places API (New)
- OpenAI Agents SDK
- Meta WhatsApp Cloud API

## Safety defaults
- No outbound marketing without recorded opt-in and required template approval.
- Human approval is required for demo and campaign outreach.
- Google Places content is not treated as an unrestricted permanent database.

## Development
See `docs/BUILD_STATUS.md` and `.env.example`. Apply migrations only to the intended development Supabase project.
