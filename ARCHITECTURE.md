# Recommended Architecture Blueprint

This document defines the target architecture for future implementation. It is not a record of the current codebase.

## Principles

- Sessions and webinars are one domain: events.
- An event appears on the landing page only when its Show on landing page checkbox sets showOnLanding to true.
- Routes compose screens; features own business logic; libraries own technical infrastructure.
- User and admin routes remain separate, but reuse the same feature APIs and role-neutral feature components.
- Firebase is infrastructure, not a domain module: its SDK setup stays centralized, while every domain owns its own persistence repository.
- Browser Firebase and Firebase Admin code must remain separate.

## UI/UX design system

The user and admin dashboards are one product experience. They may have different permissions and navigation, but must use the same visual language, responsive behavior, feedback patterns, and accessible interaction standards.

### Design tokens

Define tokens in `src/app/globals.css`; components and route screens consume the tokens instead of introducing near-duplicate hard-coded values.

| Token group | Standard |
| --- | --- |
| Font | Geist Sans (the Next.js font variable) with `Segoe UI, sans-serif` fallback. Use tabular numerals for dashboard metrics and dates where alignment matters. |
| Text | `--ink` for primary text, `--ink-soft` for supporting text, and no low-contrast text on tinted surfaces. |
| Brand | Deep green ink, cream/paper surfaces, lime for primary positive actions, orange for destructive/urgent actions, and purple only as a supporting accent. |
| Spacing | Use a 4px scale: 4, 8, 12, 16, 20, 24, 32, 40, 48. Page gutters are 32px desktop, 20px tablet, and 16px mobile. |
| Radius | 10px controls, 14px cards/tables, 20–24px feature panels. |
| Elevation | Use subtle borders first; reserve shadows for raised panels, modals, and sticky navigation. |
| Motion | 150–200ms transitions for interaction feedback. Respect `prefers-reduced-motion`; no motion may be required to understand a state. |
| Date and time | Persist date as `YYYY-MM-DD` and time as `HH:mm` (IST). Render all user-facing dates as `DD-MM-YYYY` and all times as 12-hour `h:mm AM/PM` through `lib/time/ist.js`. Admin forms use native `date` and `time` controls. |

### Dashboard UX rules

1. Both dashboards use a persistent desktop sidebar and a single mobile menu trigger below 760px. The menu must close after navigation.
2. Each screen has one clear title, optional short supporting text, and one primary action. Keep dangerous actions visually distinct and require confirmation.
3. Tables must remain horizontally scrollable on narrow screens, show search/count/pagination controls in a wrapping layout, and have a meaningful empty state.
4. Loading, empty, success, and error states are mandatory for every data screen. Do not leave an indefinitely blank card or a disabled control without explanation.
5. Use status labels with text plus color; do not communicate status by color alone.
6. Form labels stay visible above inputs. Use a 44px minimum interactive target on touch devices and show clear validation feedback adjacent to the affected input.
7. Keyboard focus must always be visible. Use semantic buttons for actions, links only for navigation, and dialogs with proper `role=dialog`, focus handling, and an escape/close path.
8. On mobile, stack dashboard cards/forms, keep primary actions full width when needed, and never rely on hover-only access to controls.

### Component ownership

- `components/ui` owns generic visual primitives and their common states: Button, FormField, LoadingState, EmptyState, and DataTable.
- `components/shared` owns app-wide shells, protected navigation, and notification gates.
- Feature components own domain-specific cards, registration forms, event status badges, and admin actions. Route pages compose these parts; they do not define a parallel visual system.

## Target folder structure

    src/
    ├── app/
    │   ├── (public)/
    │   │   ├── page.js
    │   │   ├── login/page.js
    │   │   └── signup/page.js
    │   ├── (user)/dashboard/
    │   │   ├── layout.js
    │   │   ├── page.js
    │   │   ├── registrations/page.js
    │   │   ├── events/[slug]/page.js
    │   │   └── complaints/{page, [id]/page}.js
    │   ├── (admin)/admin/
    │   │   ├── login/page.js
    │   │   └── dashboard/
    │   │       ├── layout.js
    │   │       ├── page.js
    │   │       ├── events/{page, create/page, [id]/page, [id]/edit/page}.js
    │   │       └── complaints/{page, [id]/page}.js
    │   ├── api/
    │   │   ├── admin/notifications/send/route.js
    │   │   └── payments/razorpay/{order, verify}/route.js
    │   ├── firebase-messaging-sw.js/route.js
    │   ├── globals.css
    │   └── layout.js
    ├── components/
    │   ├── ui/                         # Reusable, presentation-only primitives
    │   │   ├── DataTable.js
    │   │   ├── Button.js
    │   │   ├── FormField.js
    │   │   ├── LoadingState.js
    │   │   └── EmptyState.js
    │   └── shared/                     # App-wide composed components
    │       ├── ProtectedRoute.js
    │       ├── PushNotificationGate.js
    │       └── AppShell.js
    ├── features/
    │   ├── auth/
    │   │   ├── auth.service.js
    │   │   ├── auth.repository.js
    │   │   ├── auth.hooks.js
    │   │   ├── auth.validation.js
    │   │   ├── auth.types.js
    │   │   └── components/
    │   ├── users/
    │   ├── events/
    │   │   ├── event.repository.js
    │   │   ├── event.service.js
    │   │   ├── event.validation.js
    │   │   ├── event.types.js
    │   │   └── components/
    │   ├── registrations/
    │   ├── complaints/
    │   ├── payments/
    │   └── notifications/
    ├── lib/
    │   ├── auth/
    │   ├── config/
    │   │   ├── env.client.js
    │   │   └── env.server.js
    │   ├── firebase/
    │   │   ├── client.js                # Browser Firebase app only
    │   │   ├── client-auth.js           # Browser Auth instance
    │   │   ├── client-firestore.js      # Browser Firestore instance
    │   │   ├── client-messaging.js      # Lazy browser Messaging access
    │   │   └── admin.js                 # Admin app, Auth, Firestore, Messaging
    │   ├── time/ist.js
    │   └── validation/
    ├── types/                          # Cross-feature shapes only
    └── middleware.js                    # Optional route-level redirect guard

    firestore.rules
    firestore.indexes.json

