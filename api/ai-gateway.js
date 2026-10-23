// api/ai-gateway.js - Vercel Serverless Function for AeroTerra H2 AI Designer
// Secure proxy that never exposes API keys to client browsers.

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Vault-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, history, systemInstruction, action, email } = req.body || {};

    // 1. Secret API Key retrieval strictly on server side
    const serverApiKey = process.env.VERCEL_AI_API_KEY || process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
    const clientHeaderKey = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '') || req.headers['x-client-vault-key'];

    const apiKey = serverApiKey || clientHeaderKey;

    // 2. Security & RBAC: Safe Admin Verification / Gateway Health Ping without revealing the key
    if (action === 'check-status' || action === 'admin-auth' || action === 'verify-admin' || prompt === 'ping') {
      const isOwner = (typeof email === 'string' && email.trim().toLowerCase() === 'sarikmusaev2006@gmail.com');
      return res.status(200).json({
        success: true,
        connected: !!apiKey,
        owner: isOwner ? 'sarikmusaev2006@gmail.com' : 'Guest',
        isSuperAdmin: isOwner,
        status: apiKey ? 'Vercel Serverless AI Gateway Active' : 'Fallback Local Engine'
      });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!apiKey) {
      return res.status(200).json({
        fallback: true,
        message: 'No server API key found. Falling back to Local Aerospace Knowledge Engine.',
        mode: 'local'
      });
    }

    // 2. Upstream Gemini REST API call
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const systemPromptText = systemInstruction || 
      `You are the Chief Aerospace Systems Architect of AeroTerra H2, a modular twin-boom STOL hydrogen-electric eco-aircraft.
Your role is to assist engineers, pilots, and academic professors with accurate calculations, CATIA V5 Class-A surface geometry, NACA 64-215 aerodynamics, PEM fuel cell thermodynamics, distributed electric propulsion (DEP blown wing), and dual-role mission profiles (NDVI agro-spray & wildfire water salvo).
Keep answers authoritative, concise, mathematically rigorous, and formatted with markdown bullet points and equations.`;

    const contents = [];
    if (Array.isArray(history)) {
      history.slice(-8).forEach((item) => {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }]
        });
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const upstreamResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPromptText }] },
        contents: contents,
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1000
        }
      })
    });

    if (!upstreamResponse.ok) {
      const errBody = await upstreamResponse.text();
      return res.status(200).json({
        fallback: true,
        error: `Upstream AI Gateway returned status ${upstreamResponse.status}`,
        details: errBody.slice(0, 300),
        mode: 'local'
      });
    }

    const data = await upstreamResponse.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (replyText) {
      return res.status(200).json({
        success: true,
        text: replyText,
        mode: 'server-ai'
      });
    } else {
      return res.status(200).json({
        fallback: true,
        error: 'Empty response candidate from upstream model',
        mode: 'local'
      });
    }
  } catch (err) {
    return res.status(500).json({
      fallback: true,
      error: err.message,
      mode: 'local'
    });
  }
};
