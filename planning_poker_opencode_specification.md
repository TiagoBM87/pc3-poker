# 🎯 OpenCode Task Specification: Planning Poker (Serverless + Corporate VPN Ready)

## 📌 Project Overview
Build a lightweight, zero-backend **Planning Poker** web application tailored for development squads operating under strict corporate VPNs and proxies.

* **Hosting Target:** GitHub Pages (Static HTML/JS/CSS)
* **Backend Services:** Firebase Realtime Database (Serverless)
* **Framework & Tooling:** React (TypeScript) + Vite + Tailwind CSS
* **Routing:** React Router DOM with `HashRouter` (prevents 404 errors on GitHub Pages)
* **Network Strategy:** Forced Long-Polling fallback capability for Firebase to bypass corporate WebSocket blocks.

---

## 🏗️ Technical Stack & Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.0",
    "firebase": "^10.8.0",
    "lucide-react": "^0.344.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "canvas-confetti": "^1.9.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.2.0",
    "vite": "^5.1.0"
  }
}
```

---

## 🗄️ Firebase Realtime Database Architecture

### Data Schema (`/rooms/{roomId}`)
```json
{
  "rooms": {
    "squad-refinement-101": {
      "metadata": {
        "title": "Refinamento - Sprint 45",
        "createdAt": 1700000000000,
        "isRevealed": false
      },
      "participants": {
        "user_uuid_123": {
          "name": "Alex Dev",
          "role": "VOTER",
          "joinedAt": 1700000005000
        },
        "user_uuid_456": {
          "name": "Sarah PM",
          "role": "OBSERVER",
          "joinedAt": 1700000010000
        }
      },
      "votes": {
        "user_uuid_123": "5"
      }
    }
  }
}
```

### Card Values
Standard Fibonacci Sequence: `'1'`, `'2'`, `'3'`, `'5'`, `'8'`, `'13'`, `'21'`, `'?'`, `'☕'`.

---

## 🚀 Step-by-Step Implementation Instructions for OpenCode

### Step 1: File Structure Setup
Create the following directory structure:
```text
src/
├── components/
│   ├── Header.tsx
│   ├── CardDeck.tsx
│   ├── UserCard.tsx
│   ├── VoteTable.tsx
│   └── StatsPanel.tsx
├── config/
│   └── firebase.ts
├── hooks/
│   └── usePokerRoom.ts
├── services/
│   └── firebaseService.ts
├── types/
│   └── poker.ts
├── views/
│   ├── HomeView.tsx
│   └── RoomView.tsx
├── App.tsx
├── main.tsx
└── index.css
```

---

### Step 2: Types Definition (`src/types/poker.ts`)
```typescript
export type VoteValue = '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?' | '☕';
export type UserRole = 'VOTER' | 'OBSERVER';

export interface Participant {
  id: string;
  name: string;
  role: UserRole;
  joinedAt: number;
}

export interface RoomMetadata {
  title: string;
  createdAt: number;
  isRevealed: boolean;
}

export interface RoomState {
  metadata: RoomMetadata;
  participants: Record<string, Participant>;
  votes?: Record<string, VoteValue>;
}

export interface RoomStats {
  average: number | null;
  mode: VoteValue[] | null;
  min: number | null;
  max: number | null;
  hasConsensus: boolean;
}
```

---

### Step 3: Firebase Config with Proxy/VPN Fallback (`src/config/firebase.ts`)
Implement Firebase setup with automatic HTTPS Long-Polling to guarantee connectivity over strict VPNs:

```typescript
import { initializeApp } from 'firebase/app';
import { initializeDatabase, getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Force HTTPS Long-Polling to bypass corporate firewall/proxy WebSocket blocks
export const db = initializeDatabase(app, {
  forceLongPolling: true
});
```

---

### Step 4: Real-time Synchronizer Hook (`src/hooks/usePokerRoom.ts`)
Implement a React custom hook using Firebase's `onValue` listener:
- Generates or reads a local user ID (`localStorage`).
- Subscribes to changes under `/rooms/{roomId}`.
- Sanitizes votes: while `isRevealed === false`, user votes are hidden from other peers (returning only whether they have voted or not).
- Calculates statistical metrics when `isRevealed === true`:
  - **Average ($\bar{x}$):** Sum of numeric votes divided by total numeric voters: $\bar{x} = \frac{\sum x_i}{N}$.
  - **Consensus check:** Checks if all numeric votes are identical.

---

### Step 5: Key UI Views & Components

1. **`HomeView.tsx`:**
   - Input for "Your Name".
   - Toggle switch for "Voter" vs "Observer".
   - Option to "Create New Room" or "Join Existing Room".
   - Direct link creation with auto-generated room ID slug.

2. **`RoomView.tsx`:**
   - Top Header with room name, user list count, copy link button.
   - **Central Voting Table (`VoteTable.tsx`):**
     - Grid of user avatars.
     - Card state logic:
       - *Waiting:* Empty slot with "Thinking...".
       - *Voted (Hidden):* Card turned upside down with green indicator.
       - *Revealed:* Displays selected number/emoji with smooth flip animation.
   - **Bottom Control Bar (`CardDeck.tsx`):**
     - Selectable card deck (Fibonacci items).
     - Active selection highlighting.
     - Disabled state if user is set to `OBSERVER`.
   - **Moderator Controls:**
     - Primary button: "Reveal Cards" / "Reset Voting".
   - **Stats Display (`StatsPanel.tsx`):**
     - Appears upon reveal.
     - Displays Average, Highest, Lowest, and triggers confetti if consensus is reached (`hasConsensus === true`).

---

### Step 6: Router Setup (`src/App.tsx`)
Ensure routing uses `HashRouter`:

```typescript
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomeView from './views/HomeView';
import RoomView from './views/RoomView';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/room/:roomId" element={<RoomView />} />
      </Routes>
    </HashRouter>
  );
}
```

---

### Step 7: Continuous Deployment Pipeline (`.github/workflows/deploy.yml`)
Add an automated GitHub Actions deployment script to build and publish to `gh-pages`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_DATABASE_URL: ${{ secrets.VITE_FIREBASE_DATABASE_URL }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 💡 Prompt to Execute in OpenCode

> "Read `OPENCODE_SPEC.md`. Please build the entire React + TypeScript + Tailwind CSS application following the defined file structure, Firebase Long-Polling configuration, and components. Make sure all votes remain hidden until the moderator triggers the reveal action."