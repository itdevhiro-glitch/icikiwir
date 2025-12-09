const dashboardSection = document.getElementById('admin-dashboard-section');
const controlSection = document.getElementById('tournament-control-section');
const teamsSection = document.getElementById('admin-teams-section');
const scoreModal = document.getElementById('score-modal');

let currentEditingMatch = null; 
let currentTournamentData = null;

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    if (user.uid !== ADMIN_UID) {
        alert("ACCESS DENIED");
        window.location.href = 'dashboard.html';
        return;
    }
    loadTournamentList();
    loadTeamStats();
});

function handleLogout() {
    auth.signOut().then(() => window.location.href = 'login.html');
}

function showSection(section) {
    dashboardSection.classList.add('hidden');
    controlSection.classList.add('hidden');
    teamsSection.classList.add('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    if (section === 'dashboard') {
        dashboardSection.classList.remove('hidden');
    } else if (section === 'teams') {
        teamsSection.classList.remove('hidden');
    } else if (section === 'control') {
        controlSection.classList.remove('hidden');
    }
}

document.getElementById('create-tournament-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('tourName').value;
    const max = parseInt(document.getElementById('tourMax').value);
    const date = document.getElementById('tourDate').value;
    const format = parseInt(document.getElementById('tourFormat').value);
    const fee = parseInt(document.getElementById('tourFee').value) || 0;
    const prize = parseInt(document.getElementById('tourPrize').value) || 0;
    const rules = document.getElementById('tourRules').value;

    const newRef = database.ref('tournaments').push();
    newRef.set({
        name: name,
        maxTeams: max,
        format: format, 
        fee: fee,
        prize: prize,
        rules: rules,
        startDate: date,
        status: 'registration',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert("Tournament Created!");
        document.getElementById('create-tournament-form').reset();
    });
});

function loadTournamentList() {
    database.ref('tournaments').on('value', (snapshot) => {
        const container = document.getElementById('tournament-list-container');
        container.innerHTML = '';
        const data = snapshot.val();

        if (!data) return;

        Object.entries(data).reverse().forEach(([key, t]) => {
            const count = t.participants ? Object.keys(t.participants).length : 0;
            const formatLabel = t.format ? `BO${t.format}` : 'BO1';
            const feeLabel = t.fee > 0 ? `<span class="t-badge badge-paid">PAID</span>` : `<span class="t-badge">FREE</span>`;
            
            const item = document.createElement('div');
            item.className = `tournament-card ${t.fee > 0 ? 'premium-border' : ''}`;
            item.style.marginBottom = '10px';
            item.innerHTML = `
                <div style="padding:15px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="margin:0; color:white;">${t.name} <span style="font-size:0.7rem; background:var(--neon-purple); padding:2px 5px; border-radius:4px;">${formatLabel}</span> ${feeLabel}</h4>
                        <small style="color:var(--text-muted);">${t.status.toUpperCase()} | ${count}/${t.maxTeams}</small>
                    </div>
                    <div>
                        <button class="btn-action" style="padding:5px 15px; width:auto;" onclick="openTournamentControl('${key}')">Manage</button>
                        <button class="btn-action" style="padding:5px 10px; width:auto; background:var(--danger);" onclick="deleteTournament('${key}')">Del</button>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    });
}

function loadTeamStats() {
    database.ref('teams').on('value', (snap) => {
        const container = document.getElementById('team-stats-list');
        container.innerHTML = '';
        const teams = snap.val();
        if(!teams) return;
        
        Object.values(teams).forEach(t => {
            const stats = t.stats || { ch1:0, ch2:0, ch3:0, paidCh1:0, paidCh2:0, paidCh3:0 };
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <h4 style="color:white;">${t.teamName}</h4>
                <div style="margin-bottom:5px; color:var(--text-muted); font-size:0.8rem;">FREE TOURNAMENT STATS:</div>
                <div class="form-container" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px; margin-bottom:10px;">
                    <div><label style="color:var(--gold); font-size:0.8rem;">1st</label><input type="number" value="${stats.ch1 || 0}" onchange="updateStat('${t.username}', 'ch1', this.value)"></div>
                    <div><label style="color:var(--silver); font-size:0.8rem;">2nd</label><input type="number" value="${stats.ch2 || 0}" onchange="updateStat('${t.username}', 'ch2', this.value)"></div>
                    <div><label style="color:var(--bronze); font-size:0.8rem;">3rd</label><input type="number" value="${stats.ch3 || 0}" onchange="updateStat('${t.username}', 'ch3', this.value)"></div>
                </div>
                <div style="margin-bottom:5px; color:var(--gold); font-size:0.8rem;">PAID TOURNAMENT STATS:</div>
                <div class="form-container" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px;">
                    <div><label style="color:var(--gold); font-size:0.8rem;">1st</label><input type="number" value="${stats.paidCh1 || 0}" onchange="updateStat('${t.username}', 'paidCh1', this.value)"></div>
                    <div><label style="color:var(--silver); font-size:0.8rem;">2nd</label><input type="number" value="${stats.paidCh2 || 0}" onchange="updateStat('${t.username}', 'paidCh2', this.value)"></div>
                    <div><label style="color:var(--bronze); font-size:0.8rem;">3rd</label><input type="number" value="${stats.paidCh3 || 0}" onchange="updateStat('${t.username}', 'paidCh3', this.value)"></div>
                </div>
            `;
            container.appendChild(div);
        });
    });
}

