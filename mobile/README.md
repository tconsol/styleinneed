# Style In Need Fashions — Mobile App

React Native (Expo managed) + Expo Router + TypeScript. Talks to the existing
`server/` API. This is the **foundation**: auth, navigation, theme, API layer,
and core screens. Features are built on top in phases.

## Stack
- Expo SDK 52 + Expo Router (file-based routing in `app/`)
- TanStack Query (server state) · Zustand (auth) · Axios (API)
- React Hook Form + Zod (forms) · Reanimated + Gesture Handler
- Expo SecureStore (encrypted tokens) · Expo Image
- Playfair Display (headings) + Inter (body)

## Setup
```bash
cd mobile
npm install
# Native/SDK-versioned packages — let Expo pick compatible versions:
npx expo install expo-router expo-status-bar expo-constants expo-linking \
  expo-font expo-secure-store expo-image expo-splash-screen \
  react-native-safe-area-context react-native-screens \
  react-native-gesture-handler react-native-reanimated
```

Create `.env` from `.env.example`:
```
EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1
```
On a **physical device**, replace `localhost` with your computer's LAN IP
(e.g. `http://192.168.1.5:5000/api/v1`) — the phone can't reach the PC's localhost.

## Run
```bash
npm start          # Expo dev server (scan QR with Expo Go)
npm run android    # Android emulator
npm run ios        # iOS simulator (macOS)
npm run typecheck  # tsc --noEmit
```

## Structure
```
app/                       # Expo Router screens
  _layout.tsx              # providers, fonts, auth hydrate, splash
  index.tsx                # launch gate → onboarding / tabs
  onboarding.tsx
  (auth)/login,register
  (tabs)/                  # bottom nav: Home, Categories, Wishlist, Cart, Profile
  product/[slug].tsx       # product detail
  search.tsx
src/
  theme/                   # colors, fonts, spacing, radii
  lib/                     # api (axios + token refresh), tokenStore, queryClient
  api/                     # TanStack Query hooks (catalog/products)
  store/                   # zustand auth store
  components/              # Screen, ProductCard, Field, EmptyState
  types/                   # shared TS types (mirror server)
  utils/                   # formatPrice, …
```

## Done in this foundation
- Splash + onboarding (swipeable, skip, persisted)
- Auth: login / register (Zod-validated), secure token storage, auto-refresh, auto-logout on 401
- Bottom-tab navigation
- Home: hero, category chips, New Arrivals / Trending / Best Sellers rails (live API)
- Categories grid + product-type chips
- Product detail: gallery, variant (size/colour) selection, live stock, add-to-bag (stub)
- Search with filters (category / productType / flags)
- Profile: account rows + sign out; sign-in CTA when logged out
- Wishlist / Cart: empty states (logic in next phase)

## Next phases (not yet built)
Cart + coupons, checkout + Razorpay, orders + Shiprocket tracking, wishlist
persistence, reviews, blog, notifications (FCM), offline cache (MMKV), Lottie
splash, shared-element transitions.
```
