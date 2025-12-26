
export const environment = {
  firebase: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  },
  // Local development URLs
  functionsUrl: 'http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1',
  stravaAuthUrl: 'http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1/stravaAuth',

  // For production, use:
  // functionsUrl: 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net',
  // stravaAuthUrl: 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/stravaAuth',
};

