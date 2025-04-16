# VULU GO

A modern social streaming app with interactive chat features and comprehensive live stream capabilities.

## Features

### Live Streaming
- Host and join live audio rooms with multiple participants
- View participant information and speaking status
- Interactive progress bar showing stream ranking
- Stats display showing boosts, rank, and viewer counts
- Swipe-based navigation for mobile-friendly experience

### Chat System
- Real-time chat messaging in live streams
- Reply functionality with intuitive thread-based conversations
- @mentions support with user suggestions
- Admin badges for moderators/hosts
- Dynamic text bubbles that adapt to content length
- Elegant shadow fading effect for scroll indication

### User Interface
- Modern, sleek dark theme optimized for OLED displays
- Gradient-based components for visual appeal
- Haptic feedback on iOS for enhanced interaction
- Highly optimized UI with minimal re-renders
- Responsive design that adapts to different screen sizes

## Getting Started

### Prerequisites

- Node.js (16.x or newer)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd VULUGONEW
npm install
```

3. Start the app:

```bash
npx expo start
```

## Project Structure

```
VULUGONEW/
├── src/
│   ├── components/      # Reusable UI components
│   ├── context/         # React Context providers
│   ├── navigation/      # Navigation configurations
│   ├── screens/         # App screens
│   │   ├── LiveScreen.tsx         # Main live streams list
│   │   ├── LiveStreamView.tsx     # Individual live stream with chat
│   │   ├── ProfileScreen.tsx      # User profile
│   │   └── ...
├── App.tsx              # App entry point
├── package.json         # Dependencies and scripts
```

## Core Functionality

### Live Stream View
The `LiveStreamView` component provides a comprehensive streaming experience with:
- Participant grid showing all users in the stream
- Interactive chat with reply and mention capabilities
- Swipeable info panel with stream details
- Boost and ranking system

### Chat System
The chat system features:
- Dynamic message bubbles that adapt to content length
- Reply functionality with visual threading
- User mentions with auto-complete
- Smooth scrolling and navigation between messages

## User Experience Enhancements
- Subtle animations for UI transitions
- Haptic feedback for important interactions
- Visual indicators for speaking participants
- Gradient overlays for improved readability
- Optimized performance for smooth scrolling

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Start for Android
- `npm run ios` - Start for iOS
- `npm run web` - Start for web

## Dependencies

- React Native
- Expo
- React Navigation
- Expo Linear Gradient
- React Native Paper
- Expo Vector Icons

## License

This project is private and is not licensed for public use.

## Version History

- v0.0.2 - Added comprehensive chat system with reply functionality, enhanced UI, and improved interactions
- v0.0.1 - Initial app setup with basic navigation and screens
