import { corsHeaders } from '../_shared/cors.ts';

const ONSPACE_AI_API_KEY = Deno.env.get('ONSPACE_AI_API_KEY');
const ONSPACE_AI_BASE_URL = Deno.env.get('ONSPACE_AI_BASE_URL');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { appName, category, type, tags } = await req.json();

    if (!appName) {
      return new Response(JSON.stringify({ error: 'appName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Write a compelling app store description for an ${type === 'game' ? 'mobile game' : 'mobile app'} with the following details:
- Name: ${appName}
- Category: ${category}
- Tags: ${tags || 'none provided'}

Requirements:
- 2-3 short paragraphs, ~100-140 words total
- Start with a punchy hook sentence
- Highlight key benefits (not features) in the second paragraph
- End with a clear call-to-action
- Tone: professional yet enthusiastic
- Do NOT use markdown formatting, bullet points, or headers
- Write plain text only, no asterisks or special characters`;

    const response = await fetch(`${ONSPACE_AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ONSPACE_AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are an expert app store copywriter who writes compelling, concise app descriptions that convert users into downloads.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OnSpace AI: ${err}`);
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim() ?? '';

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-description error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
