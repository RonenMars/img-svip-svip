# Photo Sviper

## The Problem

We all have thousands of photos on our phones. Screenshots we forgot about, blurry shots, duplicates, and that series of 47 nearly-identical selfies where we were trying to get the lighting just right.

Cleaning up your photo library is tedious. You open the Photos app, scroll through endless thumbnails, tap one, decide to delete it, confirm the deletion, go back, scroll again... repeat forever.

**And then there are the apps.** The App Store and Google Play are full of "photo cleaner" apps that promise to solve this problem. But here's the catch: they all want a subscription. $4.99/month. $29.99/year. Just to delete your own photos.

I got tired of paying for something this simple. So I built this.

## The Solution

**Photo Sviper** brings the svipe experience to photo management:

- **Swipe right** to keep a photo
- **Swipe left** to delete it

That's it. No complicated UI. No subscription fees. No ads. Just svipe through your photos and clean up your library in minutes instead of hours.

## How It Works

When you open the app, it loads photos from your device's camera roll. Photos appear one at a time as cards. Swipe right and you'll see a green checkmark - the photo stays. Swipe left and you'll see a red X - after a quick confirmation, the photo is permanently deleted.

A progress counter at the top shows how many photos you've reviewed. When you're done, you get a summary of how many photos you kept vs. deleted.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        App.tsx                          │
│                    (Main Container)                     │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐  │
│  │              GestureHandlerRootView               │  │
│  │         (Enables touch gesture handling)          │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │              PhotoSviper                    │  │  │
│  │  │         (State & Logic Manager)             │  │  │
│  │  │                                             │  │  │
│  │  │  • Loads photos from CameraRoll            │  │  │
│  │  │  • Tracks current index & stats            │  │  │
│  │  │  • Handles keep/delete actions             │  │  │
│  │  │                                             │  │  │
│  │  │  ┌───────────────────────────────────────┐ │  │  │
│  │  │  │           PhotoCard                   │ │  │  │
│  │  │  │      (Svipeable Card Component)       │ │  │  │
│  │  │  │                                       │ │  │  │
│  │  │  │  • Pan gesture detection              │ │  │  │
│  │  │  │  • Animated rotation & translation    │ │  │  │
│  │  │  │  • Overlay indicators (keep/delete)   │ │  │  │
│  │  │  └───────────────────────────────────────┘ │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | React Native | Cross-platform mobile development |
| **Animations** | Reanimated | 60fps gesture-driven animations on the UI thread |
| **Gestures** | Gesture Handler | Native touch handling for smooth svipes |
| **Media Access** | CameraRoll | Read photos and delete from device storage |
| **UI Safety** | Safe Area Context | Handle notches, home indicators, etc. |

### Data Flow

```
User svipes card
       │
       ▼
┌──────────────────┐
│  Gesture Handler │ ─── Detects pan gesture
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    Reanimated    │ ─── Animates card position/rotation
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Svipe Threshold │ ─── Did card pass 25% of screen width?
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  Keep     Delete
    │         │
    │         ▼
    │    ┌─────────┐
    │    │ Confirm │ ─── User confirms deletion
    │    └────┬────┘
    │         │
    ▼         ▼
┌──────────────────┐
│   Update State   │ ─── Move to next photo, update stats
└──────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn
- Xcode (for iOS)
- Android Studio (for Android)

### Installation

```bash
# Clone the repo
git clone git@github.com:RonenMars/img-svip-svip.git
cd img-svip-svip

# Install dependencies (use yarn, not npm)
yarn install

# iOS: Install CocoaPods
cd ios && bundle install && bundle exec pod install && cd ..

# Run on iOS
yarn ios

# Run on Android
yarn android
```

### Why Yarn?

This project uses Yarn instead of npm due to better dependency resolution with React Native's native modules. Using npm may cause build failures.

## Permissions

The app requires access to your photo library:

- **iOS**: Photo Library access (read & write)
- **Android**: `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (or scoped storage on Android 10+)

Photo deletion is permanent - the app shows a confirmation dialog before removing any photo.

## Future Ideas

- Undo last action
- Filter by album, date range, or file size
- "Archive" action (move to a separate album instead of delete)
- Batch mode for power users
- Widget showing storage saved

## License

MIT - Do whatever you want with it. No subscriptions required.
