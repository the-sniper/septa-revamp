# SEPTA Transit App Redesign

A modern, user-focused transit app for SEPTA (Southeastern Pennsylvania Transportation Authority) that addresses common pain points and provides a better rider experience.

## 📚 Documentation

- **[Functional Requirements](docs/FUNCTIONAL_REQUIREMENTS.md)** - Complete feature specifications, acceptance criteria, and project status
- **[Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)** - Technical guide for developers with code examples

## 🚀 Features

### Stop Discovery & Stop ID Visibility
- Stop IDs displayed prominently on all stop pages
- Search by Stop ID directly from the global search
- One-tap "Copy Stop ID" functionality
- Stop IDs visible in search results

### Route Discovery & Navigation
- Unified search supporting destinations, route numbers, stop names, and Stop IDs
- "Routes near me" based on GPS location
- Clear direction labels using destination names (not just cardinal directions)
- Find routes within 2 taps from app launch

### Real-time Tracking Transparency
- Arrival times labeled as:
  - **Live GPS** - Real-time vehicle tracking
  - **Estimated** - Based on schedule with adjustments
  - **Scheduled** - Static schedule times
  - **No tracking** - Data unavailable
- Last updated timestamps shown
- Fallback to scheduled times when live data fails

### Reliability & Offline Resilience
- Cached schedules for favorited routes/stops
- Clear error messaging with retry options
- Stale data indicators when using cached information
- Offline status detection

### Favorites & Recents
- Persistent favorites stored locally
- Automatic "Recents" section based on usage
- Quick access to frequently used stops and routes

### Service Alerts
- Severity-based filtering (Severe, Warning, Info)
- Route-specific alert notifications
- Alert banners on affected stop/route pages

## 🛠️ Tech Stack

- **Framework**: Next.js 15.1.0 (App Router)
- **Language**: TypeScript 5.7.2
- **UI Library**: React 19.0.0
- **Styling**: Tailwind CSS 3.4.17
- **State Management**: Zustand 5.0.9 with localStorage persistence
- **Icons**: Lucide React

## 📋 Requirements

- **Node.js**: 20.0.0 or higher
- **npm**: 10.x or higher

## 🚦 Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd septa-revamp

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page
│   ├── stop/[id]/         # Stop detail page
│   ├── route/[id]/        # Route detail page
│   ├── nearby/            # Nearby stops page
│   ├── routes/            # All routes page
│   ├── alerts/            # Service alerts page
│   └── favorites/         # Favorites & recents page
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── ArrivalTime.tsx   # Arrival time display
│   ├── StopCard.tsx      # Stop card component
│   ├── RouteCard.tsx     # Route card component
│   ├── AlertCard.tsx     # Alert display component
│   ├── Search.tsx        # Global search component
│   └── Navigation.tsx    # Navigation components
└── lib/                  # Utilities and services
    ├── septa-api.ts      # SEPTA API integration
    ├── store.ts          # Zustand state management
    ├── hooks.ts          # Custom React hooks
    └── types.ts          # TypeScript types
```

## 🎨 Design Principles

1. **Trust through transparency** - Always show data source and freshness
2. **Speed over aesthetics** - Optimize for quick task completion
3. **Graceful degradation** - Work offline when possible
4. **Reduce cognitive load** - Clear hierarchy and minimal navigation
5. **Design for anxiety** - Transit riders are often stressed; keep UI calm

## 📡 SEPTA API Integration

The app integrates with SEPTA's public APIs:

- **Bus/Trolley Schedules**: Real-time arrival predictions
- **TransitView**: Live vehicle positions
- **Alerts**: Service disruptions and advisories

### API Caching Strategy

| Data Type | Cache Duration |
|-----------|---------------|
| Arrivals  | 30 seconds    |
| Stops     | 24 hours      |
| Routes    | 24 hours      |
| Alerts    | 5 minutes     |

## 🔮 Future Enhancements

- [ ] Trip planning with multi-modal routing
- [ ] SEPTA Key card integration
- [ ] Push notifications for alerts
- [ ] Offline schedule downloads
- [ ] Dark/light theme toggle
- [ ] Accessibility improvements (VoiceOver, TalkBack)
- [ ] Widget support for iOS/Android
- [ ] GTFS data import for complete stop/route data

## 📄 License

MIT License - See LICENSE file for details.

## 🙏 Acknowledgments

- SEPTA for providing public transit APIs
- The Philadelphia transit community for feedback and inspiration