function updateStat(username, type, val) {
    database.ref(`teams/${username}/stats/${type}`).set(parseInt(val));
}

function deleteTournament(id) {
    if (confirm("Delete tournament permanently?")) {
        database.ref(`tournaments/${id}`).remove();
    }
}

let currentTournamentId = null;

function openTournamentControl(id) {
    currentTournamentId = id;
    showSection('control');
    
    database.ref(`tournaments/${id}`).on('value', (snapshot) => {
        const t = snapshot.val();
        if (!t) return showSection('dashboard');
        
        currentTournamentData = t;
        document.getElementById('control-title').innerText = t.name;
        document.getElementById('format-display').innerText = `FORMAT: MIXED`;
        document.getElementById('fee-display').innerText = t.fee > 0 ? `FEE: ${formatRupiah(t.fee)} | PRIZE: ${formatRupiah(t.prize)}` : `FREE ENTRY`;
        
        renderAdminActions(id, t);
        renderParticipants(id, t);
        if (t.bracket) renderAdminBracket(id, t);
        else document.getElementById('admin-bracket-view').innerHTML = '<p>Bracket not created.</p>';
    });
}

function renderAdminActions(id, t) {
    const container = document.getElementById('admin-actions');
    let html = '';

    if (t.status === 'registration') {
        html += `<button class="btn-action" style="background:var(--success)" onclick="generateRandomBracket('${id}')">Randomize Bracket & Start</button>`;
    } else if (t.status === 'ongoing') {
        html += `<button class="btn-action" onclick="finishTournament('${id}')">End Tournament</button>`;
        html += `<button class="btn-action" style="background:var(--danger); margin-top:5px;" onclick="resetBracket('${id}')">Reset Bracket</button>`;
    } else {
        html += `<p style="color:var(--success); font-weight:bold;">Tournament Finished</p>`;
        html += `<button class="btn-action" onclick="resetBracket('${id}')">Re-open</button>`;
    }
    container.innerHTML = html;
}

function renderParticipants(id, t) {
    const list = document.getElementById('participant-list');
    list.innerHTML = '';
    if (!t.participants) {
        list.innerHTML = '<li>No participants</li>';
        return;
    }

    Object.entries(t.participants).forEach(([key, p]) => {
        let statusBadge = '';
        let approveBtn = '';
        
        if (t.fee > 0) {
            if (p.status === 'pending_payment') {
                statusBadge = '<span style="color:orange; font-size:0.8rem;">[PENDING]</span>';
                approveBtn = `<button style="background:var(--success); border:none; color:white; padding:2px 8px; border-radius:4px; cursor:pointer; margin-right:5px;" onclick="approvePayment('${id}', '${key}')">Approve</button>`;
            } else {
                statusBadge = '<span style="color:var(--success); font-size:0.8rem;">[PAID]</span>';
            }
        } else {
            statusBadge = '<span style="color:var(--success); font-size:0.8rem;">[READY]</span>';
        }

        list.innerHTML += `
            <li style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.1); color:white;">
                <span>${p.teamName} ${statusBadge}</span>
                <div>
                    ${approveBtn}
                    <button style="background:var(--danger); border:none; color:white; padding:2px 8px; border-radius:4px; cursor:pointer;" onclick="kickTeam('${id}', '${key}')">Kick</button>
                </div>
            </li>
        `;
    });
}

