const dashboardSection = document.getElementById('admin-dashboard-section');
const controlSection = document.getElementById('tournament-control-section');

auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    if (user.uid !== ADMIN_UID) {
        alert("⛔ AKSES DITOLAK: Anda bukan Admin!");
        window.location.href = 'dashboard.html';
        return;
    }

    loadTournamentList();
});

function handleLogout() {
    auth.signOut().then(() => window.location.href = 'login.html');
}

function showSection(section) {
    if (section === 'dashboard') {
        dashboardSection.classList.remove('hidden');
        controlSection.classList.add('hidden');
    } else {
        dashboardSection.classList.add('hidden');
        controlSection.classList.remove('hidden');
    }
}

document.getElementById('create-tournament-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('tourName').value;
    const max = parseInt(document.getElementById('tourMax').value);
    const date = document.getElementById('tourDate').value;

    if (max & (max - 1) !== 0) { 
        alert("Saran: Gunakan jumlah slot kelipatan 2 (4, 8, 16) agar bagan rapi.");
    }

    const newRef = database.ref('tournaments').push();
    newRef.set({
        name: name,
        maxTeams: max,
        startDate: date,
        status: 'registration',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        alert("Turnamen Berhasil Dibuat! 🚀");
        document.getElementById('create-tournament-form').reset();
    }).catch(err => alert("Error: " + err.message));
});

function loadTournamentList() {
    database.ref('tournaments').on('value', (snapshot) => {
        const container = document.getElementById('tournament-list-container');
        container.innerHTML = '';
        const data = snapshot.val();

        if (!data) {
            container.innerHTML = '<p>Belum ada turnamen.</p>';
            return;
        }

        Object.entries(data).reverse().forEach(([key, t]) => {
            const count = t.participants ? Object.keys(t.participants).length : 0;
            const item = document.createElement('div');
            item.className = 'tournament-card';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="margin:0;">${t.name}</h4>
                        <small>Status: <b>${t.status.toUpperCase()}</b> | Slot: ${count}/${t.maxTeams}</small>
                    </div>
                    <div>
                        <button class="btn-action" style="padding: 5px 15px; width:auto; font-size:0.8rem;" onclick="openTournamentControl('${key}')">⚙️ Atur</button>
                        <button class="btn-remove" style="margin-left:5px;" onclick="deleteTournament('${key}')">🗑️</button>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    });
}

function deleteTournament(id) {
    if (confirm("Hapus turnamen ini secara permanen?")) {
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

        document.getElementById('control-title').innerText = t.name;
        renderAdminActions(id, t);
        renderParticipants(id, t);
        if (t.bracket) renderAdminBracket(id, t);
        else document.getElementById('admin-bracket-view').innerHTML = '<p>Bracket belum dibuat.</p>';
    });
}

function renderAdminActions(id, t) {
    const container = document.getElementById('admin-actions');
    let html = '';

    if (t.status === 'registration') {
        html += `<button class="btn-action" style="background:var(--success)" onclick="generateRandomBracket('${id}')">🎲 Acak Bracket & Mulai</button>`;
    } else if (t.status === 'ongoing') {
        html += `<button class="btn-action" onclick="finishTournament('${id}')">🏁 Akhiri Turnamen</button>`;
        html += `<button class="btn-action" style="background:var(--danger); margin-top:5px;" onclick="resetBracket('${id}')">⚠️ Reset Bracket</button>`;
    } else {
        html += `<p style="color:var(--success); font-weight:bold;">Turnamen Selesai 🎉</p>`;
        html += `<button class="btn-action" onclick="resetBracket('${id}')">Buka Kembali (Reset)</button>`;
    }
    container.innerHTML = html;
}

function renderParticipants(id, t) {
    const list = document.getElementById('participant-list');
    list.innerHTML = '';
    if (!t.participants) {
        list.innerHTML = '<li>Belum ada pendaftar</li>';
        return;
    }

    Object.entries(t.participants).forEach(([key, p]) => {
        list.innerHTML += `
            <li style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed #ccc;">
                <span>${p.teamName}</span>
                <button class="btn-remove" onclick="kickTeam('${id}', '${key}')">Kick</button>
            </li>
        `;
    });
}

function kickTeam(tourId, teamId) {
    if (confirm("Keluarkan tim ini dari turnamen?")) {
        database.ref(`tournaments/${tourId}/participants/${teamId}`).remove();
        database.ref(`teams/${teamId}/isApproved`).set(false);
    }
}

function generateRandomBracket(id) {
    database.ref(`tournaments/${id}`).once('value', (snapshot) => {
        const t = snapshot.val();
        if (!t.participants) return alert("Tidak ada peserta!");
        
        const teams = Object.keys(t.participants);
        if (teams.length < 2) return alert("Minimal 2 tim untuk memulai.");

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
    
    let html = '<div class="bracket-flex">';
    
    roundKeys.forEach(rKey => {
        html += `<div class="round-column"><div class="round-title">${rKey.toUpperCase()}</div>`;
        t.bracket[rKey].forEach((m, idx) => {
            const wA = m.winner === m.teamA;
            const wB = m.winner === m.teamB;
            
            html += `
                <div class="match-card">
                    <small style="color:#aaa;">Match #${m.id}</small>
                    <div class="match-team ${wA ? 'winner' : ''}" 
                         style="cursor:pointer;" 
                         onclick="setWinner('${id}', '${rKey}', ${idx}, '${m.teamA}', '${m.nextMatchId}')">
                        ${m.teamA || '...'} ${wA ? '👑' : ''}
                    </div>
                    <div class="match-team ${wB ? 'winner' : ''}" 
                         style="cursor:pointer;" 
                         onclick="setWinner('${id}', '${rKey}', ${idx}, '${m.teamB}', '${m.nextMatchId}')">
                        ${m.teamB || '...'} ${wB ? '👑' : ''}
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function setWinner(tourId, roundKey, matchIndex, winnerName, nextMatchId) {
    if (!winnerName || winnerName === 'null' || winnerName === '...') return;
    if (!confirm(`Tetapkan ${winnerName} sebagai pemenang?`)) return;

    database.ref(`tournaments/${tourId}/bracket/${roundKey}/${matchIndex}`).update({
        winner: winnerName
    });

    if (nextMatchId) {
        database.ref(`tournaments/${tourId}/bracket`).once('value', snap => {
            const brackets = snap.val();
            let targetRound, targetIndex;

            Object.keys(brackets).forEach(r => {
                brackets[r].forEach((m, i) => {
                    if (m.id == nextMatchId) {
                        targetRound = r;
                        targetIndex = i;
                    }
                });
            });

            if (targetRound) {
                const targetMatch = brackets[targetRound][targetIndex];
                if (targetMatch.teamA !== winnerName && targetMatch.teamB !== winnerName) {
                    const updateField = !targetMatch.teamA ? 'teamA' : 'teamB';
                    database.ref(`tournaments/${tourId}/bracket/${targetRound}/${targetIndex}`).update({
                        [updateField]: winnerName
                    });
                }
            }
        });
    }
}

function resetBracket(id) {
    if (confirm("Reset total bracket turnamen ini?")) {
        database.ref(`tournaments/${id}`).update({
            bracket: null,
            status: 'registration'
        });
    }
}

function finishTournament(id) {
    database.ref(`tournaments/${id}`).update({ status: 'completed' });
}