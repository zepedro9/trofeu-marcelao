import { app } from './firebaseConfig.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const db = getFirestore(app);
    const auth = getAuth(app);
    const isAdminLoggedIn = false

    const elements = {
        navToggle: document.querySelector('.nav-toggle'),
        navLinks: document.querySelector('.nav-links'),
        navLinksItems: document.querySelectorAll('.nav-links a'),
        gameInfoDiv: document.getElementById('game-info'),
        loginForm: document.getElementById('login-form'),
        adminLoginButton: document.getElementById('admin-login-button'),
        loginButton: document.getElementById('login-button'),
        logoutButton: document.getElementById('logout-button'),
        adminGameSection: document.getElementById('admin-game-section'),
        adminCompetitionSection: document.getElementById('admin-competition-section'),
        gameForm: document.getElementById('create-game-form'),
        jogosPage: document.getElementById('jogos-page'),
        competitionPage: document.getElementById('competition-page'),
        classificacaoPage: document.getElementById('classificacao-page'),
        jogosLink: document.getElementById('jogos-link'),
        competitionLink: document.getElementById('competition-link'),
        classificacaoLink: document.getElementById('classificacao-link'),
        competitionInfoDiv: document.getElementById('competition-info'),
        competitionForm: document.getElementById('competition-form'),
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
        isAdminLoggedIn = true;
        elements.adminGameSection.style.display = display;
        elements.adminCompetitionSection.style.display = display;
        elements.adminLoginButton.style.display = user ? 'none' : 'block';
        elements.logoutButton.style.display = user ? 'block' : 'none';
    }

    // Function to fetch users from Firestore
    async function fetchUsers() {
        const snapshot = await getDocs(collection(db, 'jogadores'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async function fetchData(collectionName, renderFunction) {
        try {
            const snapshot = await getDocs(collection(db, collectionName));
            const dataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderFunction(dataList);
        } catch (error) {
            console.error(`Error fetching ${collectionName} information:`, error);
            renderFunction([]);
        }
    }

    function getIsPastGame(gameDateTime) {
        // Get the current date and time in the Portuguese time zone
        const currentDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
        return gameDateTime < currentDateTime;
    }

    async function fetchPredictions() {
        const snapshot = await getDocs(collection(db, 'previsoes'));
        return snapshot.docs.map(doc => doc.data());
    }    

    async function renderGames(games) {
        const users = await fetchUsers();
        const predictions = await fetchPredictions();

        // Create a lookup for predictions by game and user
        const predictionLookup = predictions.reduce((acc, pred) => {
            if (!acc[pred.Jogo]) {
                acc[pred.Jogo] = {};
            }
            acc[pred.Jogo][pred.Jogador] = pred;  // Store the entire prediction object
            return acc;
        }, {});
    
        // Sort the games array with the newest games first
        games.sort((a, b) => b.Data.toDate() - a.Data.toDate());
    
        elements.gameInfoDiv.innerHTML = games.map(game => {
            const gameDateTime = new Date(game.Data.toDate().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
            const isPastGame = getIsPastGame(gameDateTime);

            const usersWithoutPredictions = users.filter(user => !predictionLookup[game.id] || !predictionLookup[game.id][user.Nome]);
            const usersWithPredictions = users.filter(user => predictionLookup[game.id] && predictionLookup[game.id][user.Nome]);

            return `
                <div id="${game.id}" class="game-box ${isPastGame ? 'past-game' : ''}">
                    <p class="highlight">${game.Casa} Vs ${game.Fora}</p>
                    <p class="subdued">${game.Competicao}</p>
                    <p class="subdued">${gameDateTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p class="subdued">${gameDateTime.toLocaleDateString('en-GB')}</p>
                    ${game.Resultado ? `<p class="highlight">Resultado: ${game.Resultado}</p>` : ''}

                    ${isPastGame && usersWithPredictions.length > 0 ? `
                        <p class="separator"></p>
                        <p class="highlight">Previsões</p>
                        ${usersWithPredictions.map(user => `
                            <p class="subdued ${(game.Resultado == (predictionLookup[game.id][user.Nome].Casa + " - " + predictionLookup[game.id][user.Nome].Fora)) ? 'winner' : ''}">${user.Nome}: ${predictionLookup[game.id][user.Nome].Casa} - ${predictionLookup[game.id][user.Nome].Fora}</p>
                        `).join('')}
                    ` : ''}

                    ${!isPastGame && usersWithoutPredictions.length > 0 ? `
                        <form id="${game.id}-prediction-form" class="prediction-form hidden">
                            <p class="separator"></p>
                            <p class="highlight">Submeter previsão:</p>
                            <p>Seleciona quem és:</p>
                            <div>
                                ${usersWithoutPredictions.map(user => `
                                    <div class="user-selector">
                                        <input type="radio" id="${game.id}-${user.id}" name="username" value="${user.Nome}" required>
                                        <label for="${game.id}-${user.id}">${user.Nome}</label>
                                    </div>
                                `).join('')}
                            </div>
                            <div>
                                <label for="${game.id}-casa">${game.Casa}:</label>
                                <input type="number" id="${game.id}-casa" name="casa" required/>
                            </div>
                            <div>
                                <label for="${game.id}-fora">${game.Fora}:</label>
                                <input type="number" id="${game.id}-fora" name="fora" required/>
                            </div>
                            <div>
                                <label for="${game.id}-password">Password:</label>
                                <input type="password" id="${game.id}-password" name="password" required/>
                            </div>
                            <button type="submit">Submit Prediction</button>
                        </form>
                    ` : ''}

                    ${isPastGame && isAdminLoggedIn ? `
                        <form id="set-game-result-form" onsubmit="handleSetGameResultFormSubmit(event, '${game.id}')">
                            <input type="text" id="casa" placeholder="${game.Casa}" required />
                            <input type="text" id="fora" placeholder="${game.Fora}" required />
                            <button type="submit">Submit Game</button>
                        </form>
                    ` : ''}
                </div>
            `;
        }).join('') || "Não há jogos para mostrar de momento.";
    
        document.querySelectorAll('.game-box').forEach(box => {
            if (!box.classList.contains('past-game')) {
                box.addEventListener('click', function(event) {
                    // Prevent the document click handler from firing immediately
                    event.stopPropagation();
        
                    // Hide all other games and expand the clicked one
                    document.querySelectorAll('.game-box').forEach(box => {
                        box.classList.add('hidden');
                        if (!box.classList.contains('past-game')) {
                            const form = box.querySelector('.prediction-form');
                            form.classList.add('hidden');
                            // Remove required attributes when form is hidden
                            form.querySelectorAll('[required]').forEach(input => input.removeAttribute('required'));
                        }
                    });
                    this.classList.remove('hidden');
                    this.classList.add('expanded');
                    const form = this.querySelector('.prediction-form');
                    form.classList.remove('hidden');
                    // Add required attributes when form is shown
                    form.querySelectorAll('input').forEach(input => input.setAttribute('required', 'required'));
        
                    // Add event listener to radio buttons to check password status
                    form.querySelectorAll('input[type="radio"][name="username"]').forEach(radio => {
                        radio.addEventListener('change', function() {
                            const selectedUser = users.find(user => user.Nome === this.value);
                            const passwordLabel = form.querySelector(`label[for="${radio.id.split('-')[0]}-password"]`);
                            if (selectedUser && selectedUser.Password === '') {
                                passwordLabel.textContent = 'Criar password:';
                            } else {
                                passwordLabel.textContent = 'Password:';
                            }
                        });
                    });
        
                    // Add a click listener to the document to close the expanded box when clicking outside
                    document.addEventListener('click', function closeBox(event) {
                        if (!box.contains(event.target)) {
                            // Show all game boxes
                            document.querySelectorAll('.game-box').forEach(box => {
                                box.classList.remove('hidden');
                                if (!box.classList.contains('past-game')) {
                                    const form = box.querySelector('.prediction-form');
                                    form.classList.add('hidden');
                                    // Remove required attributes when form is hidden
                                    form.querySelectorAll('[required]').forEach(input => input.removeAttribute('required'));
                                }
                            });
                            box.classList.remove('expanded');
                            
                            // Remove this event listener after execution
                            document.removeEventListener('click', closeBox);
                        }
                    });
                });
            }
        });        
    
        games.forEach(game => {
            const gameDateTime = new Date(game.Data.toDate().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }));
            if (!getIsPastGame(gameDateTime)) {
                const form = document.getElementById(`${game.id}-prediction-form`);
                form.addEventListener('submit', async function(event) {
                    event.preventDefault();
                    
                    if (!form.reportValidity()) {
                        alert('Preenche todos campos antes de submeter');
                        return;
                    }
        
                    const formData = new FormData(event.target);
                    const username = formData.get('username');
                    const casa = formData.get('casa');
                    const fora = formData.get('fora');
                    const password = formData.get('password');
                    
                    const userDoc = users.find(user => user.Nome === username);
                    console.log("Password: " + password);
                    const hashedPassword = await hashPassword(password);
                    console.log("Hashed password: " + hashedPassword);

                    const previsao = {
                        Casa: casa,
                        Fora: fora,
                        Jogador: username,
                        Jogo: game.id
                    };
        
                    if (userDoc) {
                        if (userDoc.Password === '') {
                            // Setting the new password is not working for some reason..
                            await updateDoc(doc(db, "jogadores", userDoc.id), { Password: hashedPassword });
                            await addDoc(collection(db, 'previsoes'), previsao);
                            alert(`Password criada e previsão submetida: ${game.Casa} ${casa} - ${game.Fora} ${fora}`);
                            window.location.reload();
                        } else if (userDoc.Password === hashedPassword) {
                            await addDoc(collection(db, 'previsoes'), previsao);
                            alert(`Previsão submetida: ${game.Casa} ${casa} - ${game.Fora} ${fora}`);
                            window.location.reload();
                        } else {
                            alert('Password errada.');
                        }
                    }
                });
            }
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

    function handleCreateGameFormSubmit(e) {
        e.preventDefault();
        const data = {
            Casa: document.getElementById('casa').value,
            Fora: document.getElementById('fora').value,
            Data: new Date(document.getElementById('data').value),
            Competicao: document.getElementById('competicao').value,
            Resultado: "",
        };
        addDocument("jogos", data, () => fetchData("jogos", renderGames));
        elements.gameForm.reset();
    }

    async function handleSetGameResultFormSubmit(e, gameId) {
        e.preventDefault();
        const data = {
            Casa: document.getElementById('casa').value,
            Fora: document.getElementById('fora').value,
        };
        await updateDoc(doc(db, "jogos", gameId), { Resultado: data.Casa + " - " + data.Fora });
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

    elements.gameForm.addEventListener('submit', handleCreateGameFormSubmit);
    elements.competitionForm.addEventListener('submit', handleCompetitionFormSubmit);

    fetchData("jogos", renderGames);
    fetchData("competicoes", renderCompetitions);
    fetchData("jogadores", renderLeaderboard);

    showPage('jogos');
});