function approvePayment(tourId, teamId) {
    if(confirm("Confirm payment received for " + teamId + "?")) {
        database.ref(`tournaments/${tourId}/participants/${teamId}/status`).set('approved');
        database.ref(`teams/${teamId}/isApproved`).set(true);
    }
}

function kickTeam(tourId, teamId) {
    if (confirm("Kick team?")) {
        database.ref(`tournaments/${tourId}/participants/${teamId}`).remove();
    }
}

function generateRandomBracket(id) {
    database.ref(`tournaments/${id}`).once('value', (snapshot) => {
        const t = snapshot.val();
        if (!t.participants) return alert("No participants!");
        
        const teams = [];
        Object.entries(t.participants).forEach(([k, v]) => {
            if(t.fee > 0 && v.status !== 'approved') return;
            teams.push(k);
        });

        if (teams.length < 2) return alert("Need 2 approved teams min.");

        for (let i = teams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teams[i], teams[j]] = [teams[j], teams[i]];
        }

        const bracketData = {};
        let matchIdCounter = 1;

        const round1Matches = [];
        for (let i = 0; i < teams.length; i += 2) {
            const teamA = teams[i];
            const teamB = teams[i+1] || null;

            round1Matches.push({
                id: matchIdCounter++,
                teamA: teamA,
                teamB: teamB,
                winner: teamB ? null : teamA, 
                scoreA: 0,
                scoreB: 0,
                format: 1, 
                nextMatchId: null
            });
        }
        bracketData['round1'] = round1Matches;

        let currentRoundMatches = round1Matches;
        let roundCounter = 2;

        while (currentRoundMatches.length > 1) {
            const nextRoundMatches = [];
            for (let i = 0; i < currentRoundMatches.length; i += 2) {
                const nextId = matchIdCounter++;
                currentRoundMatches[i].nextMatchId = nextId;
                if (currentRoundMatches[i+1]) currentRoundMatches[i+1].nextMatchId = nextId;

                nextRoundMatches.push({
                    id: nextId,
                    teamA: null,
                    teamB: null,
                    winner: null,
                    scoreA: 0, 
                    scoreB: 0,
                    format: 1,
                    nextMatchId: null
                });
            }
            bracketData[`round${roundCounter}`] = nextRoundMatches;
            currentRoundMatches = nextRoundMatches;
            roundCounter++;
        }

        database.ref(`tournaments/${id}`).update({
            bracket: bracketData,
            status: 'ongoing'
        });
    });
}

