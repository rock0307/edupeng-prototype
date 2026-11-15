// ==========================================
// 📁 auth_db.js (GitHub 저장용 인증 & DB 모듈)
// ==========================================

// 1. Firebase 설정 및 초기화 (본인의 Firebase 정보로 변경하세요)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, limit, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7v4V_jMb3x996QdHW7EL2DcZsB8FoiZw",
  authDomain: "my-language-site.firebaseapp.com",
  databaseURL: "https://my-language-site-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-language-site",
  storageBucket: "my-language-site.firebasestorage.app",
  messagingSenderId: "550541389936",
  appId: "1:550541389936:web:8b0f38c9312d2b6b7bc4b5",
  measurementId: "G-X1RLXJ8H7R"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

// ==========================================
// 2. 로그인 및 회원가입 처리 (handleAuthSubmit)
// ==========================================
window.handleAuthSubmit = async function(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value.trim();
    const mode = window.authMode; // 'login' 또는 'signup'

    try {
        if (mode === 'signup') {
            // 회원가입
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // 새 유저 초기 데이터 Firestore에 세팅
            const newUserData = {
                uid: user.uid,
                email: email,
                name: name,
                role: email === 'leegieun2525@gmail.com' ? 'admin' : 'user',
                history: {},
                testCounts: { numbers: 0, dates: 0, times: 0 },
                completedUnits: [],
                dailyGoals: { numbers: 5, dates: 5, times: 5 },
                userDecks: {}
            };
            
            await setDoc(doc(db, "users", user.uid), newUserData);
            alert("회원가입이 완료되었습니다.");
            
        } else {
            // 로그인
            await signInWithEmailAndPassword(auth, email, password);
            // 로그인이 성공하면 onAuthStateChanged 가 자동으로 loadUserData를 호출합니다.
        }
        
        closeAuthModal(); // UI 모달 닫기 (기존 HTML에 정의된 함수)
    } catch (error) {
        console.error("Auth Error:", error);
        alert("인증 오류가 발생했습니다: " + error.message);
    }
};

// ==========================================
// 3. 로그아웃 처리 (handleLogout)
// ==========================================
window.handleLogout = async function() {
    try {
        await signOut(auth);
        
        // 로컬 상태 초기화
        window.currentUser = null;
        window.userDecks = {};
        window.completedUnits = new Set();
        
        // UI 변경 (로그아웃 상태)
        document.getElementById('loggedOutUI').style.display = 'flex';
        document.getElementById('loggedInUI').style.display = 'none';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');

        if(window.activeTab !== 'dashboard') {
            window.nav('dashboard');
        }
        window.initApp(); 
        alert("로그아웃 되었습니다.");
    } catch (error) {
        console.error("Logout Error:", error);
        alert("로그아웃 중 오류가 발생했습니다.");
    }
};

// ==========================================
// 4. 데이터 저장 로직 (saveUserData)
// ==========================================
window.saveUserData = async function() {
    if (!window.currentUser || !auth.currentUser) return;
    
    // 현재 메모리에 있는 학습 데이터를 유저 객체에 동기화
    window.currentUser.userDecks = window.userDecks;
    window.currentUser.completedUnits = Array.from(window.completedUnits);
    window.currentUser.lastLogin = Date.now();
    
    try {
        // Firestore에 업데이트된 데이터 병합(merge) 저장
        await setDoc(doc(db, "users", auth.currentUser.uid), window.currentUser, { merge: true });
        console.log("데이터가 성공적으로 저장되었습니다.");
    } catch (error) {
        console.error("Save Data Error:", error);
    }
};

// ==========================================
// 5. 인증 상태 감지 및 데이터 불러오기 (loadUserData)
// ==========================================
// 유저의 로그인 상태가 변경될 때마다 자동으로 실행됩니다.
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 로그인 됨: Firestore에서 유저 데이터 가져오기
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                window.currentUser = docSnap.data();
                window.userDecks = window.currentUser.userDecks || {};
                window.ensureDefaultDeck();
                window.completedUnits = new Set(window.currentUser.completedUnits || []);
                
                // 로그인 UI 업데이트
                document.getElementById('loggedOutUI').style.display = 'none';
                document.getElementById('loggedInUI').style.display = 'flex';
                document.getElementById('userName').innerText = window.currentUser.name || 'User';
                document.getElementById('userIdDisplay').innerText = window.currentUser.email;
                document.getElementById('userBadge').innerText = (window.currentUser.name || 'U').charAt(0).toUpperCase();

                // 관리자 메뉴 권한 처리
                if (window.currentUser.role === 'admin' || user.email === 'leegieun2525@gmail.com') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
} else {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
}

                window.initApp(); 
            }
        } catch(error) {
            console.error("데이터 불러오기 실패:", error);
        }
    } else {
        // 비로그인 상태 처리
        window.currentUser = null;
        window.userDecks = {};
        window.completedUnits = new Set();
        document.getElementById('loggedOutUI').style.display = 'flex';
        document.getElementById('loggedInUI').style.display = 'none';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        window.initApp();
    }
});
