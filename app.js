// app.js

// 🔑 Gemini API Key (외부 연동)
window.GEMINI_API_KEY = ""; 

// 전역 상태 변수
window.coursesData = [];
window.vocabDb = [];
window.userDecks = {}; 
window.completedUnits = new Set();
window.currentUser = null;
window.isDarkMode = localStorage.getItem('edupeng_theme_dark') === 'true';
window.activeTab = 'dashboard';
window.deckSortOrder = 'desc';

let vocabAutoId = 1;
let isBlurMode = false;
let isBlurMyDecksMode = false;
let currentVocabLang = 'en'; 

// 유틸리티 함수
window.escapeHTML = function(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, function(match) {
        const escapeRules = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
        return escapeRules[match];
    });
};

window.parseMarkdownTable = function(text) {
    if (!text.includes('|')) return window.escapeHTML(text).replace(/\n/g, '<br>');
    const lines = text.split('\n');
    let html = '';
    let inTable = false;
    for (let line of lines) {
        let trimmed = line.trim();
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            if (!inTable) { html += '<table class="topik-table"><tbody>\n'; inTable = true; }
            if (trimmed.includes('---')) continue;
            const cells = trimmed.split('|').slice(1, -1);
            html += '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>\n';
        } else {
            if (inTable) { html += '</tbody></table>\n'; inTable = false; }
            html += window.escapeHTML(line) + '<br>';
        }
    }
    if (inTable) html += '</tbody></table>\n';
    return html;
};

window.customAlert = function(msg) {
    document.getElementById('customAlertMessage').innerText = msg;
    document.getElementById('customAlertModal').classList.add('active');
};

// UI 컨트롤
window.toggleSidebar = function() {
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('active');
};

window.toggleDarkMode = function() {
    window.isDarkMode = !window.isDarkMode;
    document.body.classList.toggle('dark-mode', window.isDarkMode);
    document.getElementById('btnDarkMode').innerText = window.isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('edupeng_theme_dark', window.isDarkMode);
};

// 데이터 초기화 세팅
function parseInitialData() {
    if(!window.massiveRawData) return;
    
    window.massiveRawData.trim().split('\n').forEach(line => {
        if(!line) return;
        const parts = line.split('|');
        if(parts.length !== 26) return;
        
        const cat = parts[0] === 'C' ? 'casual' : (parts[0] === 'K' ? 'korean' : 'business');
        const lvl = parts[1] === 'B' ? 'beginner' : (parts[1] === 'I' ? 'intermediate' : 'advanced');
        const unit = parseInt(parts[2]);
        const id = `${cat}_${lvl}_u${unit}`;
        
        const dialogue = [
            { actor: 'A', en: parts[5], ko: parts[6], ja: parts[7] },
            { actor: 'B', en: parts[8], ko: parts[9], ja: parts[10] },
            { actor: 'A', en: parts[11], ko: parts[12], ja: parts[13] },
            { actor: 'B', en: parts[14], ko: parts[15], ja: parts[16] }
        ];

        const unitVocab = [];
        for(let i = 0; i < 3; i++) {
            const baseIdx = 17 + (i * 3);
            const vItem = {
                id: `v_${vocabAutoId++}`, cat, level: lvl, unit,
                word: parts[baseIdx], ko: parts[baseIdx+1], ja: parts[baseIdx+2]
            };
            unitVocab.push(vItem);
            window.vocabDb.push(vItem);
        }

        window.coursesData.push({
            id, cat, level: lvl, unit,
            topicKo: parts[3], topicJa: parts[4],
            dialogue, vocab: unitVocab
        });
    });

    if(window.topikVocabRaw) {
        window.topikVocabRaw.forEach((v, idx) => {
            if (!window.vocabDb.some(existing => existing.word === v.word)) {
                window.vocabDb.push({
                    id: `v_topik_${idx}`, cat: 'korean', level: 'beginner', unit: 'TOPIK',
                    word: v.word, ko: v.ko, ja: v.ja, isTopik: true
                });
            }
        });
    }
}