function renderAdminBracket(id, t) {
    const container = document.getElementById('admin-bracket-view');
    const roundKeys = Object.keys(t.bracket).sort((a,b) => b.localeCompare(a)).reverse();
    
    let html = '<div style="display:flex; gap:30px; overflow-x:auto; padding-bottom:10px;">';
    
    roundKeys.forEach(rKey => {
        html += `<div class="round-column" style="min-width:200px;"><div style="text-align:center; color:var(--neon-purple); font-weight:bold; margin-bottom:10px;">${rKey.toUpperCase()}</div>`;
        t.bracket[rKey].forEach((m, idx) => {
            const wA = m.winner === m.teamA && m.teamA;
            const wB = m.winner === m.teamB && m.teamB;
            
            html += `
                <div class="match-card" onclick="openScoreModal('${rKey}', ${idx}, '${m.teamA}', '${m.teamB}', ${m.scoreA}, ${m.scoreB}, ${m.format || 1})" style="cursor:pointer; border:${(m.teamA && m.teamB) ? '1px solid var(--neon-blue)' : '1px solid #333'}">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <small style="color:#aaa;">M${m.id} <span style="background:#444; padding:1px 4px; border-radius:3px;">BO${m.format||1}</span></small>
                        <small style="color:var(--text-muted);">Edit</small>
                    </div>
                    <div class="match-team ${wA ? 'winner' : ''}" style="display:flex; justify-content:space-between;">
                        <span>${m.teamA || '...'}</span> <span>${m.scoreA}</span>
                    </div>
                    <div class="match-team ${wB ? 'winner' : ''}" style="display:flex; justify-content:space-between;">
                        <span>${m.teamB || '...'}</span> <span>${m.scoreB}</span>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function openScoreModal(roundKey, index, teamA, teamB, sA, sB, fmt) {
    if (!teamA || !teamB || teamA === 'null' || teamB === 'null' || teamA === '...' || teamB === '...') {
        alert("Match not ready (Waiting for teams)");
        return;
    }

    currentEditingMatch = { roundKey, index, teamA, teamB };
    
    document.getElementById('score-modal-match-info').innerText = `${roundKey.toUpperCase()} - Match`;
    document.getElementById('score-team-a-name').innerText = teamA;
    document.getElementById('score-team-b-name').innerText = teamB;
    document.getElementById('input-score-a').value = sA;
    document.getElementById('input-score-b').value = sB;
    document.getElementById('modalMatchFormat').value = fmt || 1;
    
    scoreModal.classList.remove('hidden');
}

function closeScoreModal() {
    scoreModal.classList.add('hidden');
    currentEditingMatch = null;
}

function saveMatchScore() {
    if (!currentEditingMatch) return;

    const sA = parseInt(document.getElementById('input-score-a').value) || 0;
    const sB = parseInt(document.getElementById('input-score-b').value) || 0;
    const fmt = parseInt(document.getElementById('modalMatchFormat').value) || 1;
    
    const { roundKey, index, teamA, teamB } = currentEditingMatch;
    const winsNeeded = Math.ceil(fmt / 2);

    let winner = null;
    if (sA >= winsNeeded) winner = teamA;
    else if (sB >= winsNeeded) winner = teamB;

    const updates = {};
    const basePath = `tournaments/${currentTournamentId}/bracket/${roundKey}/${index}`;
    
    updates[`${basePath}/scoreA`] = sA;
    updates[`${basePath}/scoreB`] = sB;
    updates[`${basePath}/format`] = fmt;
    updates[`${basePath}/winner`] = winner; 

    database.ref().update(updates).then(() => {
        if (winner) {
            advanceWinner(currentTournamentId, roundKey, index, winner);
        }
        closeScoreModal();
    });
}

function advanceWinner(tourId, roundKey, matchIndex, winnerName) {
    database.ref(`tournaments/${tourId}/bracket/${roundKey}/${matchIndex}`).once('value', snap => {
        const match = snap.val();
        if (!match.nextMatchId) return;

        database.ref(`tournaments/${tourId}/bracket`).once('value', bracketSnap => {
            const brackets = bracketSnap.val();
            let targetRound, targetIndex;

            Object.keys(brackets).forEach(r => {
                brackets[r].forEach((m, i) => {
                    if (m.id == match.nextMatchId) {
                        targetRound = r;
                        targetIndex = i;
                    }
                });
            });

            if (targetRound) {
                let updateField = null;
                if (matchIndex % 2 === 0) updateField = 'teamA';
                else updateField = 'teamB';

                if (updateField) {
                    database.ref(`tournaments/${tourId}/bracket/${targetRound}/${targetIndex}/${updateField}`).set(winnerName);
                }
            }
        });
    });
}

function resetBracket(id) {
    if (confirm("Reset bracket? All scores will be lost.")) {
        database.ref(`tournaments/${id}`).update({
            bracket: null,
            status: 'registration'
        });
    }
}

function finishTournament(id) {
    if(confirm("End Tournament?")) {
        database.ref(`tournaments/${id}`).update({ status: 'completed' });
    }
}
