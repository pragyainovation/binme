# BinMe

## Push notifications

User dashboard access requires browser notifications. Add the Firebase Cloud Messaging Web Push certificate key to `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_firebase_web_push_certificate_key
IsNotificationStore=true
```

The reminder endpoint is `GET /api/notifications/remind`. Run it from a scheduler every minute with these server-only variables:

```env
FIREBASE_PROJECT_ID=binme-5123b
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@binme-5123b.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NOTIFICATION_CRON_SECRET=long-random-secret
```

Send the secret in the `x-cron-secret` header. The endpoint checks registered sessions and free webinars within two minutes of the 30-minute reminder point and records each sent reminder to prevent duplicates. Browser push requires HTTPS in production (localhost is allowed during development).

Notification history is written to the `notifications` collection only when `IsNotificationStore` is exactly `true`. Any other value, including an unset variable, skips that write.

## Getting started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
