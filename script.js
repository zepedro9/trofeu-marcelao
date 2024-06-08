import { app } from './firebaseConfig.js';
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const db = getFirestore(app);
    const auth = getAuth(app);

    const elements = {
        navToggle: document.querySelector('.nav-toggle'),
        navLinks: document.querySelector('.nav-links'),
        navLinksItems: document.querySelectorAll('.nav-links a'),
        gameInfoDiv: document.getElementById('game-info'),
        loginForm: document.getElementById('login-form'),
        adminLoginButton: document.getElementById('admin-login-button'),
        loginButton: document.getElementById('login-button'),
        logoutButton: document.getElementById('logout-button'),
        adminSection: document.getElementById('admin-section'),
        gameForm: document.getElementById('game-form'),
        jogosPage: document.getElementById('jogos-page'),
        competitionPage: document.getElementById('competition-page'),
        classificacaoPage: document.getElementById('classificacao-page'),
        jogosLink: document.getElementById('jogos-link'),
        competitionLink: document.getElementById('competition-link'),
        classificacaoLink: document.getElementById('classificacao-link'),
        competitionInfoDiv: document.getElementById('competition-info'),
        competitionForm: document.getElementById('competition-form'),
        adminCompetitionSection: document.getElementById('admin-competition-section'),
        leaderboardDiv: document.getElementById('leaderboard'),
    };
    
    elements.navToggle.addEventListener('click', function() {
        elements.navLinks.classList.toggle('nav-active');
    });

    elements.navLinksItems.forEach(link => {
        link.addEventListener('click', function() {
            elements.navLinks.classList.remove('nav-active');
        });
    });

    // Helper function to hash passwords
    async function hashPassword(password) {
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function showPage(page) {
        const pages = ['jogos', 'competition', 'classificacao'];
        pages.forEach(p => {
            elements[`${p}Page`].style.display = p === page ? 'block' : 'none';
            elements[`${p}Link`].classList.toggle('active', p === page);
        });
    }

    function toggleLoginForm() {
        elements.loginForm.style.display = elements.loginForm.style.display === 'block' ? 'none' : 'block';
    }

    function handleAuthStateChanged(user) {
        const display = user ? 'block' : 'none';
        elements.adminSection.style.display = display;
        elements.adminCompetitionSection.style.display = display;
        elements.adminLoginButton.style.display = user ? 'none' : 'block';
        elements.logoutButton.style.display = user ? 'block' : 'none';
    }

    // Function to fetch users from Firestore
    async function fetchUsers() {
        const snapshot = await getDocs(collection(db, 'jogadores'));
        return snapshot.docs.map(doc => doc.data());
    }

    async function fetchData(collectionName, renderFunction) {
        try {
            const snapshot = await getDocs(collection(db, collectionName));
            const dataList = snapshot.docs.map(doc => doc.data());
            renderFunction(dataList);
        } catch (error) {
            console.error(`Error fetching ${collectionName} information:`, error);
            renderFunction([]);
        }
    }

    async function renderGames(games) {
        const users = await fetchUsers();

        // Get the current date and time in the Portuguese time zone
        const currentDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
    
        // Sort the games array with the newest games first
        games.sort((a, b) => b.Data.toDate() - a.Data.toDate());
    
        elements.gameInfoDiv.innerHTML = games.map(game => {
            const gameDateTime = new Date(game.Data.toDate().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
            const isPastGame = gameDateTime < currentDateTime;
            return `
                <div id="${game.id}" class="game-box ${isPastGame ? 'past-game' : ''}">
                    <p class="highlight">${game.Casa} Vs ${game.Fora}</p>
                    <p class="subdued">${game.Competicao}</p>
                    <p class="subdued">${gameDateTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p class="subdued">${gameDateTime.toLocaleDateString('en-GB')}</p>
                    ${game.Resultado ? `<p class="highlight">Resultado: ${game.Resultado}</p>` : ''}
                    ${game.Vencedor ? `<p class="highlight">Vencedor: ${game.Vencedor}</p>` : ''}
                    <br><br>
                    <form id="${game.id}-prediction-form" class="prediction-form hidden">
                        <div>
                            ${users.map(user => `
                                <div>
                                    <input type="radio" id="${game.id}-${user.id}" name="username" value="${user.Nome}" required>
                                    <label for="${game.id}-${user.id}">${user.Nome}</label>
                                </div>
                            `).join('')}
                        </div>
                        <div>
                            <label for="${game.id}-casa">${game.Casa}:</label>
                            <input type="number" id="${game.id}-casa" name="casa" required>
                        </div>
                        <div>
                            <label for="${game.id}-fora">${game.Casa}:</label>
                            <input type="number" id="${game.id}-fora" name="fora" required>
                        </div>
                        <div>
                            <label for="${game.id}-password">Password:</label>
                            <input type="password" id="${game.id}-password" name="password" required>
                        </div>
                        <button type="submit">Submit Prediction</button>
                    </form>
                </div>
            `;
        }).join('') || "Error loading game information.";

        // Add event listeners for toggling visibility
        document.querySelectorAll('.game-box').forEach(box => {
            box.addEventListener('click', function() {
                if (this.classList.contains('expanded')) {
                    // Remove expanded class to show all games
                    document.querySelectorAll('.game-box').forEach(box => {
                        box.classList.remove('hidden');
                    });
                    this.classList.remove('expanded');
                } else {
                    // Hide all other games and expand the clicked one
                    document.querySelectorAll('.game-box').forEach(box => {
                        box.classList.add('hidden');
                    });
                    this.classList.remove('hidden');
                    this.classList.add('expanded');
                }
            });
        });

        games.map(game => {
            document.getElementById(`${game.id}-prediction-form`).addEventListener('submit', async function(event) {
                event.preventDefault();
                const formData = new FormData(event.target);
                const username = formData.get(`${game.id}-username`);
                const casa = formData.get(`${game.id}-casa`);
                const fora = formData.get(`${game.id}-fora`);
                const password = formData.get(`${game.id}-password`);
                
                const userDoc = users.find(user => user.Nome === username);
                const hashedPassword = await hashPassword(password);

                if (userDoc && userDoc.Password === hashedPassword) {
                    alert(`Prediction submitted: ${game.Casa} ${casa} - ${game.Fora} ${fora}`);
                } else {
                    alert('Incorrect password.');
                }
            });
        });
    }

    function renderCompetitions(competitions) {
        elements.competitionInfoDiv.innerHTML = competitions.map(comp => `
            <div class="competition-box">
                <p class="highlight">${comp.Nome}</p>
                <p class="subdued">Limite: ${comp.Limite.toDate().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</p>
                ${comp.Vencedor ? `<p class="highlight">Vencedor: ${comp.Vencedor}</p>` : ''}
            </div>
        `).join('') || "Error loading competition information.";
    }

    function renderLeaderboard(players) {
        players.sort((a, b) => b.Pontos - a.Pontos);
        elements.leaderboardDiv.querySelector('tbody').innerHTML = players.map(player => `
            <tr>
                <td class="highlight">${player.Nome}</td>
                <td class="subdued">${player.Pontos}</td>
                <td class="subdued">${player.Ganhos} €</td>
            </tr>
        `).join('') || "<tr><td colspan='3'>Error loading leaderboard information.</td></tr>";
    }

    async function addDocument(collectionName, data, fetchFunction) {
        try {
            await addDoc(collection(db, collectionName), data);
            fetchFunction();
        } catch (error) {
            console.error(`Error adding document to ${collectionName}:`, error);
        }
    }

    function handleGameFormSubmit(e) {
        e.preventDefault();
        const data = {
            Casa: document.getElementById('casa').value,
            Fora: document.getElementById('fora').value,
            Data: new Date(document.getElementById('data').value),
            Competicao: document.getElementById('competicao').value,
            Resultado: document.getElementById('resultado').value,
            Vencedor: document.getElementById('vencedor').value,
        };
        addDocument("jogos", data, () => fetchData("jogos", renderGames));
        elements.gameForm.reset();
    }

    function handleCompetitionFormSubmit(e) {
        e.preventDefault();
        const data = {
            Nome: document.getElementById('nome').value,
            Limite: new Date(document.getElementById('limite').value),
            Vencedor: document.getElementById('vencedor-competicao').value,
        };
        addDocument("competicoes", data, () => fetchData("competicoes", renderCompetitions));
        elements.competitionForm.reset();
    }

    elements.jogosLink.addEventListener('click', () => showPage('jogos'));
    elements.competitionLink.addEventListener('click', () => showPage('competition'));
    elements.classificacaoLink.addEventListener('click', () => showPage('classificacao'));

    elements.adminLoginButton.addEventListener('click', toggleLoginForm);

    elements.loginButton.addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                elements.loginForm.style.display = 'none';
            })
            .catch(error => console.error("Error signing in: ", error));
    });

    elements.logoutButton.addEventListener('click', () => {
        signOut(auth)
            .then(() => console.log("User signed out"))
            .catch(error => console.error("Error signing out: ", error));
    });

    onAuthStateChanged(auth, handleAuthStateChanged);

    elements.gameForm.addEventListener('submit', handleGameFormSubmit);
    elements.competitionForm.addEventListener('submit', handleCompetitionFormSubmit);

    fetchData("jogos", renderGames);
    fetchData("competicoes", renderCompetitions);
    fetchData("jogadores", renderLeaderboard);

    showPage('jogos');
});