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
    authStatus.textContent = 'Authenticating...';
    
    const inputUsername = loginForm.loginUsername.value.trim().toLowerCase();
    const inputPassword = loginForm.loginPassword.value;

    try {
        if (inputUsername === 'admin') {
            await auth.signInWithEmailAndPassword('admin@icikiwir.digital', inputPassword);
            return;
        }

        const team = await getTeamDataByUsername(inputUsername);
        if (!team) throw new Error("Username not found");
        if (team.data.isBanned) throw new Error("Team is BANNED");
        
        await auth.signInWithEmailAndPassword(team.data.email, inputPassword);
    } catch (err) {
        authStatus.textContent = err.message;
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authStatus.textContent = 'Registering...';
    const username = registerForm.regUsername.value.trim().toLowerCase();
    const email = registerForm.regEmail.value.trim();
    
    if (!email.endsWith('@icikiwir.digital')) {
        authStatus.textContent = 'Email must end with @icikiwir.digital';
        return;
    }
    
    try {
        const check = await getTeamDataByUsername(username);
        if(check) throw new Error("Username taken");
        
        const cred = await auth.createUserWithEmailAndPassword(email, registerForm.regPassword.value);
        
        await database.ref(`teams/${username}`).set({
            uid: cred.user.uid,
            username: username,
            teamName: registerForm.regTeamName.value,
            email: email,
            isApproved: false,
            isBanned: false,
            stats: { ch1: 0, ch2: 0, ch3: 0, paidCh1: 0, paidCh2: 0, paidCh3: 0 },
            players: []
        });
        
        alert("Registration Successful. Please Login.");
        window.location.reload();
    } catch (err) {
        authStatus.textContent = err.message;
    }
});
