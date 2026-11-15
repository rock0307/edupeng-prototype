// 🔑 Gemini API Key 직접 연동 설정 (테스트 시 본인의 API 키 입력)
window.GEMINI_API_KEY = ""; 

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

window.toggleSidebar = function() {
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const isOpen = sidebar.classList.contains('open');
    if(isOpen) {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
    } else {
        sidebar.classList.add('open');
        backdrop.classList.add('active');
    }
};

document.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('focus', () => {
        setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    });
});

// 전역 상태 및 데이터베이스 배열
window.coursesData = [];
window.vocabDb = [];
let vocabAutoId = 1;

// data.js에서 넘겨받은 원본 데이터 파싱
if (window.massiveRawData) {
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
}

if (window.topikVocabRaw) {
    window.topikVocabRaw.forEach((v, idx) => {
        if (!window.vocabDb.some(existing => existing.word === v.word)) {
            window.vocabDb.push({
                id: `v_topik_${idx}`, cat: 'korean', level: 'beginner', unit: 'TOPIK',
                word: v.word, ko: v.ko, ja: v.ja, isTopik: true
            });
        }
    });
}

// TOPIK 상태 관리
window.currentTopikType = 'listen';
window.topikState = {
    listen: { mode: 'all', category: 'all', questions: [], currentIndex: 0, answers: [], isInstant: false, timer: null, remaining: 40 * 60, isTimeUp: false },
    read: { mode: 'all', category: 'all', questions: [], currentIndex: 0, answers: [], isInstant: false, timer: null, remaining: 60 * 60, isTimeUp: false }
};

window.switchTopikTab = function(type) {
    window.currentTopikType = type;
    document.getElementById('tab-btn-listen').classList.toggle('active', type === 'listen');
    document.getElementById('tab-btn-read').classList.toggle('active', type === 'read');
    window.renderTopikCategories();
    
    const quizSection = document.getElementById('topik-quiz-section');
    const resultSection = document.getElementById('topik-result-section');
    if (quizSection.style.display !== 'block' && resultSection.style.display !== 'block') {
        document.getElementById('topik-start-section').style.display = 'block';
    }
};

window.selectTopikMode = function(mode) {
    const type = window.currentTopikType;
    window.topikState[type].mode = mode;
    ['all', 'mock', 'custom'].forEach(m => {
        const box = document.getElementById(`topik-mode-${m}`);
        if (box) box.classList.toggle('selected', mode === m);
    });
    const customArea = document.getElementById(`topik-custom-options`);
    if(customArea) customArea.style.display = mode === 'custom' ? 'block' : 'none';
};

window.renderTopikCategories = function() {
    const type = window.currentTopikType;
    const pool = type === 'listen' ? window.listeningPool : window.readingPool;
    if(!pool) return;
    const domains = [...new Set(pool.map(q => q.domain))].sort();
    const container = document.getElementById(`topik-category-group`);
    if(!container) return;
    container.innerHTML = '';

    const allBtn = document.createElement('div');
    allBtn.className = 'topik-select-box selected';
    allBtn.innerHTML = `<div style="font-weight:bold; margin-bottom:4px;">全領域</div><div style="font-size:0.85rem; color:var(--text-muted);">(${pool.length}問)</div>`;
    allBtn.onclick = (e) => {
        window.topikState[type].category = 'all';
        Array.from(container.children).forEach(c => c.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
    };
    container.appendChild(allBtn);

    domains.forEach(domain => {
        const count = pool.filter(q => q.domain === domain).length;
        const btn = document.createElement('div');
        btn.className = 'topik-select-box';
        btn.innerHTML = `<div style="font-weight:bold; margin-bottom:4px; font-size:0.95rem; word-break:keep-all;">${domain}</div><div style="font-size:0.85rem; color:var(--text-muted);">(${count}問)</div>`;
        btn.onclick = (e) => {
            window.topikState[type].category = domain;
            Array.from(container.children).forEach(c => c.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
        };
        container.appendChild(btn);
    });
};

window.startTopikTimer = function(type, seconds) {
    window.stopTopikTimer(type);
    const state = window.topikState[type];
    state.remaining = seconds; 
    state.isTimeUp = false;
    
    const display = document.getElementById(`topik-timer`);
    display.classList.add('active');
    display.style.color = 'var(--warning-text)';
    display.style.backgroundColor = 'var(--warning-bg)';
    display.style.borderColor = 'var(--warning-border)';
    
    state.timer = setInterval(() => {
        let remain = --state.remaining;
        const m = String(Math.floor(Math.max(0, remain) / 60)).padStart(2, '0');
        const s = String(Math.max(0, remain) % 60).padStart(2, '0');
        display.textContent = `⏱️ 残り時間: ${m}:${s}`;
        
        if (remain <= 300) {
            display.style.color = 'var(--danger-text)';
            display.style.backgroundColor = 'var(--danger-bg)';
            display.style.borderColor = 'var(--danger-border)';
        }
        if (remain <= 0) window.handleTopikTimeUp(type);
    }, 1000);
};

window.stopTopikTimer = function(type) {
    const state = window.topikState[type];
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    const display = document.getElementById(`topik-timer`);
    if(display) display.classList.remove('active');
};

window.handleTopikTimeUp = function(type) {
    window.stopTopikTimer(type);
    window.topikState[type].isTimeUp = true;
    
    document.querySelectorAll(`#topik-choices-container .topik-choice-btn`).forEach(btn => {
        btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed';
    });
    
    const nextBtn = document.getElementById(`topik-next-btn`);
    nextBtn.disabled = true; 
    nextBtn.textContent = '⏱️ 時間切れ (解答不可)';
    
    alert('試験時間が終了しました。採点画面に移動します。');
    window.showTopikResult(type);
};

window.startTopikExam = function() {
    const type = window.currentTopikType;
    const poolMaster = type === 'listen' ? window.listeningPool : window.readingPool;
    if (!poolMaster || poolMaster.length === 0) return alert('登録された問題がありません。');
    
    const state = window.topikState[type];
    let pool = [...poolMaster];
    
    if (state.mode === 'mock') {
        const count = type === 'listen' ? 30 : 40;
        const time = type === 'listen' ? 40 * 60 : 60 * 60;
        pool = pool.sort(() => 0.5 - Math.random()).slice(0, Math.min(count, pool.length));
        window.startTopikTimer(type, time);
    } else if (state.mode === 'custom') {
        if (state.category !== 'all') pool = pool.filter(q => q.domain === state.category);
        window.stopTopikTimer(type);
    } else {
        window.stopTopikTimer(type);
    }

    state.questions = pool;
    state.currentIndex = 0;
    state.answers = new Array(pool.length).fill(null);
    
    document.getElementById(`topik-start-section`).classList.remove('active');
    document.getElementById(`topik-start-section`).style.display = 'none';
    document.getElementById(`topik-quiz-section`).style.display = 'block';
    document.getElementById(`topik-quiz-section`).classList.add('active');
    document.querySelector('.topik-tabs').style.display = 'none';
    
    window.showTopikQuestion(type);
};

window.showTopikQuestion = function(type) {
    const state = window.topikState[type];
    state.isInstant = false;
    const q = state.questions[state.currentIndex];
    
    document.getElementById(`topik-progress`).textContent = `進行度: ${state.currentIndex + 1} / ${state.questions.length} 問`;
    document.getElementById(`topik-progress-bar`).style.width = `${((state.currentIndex + 1) / state.questions.length) * 100}%`;
    document.getElementById(`topik-question-text`).innerHTML = window.parseMarkdownTable(q.question);
    document.getElementById(`topik-feedback`).style.display = 'none';

    const btnTtsContainer = document.getElementById(`topik-tts-container`);
    if(type === 'read') {
        btnTtsContainer.style.display = 'none';
    } else {
        btnTtsContainer.style.display = 'flex';
    }

    const btnBookmark = document.getElementById(`btn-topik-bookmark`);
    if(window.userDecks['default_kor'] && window.userDecks['default_kor'].words.some(w => w.id === q.id)) {
        btnBookmark.style.background = 'var(--warning-bg)';
        btnBookmark.style.color = 'var(--warning-text)';
        btnBookmark.style.borderColor = 'var(--warning-border)';
    } else {
        btnBookmark.style.background = 'var(--bg-color)';
        btnBookmark.style.color = 'var(--text-muted)';
        btnBookmark.style.borderColor = 'var(--border)';
    }

    const container = document.getElementById(`topik-choices-container`);
    container.innerHTML = '';
    
    q.choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        btn.className = 'topik-choice-btn';
        btn.innerHTML = `<strong>${idx + 1}.</strong> ${window.escapeHTML(choice).replace(/^\d+\.\s*/, '')}`;
        btn.onclick = () => window.selectTopikChoice(type, idx);
        if (state.isTimeUp) { btn.disabled = true; btn.style.opacity = '0.5'; }
        container.appendChild(btn);
    });

    window.updateTopikNextBtn(type);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
};

window.playTopikTTS = function() {
    const state = window.topikState['listen'];
    const q = state.questions[state.currentIndex];
    if(!q) return;
    
    const parts = q.question.split('\n\n');
    const targetText = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    
    let rawText = targetText.replace(/\|/g, '').replace(/<[^>]+>/g, '').replace(/【[^】]+】/g, '').replace(/_+/g, ''); 
    window.speakTextByActor(rawText.trim(), 'A', true);
};