## Feature responsibilities

| Feature | Responsibility |
| --- | --- |
| auth | Signup, login, logout, and auth-state hooks. |
| users | User profiles, roles, and FCM token persistence. |
| events | Event lifecycle, schedules, visibility, Meet access, landing-page selection, and event UI. |
| registrations | Eligibility, duplicate prevention, anonymous registration claiming, and registration records. |
| complaints | Complaint creation, messages, status changes, and complaint UI. |
| payments | Razorpay orders, payment verification, and payment records. |
| notifications | Browser push setup and server-side notification delivery. |

## Structure recommendations

- Keep `components/ui` deliberately small and generic. Put composed, app-aware pieces such as `ProtectedRoute` and `PushNotificationGate` in `components/shared`; put event, payment, and complaint screens/components inside their owning feature.
- Give every feature the same predictable internal boundary: `*.repository.js` for Firestore access, `*.service.js` for workflows, `*.validation.js` for input contracts, `*.types.js` for feature-local JSDoc/TypeScript shapes, `components/` for reusable domain UI, and `*.hooks.js` only for client-side state/query hooks. Do not create empty folders until a feature needs them.
- Keep `src/types` for types truly shared by multiple features (for example `api.types.js`); a domain type belongs with its feature. If this project adopts TypeScript, rename files incrementally rather than maintaining duplicate `.js` and `.ts` modules.
- Add `loading.js`, `error.js`, and `not-found.js` next to route segments that fetch data or have an expected empty/error state. `error.js` must be a client component.
- Route handlers are transport adapters only: authenticate/parse the request, call a server-side feature service, then map its result to HTTP. They must not contain direct Firestore or Razorpay workflow logic.
- Keep browser-only Firebase usage in client components/hooks. Any module importing Firebase Admin, payment secrets, or server environment configuration must be server-only (use `import "server-only"` at its entry point).
- Use `middleware.js` only for inexpensive redirect decisions. Authorization remains enforced by feature services and Firestore rules, because middleware is not the security boundary.
- Prefer one canonical route during migration. Legacy `/sessions` and `/free-webinar` routes may redirect to `/events` temporarily, but should not each retain duplicate feature logic.

## Route-module conventions

Every route directory may contain only the Next.js route modules it needs: `page.js`, `layout.js`, `loading.js`, `error.js`, `not-found.js`, `route.js`, and route-local private helpers. Move reusable code out of route folders into `features` or `components`.

For dynamic event pages, resolve the public slug through the event service and resolve dashboard/admin records by `eventId`. Do not treat a mutable title as an identifier.

## Firebase boundary

The current `src/app/firebase/firestore.js` is a useful prototype, but it is too broad for the target architecture: it mixes users, sessions, registrations, webinars, and complaints in one module. It also lets pages call domain persistence directly. Replace it during migration; do not keep it as a growing catch-all.

    src/lib/firebase/                    # SDK adapters only; no collection names or business rules
    ├── client.js                        # initializeApp once; exports firebaseApp
    ├── client-auth.js                   # exports browserAuth
    ├── client-firestore.js              # exports browserDb
    ├── client-messaging.js              # async browser Messaging support/token helpers
    └── admin.js                         # server-only singleton: adminAuth, adminDb, adminMessaging

    src/features/
    ├── users/user.repository.js         # reads/writes users and users/{uid}/fcmTokens
    ├── events/event.repository.js        # reads/writes events only
    ├── registrations/registration.repository.js
    ├── complaints/complaint.repository.js
    ├── payments/payment.repository.js
    └── notifications/notification.service.js

### Non-negotiable Firebase rules

