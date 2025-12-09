const dashboardSection = document.getElementById('dashboard-section');
const bracketSection = document.getElementById('bracket-section');
const leaderboardSection = document.getElementById('leaderboard-section');

let currentPaymentTourId = null;
let currentPaymentTeamName = null;

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
        <button class="nav-btn active" onclick="showSection('dashboard', this)">
            <i class="ri-dashboard-line"></i> <span>Dashboard</span>
        </button>
        <button class="nav-btn" onclick="showSection('leaderboard', this)">
            <i class="ri-trophy-fill"></i> <span>Leaderboard</span>
        </button>
        <button class="nav-btn" onclick="showSection('bracket', this)">
            <i class="ri-organization-chart"></i> <span>Brackets</span>
        </button>
        <button class="nav-btn logout" onclick="auth.signOut()">
            <i class="ri-logout-box-line"></i> <span>Logout</span>
        </button>
    `;
    renderTeamDashboard(user.uid);
});

function showSection(sectionId, btnElement) {
    dashboardSection.classList.add('hidden');
    bracketSection.classList.add('hidden');
    leaderboardSection.classList.add('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    else {
        const icons = { 'dashboard': 'ri-dashboard-line', 'bracket': 'ri-organization-chart', 'leaderboard': 'ri-trophy-fill' };
        document.querySelectorAll('.nav-btn').forEach(b => {
            if(b.innerHTML.includes(icons[sectionId])) b.classList.add('active');
        });
    }

    if (sectionId === 'dashboard') {
        dashboardSection.classList.remove('hidden');
    } else if (sectionId === 'bracket') {
        bracketSection.classList.remove('hidden');
    } else if (sectionId === 'leaderboard') {
        leaderboardSection.classList.remove('hidden');
        renderLeaderboard();
    }
}

async function renderTeamDashboard(uid) {
    const teamResult = await getTeamDataByUID(uid);
    if (!teamResult) return;
    
    const teamKey = teamResult.key;
    const teamData = teamResult.data;
    const players = teamData.players || [];
    
    const roleOrder = { 'Jungler': 1, 'Roamer': 2, 'MidLane': 3, 'ExpLane': 4, 'GoldLane': 5, 'Cadangan': 6 };
    players.sort((a, b) => (roleOrder[a.role] || 6) - (roleOrder[b.role] || 6));

    let playersHTML = '';
    players.forEach((p, index) => {
        let badgeClass = `role-${p.role.toLowerCase().replace('lane','')}`;
        if(p.role === 'Cadangan') badgeClass = 'role-sub';
        
        playersHTML += `
            <div class="player-item">
                <div style="display:flex; align-items:center;">
                    <div class="role-badge ${badgeClass}">${p.role}</div>
                    <div class="player-info">
                        <span style="font-weight:600; color:white;">${p.name}</span>
                        <div class="id-badge">ID: ${p.id}</div>
                    </div>
                </div>
                <button style="background:none; border:none; color:var(--danger); cursor:pointer;" onclick="removePlayer('${teamKey}', ${index})"><i class="ri-delete-bin-line"></i></button>
            </div>
        `;
    });
    
    dashboardSection.innerHTML = `
        <div class="card">
            <div class="section-title"><i class="ri-shield-user-line"></i> Active Roster</div>
            <h2 style="color:white; margin-bottom:10px;">${teamData.teamName}</h2>
            <p style="margin-bottom:20px; color:${teamData.isApproved ? 'var(--success)' : 'var(--text-muted)'}">
                Status: ${teamData.isBanned ? 'BANNED' : (teamData.isApproved ? 'VERIFIED TEAM' : 'Waiting for Approval')}
            </p>

            <div style="max-height: 400px; overflow-y: auto; margin-bottom: 20px; padding-right:5px;">
                ${players.length === 0 ? '<p style="color:var(--text-muted); text-align:center;">No players recruited.</p>' : playersHTML}
            </div>

            ${players.length < 10 ? `
                <form id="add-player-form" class="form-container">
                    <select id="playerRole" required>
                        <option value="" disabled selected>Select Role</option>
                        <option value="Jungler">Jungler</option>
                        <option value="Roamer">Roamer</option>
                        <option value="MidLane">MidLane</option>
                        <option value="ExpLane">ExpLane</option>
                        <option value="GoldLane">GoldLane</option>
                        <option value="Cadangan">Substitute</option>
                    </select>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                        <input type="text" id="playerName" placeholder="Nickname" required>
                        <input type="text" id="playerId" placeholder="Game ID" required>
                    </div>
                    <button type="submit" class="btn-action">Add Player</button>
                </form>
            ` : ''}
        </div>

        <div class="card" style="background:transparent; border:none; padding:0;">
             <div class="section-title"><i class="ri-trophy-line"></i> Available Tournaments</div>
             <div class="tournament-grid">
                <div id="tournaments-loader">Loading events...</div>
             </div>
        </div>
    `;

    document.getElementById('add-player-form')?.addEventListener('submit', (e) => addPlayer(e, teamKey, players));
    
    loadTournamentsForTeam(teamKey, players);
}

function addPlayer(e, teamUsername, currentPlayers) {
    e.preventDefault();
    const role = document.getElementById('playerRole').value;
    const name = document.getElementById('playerName').value;
    const id = document.getElementById('playerId').value;
    
    if (role !== 'Cadangan' && currentPlayers.some(p => p.role === role)) {
        if(!confirm(`Role ${role} filled. Add anyway?`)) return;
    }

    const newPlayers = [...currentPlayers, { role, name, id }];
    database.ref(`teams/${teamUsername}/players`).set(newPlayers)
        .then(() => renderTeamDashboard(auth.currentUser.uid));
}

function removePlayer(teamUsername, index) {
    if (!confirm("Remove player?")) return;
    database.ref(`teams/${teamUsername}/players`).once('value')
        .then(snapshot => {
            let players = snapshot.val() || [];
            players.splice(index, 1);
            return database.ref(`teams/${teamUsername}/players`).set(players);
        })
        .then(() => renderTeamDashboard(auth.currentUser.uid));
}

async function loadTournamentsForTeam(teamUsername, players) {
    const grid = document.querySelector('.tournament-grid');
    const snapshot = await database.ref('tournaments').once('value');
    const tournaments = snapshot.val();
    
    if (!tournaments) {
        grid.innerHTML = '<p style="color:var(--text-muted)">No active tournaments.</p>';
        return;
    }

    let html = '';
    const rosterReady = players.length >= 5;

    Object.entries(tournaments).forEach(([id, t]) => {
        const participantData = t.participants ? t.participants[teamUsername] : null;
        const isRegistered = !!participantData;
        const count = t.participants ? Object.keys(t.participants).length : 0;
        
        let actionBtn = '';
        if (isRegistered) {
            if(participantData.status === 'pending_payment') {
                actionBtn = `<button class="btn-action" style="background:#e5a50a;" onclick="openPaymentModal('${id}', '${teamUsername}', ${t.fee})">Pay Now</button>`;
            } else if (t.status === 'ongoing') {
                actionBtn = `<button class="btn-action" onclick="showBracketView('${id}')" style="background:transparent; border:1px solid var(--neon-blue); color:var(--neon-blue);">View Bracket</button>`;
            } else {
                actionBtn = `<button class="btn-action" disabled style="background:rgba(255,255,255,0.1); color:var(--text-muted);">Registered</button>`;
            }
        } else if (t.status === 'registration') {
            if (rosterReady) {
                 if(t.fee > 0) {
                     actionBtn = `<button class="btn-action" onclick="initiateRegistration('${id}', '${teamUsername}', ${t.fee})" style="background:var(--gold); color:black;">Join (Paid)</button>`;
                 } else {
                     actionBtn = `<button class="btn-action" onclick="initiateRegistration('${id}', '${teamUsername}', 0)">Join Now</button>`;
                 }
            } else {
                 actionBtn = `<button class="btn-action" disabled style="background:rgba(255,255,255,0.1); opacity:0.5;">Roster Incomplete</button>`;
            }
        }

        let feeDisplay = t.fee > 0 ? `<div style="color:var(--gold); font-weight:bold;">Fee: ${formatRupiah(t.fee)}</div><div style="font-size:0.8rem; color:white;">Prize: ${formatRupiah(t.prize)}</div>` : `<div style="color:var(--success); font-weight:bold;">FREE ENTRY</div>`;
        let premiumClass = t.fee > 0 ? 'premium-border' : '';
        let badge = t.fee > 0 ? '<span class="t-badge badge-paid">PAID</span>' : '<span class="t-badge">FREE</span>';

        html += `
            <div class="tournament-card ${premiumClass}">
                <div class="t-header">
                    <span class="t-badge">${t.status}</span>
                    ${badge}
                </div>
                <div class="t-body">
                    <h4>${t.name}</h4>
                    <p>Format: BO${t.format || 1} | Slots: ${count} / ${t.maxTeams}</p>
                    <div style="margin-bottom:15px; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px;">
                        ${feeDisplay}
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:10px;">
                        ${actionBtn}
                        <button class="btn-action" style="background:rgba(255,255,255,0.1);" onclick="viewRules('${id}')">Rules</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