window.toggleTopikBookmark = function() {
    // Note: checkAuth and saveUserData will be provided by firebase.js, but we check if they exist
    if(window.checkAuth && !window.checkAuth()) return;
    window.ensureDefaultDeck();
    const type = window.currentTopikType;
    const state = window.topikState[type];
    const q = state.questions[state.currentIndex];
    if(!q) return;

    const defaultDeck = window.userDecks['default_kor'];
    const existsIndex = defaultDeck.words.findIndex(w => w.id === q.id);
    const btn = document.getElementById('btn-topik-bookmark');

    if(existsIndex >= 0) {
        defaultDeck.words.splice(existsIndex, 1);
        btn.style.background = 'var(--bg-color)';
        btn.style.color = 'var(--text-muted)';
        btn.style.borderColor = 'var(--border)';
        window.customAlert("ブックマークから削除しました。");
    } else {
        defaultDeck.words.push({ 
            id: q.id, 
            word: "[TOPIK] " + q.question.replace(/\n/g, ' ').substring(0, 30) + "...", 
            ko: q.explanation.substring(0, 50), 
            ja: q.explanation, 
            isCourseWord: true 
        });
        btn.style.background = 'var(--warning-bg)';
        btn.style.color = 'var(--warning-text)';
        btn.style.borderColor = 'var(--warning-border)';
        window.customAlert("問題をMY単語帳に保存しました。");
    }
    if(window.saveUserData) window.saveUserData();
};

window.selectTopikChoice = function(type, idx) {
    const state = window.topikState[type];
    if (state.isTimeUp || state.isInstant) return;
    state.answers[state.currentIndex] = idx;
    
    const btns = document.querySelectorAll(`#topik-choices-container .topik-choice-btn`);
    btns.forEach((b, i) => b.classList.toggle('selected', i === idx));
    window.updateTopikNextBtn(type);
};

window.updateTopikNextBtn = function(type) {
    const state = window.topikState[type];
    const btn = document.getElementById(`topik-next-btn`);
    
    if (state.isTimeUp) return;
    
    if (state.answers[state.currentIndex] !== null) {
        btn.disabled = false;
        btn.style.backgroundColor = 'var(--primary)';
        btn.style.color = 'white';
        btn.textContent = state.mode !== 'mock' ? '正解の確認と解説 ➔' : (state.currentIndex === state.questions.length - 1 ? '試験終了後、採点する' : '次の問題 ➔');
    } else {
        btn.disabled = true;
        btn.style.backgroundColor = 'var(--border)';
        btn.style.color = 'var(--text-muted)';
        btn.textContent = '正解を選択してください';
    }
};

window.nextTopikQuestion = function() {
    const type = window.currentTopikType;
    const state = window.topikState[type];
    
    if (state.isTimeUp || state.answers[state.currentIndex] === null) return;
    const q = state.questions[state.currentIndex];

    if (state.mode !== 'mock' && !state.isInstant) {
        state.isInstant = true;
        const btns = document.querySelectorAll(`#topik-choices-container .topik-choice-btn`);
        btns.forEach((b, i) => {
            if (i + 1 === q.answer) b.classList.add('correct-choice');
            else if (i === state.answers[state.currentIndex]) b.classList.add('incorrect-choice');
        });
        
        const isCorrect = (state.answers[state.currentIndex] + 1) === q.answer;
        const fb = document.getElementById(`topik-feedback`);
        fb.innerHTML = `
            <div style="font-weight:bold; font-size:1.1rem; margin-bottom:12px; color: ${isCorrect ? 'var(--success-text)' : 'var(--danger-text)'}">
                ${isCorrect ? '🎯 正解です!' : '❌ 不正解です。'}
            </div>
            ${window.parseMarkdownTable(q.explanation)}
        `;
        fb.style.display = 'block';
        document.getElementById(`topik-next-btn`).textContent = state.currentIndex === state.questions.length - 1 ? '試験終了後、採点する' : '次の問題 ➔';
        return;
    }

    if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex++;
        window.showTopikQuestion(type);
    } else {
        window.showTopikResult(type);
    }
};

window.abortTopikExam = function() {
    const type = window.currentTopikType;
    const state = window.topikState[type];
    const answeredCount = state.answers.filter(a => a !== null).length;
    
    if (answeredCount === 0) {
        if(confirm('まだ解いた問題がありません。初期 화면に戻りますか？')) {
            window.restartTopikExam();
        }
        return;
    }
    document.getElementById('topik-abort-msg').innerHTML = `現在までに <strong>${answeredCount}問</strong>解答しました。<br>このまま試験を終了して採点しますか？`;
    document.getElementById('topikAbortModal').classList.add('active');
};

window.closeTopikAbortModal = function() {
    document.getElementById('topikAbortModal').classList.remove('active');
};
        
window.confirmTopikAbort = function() {
    window.closeTopikAbortModal();
    window.showTopikResult(window.currentTopikType);
};

window.showTopikResult = function(type, isSilent = false) {
    window.stopTopikTimer(type);
    const state = window.topikState[type];
    
    if (!isSilent) {
        document.getElementById(`topik-quiz-section`).style.display = 'none';
        document.getElementById(`topik-quiz-section`).classList.remove('active');
        document.getElementById(`topik-result-section`).style.display = 'block';
        document.getElementById(`topik-result-section`).classList.add('active');
    }
    window.renderTopikResult(type, state.questions, state.answers, isSilent);
};

window.renderTopikResult = function(type, questions, answers, isSilent = false) {
    let correctCount = 0;
    questions.forEach((q, i) => { if (answers[i] !== null && (answers[i] + 1) === q.answer) correctCount++; });
    const state = window.topikState[type];
    
    if (!isSilent) {
        const card = document.getElementById(`topik-score-card`);
        const judge = document.getElementById(`topik-judge-text`);
        const scoreLabel = document.getElementById(`topik-score-label`);
        const scoreNum = document.getElementById(`topik-score-num`);
        
        if (state.mode === 'mock') {
            let calculatedScore = Math.round((correctCount / questions.length) * 100);
            scoreNum.textContent = `${calculatedScore}点`;
            scoreLabel.textContent = '予想スコア (100点満点)';
            
            if (calculatedScore >= 60) {
                card.className = 'topik-result-card pass';
                judge.style.color = 'var(--success-text)';
                judge.textContent = '🎉 素晴らしい！ (合格圏)';
            } else {
                card.className = 'topik-result-card fail';
                judge.style.color = 'var(--warning-text)';
                judge.textContent = '💪 もう少し頑張りましょう！';
            }
            judge.style.display = 'block';
        } else {
            scoreNum.textContent = `${correctCount} / ${questions.length}`;
            scoreLabel.textContent = '正解数 / 全問題数';
            card.className = 'topik-result-card';
            judge.style.display = 'none';
        }

        const reviewContainer = document.getElementById(`topik-review-container`);
        reviewContainer.innerHTML = '';
        
        questions.forEach((q, i) => {
            const userAnsIdx = answers[i];
            const isCorrect = userAnsIdx !== null && (userAnsIdx + 1) === q.answer;
            const item = document.createElement('div');
            item.className = `topik-review-item ${isCorrect ? 'correct' : 'incorrect'}`;
            
            const userAnsText = userAnsIdx !== null ? `${userAnsIdx + 1}. ${q.choices[userAnsIdx].replace(/^\d+\.\s*/, '')}` : '<span style="color:var(--danger-text);">未選択</span>';
            const correctAnsText = `${q.answer}. ${q.choices[q.answer - 1].replace(/^\d+\.\s*/, '')}`;
            
            item.innerHTML = `
                <span class="topik-badge ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? '正解' : '誤答'}</span>
                <div style="font-weight: bold; margin-bottom: 10px; font-size:1.05rem;">${i + 1}.</div>
                <div style="font-size: 1rem; margin-bottom: 16px; background: var(--bg-color); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
                    ${window.parseMarkdownTable(q.question)}
                </div>
                <div style="font-size: 0.95rem; margin-bottom: 6px;">選択した解答: <strong>${userAnsText}</strong></div>
                <div style="font-size: 0.95rem; margin-bottom: 12px; color: var(--success-text);">正解: <strong>${correctAnsText}</strong></div>
                <div class="topik-review-explanation">
                    ${window.parseMarkdownTable(q.explanation)}
                </div>
            `;
            reviewContainer.appendChild(item);
        });
    }

    if (window.currentUser) {
        if (!window.currentUser.history) window.currentUser.history = {};
        const today = window.getTodayStr();
        if(!window.currentUser.history[today]) window.currentUser.history[today] = [];

        window.currentUser.history[today].push({
            type: `topik_${type}_${window.topikState[type].mode}`,
            score: correctCount,
            total: questions.length,
            details: questions.map((q, i) => ({
                isCorrect: (answers[i] !== null && (answers[i] + 1) === q.answer)
            }))
        });

        if(window.saveUserData) window.saveUserData();
        if (typeof window.renderHomeStats === 'function') window.renderHomeStats();
    }
};

window.restartTopikExam = function() {
    const type = window.currentTopikType;
    window.stopTopikTimer(type);
    document.getElementById(`topik-result-section`).style.display = 'none';
    document.getElementById(`topik-result-section`).classList.remove('active');
    
    document.getElementById(`topik-quiz-section`).style.display = 'none';
    document.getElementById(`topik-quiz-section`).classList.remove('active');

    document.getElementById(`topik-start-section`).style.display = 'block';
    document.getElementById(`topik-start-section`).classList.add('active');
    
    document.querySelector('.topik-tabs').style.display = 'flex';
    document.getElementById('mainContentScroll').scrollTop = 0;
    window.renderTopikCategories();
};

window.currentLang = 'ja'; 
window.isDarkMode = localStorage.getItem('edupeng_theme_dark') === 'true';
window.activeTab = 'dashboard';
window.isBlurMode = false;
window.isBlurMyDecksMode = false;
window.currentVocabLang = 'en'; 
window.deckSortOrder = 'desc';
window.userDecks = {}; 
window.completedUnits = new Set();
// window.currentUser is managed by firebase.js, but default null if absent
if(typeof window.currentUser === 'undefined') window.currentUser = null;

