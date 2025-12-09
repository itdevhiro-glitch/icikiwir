const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const authStatus = document.getElementById('auth-status-message');

auth.onAuthStateChanged((user) => {
    if (user) {
        if (user.uid === ADMIN_UID) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }
});

document.getElementById('to-register-btn').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authStatus.textContent = '';
});

document.getElementById('to-login-btn').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    authStatus.textContent = '';
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authStatus.textContent = 'Loading...';
    
    const inputUsername = loginForm.loginUsername.value.trim().toLowerCase();
    const inputPassword = loginForm.loginPassword.value;

    try {
        if (inputUsername === 'admin') {
            await auth.signInWithEmailAndPassword('admin@icikiwir.digital', inputPassword);
            return;
        }

        const team = await getTeamDataByUsername(inputUsername);
        if (!team) throw new Error("Username tidak ditemukan");
        if (team.data.isBanned) throw new Error("Akun dibanned");
        
        await auth.signInWithEmailAndPassword(team.data.email, inputPassword);
    } catch (err) {
        authStatus.textContent = err.message;
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authStatus.textContent = 'Mendaftar...';
    const username = registerForm.regUsername.value.trim().toLowerCase();
    const email = registerForm.regEmail.value.trim();
    
    if (!email.endsWith('@icikiwir.digital')) {
        authStatus.textContent = 'Wajib email @icikiwir.digital';
        return;
    }
    
    try {
        const check = await getTeamDataByUsername(username);
        if(check) throw new Error("Username sudah dipakai");
        
        const cred = await auth.createUserWithEmailAndPassword(email, registerForm.regPassword.value);
        
        await database.ref(`teams/${username}`).set({
            uid: cred.user.uid,
            username: username,
            teamName: registerForm.regTeamName.value,
            email: email,
            isApproved: false,
            isBanned: false,
            players: []
        });
        
        alert("Berhasil! Silakan Login.");
        window.location.reload();
    } catch (err) {
        authStatus.textContent = err.message;
    }
});