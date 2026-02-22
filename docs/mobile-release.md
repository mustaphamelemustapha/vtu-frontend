# AxisVTU Mobile Release Checklist

## 1) Accounts you need
- Google Play Console developer account.
- Apple Developer Program account.

## 2) Build config
1. Confirm production backend:
   - `VITE_API_BASE=https://<your-render-backend>/api/v1`
2. Build and sync:
   - `npm run mobile:sync`
3. Open native projects:
   - Android: `npm run mobile:android`
   - iOS: `npm run mobile:ios`

## 3) Android release (Play Store)
1. In Android Studio, set app version code/name.
2. Generate signed release bundle (`Build > Generate Signed Bundle / APK > Android App Bundle`).
3. Upload `.aab` to Play Console.
4. Fill store listing (name, screenshots, privacy policy URL, support email).
5. Complete Data Safety form and content rating.
6. Submit production release.

## 4) iOS release (App Store)
1. In Xcode, set Bundle Identifier, Team, and version/build number.
2. Add app icons and launch screen assets.
3. Archive (`Product > Archive`) and upload to App Store Connect.
4. In App Store Connect:
   - Fill app metadata, screenshots, privacy nutrition labels.
   - Complete App Privacy questionnaire.
   - Submit for review.

## 5) Policy checks (important)
- Store policies update often; verify before each submission.
- Payments: review platform billing rules for your VTU use-case before go-live.
- Do not submit a low-value wrapper; provide clear native-quality UX and stable performance.

## 6) Operational checks before submit
- Login/register/forgot password work on mobile network.
- Data purchase and transaction history statuses are consistent.
- Wallet funding flow works end-to-end on real devices.
- Support links (WhatsApp, email, website) open correctly inside app.
- Crash-free smoke test on at least one Android and one iPhone device.