window.ensureDefaultDeck = function() {
    if(!window.userDecks['default_eng']) window.userDecks['default_eng'] = { name: "⭐ 英語保存単語", isDefault: true, words: [], lang: 'en' };
    if(!window.userDecks['default_kor']) window.userDecks['default_kor'] = { name: "⭐ 韓国語保存単語", isDefault: true, words: [], lang: 'ko' };
};

window.toggleDarkMode = function() {
    window.isDarkMode = !window.isDarkMode;
    document.body.classList.toggle('dark-mode', window.isDarkMode);
    document.getElementById('btnDarkMode').innerText = window.isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('edupeng_theme_dark', window.isDarkMode);
};

window.getTodayStr = function() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

window.saveDailyGoals = function() {
    if(window.checkAuth && !window.checkAuth()) return;
    const nVal = parseInt(document.getElementById('goalInput-numbers').value) || 5;
    const dVal = parseInt(document.getElementById('goalInput-dates').value) || 5;
    const tVal = parseInt(document.getElementById('goalInput-times').value) || 5;
    
    window.currentUser.dailyGoals = { numbers: nVal, dates: dVal, times: tVal };
    if(window.saveUserData) window.saveUserData();
    window.renderHomeStats();
    window.customAlert("目標が保存されました。");
};

window.renderHomeStats = function() {
    if(window.currentUser) {
        document.getElementById('statsLoginReq').style.display = 'none';
        document.getElementById('statsContainer').style.display = 'block';
        
        document.getElementById('stat-num').innerText = window.currentUser.testCounts?.numbers || 0;
        document.getElementById('stat-date').innerText = window.currentUser.testCounts?.dates || 0;
        document.getElementById('stat-time').innerText = window.currentUser.testCounts?.times || 0;
        
        document.getElementById('goalInput-numbers').value = window.currentUser.dailyGoals?.numbers || 5;
        document.getElementById('goalInput-dates').value = window.currentUser.dailyGoals?.dates || 5;
        document.getElementById('goalInput-times').value = window.currentUser.dailyGoals?.times || 5;
        
        const today = window.getTodayStr();
        const todayRecords = window.currentUser.history && window.currentUser.history[today] ? window.currentUser.history[today] : [];
        
        let countN = 0, countD = 0, countT = 0;
        todayRecords.forEach(r => {
            if (r.type === 'numbers') countN++;
            if (r.type === 'dates') countD++;
            if (r.type === 'times') countT++;
        });

        const types = [
            { id: 'numbers', label: "🔢数字", count: countN, goal: window.currentUser.dailyGoals?.numbers || 5 },
            { id: 'dates', label: "📅日付", count: countD, goal: window.currentUser.dailyGoals?.dates || 5 },
            { id: 'times', label: "⏰時間", count: countT, goal: window.currentUser.dailyGoals?.times || 5 }
        ];
        
        const progressContainer = document.getElementById('dailyProgressContainer');
        progressContainer.innerHTML = '';
        
        types.forEach(item => {
            const isAchieved = (item.count >= item.goal && item.goal > 0);
            const cssClass = isAchieved ? 'achieved' : 'pending';
            const successText = isAchieved ? ` 🎉 達成!` : '';
            
            const span = document.createElement('span');
            span.className = `progress-badge ${cssClass}`;
            span.innerText = `${item.label} : ${item.count} / ${item.goal} 達成${successText}`;
            progressContainer.appendChild(span);
        });

        window.renderDateHistory();
    } else {
        document.getElementById('statsLoginReq').style.display = 'block';
        document.getElementById('statsContainer').style.display = 'none';
        document.getElementById('dateHistoryContainer').innerHTML = `<div style="color:var(--text-muted);">履歴がありません。</div>`;
    }
};

window.renderDateHistory = function() {
    const container = document.getElementById('dateHistoryContainer');
    container.innerHTML = '';
    if(!window.currentUser || !window.currentUser.history) return;
    
    const dates = Object.keys(window.currentUser.history).sort((a,b) => b.localeCompare(a));
    if(dates.length === 0) {
        container.innerHTML = `<div style="color:var(--text-muted);">履歴がありません。</div>`;
        return;
    }
    
    const goals = window.currentUser.dailyGoals || { numbers: 5, dates: 5, times: 5 };
    
    dates.forEach(date => {
        const dayRecords = window.currentUser.history[date];
        const totalTests = dayRecords.length;
        
        let n = 0, d = 0, timeCount = 0;
        dayRecords.forEach(r => {
            if (r.type === 'numbers') n++;
            if (r.type === 'dates') d++;
            if (r.type === 'times') timeCount++;
        });
        
        const isAchieved = (n >= goals.numbers && d >= goals.dates && timeCount >= goals.times);
        const statusClass = isAchieved ? 'history-achieved' : 'history-pending';
        
        const row = document.createElement('div');
        row.className = `history-row ${statusClass}`;
        row.innerHTML = `<div>${date} (${totalTests}回)</div>`;
        
        let tooltipHtml = `<div class="history-tooltip">
            <strong style="display:block; margin-bottom: 8px; font-size:1rem;">${date} 詳細履歴</strong>
            <hr style="margin:8px 0; border-color:var(--border);">
        `;
        
        dayRecords.forEach((r, idx) => {
            let typeName = r.type;
            if(r.type === 'numbers') typeName = "🔢数字";
            else if(r.type === 'dates') typeName = "📅日付";
            else if(r.type === 'times') typeName = "⏰時間";
            else if(r.type.startsWith('topik_listen')) typeName = 'TOPIK リスニング';
            else if(r.type.startsWith('topik_read')) typeName = 'TOPIK リーディング';
            
            tooltipHtml += `<div style="margin-bottom:12px; font-size:0.9rem;">
                <strong style="display:block; margin-bottom:4px;">${idx+1}. ${typeName} (${r.score}/${r.total})</strong>
                <div style="display:flex; flex-wrap:wrap; gap:4px;">
            `;
            if(r.details && Array.isArray(r.details)) {
                r.details.forEach((dt) => {
                    const oxClass = dt.isCorrect ? 'ox-correct' : 'ox-wrong';
                    const mark = dt.isCorrect ? 'O' : 'X';
                    tooltipHtml += `<span class="ox-badge ${oxClass}">${mark}</span>`;
                });
            }
            tooltipHtml += `</div></div>`;
        });
        tooltipHtml += `</div>`;
        row.innerHTML += tooltipHtml;
        container.appendChild(row);
    });
}