function initiateRegistration(tid, teamName, fee) {
    if(!confirm("Join tournament? Current roster will be recorded.")) return;
    
    if(fee > 0) {
        openPaymentModal(tid, teamName, fee);
    } else {
        completeRegistration(tid, teamName, 'approved');
    }
}

function openPaymentModal(tid, teamName, fee) {
    currentPaymentTourId = tid;
    currentPaymentTeamName = teamName;
    document.getElementById('payment-fee-display').innerText = formatRupiah(fee);
    document.getElementById('payment-modal').classList.remove('hidden');
}

function confirmPayment() {
    completeRegistration(currentPaymentTourId, currentPaymentTeamName, 'pending_payment');
    closeModal('payment-modal');
}

async function completeRegistration(tid, teamName, status) {
    try {
        const teamSnapshot = await database.ref(`teams/${teamName}`).once('value');
        const teamData = teamSnapshot.val();
        
        if(!teamData || !teamData.players) throw new Error("Team data error");

        const updates = {};
        updates[`tournaments/${tid}/participants/${teamName}`] = { 
            teamName, 
            status: status,
            registeredAt: firebase.database.ServerValue.TIMESTAMP,
            rosterSnapshot: teamData.players 
        };
        
        await database.ref().update(updates);
        renderTeamDashboard(auth.currentUser.uid);
        if(status === 'pending_payment') alert("Please wait for admin approval after sending payment screenshot.");
        else alert("Joined successfully!");
        
    } catch(e) {
        alert("Error registering: " + e.message);
    }
}

