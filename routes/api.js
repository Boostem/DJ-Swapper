import express from 'express';

const router = express.Router();
const BASE = 'https://api.spotify.com/v1';

async function spotifyFetch(req, url, opts = {}) {
  if (Date.now() > req.session.tokenExpiry - 60_000) await refreshToken(req);

  const fullUrl = url.startsWith('http') ? url : `${BASE}${url}`;
  const res = await fetch(fullUrl, {
    ...opts,
    headers: {
      Authorization: `Bearer ${req.session.accessToken}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });

  if (res.status === 204) return null;
  const data = await res.json();
  if (data.error) throw Object.assign(new Error(data.error.message), { status: data.error.status });
  return data;
}

async function refreshToken(req) {
  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: req.session.refreshToken }),
  });

  const tokens = await res.json();
  req.session.accessToken = tokens.access_token;
  req.session.tokenExpiry = Date.now() + tokens.expires_in * 1000;
  if (tokens.refresh_token) req.session.refreshToken = tokens.refresh_token;
}

function requireAuth(req, res, next) {
  if (!req.session.accessToken) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.use(requireAuth);

router.get('/me', async (req, res) => {
  try { res.json(await spotifyFetch(req, '/me')); }
  catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.get('/playlists', async (req, res) => {
  try {
    const items = [];
    let url = '/me/playlists?limit=50';
    while (url) {
      const page = await spotifyFetch(req, url.replace(BASE, ''));
      items.push(...page.items.filter(Boolean));
      url = page.next;
    }
    res.json(items);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.get('/playlists/:id/tracks', async (req, res) => {
  try {
    const items = [];
    let url = `/playlists/${req.params.id}/tracks?limit=100` +
      `&fields=next,items(added_at,track(id,name,uri,duration_ms,artists,album,external_urls,preview_url))`;
    while (url) {
      const page = await spotifyFetch(req, url.replace(BASE, ''));
      items.push(...page.items.filter(i => i.track && !i.track.episode));
      url = page.next;
    }
    res.json(items);
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.get('/search-extended', async (req, res) => {
  const { track, artist } = req.query;
  if (!track || !artist) return res.status(400).json({ error: 'Missing track or artist' });

  // Strip featuring info from track name for cleaner search
  const cleanTrack = track.replace(/\s*[\(\[](feat\.?|ft\.?|with|prod\.?)[^\)\]]*[\)\]]/gi, '').trim();

  const queries = [
    `"${cleanTrack}" "${artist}" "extended mix"`,
    `"${cleanTrack}" "${artist}" extended`,
    `"${cleanTrack}" "${artist}" "club mix"`,
    `"${cleanTrack}" "${artist}" "original mix"`,
    `"${cleanTrack}" "extended mix"`,
    `"${cleanTrack}" "extended version"`,
    `"${cleanTrack}" "club mix"`,
    `"${cleanTrack}" "dj edit"`,
  ];

  const seen = new Set();
  const results = [];

  try {
    for (const q of queries) {
      const data = await spotifyFetch(req, `/search?q=${encodeURIComponent(q)}&type=track&limit=5`);
      for (const t of data.tracks.items) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          results.push({
            id: t.id,
            uri: t.uri,
            name: t.name,
            artists: t.artists.map(a => a.name).join(', '),
            duration_ms: t.duration_ms,
            album: t.album.name,
            image: t.album.images[2]?.url || t.album.images[0]?.url || null,
            preview_url: t.preview_url,
            external_url: t.external_urls.spotify,
          });
        }
      }
    }
    // Longer = more likely to be an extended/club mix
    results.sort((a, b) => b.duration_ms - a.duration_ms);
    res.json(results.slice(0, 20));
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

router.post('/playlists/:id/swap', async (req, res) => {
  const { oldUri, newUri, position } = req.body;
  if (!oldUri || !newUri || position === undefined) {
    return res.status(400).json({ error: 'Missing oldUri, newUri, or position' });
  }

  const pid = req.params.id;
  try {
    // Insert new track before old track's position, pushing old to position+1
    await spotifyFetch(req, `/playlists/${pid}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ uris: [newUri], position }),
    });
    // Remove old track now sitting at position+1
    await spotifyFetch(req, `/playlists/${pid}/tracks`, {
      method: 'DELETE',
      body: JSON.stringify({ tracks: [{ uri: oldUri, positions: [position + 1] }] }),
    });
    res.json({ success: true });
  } catch (e) { res.status(e.status || 500).json({ error: e.message }); }
});

export default router;