// 모달창 UI 제어 함수
window.openAuthModal = function(mode) {
    window.authMode = mode || 'login';
    var modal = document.getElementById('authModal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('active');
    window.switchAuthTab(window.authMode);
};

window.switchAuthTab = function(mode) {
    window.authMode = mode;
    var tabLogin = document.getElementById('tabLogin');
    var tabSignup = document.getElementById('tabSignup');
    var btnEl = document.getElementById('btnAuthSubmit');
    var nameGroup = document.getElementById('nameGroup');
    var nameInput = document.getElementById('authName');
    
    if (mode === 'login') {
        tabLogin.style.background = 'var(--primary)';
        tabLogin.style.color = 'white';
        tabLogin.style.borderColor = 'var(--primary)';
        tabSignup.style.background = 'var(--bg-color)';
        tabSignup.style.color = 'var(--text-main)';
        tabSignup.style.borderColor = 'var(--border)';
        btnEl.innerText = "ログイン";
        nameGroup.style.display = 'none';
        nameInput.required = false;
    } else {
        tabSignup.style.background = 'var(--primary)';
        tabSignup.style.color = 'white';
        tabSignup.style.borderColor = 'var(--primary)';
        tabLogin.style.background = 'var(--bg-color)';
        tabLogin.style.color = 'var(--text-main)';
        tabLogin.style.borderColor = 'var(--border)';
        btnEl.innerText = "会員登録";
        nameGroup.style.display = 'block';
        nameInput.required = true;
    }
};

window.closeAuthModal = function() {
    var modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    var form = document.getElementById('authForm');
    if (form) form.reset();
};

window.openAdminUserModal = function(uid) {
    const u = window.usersDbCache[uid];
    if(!u) return;
    
    let detailsHtml = `
        <div style="background: var(--bg-color); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <strong>👤 メールアドレス:</strong> ${window.escapeHTML(u.email)} <br>
            <strong>👤 名前(닉네임):</strong> ${window.escapeHTML(u.name || '-')} <br>
            <strong>🕒 最終ログイン:</strong> ${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '記録なし'} <br>
        </div>
        <h3 style="margin-top: 16px; margin-bottom: 8px; font-size: 1.1rem; color: var(--primary);">✅ 完了したユニット (${(u.completedUnits||[]).length}個)</h3>
        <div style="background: var(--bg-color); padding: 12px; border-radius: 8px; max-height: 120px; overflow-y: auto;">
    `;
    if(u.completedUnits && u.completedUnits.length > 0) {
        detailsHtml += u.completedUnits.map(id => `<span class="tag">${window.escapeHTML(id)}</span>`).join(' ');
    } else {
        detailsHtml += `<span style="color:var(--text-muted);">完了한 ユニットがありません。</span>`;
    }
    detailsHtml += `</div><h3 style="margin-top: 20px; margin-bottom: 8px; font-size: 1.1rem; color: var(--primary);">📅 日付別テスト履歴</h3>`;
    
    if(u.history && Object.keys(u.history).length > 0) {
        const dates = Object.keys(u.history).sort((a,b) => b.localeCompare(a));
        dates.forEach(date => {
            detailsHtml += `<div style="margin-bottom: 8px;"><strong>${window.escapeHTML(date)}</strong>: ${u.history[date].length}回進行</div>`;
        });
    } else {
        detailsHtml += `<div style="color:var(--text-muted);">テスト履歴がありません。</div>`;
    }

    document.getElementById('adminUserDetails').innerHTML = detailsHtml;
    document.getElementById('adminUserModal').classList.add('active');
};

window.closeAdminUserModal = function() {
    document.getElementById('adminUserModal').classList.remove('active');
};


// 단어장 및 덱 관리
window.createNewDeck = function() {
    if(window.checkAuth && !window.checkAuth()) return;
    const input = document.getElementById('newDeckName'); 
    const name = input.value.trim(); 
    if(!name) return;
    const deckId = 'deck_' + Date.now(); 
    window.userDecks[deckId] = { name: name, isDefault: false, words: [], lang: window.currentVocabLang };
    if(window.saveUserData) window.saveUserData(); 
    input.value = ''; window.renderDecks();
};

window.toggleCourseBookmark = function(vocabId, btnElement) {
    if(window.checkAuth && !window.checkAuth()) return; 
    window.ensureDefaultDeck();
    const v = window.vocabDb.find(x => x.id === vocabId);
    if(!v) return;
    const isKor = v.cat === 'korean';
    const defaultDeckName = isKor ? 'default_kor' : 'default_eng';
    
    const defaultDeck = window.userDecks[defaultDeckName]; 
    const existsIndex = defaultDeck.words.findIndex(w => w.id === vocabId);
    let isNowBookmarked = false;
    
    if(existsIndex >= 0) { 
        defaultDeck.words.splice(existsIndex, 1); 
        isNowBookmarked = false;
    } else { 
        defaultDeck.words.push({ id: v.id, word: v.word, ko: v.ko, ja: v.ja, isCourseWord: true }); 
        isNowBookmarked = true;
    }
    if(window.saveUserData) window.saveUserData(); 
    
    if (btnElement && btnElement.tagName === 'BUTTON') {
        if (isNowBookmarked) {
            btnElement.className = 'btn-bm-active';
            btnElement.innerText = "✅ 追加完了!";
        } else {
            btnElement.className = 'btn-bm-inactive';
            btnElement.innerText = "☆ 追加";
        }
    } else {
        if(window.activeTab.startsWith('vocab')) window.renderVocab(); 
        if(window.activeTab === 'lesson') window.renderLessonVocab();
    }
};

window.isBookmarked = function(vocabId) { 
    const v = window.vocabDb.find(x => x.id === vocabId);
    if(!v) return false;
    const defaultDeckName = v.cat === 'korean' ? 'default_kor' : 'default_eng';
    return window.userDecks[defaultDeckName] ? window.userDecks[defaultDeckName].words.some(w => w.id === vocabId) : false; 
}

window.renderDecks = function() {
    if(window.checkAuth && !window.checkAuth()) return; 
    document.getElementById('deckListView').style.display = 'block'; 
    document.getElementById('deckDetailView').style.display = 'none';
    const container = document.getElementById('deckGridContainer'); 
    container.innerHTML = ''; 
    window.ensureDefaultDeck();
    Object.keys(window.userDecks).filter(k => window.userDecks[k].lang === window.currentVocabLang).forEach(deckId => {
        const deck = window.userDecks[deckId]; 
        const card = document.createElement('div'); 
        card.className = 'deck-card'; 
        card.onclick = () => window.openDeckDetail(deckId);
        card.innerHTML = `<div class="deck-icon">${deck.isDefault ? '⭐' : '📁'}</div><div class="deck-title">${window.escapeHTML(deck.name)}</div><div class="deck-count" style="color:var(--text-muted); font-size:0.9rem;">${deck.words.length} words</div>`;
        container.appendChild(card);
    });
};

window.openDeckDetail = function(deckId) {
    window.currentDeckId = deckId; 
    const deck = window.userDecks[deckId];
    document.getElementById('deckListView').style.display = 'none'; 
    document.getElementById('deckDetailView').style.display = 'block'; 
    document.getElementById('currentDeckTitle').innerText = deck.name; 
    document.getElementById('addWordFormArea').style.display = deck.isDefault ? 'none' : 'flex'; 
    document.getElementById('btn-add-word').innerText = "保存 💾";
    document.getElementById('btn-add-word').style.background = "var(--primary)";
    window.renderDeckWords();
};

window.showDeckList = function() { 
    window.currentDeckId = null; 
    window.renderDecks(); 
};

window.addWordToCurrentDeck = function() {
    if(!window.currentDeckId || window.userDecks[window.currentDeckId].isDefault) return;
    const enInput = document.getElementById('newWordEn'); 
    const meanInput = document.getElementById('newWordMean');
    const word = enInput.value.trim(); 
    const mean = meanInput.value.trim(); 
    if(!word || !mean) return;
    window.userDecks[window.currentDeckId].words.push({ id: 'cw_' + Date.now(), word: word, ko: mean, ja: mean, isCourseWord: false });
    if(window.saveUserData) window.saveUserData(); 
    enInput.value = ''; 
    meanInput.value = ''; 
    window.renderDeckWords();

    const btn = document.getElementById('btn-add-word');
    btn.innerText = "✅ 追加完了!";
    btn.style.background = "#16a34a";
    setTimeout(() => {
        btn.innerText = "保存 💾";
        btn.style.background = "var(--primary)";
    }, 1500);
};

window.removeWordFromDeck = function(deckId, wordId) { 
    if(confirm("この単語を本当に削除しますか？")) {
        window.userDecks[deckId].words = window.userDecks[deckId].words.filter(w => w.id !== wordId); 
        if(window.saveUserData) window.saveUserData(); 
        window.renderDeckWords(); 
    }
};

window.toggleDeckSort = function() {
    window.deckSortOrder = window.deckSortOrder === 'desc' ? 'asc' : 'desc';
    const btn = document.getElementById('btn-sort-deck');
    if (btn) {
        btn.innerText = window.deckSortOrder === 'desc' ? '⬇️ 新着順' : '⬆️ 古い順';
    }
    window.renderDeckWords();
};

window.toggleBlurMyDecksMode = function(enabled) { 
    window.isBlurMyDecksMode = enabled; 
    document.getElementById('toggleBlurMyDecks').checked = enabled; 
    if(window.currentDeckId) window.renderDeckWords(); 
};

window.renderDeckWords = function() {
    const container = document.getElementById('deckWordsContainer'); 
    const deck = window.userDecks[window.currentDeckId]; 
    if(!deck || deck.words.length === 0) { 
        container.innerHTML = `<div class="empty-state">単語がありません。</div>`; 
        return; 
    }
    
    let wordsArr = [...deck.words];
    if(window.deckSortOrder === 'desc') wordsArr.reverse();

    let html = `<table class="vocab-table"><tr><th>単語/表現</th><th>意味 / 解説</th><th style="width: 80px; text-align: right;">🔍</th></tr>`;
    
    wordsArr.forEach(w => {
        const meaning = w.ja;
        const blurClass = window.isBlurMyDecksMode ? 'blur-meaning' : '';

        html += `<tr>
            <td style="font-weight: 600; color: var(--primary);">${window.escapeHTML(w.word)}</td>
            <td><span class="${blurClass}">${window.escapeHTML(meaning)}</span></td>
            <td style="text-align: right; white-space: nowrap;">
                ${!deck.isDefault ? `<button class="btn-options" onclick="editWordInDeck('${window.currentDeckId}', '${w.id}')">✏️</button>` : ''}
                <button class="btn-options" onclick="removeWordFromDeck('${window.currentDeckId}', '${w.id}')">❌</button>
            </td>
        </tr>`;
    });
    container.innerHTML = html + `</table>`;
};

window.editingDeckId = null;
window.editingWordId = null;

window.editWordInDeck = function(deckId, wordId) {
    const deck = window.userDecks[deckId];
    const wordObj = deck.words.find(w => w.id === wordId);
    if(!wordObj) return;
    
    window.editingDeckId = deckId;
    window.editingWordId = wordId;
    
    document.getElementById('editWordInput').value = wordObj.word;
    document.getElementById('editMeanInput').value = wordObj.ja;
    document.getElementById('editWordModal').classList.add('active');
};

window.closeEditWordModal = function() {
    document.getElementById('editWordModal').classList.remove('active');
    window.editingDeckId = null;
    window.editingWordId = null;
};

window.saveEditedWord = function() {
    if(!window.editingDeckId || !window.editingWordId) return;
    const newWord = document.getElementById('editWordInput').value.trim();
    const newMean = document.getElementById('editMeanInput').value.trim();
    if(!newWord || !newMean) return window.customAlert("単語と意味を入力してください。");
    
    const deck = window.userDecks[window.editingDeckId];
    const wordObj = deck.words.find(w => w.id === window.editingWordId);
    if(wordObj) {
        wordObj.word = newWord;
        wordObj.ja = newMean;
        if(window.saveUserData) window.saveUserData();
        window.renderDeckWords();
        window.closeEditWordModal();
    }
};

// 강좌 / 레슨 영역
window.renderCourses = function(catFilter = 'all') {
    const container = document.getElementById('courseGrid'); 
    if(!container) return; 
    container.innerHTML = '';
    const levelVal = document.getElementById('levelFilter') ? document.getElementById('levelFilter').value : 'all'; 
    let list = window.coursesData;
    
    if (catFilter !== 'all') list = list.filter(c => c.cat === catFilter); 
    else list = list.filter(c => c.cat !== 'korean'); 

    if (levelVal && levelVal !== 'all' && catFilter !== 'korean') list = list.filter(c => c.level === levelVal);

    const levelNamesJa = { beginner: '初級', intermediate: '中級', advanced: '上級' };

    list.forEach(item => {
        const isCompleted = window.completedUnits.has(item.id); 
        const topic = item.topicJa; 
        const lvlName = levelNamesJa[item.level]; 
        const catName = item.cat === 'casual' ? '日常英語' : (item.cat === 'business' ? 'ビジネス' : '韓国語');
        const tagColorClass = item.cat === 'korean' ? 'korean' : item.cat;
        const title = `${lvlName} ${catName} Unit ${item.unit}: ${topic}`; 
        const desc = `${lvlName} ${item.unit} ${topic} 学習`;
        
        const card = document.createElement('div'); 
        card.className = 'card'; 
        card.onclick = () => window.openLesson(item.id);
        card.innerHTML = `${isCompleted ? '<span class="card-completed-badge">✅</span>' : ''}<div><span class="tag level-${item.level}">${lvlName}</span><span class="tag ${tagColorClass}">${catName}</span></div><h3>${window.escapeHTML(title)}</h3><p>${window.escapeHTML(desc)}</p><button class="btn-start">学習する</button>`;
        container.appendChild(card);
    });
};

window.currentLesson = null;
window.openLesson = function(unitId) {
    window.currentLesson = window.coursesData.find(c => c.id === unitId); 
    if(!window.currentLesson) return;
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active')); 
    document.getElementById('lesson').classList.add('active');
    
    const levelNamesJa = { beginner: '初級', intermediate: '中級', advanced: '上級' };
    const topic = window.currentLesson.topicJa; 
    const lvlName = levelNamesJa[window.currentLesson.level]; 
    const catName = window.currentLesson.cat === 'casual' ? '日常英語' : (window.currentLesson.cat === 'business' ? 'ビジネス' : '韓国語');
    const tagColorClass = window.currentLesson.cat === 'korean' ? 'korean' : window.currentLesson.cat;
    
    document.getElementById('lessonTitle').innerText = `${lvlName} Unit ${window.currentLesson.unit}: ${topic}`;
    const lvlTag = document.getElementById('lessonLevelTag'); 
    lvlTag.className = `tag level-${window.currentLesson.level}`; 
    lvlTag.innerText = lvlName;
    const catTag = document.getElementById('lessonCategoryTag'); 
    catTag.className = `tag ${tagColorClass}`; 
    catTag.innerText = catName;
    
    window.setRoleplay('all'); 
    window.renderDialogue(); 
    window.renderLessonVocab();
    
    document.getElementById('mainContentScroll').scrollTop = 0;
};

window.goBackFromLesson = function() {
    if (window.currentLesson && window.currentLesson.cat) {
        window.nav(window.currentLesson.cat); 
    } else {
        window.nav('dashboard');
    }
};

window.renderDialogue = function() {
    const container = document.getElementById('dialogueContainer'); 
    container.innerHTML = '';
    const isKor = window.currentLesson.cat === 'korean';
    window.currentLesson.dialogue.forEach(line => {
        let mainText = line.en;
        let subText = line.ja; 
        const row = document.createElement('div'); 
        row.className = `dialogue-row actor-${line.actor}`;
        const safeText = mainText.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        row.innerHTML = `
            <div class="actor-badge">${line.actor}</div>
            <div class="text-content" data-actor="${line.actor}">
                <div class="en-text">${window.escapeHTML(mainText)}</div>
                <div class="tr-text">${window.escapeHTML(subText)}</div>
            </div>
            <button class="btn-icon" onclick="window.speakTextByActor('${safeText}', '${line.actor}', ${isKor})" title="音声を聞く">🔊</button>
        `;
        container.appendChild(row);
    });
}

window.renderLessonVocab = function() {
    const container = document.getElementById('lessonVocabContainer'); 
    container.innerHTML = '';
    window.currentLesson.vocab.forEach(v => {
        const isBm = window.isBookmarked(v.id);
        const btnClass = isBm ? 'btn-bm-active' : 'btn-bm-inactive';
        const btnText = isBm ? "✅ 追加完了!" : "☆ 追加";
        const card = document.createElement('div'); 
        card.className = 'vocab-detail-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size: 1.05rem;">${window.escapeHTML(v.word)}</strong>
                <button class="${btnClass}" onclick="toggleCourseBookmark('${v.id}', this)">${btnText}</button>
            </div>
            <div style="color: var(--primary); margin-top: 6px; font-weight: 600;">📌 ${window.escapeHTML(v.ja)}</div>
        `;
        container.appendChild(card);
    });
}

window.setRoleplay = function(hideActor) {
    document.querySelectorAll('.roleplay-toggles .btn-control').forEach(b => b.classList.remove('active'));
    if(hideActor === 'all') document.getElementById('rp-all').classList.add('active'); 
    if(hideActor === 'A') document.getElementById('rp-a').classList.add('active'); 
    if(hideActor === 'B') document.getElementById('rp-b').classList.add('active');
    document.querySelectorAll('.en-text').forEach(el => el.classList.remove('hide-text'));
    if(hideActor !== 'all') { 
        document.querySelectorAll('.text-content').forEach(el => { 
            if (el.getAttribute('data-actor') === hideActor) { 
                el.querySelector('.en-text').classList.add('hide-text'); 
            } 
        }); 
    }
};

window.testAnswers = [];
window.openTestModal = function() {
    if(window.checkAuth && !window.checkAuth() || !window.currentLesson) return;
    document.getElementById('testModal').classList.add('active');
    const vList = [...window.currentLesson.vocab].sort(()=>0.5-Math.random()).slice(0, 3);
    window.testAnswers = []; 
    let html = '';
    
    vList.forEach((targetV, i) => {
        const qText = `Q${i+1}. '${targetV.word}' の正しい意味は？`;
        let pool = window.vocabDb.filter(v => v.id !== targetV.id && v.cat === window.currentLesson.cat).sort(()=>0.5-Math.random()).slice(0, 3);
        let options = [targetV, ...pool].sort(()=>0.5-Math.random());
        window.testAnswers.push(options.findIndex(o => o.id === targetV.id));
        
        html += `<div style="margin-bottom: 20px;"><p style="font-weight: bold; margin-bottom: 12px; font-size: 1.05rem;">${window.escapeHTML(qText)}</p><div style="display: flex; flex-direction: column; gap: 8px;">`;
        options.forEach((opt, idx) => {
            const mean = opt.ja;
            html += `<label class="test-option-label"><input type="radio" name="testQ${i}" value="${idx}"> <span>${window.escapeHTML(mean)}</span></label>`;
        });
        html += `</div></div>`;
    });
    document.getElementById('testVocabList').innerHTML = html;
    
    const aiPromptText = window.currentLesson.dialogue[0].en;
    document.getElementById('testAiPrompt').innerText = aiPromptText;
    document.getElementById('testUserAnswer').value = '';
    setTimeout(() => window.speakTestPrompt(), 500);
};

window.speakTestPrompt = function() {
    if(window.currentLesson && window.currentLesson.dialogue.length > 0) {
        const isKor = window.currentLesson.cat === 'korean';
        window.speakTextByActor(window.currentLesson.dialogue[0].en, window.currentLesson.dialogue[0].actor, isKor);
    }
};

window.closeTestModal = function() {
    document.getElementById('testModal').classList.remove('active');
    if(window.recognitionTest && window.isRecordingTest) { window.recognitionTest.stop(); }
};

window.recognitionTest = null; 
window.isRecordingTest = false;
window.toggleVoiceRecognitionTest = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition) return window.customAlert("ブラウザが音声認識をサポートしていません。");
    const btn = document.getElementById('btn-mic-test');
    if(window.isRecordingTest) { window.recognitionTest.stop(); return; }
    window.recognitionTest = new SpeechRecognition();
    window.recognitionTest.lang = window.currentLesson.cat === 'korean' ? 'ko-KR' : 'en-US';
    window.recognitionTest.interimResults = false;
    
    window.recognitionTest.onstart = () => { window.isRecordingTest = true; btn.style.background = '#dc2626'; btn.innerText = '🛑'; };
    window.recognitionTest.onresult = (e) => { 
        const text = e.results[0][0].transcript; 
        const input = document.getElementById('testUserAnswer'); 
        input.value = input.value ? input.value + ' ' + text : text; 
    };
    window.recognitionTest.onerror = () => { window.isRecordingTest = false; btn.style.background = 'var(--primary)'; btn.innerText = '🎙️'; };
    window.recognitionTest.onend = () => { window.isRecordingTest = false; btn.style.background = 'var(--primary)'; btn.innerText = '🎙️'; };
    window.recognitionTest.start();
};

window.submitTest = function() {
    for(let i = 0; i < window.testAnswers.length; i++) {
        const selected = document.querySelector(`input[name="testQ${i}"]:checked`);
        if(!selected) return window.customAlert("単語クイズ에すべて答えてください！");
        if(parseInt(selected.value) !== window.testAnswers[i]) return window.customAlert(`❌ Q${i+1} 不正解です。もう一度確認してください！`);
    }
    const ans = document.getElementById('testUserAnswer').value.trim().toLowerCase();
    if(ans.length < 3) return window.customAlert("AIとの会話の返答が短すぎます。文章で答えてみてください！");
    
    window.customAlert("🎉 完璧に理解していますね！学習を完了とします。");
    window.closeTestModal(); 
    window.completedUnits.add(window.currentLesson.id); 
    if(window.saveUserData) window.saveUserData(); 
    window.updateOverallProgress(); 
    window.nav('dashboard');
};

window.updateOverallProgress = function() {
    const total = window.coursesData.length; 
    const count = window.completedUnits.size; 
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    document.getElementById('overallProgressBar').style.width = percent + '%'; 
    document.getElementById('overallProgressText').innerText = `${percent}% (${count}/${total})`;
};

window.toggleBlurMode = function(enabled) { 
    window.isBlurMode = enabled; 
    document.getElementById('toggleBlurVocab').checked = enabled; 
    if(window.activeTab.startsWith('vocab')) window.renderVocab(); 
};

window.renderVocab = function() {
    const container = document.getElementById('vocabContainer'); 
    const items = window.vocabDb.filter(v => window.currentVocabLang === 'en' ? v.cat !== 'korean' : v.cat === 'korean');
    
    if(items.length === 0) { 
        container.innerHTML = `<div class="empty-state">単語がありません。</div>`; 
        return; 
    }
    const levelNamesJa = { beginner: '初級', intermediate: '中級', advanced: '上級' };
    let html = `<table class="vocab-table"><tr><th style="width: 60px; text-align: center;">保存</th><th>単語/表現</th><th>意味 / 解説</th><th>出典</th></tr>`;
    items.forEach(v => {
        const isBm = window.isBookmarked(v.id);
        const btnContent = isBm ? '<span style="color:#f59e0b; font-size:1.5rem;">★</span>' : '<span style="font-size:1.5rem;">☆</span>';
        const lvlName = levelNamesJa[v.level] || 'TOPIK'; 
        const meaning = v.ja; 
        const blurClass = window.isBlurMode ? 'blur-meaning' : '';
        const tagDisplay = v.isTopik ? `<span class="tag korean">TOPIK</span> 重要単語` : `<span class="tag level-${v.level}">${window.escapeHTML(lvlName)}</span> Unit ${v.unit}`;

        html += `<tr><td style="text-align: center;"><button style="background:none; border:none; cursor:pointer;" onclick="toggleCourseBookmark('${v.id}')">${btnContent}</button></td><td style="font-weight: 600; color: var(--primary); font-size:1.1rem;">${window.escapeHTML(v.word)}</td><td><span class="${blurClass}">${window.escapeHTML(meaning)}</span></td><td>${tagDisplay}</td></tr>`;
    });
    container.innerHTML = html + `</table>`;
};

window.flashcardPool = []; 
window.currentFcIndex = 0;

window.openFlashcardModal = function(type = 'all') {
    if(type === 'all') { 
        window.flashcardPool = window.vocabDb.filter(v => window.currentVocabLang === 'en' ? v.cat !== 'korean' : v.cat === 'korean'); 
    } else if (type === 'deck') { 
        if(!window.currentDeckId) return; 
        window.flashcardPool = window.userDecks[window.currentDeckId].words; 
    }
    if(window.flashcardPool.length === 0) { 
        window.customAlert("単語が存在しません。"); 
        return; 
    }
    window.currentFcIndex = 0; 
    document.getElementById('flashcardModal').classList.add('active'); 
    window.renderFlashcardContent();
};

window.closeFlashcardModal = function() { 
    document.getElementById('flashcardModal').classList.remove('active'); 
};

window.renderFlashcardContent = function() {
    const levelNamesJa = { beginner: '初級', intermediate: '中級', advanced: '上級' };
    const item = window.flashcardPool[window.currentFcIndex];
    document.getElementById('fcWord').innerText = item.word; 
    document.getElementById('fcMeaning').innerText = item.ja;
    
    if(item.isCourseWord === undefined) { 
        if (item.isTopik) {
            document.getElementById('fcTag').innerText = `TOPIK 重要単語`;
        } else {
            const lvlName = levelNamesJa[item.level]; 
            document.getElementById('fcTag').innerText = `${lvlName} Unit ${item.unit}`;
        }
    } else { 
        document.getElementById('fcTag').innerText = item.isCourseWord ? 'Course Word' : 'Custom Word'; 
    }
    document.getElementById('fcProgress').innerText = `${window.currentFcIndex + 1} / ${window.flashcardPool.length}`;
}

window.flipFlashcard = function() { 
    document.getElementById('flashcardElement').classList.toggle('flipped'); 
};

window.nextFlashcard = function() { 
    if(window.currentFcIndex < window.flashcardPool.length - 1) { 
        const cardEl = document.getElementById('flashcardElement');
        if(cardEl.classList.contains('flipped')) { 
            cardEl.classList.remove('flipped'); 
            setTimeout(() => { window.currentFcIndex++; window.renderFlashcardContent(); }, 300); 
        } else { 
            window.currentFcIndex++; window.renderFlashcardContent(); 
        }
    } 
};

window.prevFlashcard = function() { 
    if(window.currentFcIndex > 0) { 
        const cardEl = document.getElementById('flashcardElement');
        if(cardEl.classList.contains('flipped')) { 
            cardEl.classList.remove('flipped'); 
            setTimeout(() => { window.currentFcIndex--; window.renderFlashcardContent(); }, 300); 
        } else { 
            window.currentFcIndex--; window.renderFlashcardContent(); 
        }
    } 
};

// 타이핑 테스트 로직
window.currentTestType = '';
window.currentTestQuestions = [];
window.currentTestIndex = 0;
window.correctTypingCount = 0;
window.userAnswersHistory = [];
window.testPools = { numbers: [], dates: [], times: [] };

window.initTestPools = function() {
    function numToKo(num) {
        if (num === 0) return '영';
        const units = ['','일','이','삼','사','오','육','칠','팔','구'];
        const positions = ['','십','백','천'];
        let res = '';
        let man = Math.floor(num / 10000);
        let rest = num % 10000;
        
        function parse(n) {
            let str = '';
            let s = n.toString();
            for(let i=0; i<s.length; i++) {
                let digit = parseInt(s[i]);
                let p = s.length - i - 1;
                if(digit > 0) {
                    if(digit !== 1 || p === 0) str += units[digit];
                    str += positions[p];
                }
            }
            return str;
        }
        
        if (man > 0) {
            if (man === 1) res += '만';
            else res += parse(man) + '만';
        }
        if (rest > 0) res += parse(rest);
        return res;
    }

    let nums = [];
    while(nums.length < 50) {
        let n = (nums.length < 20) ? [1,2,3,4,5,6,7,8,9,10,11,12,20,30,40,50,100,1000,5000,10000][nums.length] : Math.floor(Math.random() * 99999) + 1;
        if(!nums.some(x => x.ja === n.toString())) {
            nums.push({ ja: n.toString(), ko: numToKo(n), exp_ko: `숫자 ${n}은(는) 한국어로 '${numToKo(n)}'입니다.`, exp_ja: `数字 ${n} は韓国語で「${numToKo(n)}」と言います。` });
        }
    }
    window.testPools.numbers = nums;

    let dates = [];
    while(dates.length < 50) {
        let m = Math.floor(Math.random() * 12) + 1;
        let d = Math.floor(Math.random() * 31) + 1;
        if (m===2 && d>28) continue;
        if ((m===4||m===6||m===9||m===11) && d>30) continue;
        let mStr = numToKo(m) + '월'; if(m===6) mStr = '유월'; if(m===10) mStr = '시월';
        let dStr = numToKo(d) + '일';
        let id = `${m}月${d}日`;
        if(!dates.some(x => x.ja === id)) {
            dates.push({ ja: id, ko: `${mStr} ${dStr}`, exp_ko: `한국어로 ${m}월은 '${mStr}', ${d}일은 '${dStr}'로 읽습니다.`, exp_ja: `韓国語で ${m}月 は「${mStr}」、${d}日 は「${dStr}」と読みます。` });
        }
    }
    window.testPools.dates = dates;

    let times = [];
    const hours = ['','한','두','세','네','다섯','여섯','일곱','여덟','아홉','열','열한','열두'];
    while(times.length < 50) {
        let h = Math.floor(Math.random() * 12) + 1;
        let m = Math.floor(Math.random() * 60);
        let hStr = hours[h] + '시';
        let mStr = m === 0 ? '정각' : numToKo(m) + '분';
        let id = m === 0 ? `${h}時` : `${h}時${m}分`;
        if(!times.some(x => x.ja === id)) {
            times.push({ ja: id, ko: `${hStr} ${mStr}`, exp_ko: `시간은 고유어 '${hours[h]}시', 분은 한자어 '${m === 0 ? '정각' : numToKo(m) + '분'}'으로 읽습니다.`, exp_ja: `時間は固有語「${hours[h]}시」、分は漢字語「${m === 0 ? '정각' : numToKo(m) + '분'}」で読みます。` });
        }
    }
    window.testPools.times = times;
}

window.startTypingTest = function(type) {
    window.currentTestType = type;
    window.nav('typingTest'); 
    
    let titleText = "";
    if(type === 'numbers') titleText = "🔢 韓国語数字テスト";
    else if(type === 'dates') titleText = "📅 韓国語日付テスト";
    else if(type === 'times') titleText = "⏰ 韓国語時間テスト";
    document.getElementById('typing-test-main-title').innerText = titleText;
    
    if (window.testPools.numbers.length === 0) {
        window.initTestPools();
    }

    window.currentTestQuestions = [...window.testPools[type]].sort(() => 0.5 - Math.random()).slice(0, 5);
    window.currentTestIndex = 0;
    window.correctTypingCount = 0;
    window.userAnswersHistory = [];
    
    document.getElementById('typing-test-content').style.display = 'block';
    document.getElementById('typing-result-screen').style.display = 'none';

    window.renderTypingQuestion();
};

window.renderTypingQuestion = function() {
    document.getElementById('typing-progress').innerText = `問題 ${window.currentTestIndex + 1} / 5`;
    document.getElementById('typing-question-text').innerText = window.currentTestQuestions[window.currentTestIndex].ja;
    
    const inputEl = document.getElementById('typing-answer-input');
    inputEl.value = '';
    inputEl.disabled = false;
    
    document.getElementById('typing-explanation-box').style.display = 'none';
    document.getElementById('btn-next-typing').style.display = 'none';
    document.getElementById('btn-check-typing').style.display = 'block';
    
    setTimeout(() => inputEl.focus(), 100);
}

window.getDiffHTML = function(inputStr, correctStr) {
    let html = '';
    const maxLen = Math.max(inputStr.length, correctStr.length);
    for(let i=0; i<maxLen; i++) {
        const charIn = inputStr[i] || '';
        const charCor = correctStr[i] || '';
        if(charIn === charCor) {
            html += `<span class="diff-correct">${window.escapeHTML(charIn)}</span>`;
        } else if (charIn && charCor) {
            html += `<span class="diff-wrong">${window.escapeHTML(charIn)}</span>`;
        } else if (charIn) {
            html += `<span class="diff-wrong">${window.escapeHTML(charIn)}</span>`;
        } else {
            html += `<span class="diff-missed">${window.escapeHTML(charCor)}</span>`;
        }
    }
    return `<div class="diff-text">${html}</div>`;
}

window.checkTypingAnswer = function() {
    const rawInput = document.getElementById('typing-answer-input').value;
    if(!rawInput.trim()) return;

    let inputForCheck = rawInput.trim().replace(/\s+/g, ' ');
    let correctForCheck = window.currentTestQuestions[window.currentTestIndex].ko.trim().replace(/\s+/g, ' ');

    const isCorrect = (inputForCheck === correctForCheck);
    const explanation = window.currentTestQuestions[window.currentTestIndex].exp_ja;
    const displayCorrect = window.currentTestQuestions[window.currentTestIndex].ko;
    const diffHtmlOutput = window.getDiffHTML(inputForCheck, correctForCheck);

    window.userAnswersHistory.push({
        question: window.currentTestQuestions[window.currentTestIndex].ja,
        userAnswer: rawInput.trim(),
        correctAnswer: displayCorrect,
        isCorrect: isCorrect,
        exp: explanation,
        diffOutput: diffHtmlOutput
    });

    if(isCorrect) {
        window.correctTypingCount++;
        document.getElementById('typing-explanation-box').innerHTML = `✅ <b>正解です！</b><br><br>${window.escapeHTML(explanation)}`;
        document.getElementById('typing-explanation-box').style.background = 'var(--success-bg)'; 
        document.getElementById('typing-explanation-box').style.color = 'var(--success-text)';
    } else {
        document.getElementById('typing-explanation-box').innerHTML = `❌ <b>不正解です。</b><br>比較:<br>${diffHtmlOutput}<br><br>${window.escapeHTML(explanation)}`;
        document.getElementById('typing-explanation-box').style.background = 'var(--danger-bg)'; 
        document.getElementById('typing-explanation-box').style.color = 'var(--danger-text)';
    }

    document.getElementById('typing-explanation-box').style.display = 'block';
    document.getElementById('typing-answer-input').disabled = true;
    document.getElementById('btn-check-typing').style.display = 'none';
    document.getElementById('btn-next-typing').style.display = 'inline-block';
};

window.nextTypingQuestion = function() {
    if(window.currentTestIndex < 4) {
        window.currentTestIndex++;
        window.renderTypingQuestion();
    } else {
        document.getElementById('typing-test-content').style.display = 'none';
        document.getElementById('typing-result-screen').style.display = 'block';
        document.getElementById('typing-score').innerText = `${window.correctTypingCount} / 5`;
        window.renderTestResultsHistory();

        if(window.currentUser) {
            if (!window.currentUser.testCounts) window.currentUser.testCounts = { numbers: 0, dates: 0, times: 0 };
            if (typeof window.currentUser.testCounts[window.currentTestType] !== 'number') window.currentUser.testCounts[window.currentTestType] = 0;
            window.currentUser.testCounts[window.currentTestType]++;

            if (!window.currentUser.history) window.currentUser.history = {};
            const today = window.getTodayStr();
            if(!window.currentUser.history[today]) window.currentUser.history[today] = [];

            const testDetails = window.userAnswersHistory.map(h => ({ q: h.question, isCorrect: h.isCorrect }));
            window.currentUser.history[today].push({
                type: window.currentTestType, score: window.correctTypingCount, total: 5, details: testDetails
            });

            if(window.saveUserData) window.saveUserData();
            if (typeof window.renderHomeStats === 'function') window.renderHomeStats();
        }
    }
};

window.renderTestResultsHistory = function() {
    const listEl = document.getElementById('typing-result-list');
    listEl.innerHTML = '';
    window.userAnswersHistory.forEach((item, index) => {
        const isCorrectStr = item.isCorrect ? '✅ O' : '❌ X';
        const statusClass = item.isCorrect ? 'correct' : 'incorrect';
        let answerDisplay = item.isCorrect 
            ? `<span style="text-decoration: none;">${window.escapeHTML(item.userAnswer)}</span>` 
            : `${item.diffOutput}`;
            
        const div = document.createElement('div');
        div.className = `result-item ${statusClass}`;
        div.innerHTML = `
            <div style="flex:1;">
                <strong style="font-size: 1.1rem; display: block; margin-bottom: 8px; color: var(--text-main);">Q${index + 1}. ${window.escapeHTML(item.question)}</strong>
                <span style="color: var(--text-main); font-size: 1.05rem; line-height: 1.5;">
                    入力結果: ${answerDisplay} <br><br> 正解: <b>${window.escapeHTML(item.correctAnswer)}</b>
                </span>
                <div style="font-size: 0.95rem; color: var(--text-muted); margin-top: 10px; background: rgba(0,0,0,0.05); padding: 12px; border-radius: 6px;">${window.escapeHTML(item.exp)}</div>
            </div>
            <div style="font-weight: bold; font-size: 1.6rem; padding-left: 16px;">${isCorrectStr}</div>
        `;
        listEl.appendChild(div);
    });
}

// AI 기능 및 채팅
window.speakTextByActor = function(text, actor, isKorean = false) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    
    const speedInput = document.getElementById('ttsSpeed');
    msg.rate = speedInput ? parseFloat(speedInput.value) : 0.85;

    const targetLang = isKorean ? 'ko-KR' : 'en-US';
    msg.lang = targetLang;
    msg.pitch = actor === 'A' ? 1.1 : 0.9;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
        const langVoices = voices.filter(v => v.lang.startsWith(targetLang.split('-')[0]));
        if (langVoices.length > 0) {
            const premiumVoice = langVoices.find(v => 
                v.name.includes('Premium') || v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Natural')
            );
            msg.voice = premiumVoice ? premiumVoice : langVoices[0];
        }
    }
    window.speechSynthesis.speak(msg);
};

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = function() {
        window.speechSynthesis.getVoices(); 
    };
}

window.toggleAIChat = function() {
    const chatWindow = document.getElementById('ai-chat-window');
    chatWindow.classList.toggle('active');
    if(chatWindow.classList.contains('active')) {
        document.getElementById('ai-chat-input').focus();
    }
};

window.sendAIChat = function() {
    const input = document.getElementById('ai-chat-input');
    const text = input.value.trim();
    if(!text) return;
    
    const chatBody = document.getElementById('ai-chat-body');
    const userDiv = document.createElement('div');
    userDiv.className = 'chat-message user';
    userDiv.innerText = text;
    chatBody.appendChild(userDiv);
    input.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;
    
    const loadingId = 'loading-bot-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message ai';
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = '<div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>';
    chatBody.appendChild(loadingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;

    const uiLangName = 'Japanese';
    const sysPrompt = `You are 'Edupeng', a helpful language tutor bot. The user asks questions or provides text. If they provide text in English or Korean, correct their grammar and explain the meaning. If they ask a question, answer it concisely. ALWAYS reply in ${uiLangName} language. Start your response with a friendly greeting like "ペン！".`;
    
    const payloadHistory = [
        { role: "user", parts: [{ text: `System Instruction: ${sysPrompt}\n\nUser input: ${text}` }] }
    ];

    window.callGeminiAPI(payloadHistory, (respText) => {
        const lEl = document.getElementById(loadingId);
        if(lEl) lEl.remove();
        
        const aiDiv = document.createElement('div');
        aiDiv.className = 'chat-message ai';
        aiDiv.innerHTML = window.escapeHTML(respText).replace(/\n/g, '<br>');
        chatBody.appendChild(aiDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    });
};

window.aiConvHistory = [];
window.aiConvTargetLang = 'en';

window.toggleAiCustomSit = function() {
    const val = document.getElementById('ai-situation').value;
    document.getElementById('ai-sit-custom-group').style.display = val === 'custom' ? 'block' : 'none';
};

window.setAiLoadingState = function(isLoading) {
    document.getElementById('ai-conv-chat-input').disabled = isLoading;
    document.getElementById('btn-ai-conv-send').disabled = isLoading;
    document.getElementById('btn-ai-conv-end').disabled = isLoading;
    document.getElementById('btn-ai-conv-mic').disabled = isLoading;
};

window.startAIConv = function() {
    if(window.checkAuth && !window.checkAuth()) return;
    window.aiConvTargetLang = document.getElementById('ai-target-lang').value;
    
    let sitVal = document.getElementById('ai-situation').value;
    let situation = "";
    if(sitVal === 'custom') {
        situation = document.getElementById('ai-custom-sit-input').value.trim() || "Free talking";
    } else {
        situation = document.getElementById('ai-situation').options[document.getElementById('ai-situation').selectedIndex].text;
    }

    const targetLangName = window.aiConvTargetLang === 'en' ? 'English' : 'Korean';
    const uiLangName = 'Japanese';

    const systemPrompt = `You are 'Edupeng', a friendly language tutor character. 
The user wants to practice speaking ${targetLangName} in the following situation: "${situation}".
RULES:
1. YOU MUST START AND LEAD the conversation naturally acting as a relevant character in the given situation. Ask the first question.
2. Speak ONLY in ${targetLangName} for the main dialogue.
3. Keep your responses conversational and relatively short (1-2 sentences).
4. If the user makes grammatical or vocabulary mistakes in ${targetLangName}, provide a gentle correction in ${uiLangName} using a line starting with "[Correction]: " (or "[교정]:"). 
5. Otherwise, just continue the roleplay naturally.`;

    window.aiConvHistory = [{ role: "user", parts: [{ text: "System Instruction: " + systemPrompt + "\nPlease start the roleplay now." }] }];

    document.getElementById('ai-conv-setup').style.display = 'none';
    document.getElementById('ai-conv-chat-area').style.display = 'flex';
    document.getElementById('ai-conv-score-area').style.display = 'none';
    document.getElementById('ai-conv-msg-list').innerHTML = '';
    document.getElementById('ai-conv-header-ui').classList.add('chat-active');
    
    const loadingId = 'loading-start-' + Date.now();
    window.appendAiConvBubble('ai', '<div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>', loadingId);
    window.setAiLoadingState(true);

    window.callGeminiAPI(window.aiConvHistory, (respText) => {
        window.setAiLoadingState(false);
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        
        window.aiConvHistory.push({ role: "model", parts: [{ text: respText }] });
        window.appendAiConvBubble('ai', respText);
        
        if(respText && !respText.includes("오류") && !respText.includes("エラー")) {
            window.speakTextByActor(respText.split(/\[Correction\]|\[교정\]/i)[0], 'A', window.aiConvTargetLang === 'ko');
        }
        setTimeout(() => document.getElementById('ai-conv-chat-input').focus(), 100);
    });
};

window.sendAIConvMessage = function() {
    const input = document.getElementById('ai-conv-chat-input');
    const text = input.value.trim();
    if(!text) return;
    
    window.appendAiConvBubble('user', text);
    input.value = '';
    
    window.aiConvHistory.push({ role: "user", parts: [{ text: text }] });
    
    const loadingId = 'loading-' + Date.now();
    window.appendAiConvBubble('ai', '<div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>', loadingId);
    window.setAiLoadingState(true);

    window.callGeminiAPI(window.aiConvHistory, (respText) => {
        window.setAiLoadingState(false);
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        
        window.aiConvHistory.push({ role: "model", parts: [{ text: respText }] });
        window.appendAiConvBubble('ai', respText);
        
        if(respText && !respText.includes("오류") && !respText.includes("エラー")) {
            window.speakTextByActor(respText.split(/\[Correction\]|\[교정\]/i)[0], 'A', window.aiConvTargetLang === 'ko');
        }
        setTimeout(() => document.getElementById('ai-conv-chat-input').focus(), 100);
    });
};

window.appendAiConvBubble = function(sender, text, id = null) {
    const list = document.getElementById('ai-conv-msg-list');
    const div = document.createElement('div');
    div.className = 'chat-message ' + sender;
    if(id) div.id = id;
    
    let safeText = window.escapeHTML(text);
    let formattedText = safeText.replace(/(\[Correction.*?\]:)/gi, '<strong style="color: #ea580c; display:block; margin-top:8px; font-size: 0.85rem;">$1</strong>');
    formattedText = formattedText.replace(/(\[교정.*?\]:)/gi, '<strong style="color: #ea580c; display:block; margin-top:8px; font-size: 0.85rem;">$1</strong>');
    
    if (text.includes("typing-indicator")) formattedText = text;
    
    div.innerHTML = formattedText;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
}

window.aiConvRecognition = null;
window.isAiConvRecording = false;
window.toggleAIConvVoice = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition) return window.customAlert("ブラウザが音声認識をサポートしていません。");
    const btn = document.getElementById('btn-ai-conv-mic');
    if(window.isAiConvRecording) { window.aiConvRecognition.stop(); return; }
    window.aiConvRecognition = new SpeechRecognition();
    window.aiConvRecognition.lang = window.aiConvTargetLang === 'ko' ? 'ko-KR' : 'en-US';
    window.aiConvRecognition.interimResults = false;
    
    window.aiConvRecognition.onstart = () => { window.isAiConvRecording = true; btn.style.background = 'var(--danger-bg)'; btn.style.color = 'var(--danger-text)'; };
    window.aiConvRecognition.onresult = (e) => { 
        const text = e.results[0][0].transcript; 
        const input = document.getElementById('ai-conv-chat-input'); 
        input.value = input.value ? input.value + ' ' + text : text; 
    };
    window.aiConvRecognition.onerror = () => { window.isAiConvRecording = false; btn.style.background = 'var(--bg-color)'; btn.style.color = 'var(--text-main)'; };
    window.aiConvRecognition.onend = () => { window.isAiConvRecording = false; btn.style.background = 'var(--bg-color)'; btn.style.color = 'var(--text-main)'; };
    window.aiConvRecognition.start();
};

window.endAIConvAndScore = function() {
    if(window.aiConvHistory.length < 3) {
        window.customAlert("もう少し会話を進めてから採点を受けてください！");
        return;
    }
    
    document.getElementById('ai-conv-chat-area').style.display = 'none';
    document.getElementById('ai-conv-score-area').style.display = 'flex';
    document.getElementById('ai-score-vocab').innerText = "-";
    document.getElementById('ai-score-exp').innerText = "-";
    document.getElementById('ai-score-feedback').innerHTML = `<div class="typing-indicator" style="font-size:1.5rem; color:var(--primary);"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div><br><br><span style="color:var(--text-muted);">エデュペンが考え中です...</span>`;

    const uiLangName = 'Japanese';
    const prompt = `The conversation has ended. Please evaluate the user's performance throughout the conversation.
Analyze all of the user's messages.
Provide the response EXACTLY in the following JSON format without any markdown wrapper:
{
    "vocabScore": <number 0-100>,
    "expressionScore": <number 0-100>,
    "feedback": "<overall detailed feedback string written in ${uiLangName}>"
}`;
    
    const tempHistory = [...window.aiConvHistory, { role: "user", parts: [{ text: prompt }] }];
    
    window.callGeminiJSON(tempHistory, (data) => {
        if(data && data.vocabScore !== undefined) {
            window.animateValue("ai-score-vocab", 0, data.vocabScore || 0, 1000);
            window.animateValue("ai-score-exp", 0, data.expressionScore || 0, 1000);
            document.getElementById('ai-score-feedback').innerText = data.feedback || "Feedback generated."; 
        } else {
            document.getElementById('ai-score-feedback').innerText = "評価結果を読み込めませんでした。";
        }
    });
};

window.resetAIConv = function() {
    document.getElementById('ai-conv-score-area').style.display = 'none';
    document.getElementById('ai-conv-header-ui').classList.remove('chat-active');
    document.getElementById('ai-conv-setup').style.display = 'block';
    document.getElementById('ai-conv-chat-input').value = '';
};

window.callGeminiJSON = async function(history, callback) {
    let apiUrl = '/api/chat';
    if (window.GEMINI_API_KEY && window.GEMINI_API_KEY.trim() !== '') {
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${window.GEMINI_API_KEY}`;
    }

    const payload = { 
        contents: history,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "vocabScore": { type: "INTEGER" },
                    "expressionScore": { type: "INTEGER" },
                    "feedback": { type: "STRING" }
                }
            }
        }
    };

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
        
        if (!response.ok) throw new Error("API Response Error");
        const result = await response.json();
        if(result.candidates && result.candidates[0].content) {
            const jsonStr = result.candidates[0].content.parts[0].text;
            callback(JSON.parse(jsonStr));
        } else {
            throw new Error("No Content in Response");
        }
    } catch (e) {
        console.error(e);
        clearTimeout(timeoutId);
        callback(null);
    }
}

