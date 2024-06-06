import { app } from './firebaseConfig.js';
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
const competicoesPage = document.getElementById('competicoes-page');
const classificacaoPage = document.getElementById('classificacao-page');
const jogosLink = document.getElementById('jogos-link');
const competicoesLink = document.getElementById('competicoes-link');
const classificacaoLink = document.getElementById('classificacao-link');

function showPage(page) {
    if (page === 'jogos') {
        jogosPage.style.display = 'block';
        competicoesPage.style.display = 'none';
        classificacaoPage.style.display = 'none';
        jogosLink.classList.add('active');
        competicoesLink.classList.remove('active');
        classificacaoLink.classList.remove('active');
    } else if (page === 'competicoes') {
        jogosPage.style.display = 'none';
        competicoesPage.style.display = 'block';
        classificacaoPage.style.display = 'none';
        jogosLink.classList.remove('active');
        competicoesLink.classList.add('active');
        classificacaoLink.classList.remove('active');
    } else if (page === 'classificacao') {
        jogosPage.style.display = 'none';
        competicoesPage.style.display = 'none';
        classificacaoPage.style.display = 'block';
        jogosLink.classList.remove('active');
        competicoesLink.classList.remove('active');
        classificacaoLink.classList.add('active');
    }
}

jogosLink.addEventListener('click', () => showPage('jogos'));
competicoesLink.addEventListener('click', () => showPage('competicoes'));
classificacaoLink.addEventListener('click', () => showPage('classificacao'));

adminLoginButton.addEventListener('click', () => {
    loginForm.style.display = 'block';
});

loginButton.addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("User signed in: ", userCredential.user);
            loginForm.style.display = 'none';
        })
        .catch((error) => {
            console.error("Error signing in: ", error);
        });
});

logoutButton.addEventListener('click', () => {
    signOut(auth)
        .then(() => {
            console.log("User signed out");
        })
        .catch((error) => {
            console.error("Error signing out: ", error);
        });
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        showLoginFormButton.style.display = 'none';
        logoutButton.style.display = 'inline';
        adminSection.style.display = 'block';
    } else {
        showLoginFormButton.style.display = 'inline';
        logoutButton.style.display = 'none';
        adminSection.style.display = 'none';
    }
});

async function fetchGameInfo() {
    try {
        const jogosCol = collection(db, "jogos");
        const jogosSnapshot = await getDocs(jogosCol);
        const jogosList = jogosSnapshot.docs.map(doc => doc.data());
        gameInfoDiv.innerHTML = jogosList.map(game => `
            <div class="game-box">
                <p class="highlight">${game.casa} Vs ${game.fora}</p>
                <p>${game.competicao}</p>
                <p>${game.data.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${game.data.toDate().toLocaleDateString('en-GB')}</p>
                ${game.resultado ? `<p class="highlight">Resultado: ${game.resultado}</p>` : ''}
                ${game.vencedor ? `<p class="highlight">Vencedor: ${game.vencedor}</p>` : ''}
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
            casa: casa,
            fora: fora,
            data: new Date(data),
            competicao: competicao,
            resultado: resultado,
            vencedor: vencedor
        });
        fetchGameInfo();
        gameForm.reset();
    } catch (error) {
        console.error("Error adding document: ", error);
    }
});

fetchGameInfo();
showPage('jogos');