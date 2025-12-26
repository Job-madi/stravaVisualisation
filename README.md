
# Strava Visualisation

A tiny app I built to see my running data in ways Strava Premium won't show me for free.

Strava Premium: ❌ Chick-fil-A: ✅✅✅

All those Chick-fil-A meals I bought in the past week looking at me like…
![Screenshot](https://a.pinatafarm.com/2000x1124/b177c50844/guy-confused.jpg)

Disclaimer: I just haven’t taken running seriously enough again to justify Premium… yet. I’ll be back soon.



## What it does

- Syncs your Strava activities.
- Shows habit patterns (when you actually run vs when you pretend you will).
- Year in review stats.
- Activity heatmap calendar Github commit style.
- Heart rate zones.

## Setup

1. Clone it
2. Copy `src/enviroments/enviroment.example.ts` to `enviroment.ts`
3. Fill in your Firebase config
4. Create a Strava API app at [strava.com/settings/api](https://www.strava.com/settings/api)
5. Add your secrets to `functions/.secret.local`:

```env
STRAVA_CLIENT_ID=your_id
STRAVA_CLIENT_SECRET=your_secret
STRAVA_REDIRECT_URI=http://127.0.0.1:5001/your-project/us-central1/stravaCallbackRedirect
STRAVA_SCOPES=read,activity:read_all
```

## Run it

```bash
# Frontend
npm install
ng serve

# Backend
cd functions
npm install
firebase emulators:start 
```

## Stack

* Angular
* Firebase (Functions, Auth, Firestore)
* Strava API

---

*Awaiting approval from Strava before I can host this for everyone.*

*Powered by Strava* 🏃 *...it's in the game.*

If you get the reference, drop it in the Issues. I’ll buy you a coffee after my fictitious startup IPO (any day now).



