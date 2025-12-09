const dashboardSection = document.getElementById('dashboard-section');
const bracketSection = document.getElementById('bracket-section');

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html'; 
        return;
    }
    
    if (user.uid === ADMIN_UID) {
        window.location.href = 'admin.html';
        return;
    }

    document.getElementById('main-nav').innerHTML = `
        <button class="nav-btn active" onclick="showSection('dashboard', this)">🏠 Dashboard</button>
        <button class="nav-btn" onclick="showSection('bracket', this)">🏆 Bagan</button>
        <button class="nav-btn logout" onclick="auth.signOut().then(() => window.location.href='login.html')">🚪 Keluar</button>
    `;
    renderTeamDashboard(user.uid);
});

function showSection(sectionId, btnElement) {
    dashboardSection.classList.add('hidden');
    bracketSection.classList.add('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    if (sectionId === 'dashboard') {
        dashboardSection.classList.remove('hidden');
        document.querySelector('.dashboard-grid').classList.remove('hidden');
    } else if (sectionId === 'bracket') {
        bracketSection.classList.remove('hidden');
    }
}

async function renderTeamDashboard(uid) {
    const teamResult = await getTeamDataByUID(uid);
    if (!teamResult) {
         dashboardSection.innerHTML = '<div class="card"><h2>Error</h2><p>Data tim tidak ditemukan.</p></div>';
         return;
    }
    
    const teamKey = teamResult.key;
    const teamData = teamResult.data;
    
    let statusColor = teamData.isBanned ? 'red' : (teamData.isApproved ? '#4CAF50' : '#FF9800');
    let statusText = teamData.isBanned ? 'DIBANNED' : (teamData.isApproved ? 'DISETUJUI' : 'MENUNGGU');
    
    let playersHTML = '';
    const players = teamData.players || [];
    players.forEach((p, index) => {
        playersHTML += `
            <div class="player-item">
                <div class="player-info">
                    <span>${p.name}</span>
                    <small>ID: ${p.id}</small>
                </div>
                ${!teamData.isApproved ? `<button class="btn-remove" onclick="removePlayer('${teamKey}', ${index})">❌</button>` : ''}
            </div>
        `;
    });
    
    const isRosterLocked = teamData.isApproved || teamData.isBanned;
    const isFull = players.length >= 8;
    const rosterCompleted = players.length >= 5;

    dashboardSection.innerHTML = `
        <div class="card">
            <h2>👋 Halo, ${teamData.teamName}!</h2>
            <div style="background: ${statusColor}20; color: ${statusColor}; padding: 10px; border-radius: 10px; display: inline-block; font-weight: bold; border: 2px solid ${statusColor};">
                Status: ${statusText}
            </div>
            <p style="margin-top: 15px; color: var(--text-muted);">Kelola anggota tim dan pendaftaran turnamen Anda di sini.</p>
        </div>

        <div class="card">
            <h3>🛡️ Roster (${players.length}/8)</h3>
            <div id="player-container" style="max-height: 200px; overflow-y: auto;">
                ${players.length === 0 ? '<p style="text-align:center; color:gray;">Belum ada player</p>' : playersHTML}
            </div>
            
            ${!isRosterLocked && !isFull ? `
                <form id="add-player-form" class="form-container" style="margin-top:15px; border-top: 2px dashed #eee; padding-top:15px;">
                    <input type="text" id="playerName" placeholder="Nickname" required style="margin-bottom: 5px;">
                    <input type="text" id="playerId" placeholder="ID Game" required>
                    <button type="submit" class="btn-action">➕ Tambah Player</button>
                </form>
            ` : ''}
            
            ${isRosterLocked ? '<p style="color:var(--success); text-align:center; margin-top:10px;">🔒 Roster Terkunci</p>' : ''}
            ${!rosterCompleted && !isRosterLocked ? '<p style="color:var(--danger); font-size:0.8rem; text-align:center;">*Min 5 Player</p>' : ''}
        </div>

        <div class="card full-width">
            <h3>🏆 Turnamen Hub</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                <div id="available-tournaments">Loading...</div>
                <div id="registered-tournaments">Loading...</div>
            </div>
        </div>
    `;
    
    if (!isRosterLocked) {
        document.getElementById('add-player-form')?.addEventListener('submit', (e) => addPlayer(e, teamKey, players));
    }
    
    loadTournamentsForTeam(teamKey, rosterCompleted, isRosterLocked);
}

function addPlayer(e, teamUsername, currentPlayers) {
    e.preventDefault();
    const name = document.getElementById('playerName').value;
    const id = document.getElementById('playerId').value;
    
    const newPlayers = [...currentPlayers, { name, id }];
    database.ref(`teams/${teamUsername}/players`).set(newPlayers)
        .then(() => renderTeamDashboard(auth.currentUser.uid)) 
        .catch(error => alert(error.message));
}