1. `lib/firebase/*` exposes initialized SDK instances and SDK-specific helpers only. It must never export functions such as `getSessions`, `createComplaint`, or `registerForSession`.
2. A repository owns exactly its collection family. It may use `browserDb` for permitted client reads/writes or `adminDb` in server code; it must not import another feature's repository internals.
3. A service coordinates multi-document and cross-feature workflows. For example, `registration.service.js` checks eligibility and creates the registration plus the event aggregate in one transaction.
4. Pages/components call feature hooks or services, never Firebase SDK functions or a generic Firestore helper directly. This removes Firebase imports from `src/app/**` except a deliberately thin client provider, if one is introduced.
5. API route handlers use server-side services, which use `adminDb`. Do not initialize `firebase-admin` separately inside each route handler.
6. `admin.js` begins with `import "server-only"`, initializes the Admin app once using `getApps()`, and is the sole location that reads Firebase Admin credentials.
7. Client configuration contains only `NEXT_PUBLIC_FIREBASE_*` values. Server credentials, Razorpay keys, and private keys belong only in `env.server.js` and are validated at startup. Never provide production "demo" fallback values for missing Firebase configuration; fail clearly instead.
8. Firebase Messaging remains client-only and lazy-loaded after confirming browser support. Saving an FCM token goes through `users/user.repository.js`; sending notifications goes through the server-only notifications service.

### Migration from the current layout

1. First introduce the five `lib/firebase` adapters without changing behavior, including one shared Admin initialization module.
2. Move `time.js` unchanged to `lib/time/ist.js`; it is a general utility, not Firebase code.
3. Split `auth.js` into `features/auth` and split the current `firestore.js` by collection family into feature repositories. Retain temporary re-export shims only while imports are being migrated.
4. Move transaction-sensitive registration logic out of the browser repository to `registration.service.js` and execute privileged/payment-confirmation paths on the server.
5. Update pages and API routes feature by feature, then delete `src/app/firebase/` only after no import points to it.

## Event database model

    events
    └── {eventId}
        ├── slug
        ├── title
        ├── description
        ├── date
        ├── time
        ├── duration
        ├── meetLink
        ├── accessType          // free | paid
        ├── price               // 0 for free events
        ├── status              // active | inactive | cancelled
        ├── showOnLanding       // admin checkbox value
        ├── timezone            // Asia/Kolkata
        ├── registrationCount
        ├── registeredUsers[]
        ├── createdAt
        └── updatedAt

    eventRegistrations
    └── {registrationId}
        ├── eventId
        ├── userId
        ├── name
        ├── email
        ├── emailNormalized
        ├── mobile
        ├── status
        ├── paymentId           // paid events only
        ├── paymentOrderId      // paid events only
        └── registeredAt

The admin event form includes a Show on landing page checkbox. The landing page reads active events where showOnLanding is true and links to each event by slug.

Users, users/{uid}/fcmTokens, complaints, and payments remain separate collections. Payments reference eventId.

## Dependency rules

1. app may import features, components/ui, and lib.
2. A feature may import its own files, components/ui, and lib, but not another feature's internal repository.
3. Cross-feature workflows use exported feature services.
4. components/ui must be presentation-only: no Firebase, feature repositories, role assumptions, or environment variables.
5. Browser code imports only lib/firebase/client.js and client-safe modules.
6. Server-only code imports lib/firebase/admin.js; Firebase Admin credentials and Razorpay secrets never use NEXT_PUBLIC names.
7. Firestore reads and writes go through a feature repository or service, never directly from a page or generic UI component.

## Naming rules

- Feature names and domain module filenames are singular: event, registration, complaint, payment.
- Route folders use lowercase kebab-case.
- Use .repository.js for persistence, .service.js for workflows, .validation.js for validation, and .types.js for documented shapes.
- Use .client.js and .server.js for runtime-specific modules.
- Use domain-specific identifiers: eventId, registrationId, paymentId, complaintId, and userId.
- Persist timestamps consistently as createdAt and updatedAt; normalized email is emailNormalized.

## Development rules

1. Start every new capability with a feature folder, not a dashboard page.
2. Define its model, validation, permissions, and service API before creating route UI.
3. Keep pages thin; isolate interactivity in focused client components/hooks.
4. Keep admin/user screen composition separate while sharing domain services and neutral feature components.
5. Enforce privileges in server services and Firestore rules; client guards are navigation UX only.
6. Use transactions when registrations and event aggregates change together.
7. Version and test Firestore rules and indexes with the application.
8. Add tests for validation, authorization, and critical mutations.

## Migration and safety rules

- Migrate routes and API consumers to events and eventRegistrations before deleting legacy code or collections.
- Preserve paid-registration identity/payment reconciliation and anonymous-email registration claiming during migration.
- Backfill unique slugs before using slug routes.
- Use a controlled transition when moving existing data and verify counts, payments, notifications, and authorization before retiring legacy paths.
