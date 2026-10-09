# AI Prompt Disclosure

**Module:** NB6007CEM — Web API Development
**Coursework:** Real-Time Solar Generation Data API (SLSEA)
**AI Tool Used:** Claude (Anthropic)
**Purpose of this document:** A chronological, phase-by-phase record of the prompts used during development, as required for AI-disclosure under the module's academic integrity policy.

All generated output (code, configuration, documentation) was reviewed, tested against the live seeded dataset, and in several cases corrected following manual investigation — specific examples are noted inline below where they occurred.

---

## 1. Domain Modelling

- "Before going to Phase 1 I think folder structure creation is necessary" — *(prompted scaffolding discussion, see Section 3)*
- "Then we decide what are the required attributes for these entities"
- "Then it shows something like last reading or total — are those not attributes, is it what we need to calculate from the API?"
- "SolarInstallation capacity_kw cannot exceed in GenerationReading power_kw or energy_kwh" — clarified and corrected the actual constraint (power_kw bounded by capacity_kw; energy_kwh is cumulative and not bounded the same way)

## 2. Seed Data Generation

- "Let's create a seed.json data file — when creating data, validate there is a correct foreign key created in upper level. First tell me how you are going to create GenerationReading."
- "I only see 'national', 'provincial', 'district' — is this only roles?" *(led to confirming no admin role exists; national role reused for admin actions)*
- "Reuse national as also having admin rights, and Option A is okay" *(confirmed design decision on substation delete blocking)*
- Follow-up debugging: seed data found to be stale relative to the real current date during testing; regenerated and re-seeded as a result — see Section 6.

## 3. Project Scaffolding

- "Before going to Phase 1 I think folder structure creation is necessary"
- "Now tell me why we need server.js, app.js, and inside src config db.js, and models inside every entity.js, and what are routes and controllers used for"
- "SolarInstallation.findOne — SolarInstallation mean model right, or inside server.js method where that findOne method defined"

## 4. Resource/URI Design

- "Build that full table now" *(requested the complete resource/URI map before any route code was written)*
- Clarifying questions on pagination meaning, processing resources, Location header purpose, and the two separate authentication flows (device vs. user) — all addressed before implementation began.

## 5. Implementation — Read Path, Write Path, Auth

- "Just Provinces — route → controller. For province, in my idea these are the things: get, post, delete, put. Province only 4 APIs is it right, or find by id, find by name — how are you going to do this, do one then I can get idea for others"
- Iterative province → district → substation → installation implementation, each following the same confirmed pattern.
- "POST /installations/{id}/readings — is this implemented?" *(prompted the device write-path implementation)*
- "Want me to build the password-hash-update step and the login controller now?" — confirmed "yes" before implementation.
- Multiple rounds of runtime error paste-and-fix: missing npm packages (`dotenv`, `jsonwebtoken`, `mongodb`, `bcryptjs`), a DNS SRV resolution failure on MongoDB Atlas (diagnosed and fixed with a `dns.setServers` override), a duplicate `require` causing a `SyntaxError`, and an `argument handler must be a function` error traced to a missing middleware export — each pasted directly from the terminal and resolved based on the actual error output, not guessed.

## 6. Advanced Behaviour, Jurisdiction Scoping, and Stretch Feature

- Confirmed design for jurisdiction-scoping rule: "403 Forbidden approach is good, and it's the same for province role also, am I right?"
- "Now GET /substations — this is now public, but it should also be private — not for jurisdiction, but needs to be for any user, is that right? GET /substations/{id}/installations — it also should be private, right, it should also follow jurisdiction filter. GET /installations — it returns all installations, I think it needs pagination like we use elsewhere, and it also needs jurisdiction — yes or no" *(led to a full access-control consistency revision across four endpoints)*
- District generation-summary stretch feature confirmed and implemented after discussion of current-power vs. cumulative-energy aggregation logic.
- A stale-seed-data issue was identified directly from a live API response showing an out-of-date timestamp ("`2026-09-21T19:15:00.000Z` — if we get this date as today's date it is completely wrong, right?"), which was diagnosed as a seed-regeneration issue rather than a code bug, and corrected by re-running the generator and re-seeding.

## 7. Swagger/OpenAPI Documentation

- "Swagger/OpenAPI documentation — now do this, right?"
- Debugging: "Unable to render this definition — the provided definition does not specify a valid version field," traced through two separate causes — a broken object structure from an incomplete edit, and ultimately a wrong file path (`docs/swagger.js` at the project root instead of `src/docs/swagger.js`, where `app.js`'s relative `require` actually resolved to) — both diagnosed from the user's own file-path correction, not assumed.

## 8. Deployment

- Comparative research requested across Render, Bonto, and Railway as hosting platforms, including a live check on current card-requirement policy after Render unexpectedly requested card details during sign-up.
- Railway chosen; public domain generation troubleshooting ("in Settings tab not have 'network' or something, it has — do you mean visibility?") resolved by confirming Railway's current documented UI structure.


*Full conversation transcript is available on request and documents the complete reasoning, confirmation, and correction process behind every item above.*
