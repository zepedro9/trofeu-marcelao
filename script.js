import { app } from './firebaseConfig.js';
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const db = getFirestore(app);
    const auth = getAuth(app);

    const loginButton = document.getElementById('login-button');
    const adminLoginButton = document.getElementById('admin-login-button');
    const logoutButton = document.getElementById('logout-button');
    const gameInfoDiv = document.getElementById('game-info');
    const loginForm = document.getElementById('login-form');
    const adminSection = document.getElementById('admin-section');
    const gameForm = document.getElementById('game-form');
    const jogosPage = document.getElementById('jogos-page');
    const competicoesPage = document.getElementById('competicoes-page');
    const classificacaoPage = document.getElementById('classificacao-page');
    const jogosLink = document.getElementById('jogos-link');
    const competicoesLink = document.getElementById('competicoes-link');
    const classificacaoLink = document.getElementById('classificacao-link');

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
            adminLoginButton.style.display = 'none';
            logoutButton.style.display = 'block';
        } else {
            adminSection.style.display = 'none';
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

    fetchGameInfo();
    showPage('jogos');
});