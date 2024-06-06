import { app } from './firebaseConfig.js';
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const db = getFirestore(app);
    const auth = getAuth(app);

    const gameInfoDiv = document.getElementById('game-info');
    const loginForm = document.getElementById('login-form');
    const adminLoginButton = document.getElementById('admin-login-button');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const adminSection = document.getElementById('admin-section');
    const gameForm = document.getElementById('game-form');
    const jogosPage = document.getElementById('jogos-page');
    const competitionPage = document.getElementById('competition-page');
    const classificacaoPage = document.getElementById('classificacao-page');
    const jogosLink = document.getElementById('jogos-link');
    const competitionLink = document.getElementById('competition-link');
    const classificacaoLink = document.getElementById('classificacao-link');
    const competitionInfoDiv = document.getElementById('competition-info');
    const competitionForm = document.getElementById('competition-form');
    const adminCompetitionSection = document.getElementById('admin-competition-section');
    const leaderboardDiv = document.getElementById('leaderboard');

    function showPage(page) {
        if (page === 'jogos') {
            jogosPage.style.display = 'block';
            competitionPage.style.display = 'none';
            classificacaoPage.style.display = 'none';
            jogosLink.classList.add('active');
            competitionLink.classList.remove('active');
            classificacaoLink.classList.remove('active');
        } else if (page === 'competition') {
            jogosPage.style.display = 'none';
            competitionPage.style.display = 'block';
            classificacaoPage.style.display = 'none';
            jogosLink.classList.remove('active');
            competitionLink.classList.add('active');
            classificacaoLink.classList.remove('active');
        } else if (page === 'classificacao') {
            jogosPage.style.display = 'none';
            competitionPage.style.display = 'none';
            classificacaoPage.style.display = 'block';
            jogosLink.classList.remove('active');
            competitionLink.classList.remove('active');
            classificacaoLink.classList.add('active');
        }
    }

    jogosLink.addEventListener('click', () => showPage('jogos'));
    competitionLink.addEventListener('click', () => showPage('competition'));
    classificacaoLink.addEventListener('click', () => showPage('classificacao'));

    adminLoginButton.addEventListener('click', () => {
        if (loginForm.style.display === 'none' || loginForm.style.display === '') {
            loginForm.style.display = 'block';
        } else {
            loginForm.style.display = 'none';
        }
    });

    loginButton.addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                console.log("User signed in: ", userCredential.user);
                loginForm.style.display = 'none';
                adminLoginButton.style.display = 'none';
                logoutButton.style.display = 'block';
            })
            .catch((error) => {
                console.error("Error signing in: ", error);
            });
    });

    logoutButton.addEventListener('click', () => {
        signOut(auth)
            .then(() => {
                console.log("User signed out");
                adminLoginButton.style.display = 'block';
                logoutButton.style.display = 'none';
            })
            .catch((error) => {
                console.error("Error signing out: ", error);
            });
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            adminSection.style.display = 'block';
            adminCompetitionSection.style.display = 'block';
            adminLoginButton.style.display = 'none';
            logoutButton.style.display = 'block';
        } else {
            adminSection.style.display = 'none';
            adminCompetitionSection.style.display = 'none';
            adminLoginButton.style.display = 'block';
            logoutButton.style.display = 'none';
        }
    });

    async function fetchGameInfo() {
        try {
            const jogosCol = collection(db, "jogos");
            const jogosSnapshot = await getDocs(jogosCol);
            const jogosList = jogosSnapshot.docs.map(doc => doc.data());
            gameInfoDiv.innerHTML = jogosList.map(game => `
                <div class="game-box">
                    <p class="highlight">${game.Casa} Vs ${game.Fora}</p>
                    <p class="subdued">${game.Competicao}</p>
                    <p class="subdued">${game.Data.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p class="subdued">${game.Data.toDate().toLocaleDateString('en-GB')}</p>
                    ${game.Resultado ? `<p class="highlight">Resultado: ${game.Resultado}</p>` : ''}
                    ${game.Vencedor ? `<p class="highlight">Vencedor: ${game.Vencedor}</p>` : ''}
                </div>
            `).join('');
        } catch (error) {
            console.error("Error fetching game information:", error);
            gameInfoDiv.innerHTML = "Error loading game information.";
        }
    }

    async function fetchCompetitionInfo() {
        try {
            const competitionsCol = collection(db, "competitions");
            const competitionsSnapshot = await getDocs(competitionsCol);
            const competitionsList = competitionsSnapshot.docs.map(doc => doc.data());
            competitionInfoDiv.innerHTML = competitionsList.map(comp => `
                <div class="competition-box">
                    <p class="highlight">${comp.Nome}</p>
                    <p class="subdued">Limite: ${comp.Limite.toDate().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    ${comp.Vencedor ? `<p class="highlight">Vencedor: ${comp.Vencedor}</p>` : ''}
                </div>
            `).join('');
        } catch (error) {
            console.error("Error fetching competition information:", error);
            competitionInfoDiv.innerHTML = "Error loading competition information.";
        }
    }

    async function fetchLeaderboard() {
        try {
            const jogadoresCol = collection(db, "jogadores");
            const jogadoresSnapshot = await getDocs(jogadoresCol);
            const jogadoresList = jogadoresSnapshot.docs.map(doc => doc.data());
            jogadoresList.sort((a, b) => b.Pontos - a.Pontos); // Sort players by points in descending order
            leaderboardDiv.innerHTML = jogadoresList.map(player => `
                <div class="player-box">
                    <p class="highlight">${player.Nome}</p>
                    <p class="subdued">Pontos: ${player.Pontos}</p>
                    <p class="subdued">Ganhos: ${player.Ganhos.toFixed(2)} €</p>
                </div>
            `).join('');
        } catch (error) {
            console.error("Error fetching leaderboard information:", error);
            leaderboardDiv.innerHTML = "Error loading leaderboard information.";
        }
    }

    gameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const casa = document.getElementById('casa').value;
        const fora = document.getElementById('fora').value;
        const data = document.getElementById('data').value;
        const competicao = document.getElementById('competicao').value;
        const resultado = document.getElementById('resultado').value;
        const vencedor = document.getElementById('vencedor').value;

        try {
            await addDoc(collection(db, "jogos"), {
                Casa: casa,
                Fora: fora,
                Data: new Date(data),
                Competicao: competicao,
                Resultado: resultado,
                Vencedor: vencedor
            });
            fetchGameInfo();
            gameForm.reset();
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    });

    competitionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value;
        const limite = document.getElementById('limite').value;
        const vencedorCompeticao = document.getElementById('vencedor-competicao').value;
    
        try {
            await addDoc(collection(db, "competitions"), {
                Nome: nome,
                Limite: new Date(limite),
                Vencedor: vencedorCompeticao
            });
            fetchCompetitionInfo();
            competitionForm.reset();
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    });

    fetchGameInfo();
    fetchCompetitionInfo();
    fetchLeaderboard();
    showPage('jogos');
});