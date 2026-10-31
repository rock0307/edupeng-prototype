export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured in Vercel' });
  }

  const { contents, generationConfig } = req.body;

  // URL에서 ?key= 파라미터를 제거한 표준 엔드포인트
  const url = `https://generativelanguage.googleapis.com/v1beta/models/flash-latest:generateContent`;
  try {
    const payload = { contents };
    if (generationConfig) {
      payload.generationConfig = generationConfig;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey.trim() // 헤더로 API 키 전달
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
