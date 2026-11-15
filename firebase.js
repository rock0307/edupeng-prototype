// firebase.js
// 주의: 실제 운영 시 여기에 Firebase 설정값과 import를 추가하세요.
/*
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-app.js";
import { getFirestore, collection, query, limit, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js";

const firebaseConfig = { ... };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
*/

// 임시 DB 객체 (실제 연동 시 위 import 문을 사용하세요)
const db = {}; 

window.checkAuth = function() {
    if(!window.currentUser) { 
        window.customAlert("🔑 ログインが必要な機能です。"); 
        window.openAuthModal('login'); 
        return false; 
    }
    return true;
};

// 유저 데이터 저장 (Firestore 연동 시 여기에 저장 로직 추가)
window.saveUserData = async function() {
    // 예: await setDoc(doc(db, "users", window.currentUser.uid), window.currentUser);
    console.log("UserData saved locally:", window.currentUser);
};

// 로그인 / 회원가입 폼 제출
window.handleAuthSubmit = async function(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail').value;
    const pw = document.getElementById('authPassword').value;
    
    // 임시 로그인 처리 (실제 연동 시 signInWithEmailAndPassword 등 사용)
    window.currentUser = { uid: "test_user", email: email, name: document.getElementById('authName').value || "edupeng", history: {}, testCounts: { numbers: 0, dates: 0, times: 0 } };
    window.closeAuthModal();
    document.getElementById('loggedOutUI').style.display = 'none';
    document.getElementById('loggedInUI').style.display = 'flex';
    document.getElementById('userName').innerText = window.currentUser.name;
    document.getElementById('userIdDisplay').innerText = email;
    window.renderHomeStats();
};

window.handleLogout = async function() {
    // 실제 연동 시: await signOut(auth);
    window.currentUser = null;
    document.getElementById('loggedInUI').style.display = 'none';
    document.getElementById('loggedOutUI').style.display = 'flex';
    window.nav('dashboard');
    window.renderHomeStats();
};

// 관리자 패널 유저 목록 불러오기 (Firestore 연동)
window.renderAdminPanel = async function() {
    const tbody = document.getElementById('adminUsersTable');
    if(!tbody) return;
    
    let html = `<tr><th>ID</th><th>名前</th><th>学習ユニット</th><th>テスト(数字/日付/時間)</th><th style="width: 160px;">管理</th></tr>`;
    tbody.innerHTML = html + `<tr><td colspan="5" style="text-align:center; padding: 20px;">データを読み込み中...</td></tr>`;

    try {
        // 실제 연동 시 아래 주석 해제
        // const q = query(collection(db, "users"), limit(50));
        // const querySnapshot = await getDocs(q);
        
        window.usersDbCache = {}; 
        
        /* querySnapshot.forEach((docSnap) => {
            const u = docSnap.data();
            window.usersDbCache[u.uid] = u;
            const unitsCount = (u.completedUnits || []).length;
            const tc = u.testCounts || {numbers:0, dates:0, times:0};
            
            // ... 기존 renderAdminPanel의 테이블 HTML 생성 로직 ...
        }); */
        
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
            // 실제 연동 시: await deleteDoc(doc(db, "users", uid));
            window.customAlert("✅ ユーザーの学習データが初期化されました。");
            window.renderAdminPanel();
        } catch(e) {
            window.customAlert("❌ 削除失敗: 権限がありません。");
        }
    }
};