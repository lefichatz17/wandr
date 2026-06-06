export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, dest, dur, budget, occasion, vibes, day } = req.body;

    const GROQ_KEY = process.env.GROQ_API_KEY;
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

    async function askGroq(prompt) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          max_tokens: 1000,
          temperature: 0.7,
          messages: [
            { role: 'system', content: 'You are a honeymoon travel expert. Always respond with valid JSON only. No markdown. No explanation. Just JSON.' },
            { role: 'user', content: prompt }
          ]
        })
      });
      const d = await r.json();
      return d.choices?.[0]?.message?.content || '';
    }

    async function askAnthropic(prompt) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const d = await r.json();
      return d.content?.[0]?.text || '';
    }

    const ask = ANTHROPIC_KEY ? askAnthropic : askGroq;

    let result = {};

    if (type === 'meta') {
      // Get destination info, hotels, highlights, tips
      const prompt = `Honeymoon trip to ${dest}, ${dur} days, ${budget} budget, ${occasion}, interests: ${vibes}.
Return ONLY this JSON (no markdown):
{"tagline":"one romantic sentence","hotels":[{"name":"Real Hotel","category":"Luxury","stars":5,"price":250,"perk":"pool villa","desc":"2 sentences.","query":"hotel+${dest}"},{"name":"Real Hotel 2","category":"Mid-range","stars":4,"price":120,"perk":"ocean view","desc":"2 sentences.","query":"hotel2+${dest}"},{"name":"Real Hotel 3","category":"Boutique","stars":4,"price":150,"perk":"garden","desc":"2 sentences.","query":"hotel3+${dest}"},{"name":"Real Hotel 4","category":"Budget","stars":3,"price":60,"perk":"terrace","desc":"2 sentences.","query":"hotel4+${dest}"}],"highlights":[{"name":"Spot 1","day":1,"time":"Morning","why":"5 romantic words"},{"name":"Spot 2","day":1,"time":"Evening","why":"5 words"},{"name":"Spot 3","day":2,"time":"Morning","why":"5 words"},{"name":"Spot 4","day":2,"time":"Afternoon","why":"5 words"},{"name":"Spot 5","day":3,"time":"Morning","why":"5 words"},{"name":"Spot 6","day":3,"time":"Evening","why":"5 words"}],"couple_tips":["real tip 1","tip 2","tip 3","tip 4","tip 5"],"tips":{"transport":["tip 1","tip 2"],"money":["tip 1","tip 2"],"food":["tip 1","tip 2"],"culture":["tip 1","tip 2"],"safety":["tip 1","tip 2"]}}`;

      const raw = await ask(prompt);
      result = { type: 'meta', data: raw.replace(/```json|```/g, '').trim() };

    } else if (type === 'day') {
      // Generate one day at a time
      const prompt = `Honeymoon day ${day} in ${dest}. Budget: ${budget}. Interests: ${vibes}.
Return ONLY this JSON (no markdown):
{"day":${day},"theme":"5 word romantic theme","activities":[{"time":"8:30 AM","name":"Real place name in ${dest}","description":"2-3 sentences. Real price. Why special for couples.","tip":"1 insider tip.","romantic":true},{"time":"1:00 PM","name":"Real local restaurant","description":"2-3 sentences. Price range $X-Y. Signature dish.","tip":"Booking tip.","romantic":false},{"time":"4:30 PM","name":"Real experience or place","description":"2-3 sentences with real details and prices.","tip":"Insider secret.","romantic":true},{"time":"7:30 PM","name":"Real dinner restaurant","description":"2-3 romantic sentences. Atmosphere and price.","tip":"Best table or ordering tip.","romantic":true}]}`;

      const raw = await ask(prompt);
      result = { type: 'day', data: raw.replace(/```json|```/g, '').trim() };
    }

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