// 네비게이션 라우팅
window.nav = function(sectionId) {
    if (sectionId === 'ai_conv' || sectionId === 'bookmarks_eng' || sectionId === 'bookmarks_kor') {
        if(!window.checkAuth()) return;
    }
    
    if (window.activeTab === 'topik_integrated' && sectionId !== 'topik_integrated') {
        const quizSection = document.getElementById('topik-quiz-section');
        if (quizSection && quizSection.style.display === 'block') {
            restartTopikExam(); 
        }
    }
    
    if (window.activeTab === 'typingTest' && sectionId !== 'typingTest') {
        document.getElementById('typing-test-content').style.display = 'block';
        document.getElementById('typing-result-screen').style.display = 'none';
    }

    window.activeTab = sectionId; 
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if(window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    
    if(window.innerWidth <= 768) {
        document.getElementById('appSidebar').classList.remove('open');
        document.getElementById('sidebarBackdrop').classList.remove('active');
    }
    
    if (['dashboard', 'casual', 'business', 'korean'].includes(sectionId)) {
        document.getElementById('dashboard').classList.add('active'); 
        if (sectionId === 'dashboard') {
            document.getElementById('filterContainer').style.display = 'none';
            document.getElementById('courseGrid').style.display = 'none';
        } else {
            document.getElementById('filterContainer').style.display = sectionId === 'korean' ? 'none' : 'flex';
            document.getElementById('courseGrid').style.display = 'grid';
            window.renderCourses(sectionId);
        }
        const statsWrapper = document.getElementById('statsSectionWrapper');
        if(statsWrapper) statsWrapper.style.display = (sectionId === 'dashboard' || sectionId === 'korean') ? 'block' : 'none';
        window.renderHomeStats();
    } else {
        const targetSection = document.getElementById(sectionId);
        if(targetSection) targetSection.classList.add('active');
        
        if (sectionId === 'vocab_eng' || sectionId === 'vocab_kor') {
            currentVocabLang = sectionId === 'vocab_eng' ? 'en' : 'ko';
            document.getElementById('vocab').classList.add('active'); 
            window.renderVocab();
        } else if (sectionId === 'bookmarks_eng' || sectionId === 'bookmarks_kor') {
            currentVocabLang = sectionId === 'bookmarks_eng' ? 'en' : 'ko';
            document.getElementById('bookmarks').classList.add('active'); 
            window.renderDecks(); 
            if(window.currentDeckId) window.renderDeckWords();
        } else if (sectionId === 'admin_panel' && window.renderAdminPanel) {
            window.renderAdminPanel();
        }
    }
    document.getElementById('mainContentScroll').scrollTop = 0;
};

// 외부 연동 (Gemini API)
window.callGeminiAPI = async function(history, callback) {
    let apiUrl = '/api/chat';
    if (window.GEMINI_API_KEY && window.GEMINI_API_KEY.trim() !== '') {
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${window.GEMINI_API_KEY}`;
    }

    const payload = { contents: history };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.text();
            alert(`❌ サーバー通信エラー！\nステータスコード: ${response.status}\n\n詳細理由:\n${errorData}`);
            throw new Error("API Response Error");
        }
        
        const result = await response.json();
        if(result.candidates && result.candidates[0].content) {
            callback(result.candidates[0].content.parts[0].text);
        } else {
            throw new Error("No Content in Response");
        }
    } catch (e) {
        console.error("通信エラー:", e);
        clearTimeout(timeoutId);
        callback("エラーが発生しました。しばらくしてからもう一度お試しください。");
    }
}

// 앱 초기화 실행
window.initApp = function() {
    if(window.isDarkMode) { 
        document.body.classList.add('dark-mode'); 
        document.getElementById('btnDarkMode').innerText = '☀️'; 
    }
    parseInitialData();
    if(window.renderCourses) window.renderCourses(); 
    if(window.renderHomeStats) window.renderHomeStats();
};

document.addEventListener('DOMContentLoaded', window.initApp);