export async function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "demo-app-id",
  };

  const script = `
    importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");
    firebase.initializeApp(${JSON.stringify(firebaseConfig)});
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const notification = payload.notification || {};
      self.registration.showNotification(notification.title || "BinMe reminder", {
        body: notification.body || "You have a notification from BinMe.",
        icon: "/icon-192.png",
        data: payload.data || {},
      });
    });
  `;


  return new Response(script, {
    headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" },

  });
}