function removePlayer(teamUsername, index) {
    if (!confirm("Hapus player ini?")) return;
    database.ref(`teams/${teamUsername}/players`).once('value')
        .then(snapshot => {
            let players = snapshot.val() || [];
            players.splice(index, 1);
            return database.ref(`teams/${teamUsername}/players`).set(players);
        })
        .then(() => renderTeamDashboard(auth.currentUser.uid));
}

async function loadTournamentsForTeam(teamUsername, rosterCompleted, isRosterLocked) {
    const tournamentDiv = document.getElementById('available-tournaments');
    const registeredDiv = document.getElementById('registered-tournaments');
    const snapshot = await database.ref('tournaments').once('value');
    const tournaments = snapshot.val();
    
    if (!tournaments) {
        tournamentDiv.innerHTML = '<p>Tidak ada turnamen aktif.</p>';
        registeredDiv.innerHTML = '';
        return;
    }

    let availableHTML = '<h4>Pendaftaran Buka</h4>';
    let registeredHTML = '<h4>Turnamen Saya</h4>';

    Object.entries(tournaments).forEach(([id, tournament]) => {
        const isRegistered = tournament.participants && tournament.participants[teamUsername];
        
        if (isRegistered) {
            registeredHTML += `
                <div class="tournament-card" style="border-color: var(--success);">
                    <h4>${tournament.name}</h4>
                    <p>Mulai: ${new Date(tournament.startDate).toLocaleDateString()}</p>
                    ${tournament.status === 'ongoing' ? `<button class="btn-action" onclick="showBracketView('${id}')" style="background:var(--secondary)">👁️ Lihat Bracket</button>` : '<small>Menunggu Bracket...</small>'}
                </div>
            `;
        } else if (tournament.status === 'registration') {
            let btnState = isRosterLocked ? '' : (rosterCompleted ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"');
            let btnText = isRosterLocked ? 'Daftar' : (rosterCompleted ? 'Daftar & Kunci' : 'Lengkapi Roster');
            
            availableHTML += `
                <div class="tournament-card">
                    <h4>${tournament.name}</h4>
                    <p>Slot: ${Object.keys(tournament.participants || {}).length}/${tournament.maxTeams}</p>
                    <button class="btn-action" onclick="registerForTournament('${id}', '${teamUsername}')" ${btnState}>${btnText}</button>
                </div>
            `;
        }
    });

    tournamentDiv.innerHTML = availableHTML;
    registeredDiv.innerHTML = registeredHTML;
}

function registerForTournament(tid, teamName) {
    if(!confirm("Daftar turnamen? Roster akan dikunci.")) return;
    const updates = {};
    updates[`tournaments/${tid}/participants/${teamName}`] = { teamName, registeredAt: firebase.database.ServerValue.TIMESTAMP };
    updates[`teams/${teamName}/isApproved`] = true;
    database.ref().update(updates).then(() => renderTeamDashboard(auth.currentUser.uid));
}

async function showBracketView(tournamentId) {
    const bracketView = document.getElementById('tournament-bracket-view');
    const snapshot = await database.ref(`tournaments/${tournamentId}`).once('value');
    const tournament = snapshot.val();
    
    if (!tournament || !tournament.bracket) {
        bracketView.innerHTML = `<p>Bracket belum tersedia.</p>`;
        showSection('bracket');
        return;
    }
    
    showSection('bracket');
    
    const roundKeys = Object.keys(tournament.bracket).sort((a,b) => b.localeCompare(a)).reverse(); 
    
    let html = `<h3 style="text-align:center; margin-bottom:20px;">${tournament.name}</h3><div class="bracket-flex">`;
    
    roundKeys.forEach(roundName => {
        html += `<div class="round-column"><div class="round-title">${roundName.replace('round', 'Round ').toUpperCase()}</div>`;
        tournament.bracket[roundName].forEach(m => {
            const winnerA = m.winner === m.teamA;
            const winnerB = m.winner === m.teamB;
            html += `
                <div class="match-card">
                    <div class="match-team ${winnerA ? 'winner' : (m.winner ? 'loser' : '')}">
                        <span>${m.teamA || 'TBD'}</span> <span>${m.scoreA || 0}</span>
                    </div>
                    <div class="match-team ${winnerB ? 'winner' : (m.winner ? 'loser' : '')}">
                        <span>${m.teamB || 'TBD'}</span> <span>${m.scoreB || 0}</span>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });
    
    html += `</div>`;
    bracketView.innerHTML = html;
}