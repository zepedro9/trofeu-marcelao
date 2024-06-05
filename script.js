import { app } from './firebaseConfig.js';
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

const gameInfoDiv = document.getElementById('game-info');
const loginForm = document.getElementById('login-form');
const showLoginFormButton = document.getElementById('show-login-form');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const adminSection = document.getElementById('admin-section');
const gameForm = document.getElementById('game-form');

showLoginFormButton.addEventListener('click', () => {
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
            <div>
                <p><strong>Casa:</strong> ${game.casa}</p>
                <p><strong>Data:</strong> ${game.data.toDate().toLocaleString()}</p>
                <p><strong>Fora:</strong> ${game.fora}</p>
                <p><strong>Resultado:</strong> ${game.resultado}</p>
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
    const resultado = document.getElementById('resultado').value;

    try {
        await addDoc(collection(db, "jogos"), {
            casa: casa,
            fora: fora,
            data: new Date(data),
            resultado: resultado
        });
        fetchGameInfo();
        gameForm.reset();
    } catch (error) {
        console.error("Error adding document: ", error);
    }
});

fetchGameInfo();