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
        
        let teams = [];
        Object.entries(t.participants).forEach(([k, v]) => {
            if(t.fee > 0 && v.status !== 'approved') return;
            teams.push(k);
        });

        if (teams.length < 2) return alert("Need at least 2 teams.");

        for (let i = teams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teams[i], teams[j]] = [teams[j], teams[i]];
        }

        const bracketData = {};
        const N = teams.length;
        const P = Math.pow(2, Math.ceil(Math.log2(N)));
        
        const prelimCount = N - (P/2); 
        const byeCount = P - N; 

        let prelimMatches = [];
        let nextRoundPool = [];
        let matchIdCounter = 1;

        for (let i = 0; i < prelimCount * 2; i += 2) {
            prelimMatches.push({
                id: `r1_m${matchIdCounter++}`,
                teamA: teams[i],
                teamB: teams[i+1],
                scoreA: 0, scoreB: 0, format: 1, completed: false, winner: null
            });
            nextRoundPool.push({ type: 'match_winner', sourceMatchIndex: prelimMatches.length - 1, sourceRound: 'r1' });
        }
        
        for (let i = prelimCount * 2; i < N; i++) {
            nextRoundPool.push({ type: 'bye', teamName: teams[i] });
        }

        if(prelimMatches.length > 0) bracketData['r1'] = prelimMatches;

        let currentRoundPool = nextRoundPool;
        let roundCounter = 2;
        let bronzeMatchCreated = false;

        while (currentRoundPool.length > 1) {
            let nextPool = [];
            let currentMatches = [];
            let isSemiFinal = currentRoundPool.length === 4;
            
            for (let i = 0; i < currentRoundPool.length; i += 2) {
                const itemA = currentRoundPool[i];
                const itemB = currentRoundPool[i+1];
                
                const matchId = `r${roundCounter}_m${(i/2)+1}`;
                
                let matchObj = {
                    id: matchId,
                    teamA: itemA.type === 'bye' ? itemA.teamName : null,
                    teamB: itemB.type === 'bye' ? itemB.teamName : null,
                    scoreA: 0, scoreB: 0, format: isSemiFinal ? 3 : (currentRoundPool.length === 2 ? 5 : 1), 
                    completed: false, winner: null
                };
                
                if (itemA.type === 'match_winner') {
                    bracketData[itemA.sourceRound][itemA.sourceMatchIndex].nextMatchId = matchId;
                }
                if (itemB.type === 'match_winner') {
                    bracketData[itemB.sourceRound][itemB.sourceMatchIndex].nextMatchId = matchId;
                }

                currentMatches.push(matchObj);
                nextPool.push({ type: 'match_winner', sourceMatchIndex: currentMatches.length - 1, sourceRound: `r${roundCounter}` });
            }

            bracketData[`r${roundCounter}`] = currentMatches;
            currentRoundPool = nextPool;
            
            if (isSemiFinal) {
                bracketData['bronze'] = [{
                    id: 'bronze',
                    teamA: null, teamB: null, scoreA: 0, scoreB: 0, format: 3, completed: false, winner: null
                }];
                
                bracketData[`r${roundCounter}`][0].bronzeMatchId = 'bronze';
                bracketData[`r${roundCounter}`][1].bronzeMatchId = 'bronze';
            }

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
    const sortedKeys = Object.keys(t.bracket).sort((a,b) => {
        if(a === 'bronze') return 1;
        if(b === 'bronze') return -1;
        const numA = parseInt(a.replace('r', ''));
        const numB = parseInt(b.replace('r', ''));
        return numA - numB;
    });
    
    let html = '<div style="display:flex; gap:30px; overflow-x:auto; padding-bottom:10px;">';
    
    sortedKeys.forEach(rKey => {
        let title = rKey.toUpperCase();
        if(rKey === 'bronze') title = "BRONZE MATCH";
        else if (t.bracket[rKey].length === 1 && rKey !== 'r1') title = "GRAND FINAL"; 
        
        html += `<div class="round-column" style="min-width:200px;"><div style="text-align:center; color:var(--neon-purple); font-weight:bold; margin-bottom:10px;">${title}</div>`;
        t.bracket[rKey].forEach((m, idx) => {
            const wA = m.winner === m.teamA && m.teamA;
            const wB = m.winner === m.teamB && m.teamB;
            const borderStyle = m.completed ? '2px solid var(--success)' : (m.teamA && m.teamB ? '1px solid var(--neon-blue)' : '1px solid #333');
            
            html += `
                <div class="match-card" onclick="openScoreModal('${rKey}', ${idx}, '${m.teamA}', '${m.teamB}', ${m.scoreA}, ${m.scoreB}, ${m.format || 1}, ${m.completed})" style="cursor:pointer; border:${borderStyle}; opacity:${m.completed?0.6:1}">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <small style="color:#aaa;">${m.id} <span style="background:#444; padding:1px 4px; border-radius:3px;">BO${m.format||1}</span></small>
                        <small style="color:var(--text-muted);">${m.completed ? 'DONE' : 'Edit'}</small>
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

function openScoreModal(roundKey, index, teamA, teamB, sA, sB, fmt, isCompleted) {
    if (!teamA || !teamB || teamA === 'null' || teamB === 'null') {
        alert("Match not ready");
        return;
    }
    if (isCompleted) {
        if(!confirm("Match is DONE. Edit anyway?")) return;
    }

    currentEditingMatch = { roundKey, index, teamA, teamB };
    
    document.getElementById('score-modal-match-info').innerText = `${roundKey.toUpperCase()}`;
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

function saveMatchScore(markDone) {
    if (!currentEditingMatch) return;

    const sA = parseInt(document.getElementById('input-score-a').value) || 0;
    const sB = parseInt(document.getElementById('input-score-b').value) || 0;
    const fmt = parseInt(document.getElementById('modalMatchFormat').value) || 1;
    
    const { roundKey, index, teamA, teamB } = currentEditingMatch;
    
    let winner = null;
    let loser = null;
    
    if (sA > sB) { winner = teamA; loser = teamB; }
    else if (sB > sA) { winner = teamB; loser = teamA; }
    else if (markDone) {
        alert("Draw!");
        return;
    }

    const updates = {};
    const basePath = `tournaments/${currentTournamentId}/bracket/${roundKey}/${index}`;
    
    updates[`${basePath}/scoreA`] = sA;
    updates[`${basePath}/scoreB`] = sB;
    updates[`${basePath}/format`] = fmt;
    
    if (markDone) {
        updates[`${basePath}/completed`] = true;
        updates[`${basePath}/winner`] = winner;
    }

    database.ref().update(updates).then(() => {
        if (markDone && winner) {
            advanceWinner(currentTournamentId, roundKey, index, winner, loser);
        }
        closeScoreModal();
    });
}

function advanceWinner(tourId, roundKey, matchIndex, winnerName, loserName) {
    database.ref(`tournaments/${tourId}/bracket/${roundKey}/${matchIndex}`).once('value', snap => {
        const match = snap.val();

        // Handle Winner
        if (match.nextMatchId) {
            findAndSet(tourId, match.nextMatchId, winnerName);
        } else if (roundKey !== 'bronze') {
             // Grand Final Winner
             alert(`WINNER: ${winnerName}`);
             updateLeaderboardPoints(winnerName, 1, currentTournamentData.fee > 0);
             updateLeaderboardPoints(loserName, 2, currentTournamentData.fee > 0);
        } else {
             // Bronze Winner
             alert(`3rd PLACE: ${winnerName}`);
             updateLeaderboardPoints(winnerName, 3, currentTournamentData.fee > 0);
        }

        // Handle Loser (Bronze)
        if (match.bronzeMatchId) {
            findAndSet(tourId, match.bronzeMatchId, loserName);
        }
    });
}

function findAndSet(tourId, targetMatchId, teamName) {
    database.ref(`tournaments/${tourId}/bracket`).once('value', bracketSnap => {
        const brackets = bracketSnap.val();
        let targetRound, targetIndex;

        Object.keys(brackets).forEach(r => {
            brackets[r].forEach((m, i) => {
                if (m.id == targetMatchId) {
                    targetRound = r;
                    targetIndex = i;
                }
            });
        });

        if (targetRound) {
            const m = brackets[targetRound][targetIndex];
            const field = !m.teamA ? 'teamA' : 'teamB';
            database.ref(`tournaments/${tourId}/bracket/${targetRound}/${targetIndex}/${field}`).set(teamName);
        }
    });
}

function updateLeaderboardPoints(teamName, rank, isPaid) {
    if(!teamName) return;
    database.ref(`teams/${teamName}/stats`).once('value', snapshot => {
        const stats = snapshot.val() || { ch1:0, ch2:0, ch3:0, paidCh1:0, paidCh2:0, paidCh3:0 };
        const updates = {};
        
        if (isPaid) {
            if (rank === 1) updates[`teams/${teamName}/stats/paidCh1`] = (stats.paidCh1 || 0) + 1;
            if (rank === 2) updates[`teams/${teamName}/stats/paidCh2`] = (stats.paidCh2 || 0) + 1;
            if (rank === 3) updates[`teams/${teamName}/stats/paidCh3`] = (stats.paidCh3 || 0) + 1;
        } else {
            if (rank === 1) updates[`teams/${teamName}/stats/ch1`] = (stats.ch1 || 0) + 1;
            if (rank === 2) updates[`teams/${teamName}/stats/ch2`] = (stats.ch2 || 0) + 1;
            if (rank === 3) updates[`teams/${teamName}/stats/ch3`] = (stats.ch3 || 0) + 1;
        }
        
        database.ref().update(updates);
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
