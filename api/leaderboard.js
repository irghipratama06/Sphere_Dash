// Leaderboard nyata: Upstash Redis (Vercel Marketplace). Env KV_REST_API_URL & KV_REST_API_TOKEN otomatis terisi.
const R = async cmd => (await fetch(process.env.KV_REST_API_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.KV_REST_API_TOKEN }, body: JSON.stringify(cmd) })).json();
export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { addr, dist, ms } = req.body || {};
      if (typeof addr !== 'string' || addr.length < 3 || addr.length > 80) return res.status(400).json({ error: 'addr' });
      if (!Number.isInteger(dist) || !Number.isInteger(ms) || dist < 1 || ms < 500) return res.status(400).json({ error: 'input' });
      if (dist > (ms / 1000) * 34 * 1.1 + 2) return res.status(400).json({ error: 'implausible' }); // jarak tak mungkin > kecepatan x waktu
      await R(['ZADD', 'gd:lb', 'GT', dist, addr]);
      return res.json({ ok: true });
    }
    const r = await R(['ZREVRANGE', 'gd:lb', 0, 9, 'WITHSCORES']); const a = r.result || [], rows = [];
    for (let i = 0; i < a.length; i += 2) rows.push({ addr: a[i], dist: +a[i + 1] });
    res.setHeader('Cache-Control', 'no-store'); res.json({ rows });
  } catch (e) { res.status(500).json({ error: 'server' }) }
}
