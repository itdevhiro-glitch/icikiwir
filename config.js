const firebaseConfig = {
    apiKey: "AIzaSyAkV4bmhAyNxuB13Oz1WnvPHtfLjZldGLQ",
    authDomain: "icikiwircommunity-a9900.firebaseapp.com",
    projectId: "icikiwircommunity-a9900",
    storageBucket: "icikiwircommunity-a9900.firebasestorage.app",
    messagingSenderId: "855027081992",
    appId: "1:855027081992:web:b25b700e5e79e021ec82bd",
    measurementId: "G-XH1LBP84QW"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

const ADMIN_UID = "KMvEgDWkxfYVGjpNbqHijeHAPTz2";

async function getTeamDataByUID(uid) {
    try {
        const s = await database.ref('teams').orderByChild('uid').equalTo(uid).once('value');
        return s.exists() ? { key: Object.keys(s.val())[0], data: Object.values(s.val())[0] } : null;
    } catch (e) { return null; }
}

async function getTeamDataByUsername(u) {
    try {
        const s = await database.ref('teams').orderByChild('username').equalTo(u).once('value');
        return s.exists() ? { key: Object.keys(s.val())[0], data: Object.values(s.val())[0] } : null;
    } catch (e) { return null; }
}

function formatRupiah(angka) {
    return "Rp " + parseInt(angka).toLocaleString('id-ID');
}
