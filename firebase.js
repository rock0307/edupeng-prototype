const db = {}; 

window.checkAuth = function() {
    if(!window.currentUser) { 
        window.customAlert("🔑 ログインが必要な機能です。"); 
        window.openAuthModal('login'); 
        return false; 
    }
    return true;
};

window.saveUserData = async function() {
    console.log("UserData saved locally:", window.currentUser);
};

window.handleAuthSubmit = async function(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail').value;
    const pw = document.getElementById('authPassword').value;
    
    window.currentUser = { uid: "test_user", email: email, name: document.getElementById('authName').value || "edupeng", history: {}, testCounts: { numbers: 0, dates: 0, times: 0 } };
    window.closeAuthModal();
    document.getElementById('loggedOutUI').style.display = 'none';
    document.getElementById('loggedInUI').style.display = 'flex';
    document.getElementById('userName').innerText = window.currentUser.name;
    document.getElementById('userIdDisplay').innerText = email;
    if(window.renderHomeStats) window.renderHomeStats();
};

window.handleLogout = async function() {
    window.currentUser = null;
    document.getElementById('loggedInUI').style.display = 'none';
    document.getElementById('loggedOutUI').style.display = 'flex';
    if(window.nav) window.nav('dashboard');
    if(window.renderHomeStats) window.renderHomeStats();
};

window.renderAdminPanel = async function() {
    const tbody = document.getElementById('adminUsersTable');
    if(!tbody) return;
    
    let html = `<tr><th>ID</th><th>名前</th><th>学習ユニット</th><th>テスト(数字/日付/時間)</th><th style="width: 160px;">管理</th></tr>`;
    tbody.innerHTML = html + `<tr><td colspan="5" style="text-align:center; padding: 20px;">データを読み込み中...</td></tr>`;

    try {
        window.usersDbCache = {}; 
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color:var(--text-muted);">Firebase 연동이 필요합니다.</td></tr>`;
    } catch(e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding: 20px;">権限がないか、データを読み込めませんでした。</td></tr>`;
    }
};

window.deleteUser = async function(uid) {
    const u = window.usersDbCache[uid];
    if(!u) return;
    
    if(u.role === 'admin') return window.customAlert("管理者アカウントは削除できません。");
    
    if(confirm(`[${u.email}] ユーザーの全学習データを削除(初期化)しますか？`)) {
        try {
            window.customAlert("✅ ユーザーの学習データが初期化されました。");
            window.renderAdminPanel();
        } catch(e) {
            window.customAlert("❌ 削除失敗: 権限がありません。");
        }
    }
};
