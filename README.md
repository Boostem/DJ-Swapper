# DJ Swapper

Swap songs in your Spotify playlists for their extended / club / DJ mixes. Built for DJs who need the long versions.

## Prerequisites

- Node.js 18+
- OpenSSL (macOS: `brew install openssl`, Linux: `apt install openssl`)
- A free [Spotify Developer](https://developer.spotify.com/dashboard) account

## Setup

### 1. Clone and install
```bash
git clone https://github.com/boostem/dj-swapper
cd dj-swapper
npm install
```

### 2. Generate a self-signed HTTPS certificate
```bash
npm run setup
```
This creates `certs/key.pem` and `certs/cert.pem` (gitignored).

### 3. Create a Spotify app
1. Go to https://developer.spotify.com/dashboard
2. Click **Create App**
3. Set **Redirect URI** to: `https://localhost:3000/auth/callback`
4. Save — copy your **Client ID** and **Client Secret**

### 4. Configure environment
```bash
cp .env.example .env
# Edit .env with your Client ID, Client Secret, and a random SESSION_SECRET
```

### 5. Run
```bash
npm start
```

### 6. Open in browser
Visit **https://localhost:3000**

**Certificate warning (expected — it's your own cert):**
- **Chrome/Edge:** Type `thisisunsafe` anywhere on the warning page (no text field needed)
- **Firefox:** Click *Advanced* → *Accept the Risk and Continue*
- **Safari:** Click *Show Details* → *visit this website*

## How it works

1. Select a playlist from the sidebar
2. Click **Find Extended Mix** on any track
3. Results are sorted by duration — longer = more likely to be the extended mix
4. Green duration = 6+ min, yellow = 4:30+
5. Preview a 30-second clip before swapping
6. Click **Swap In** to replace the track in your playlist
7. ↗ icon opens the track in Spotify to verify before swapping

## Notes

- The app searches for "extended mix", "club mix", "original mix", and "DJ edit" variants
- Not every pop song has an extended mix on Spotify — Beatport exclusives won't appear
- Swaps are immediate and live on your actual Spotify playlist
- Re-login required after server restart (sessions are in-memory)