window.timerRegistry = {};
window.animateValue = function(id, start, end, duration) {
    if (window.timerRegistry[id]) clearInterval(window.timerRegistry[id]);
    if (start === end) { document.getElementById(id).innerHTML = end; return; }
    let range = end - start;
    let current = start;
    let increment = end > start ? 1 : -1;
    let stepTime = Math.abs(Math.floor(duration / range));
    let obj = document.getElementById(id);
    
    window.timerRegistry[id] = setInterval(function() {
        current += increment;
        obj.innerHTML = current;
        if (current == end) {
            clearInterval(window.timerRegistry[id]);
            delete window.timerRegistry[id];
        }
    }, stepTime);
}

document.addEventListener('keydown', function(e) {
    if (window.activeTab === 'typingTest' && e.key === 'Enter') {
        e.preventDefault();
        const checkBtn = document.getElementById('btn-check-typing');
        const nextBtn = document.getElementById('btn-next-typing');
        
        if (checkBtn && checkBtn.style.display !== 'none') {
            window.checkTypingAnswer();
        } else if (nextBtn && nextBtn.style.display !== 'none') {
            window.nextTypingQuestion();
        }
    }
});

// 시작 함수
window.initApp = function() {
    if(window.isDarkMode) { document.body.classList.add('dark-mode'); document.getElementById('btnDarkMode').innerText = '☀️'; }
    window.renderCourses(); 
    if(window.updateOverallProgress) window.updateOverallProgress(); 
    if(window.renderHomeStats) window.renderHomeStats();
    if(window.renderTopikCategories) window.renderTopikCategories();
};

document.addEventListener('DOMContentLoaded', window.initApp);
