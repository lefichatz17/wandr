export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;
    const useGroq = process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY;

    let response, data;

    if (useGroq) {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          max_tokens: 2000,
          messages: [
            {
              role: 'system',
              content: 'You are an expert luxury honeymoon travel planner with 20 years experience. Give specific, detailed, opinionated advice with real place names, real prices, real insider tips. Never be generic. Respond with valid JSON only, no markdown.'
            },
            ...messages
          ]
        })
      });
      data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      return res.status(200).json({ content: [{ type: 'text', text }] });

    } else {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: 'You are an expert luxury honeymoon travel planner with 20 years experience. Give specific, detailed, opinionated advice with real place names, real prices, real insider tips. Never be generic. Respond with valid JSON only, no markdown.',
          messages
        })
      });
      data = await response.json();
      return res.status(200).json(data);
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