async function viewRules(tid) {
    const snap = await database.ref(`tournaments/${tid}/rules`).once('value');
    const rules = snap.val() || "No specific rules.";
    document.getElementById('rules-content').innerText = rules;
    document.getElementById('rules-modal').classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

async function renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '<tr><td colspan="5">Calculating rankings...</td></tr>';

    const snapshot = await database.ref('teams').once('value');
    const teams = snapshot.val();

    if (!teams) {
        tbody.innerHTML = '<tr><td colspan="5">No teams data found.</td></tr>';
        return;
    }

    const teamList = Object.values(teams).map(t => {
        const s = t.stats || {};
        const freePoints = ((s.ch1||0) * 3) + ((s.ch2||0) * 2) + ((s.ch3||0) * 1);
        const paidPoints = ((s.paidCh1||0) * 6) + ((s.paidCh2||0) * 4) + ((s.paidCh3||0) * 2); 
        const totalPoints = freePoints + paidPoints;
        return { ...t, s, totalPoints };
    });

    teamList.sort((a, b) => b.totalPoints - a.totalPoints);

    let html = '';
    teamList.forEach((t, index) => {
        const rank = index + 1;
        let rowClass = '';
        if (rank === 1) rowClass = 'rank-1';
        else if (rank === 2) rowClass = 'rank-2';
        else if (rank === 3) rowClass = 'rank-3';

        html += `
            <tr class="${rowClass}">
                <td><span class="rank-num">#${rank}</span></td>
                <td>
                    <span style="font-weight:bold; font-size:0.95rem; cursor:pointer;" onclick="inspectTeam('${t.username}')">${t.teamName}</span>
                </td>
                <td>
                    <div style="font-size:0.8rem; color:#aaa;">
                    1st:${t.s.ch1||0} | 2nd:${t.s.ch2||0} | 3rd:${t.s.ch3||0}
                    </div>
                </td>
                <td>
                    <div style="font-size:0.8rem; color:var(--gold);">
                    1st:${t.s.paidCh1||0} | 2nd:${t.s.paidCh2||0} | 3rd:${t.s.paidCh3||0}
                    </div>
                </td>
                <td style="text-align:right; font-weight:bold; font-family:monospace; color:var(--neon-blue);">${t.totalPoints} PTS</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

async function inspectTeam(targetName) {
    document.getElementById('team-inspector-modal').classList.remove('hidden');
    document.getElementById('inspector-title').innerText = targetName;
    const content = document.getElementById('inspector-content');
    content.innerHTML = 'Loading...';
    
    try {
        const teamData = await getTeamDataByUsername(targetName);
        const players = teamData.data.players || [];
        renderInspectorPlayers(players);
    } catch (e) { content.innerHTML = 'Error loading team.'; }
}

async function inspectTournamentRoster(tourId, teamName) {
    if(teamName === 'TBD' || !teamName) return;
    
    document.getElementById('team-inspector-modal').classList.remove('hidden');
    document.getElementById('inspector-title').innerText = `${teamName} (Tournament Roster)`;
    const content = document.getElementById('inspector-content');
    content.innerHTML = 'Loading snapshot...';
    
    try {
        const snap = await database.ref(`tournaments/${tourId}/participants/${teamName}`).once('value');
        const participant = snap.val();
        
        if(participant && participant.rosterSnapshot) {
            renderInspectorPlayers(participant.rosterSnapshot);
        } else {
            const liveTeam = await getTeamDataByUsername(teamName);
            if(liveTeam) {
                renderInspectorPlayers(liveTeam.data.players);
            } else {
                content.innerHTML = "Roster data not available.";
            }
        }
    } catch (e) { content.innerHTML = 'Error loading roster.'; }
}

function renderInspectorPlayers(players) {
    const content = document.getElementById('inspector-content');
    let html = '';
    
    const roleOrder = { 'Jungler': 1, 'Roamer': 2, 'MidLane': 3, 'ExpLane': 4, 'GoldLane': 5, 'Cadangan': 6 };
    players.sort((a, b) => (roleOrder[a.role] || 6) - (roleOrder[b.role] || 6));

    players.forEach(p => {
        let badgeClass = `role-${p.role.toLowerCase().replace('lane','')}`;
        if(p.role === 'Cadangan') badgeClass = 'role-sub';
        html += `
            <div class="player-item">
                 <div style="display:flex; align-items:center;">
                    <div class="role-badge ${badgeClass}">${p.role}</div>
                    <div style="display:flex; flex-direction:column;">
                        <span style="color:white; font-weight:bold;">${p.name}</span>
                        <span style="color:var(--text-muted); font-size:0.75rem; font-family:monospace;">ID: ${p.id}</span>
                    </div>
                 </div>
            </div>
        `;
    });
    content.innerHTML = html;
}

async function showBracketView(tournamentId) {
    const bracketView = document.getElementById('tournament-bracket-view');
    const snapshot = await database.ref(`tournaments/${tournamentId}`).once('value');
    const tournament = snapshot.val();
    
    if (!tournament || !tournament.bracket) {
        bracketView.innerHTML = `<p>Bracket not ready.</p>`;
        showSection('bracket');
        return;
    }
    
    showSection('bracket');
    
    const sortedKeys = Object.keys(tournament.bracket).sort((a,b) => {
        if(a === 'bronze') return 1;
        if(b === 'bronze') return -1;
        const numA = parseInt(a.replace('r', ''));
        const numB = parseInt(b.replace('r', ''));
        return numA - numB;
    });
    
    let html = `<h3 style="margin-bottom:0;">${tournament.name}</h3><p style="color:var(--neon-blue); font-size:0.9rem; margin-bottom:20px;">MIXED FORMAT</p><div style="display:flex; gap:30px;">`;
    
    sortedKeys.forEach(roundName => {
        let title = roundName.toUpperCase();
        if(roundName === 'bronze') title = "BRONZE MATCH";
        else if(tournament.bracket[roundName].length === 1 && roundName !== 'r1') title = "GRAND FINAL";

        html += `<div style="display:flex; flex-direction:column; gap:20px; justify-content:center; min-width:180px;"><div style="margin-bottom:10px; font-weight:bold; color:var(--neon-purple); text-align:center;">${title}</div>`;
        tournament.bracket[roundName].forEach(m => {
            const winnerA = m.winner === m.teamA;
            const winnerB = m.winner === m.teamB;
            const styleDone = m.completed ? 'opacity:0.6;' : '';

            html += `
                <div class="match-card" style="${styleDone}">
                    <div style="text-align:center; font-size:0.7rem; color:#aaa; margin-bottom:5px;">BO${m.format || 1}</div>
                    <div class="match-team ${winnerA ? 'winner' : (m.winner ? 'loser' : '')}" style="display:flex; justify-content:space-between;">
                        <span class="clickable-team" onclick="inspectTournamentRoster('${tournamentId}', '${m.teamA}')">${m.teamA || 'TBD'}</span> <span style="font-weight:bold; font-size:1.1rem; color:${winnerA ? 'var(--neon-blue)' : 'white'}">${m.scoreA || 0}</span>
                    </div>
                    <div class="match-team ${winnerB ? 'winner' : (m.winner ? 'loser' : '')}" style="display:flex; justify-content:space-between;">
                        <span class="clickable-team" onclick="inspectTournamentRoster('${tournamentId}', '${m.teamB}')">${m.teamB || 'TBD'}</span> <span style="font-weight:bold; font-size:1.1rem; color:${winnerB ? 'var(--neon-blue)' : 'white'}">${m.scoreB || 0}</span>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });
    html += `</div>`;
    bracketView.innerHTML = html;
}
