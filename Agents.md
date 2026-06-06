# AGENTS.md

## Project
This repository is for Bonsung Music Academy's internal intranet and management web app.

The system is intended for a practical music academy that manages:
- students
- guardians
- consultations
- enrollments
- lessons
- attendance
- lesson notes
- practice room reservations
- billing records
- internal tasks
- notices
- documents
- future performance/content workflows

## Tech stack
Use the following stack unless explicitly instructed otherwise:
- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS
- Auth.js or Supabase Auth
- Vercel deployment target

## Product principles
- Build an internal intranet, not a public marketing website.
- Prioritize actual academy operations over visual decoration.
- Use Korean labels in the UI.
- Keep the system simple enough for non-developer academy staff to use.
- Design with future parent/student portals in mind, but do not implement them unless requested.
- Protect student and guardian personal information.
- Separate admin, staff, and teacher permissions.

## MVP scope
The first MVP should include:
1. Authentication and role-based access control
2. Dashboard
3. Student management
4. Guardian management
5. Consultation management
6. Enrollment and lesson scheduling
7. Attendance
8. Lesson notes
9. Practice room reservations
10. Billing memo/status management
11. Internal tasks
12. Notices/documents

## Development rules
- Before implementing a feature, inspect the existing structure.
- Prefer small, reviewable commits.
- Do not rewrite the entire project unless asked.
- Do not introduce new production dependencies without explaining why.
- Do not remove existing docs or schema without justification.
- Keep database schema changes backward-compatible when possible.
- Add or update documentation in docs/ when behavior changes.
- Use clear TypeScript types.
- Prefer server actions or API routes consistently according to the existing project pattern.
- Run lint and tests before reporting completion.

## Security rules
- Never commit .env files or secrets.
- Use environment variables for credentials.
- Do not hard-code API keys.
- Do not expose guardian phone numbers, billing details, or student notes to unauthorized roles.
- Add audit logs for sensitive operations when feasible.

## Definition of done
A task is complete only when:
- The requested feature works end-to-end.
- TypeScript errors are resolved.
- Lint passes.
- Relevant tests or manual verification steps are documented.
- The final response includes changed files, migration notes, and next recommended task.
