# VTU SaaS Frontend

## Setup
1. Install deps: `npm install`
2. Copy `.env.example` to `.env` and set `VITE_API_BASE`.
3. Run: `npm run dev`

## Notes
- Login/Register available on the landing screen.
- Admin area expects an admin role token; otherwise it will error.

## Mobile Apps (Play Store + App Store)
Capacitor has been initialized for this project with:
- App ID: `com.mmtechglobe.axisvtu`
- App name: `AxisVTU`
- Native folders: `android/`, `ios/`

### Commands
- Sync web build into native projects: `npm run mobile:sync`
- Open Android project: `npm run mobile:android`
- Open iOS project (macOS): `npm run mobile:ios`

### Required before release
1. Set production API env before `mobile:sync` (`VITE_API_BASE=https://<your-render-backend>/api/v1`).
2. Replace launcher icons and splash assets in Android/iOS native projects.
3. Build signed release:
   - Android App Bundle (`.aab`) from Android Studio.
   - iOS archive from Xcode and upload to App Store Connect.
4. Provide app privacy disclosures and support URL in store listings.

See `docs/mobile-release.md` for full release checklist.
