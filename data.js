// 학습 데이터 전역 변수 할당
const massiveRawData = `
C|B|1|인사와 안부|挨拶と近況|Hello, how are you today?|안녕하세요, 오늘 어때요?|こんにちは、今日の調子はどう？|I'm doing great. And you?|아주 좋아요. 당신은요?|絶好調です。あなたは？|I'm a bit tired, but good.|약간 피곤하지만 괜찮아요.|少し疲れていますが、元気です。|Make sure to rest later.|나중에 꼭 쉬세요.|後でしっかり休んでね。|how are you|어떻게 지내요|調子はどう|a bit tired|약간 피곤한|少し疲れた|make sure to|반드시 ~하다|必ず〜する
C|B|2|자기소개|自己紹介|Nice to meet you. I'm Alex.|만나서 반가워요. 알렉스입니다.|はじめまして。アレックスです。|I'm Sarah. I'm from Canada.|저는 사라예요. 캐나다에서 왔어요.|私はサラです。カナダから来ました。|Oh, I visited Canada last year.|오, 작년에 캐나다 갔었어요.|あ、昨年カナダに行きました。|Really? I hope you liked it!|정말요? 맘에 들었길 바라요!|本当？気に入ってくれたといいな！|nice to meet you|만나서 반가워요|はじめまして|visited|방문했다|訪れた|last year|작년|昨年
C|B|3|날씨 묻기|天気を尋ねる|Is it going to rain today?|오늘 비가 올까요?|今日雨が降るかな？|Yes, take an umbrella.|네, 우산 챙기세요.|はい、傘を持っていって。|Thanks, I almost forgot it.|고마워요, 하마터면 잊을 뻔했네요.|ありがとう、危うく忘れるところだった。|No problem. Stay dry!|천만에요. 비 맞지 마세요!|どういたしまして。濡れないようにね！|going to rain|비가 올 것이다|雨が降る|take an umbrella|우산을 챙기다|傘を持っていく|almost forgot|하마터면 잊을 뻔한|危うく忘れるところだった
B|B|1|회의 시작|会議の開始|Let's get down to business. Can you hear me?|본론으로 들어갑시다. 제 목소리 들리나요?|本題に入りましょう。聞こえますか？|Yes, we can hear you clearly.|네, 아주 명확하게 잘 들립니다.|はい、はっきりと聞こえます。|Great. Let me share my screen now.|좋습니다. 이제 제 화면을 공유해 드릴게요.|素晴らしい。今画面を共有します。|We can see your presentation slides.|발표 슬라이드가 잘 보입니다.|プレゼンスライドが見えます。|get down to business|본론으로 들어가다|本題に入る|clearly|명확하게|はっきりと|share my screen|화면을 공유하다|画面を共有する
B|B|2|명함 교환|名刺交換|Here is my business card.|제 명함입니다.|私の名刺です。|Thank you. Let me give you mine.|감사합니다. 제 명함도 드릴게요.|ありがとうございます。私の名刺もどうぞ。|It is a pleasure to finally meet you.|마침내 뵙게 되어 기쁩니다.|やっとお会いできて嬉しいです。|Likewise. I look forward to working with you.|저도요. 함께 일하게 되길 고대합니다.|こちらこそ。一緒に働くのを楽しみにしています。|business card|명함|名刺|pleasure|기쁨|喜び|look forward to|~을 고대하다|〜を楽しみにする
`;

const topikVocabRaw = [
    { word: "처음 뵙겠습니다", ko: "처음 뵙겠습니다", ja: "はじめまして" },
    { word: "우체국", ko: "우체국", ja: "郵便局" },
    { word: "약국", ko: "약국", ja: "薬局" },
    { word: "은행", ko: "은행", ja: "銀行" },
    { word: "식당", ko: "식당", ja: "食堂" },
    { word: "감기약", ko: "감기약", ja: "風邪薬" },
    { word: "소화제", ko: "소화제", ja: "消化剤" }
];

const listeningPool = [
    {
        "id": "t_l_1",
        "domain": "1. 続く言葉を選ぶ",
        "question": "【듣기1번】다음을 듣고 다음에 나올 말을 고르세요.\n\n안녕하세요. 처음 뵙겠습니다 ___________________________",
        "choices": [
            "네, 안녕히 가세요.",
            "네, 처음 뵙겠습니다.",
            "아니요, 괜찮습니다.",
            "아니요, 처음이 아닙니다."
        ],
        "answer": 2,
        "explanation": "【解説】\n正解は「2.」です。\n男性が「처음 뵙겠습니다 (はじめまして)」と挨拶したので、女性も「네, 처음 뵙겠습니다 (はい、はじめまして)」と答えるのが自然な会話の流れです。"
    }
];

const readingPool = [
    {
        "id": "t_r_1",
        "domain": "3. 実用文の理解",
        "question": "【読解 1番】 次の案内文を見て、ここはどこか選んでください。\n\n| 🏥 스마일 건강 |\n| :---: |\n| 평일: 09:00 ~ 18:00<br>주말: 쉽니다<br><br>※ 감기약, 소화제 있습니다. |",
        "choices": [
            "우체국",
            "약국",
            "은행",
            "식당"
        ],
        "answer": 2,
        "explanation": "【解説】\n正解は「2.」です。\n案内文に「감기약 (風邪薬)」や「소화제 (消化剤)」とあるため、ここが薬局(약국)であることがわかります。"
    }
];

// app.js 에서 사용할 수 있도록 전역 window 객체에 등록
window.massiveRawData = massiveRawData;
window.topikVocabRaw = topikVocabRaw;
window.listeningPool = listeningPool;
window.readingPool = readingPool;