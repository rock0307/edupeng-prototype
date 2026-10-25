export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Vercel 환경 변수에서 API 키를 몰래 꺼내옵니다.
    const apiKey = process.env.GEMINI_API_KEY;
    const { contents, generationConfig } = req.body;

    if (!apiKey) {
        return res.status(500).json({ error: 'API 키가 서버에 설정되지 않았습니다.' });
    }

    try {
        // 구글 Gemini 서버로 요청을 보냅니다. (사용 모델: gemini-1.5-flash)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, generationConfig })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: '서버 내부 통신 에러가 발생했습니다.' });
    }
}
