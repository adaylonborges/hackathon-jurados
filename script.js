// Hardcoded Judges (Login data)
const JURADOS = [
    { username: 'ana.batista', password: '482', name: 'Ana Paula Batista' },
    { username: 'andre.nery', password: '715', name: 'Andre Nery' },
    { username: 'rafael.garcia', password: '391', name: 'Rafael Venturacci Garcia' },
    { username: 'ariane.alves', password: '824', name: 'Ariane Gare Alves' },
    { username: 'andre.maldonado', password: '567', name: 'Andre Almeida Maldonado' },
    { username: 'ariovaldo.jr', password: '930', name: 'Ariovaldo Carmona Jr.' },
    { username: 'bruno.lui', password: '258', name: 'Bruno Lui' },
    { username: 'caren.rocha', password: '619', name: 'Caren Cristina Rocha' },
    { username: 'emilio.neto', password: '146', name: 'Emilio Aiolfi Neto' },
    { username: 'lucas.duarte', password: '873', name: 'Lucas Duarte' },
    { username: 'diego.poblete', password: '302', name: 'Diego Busin Poblete' },
    { username: 'lucas.falcao', password: '594', name: 'Lucas Campos Falcão' }
];

// Google Sheets Integration (Apps Script Web App URL)
// Substitua pela URL gerada no passo "Implantar como aplicativo web" do Google Apps Script
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyOX8-u02fHkVcWIehqdCn8FFTFPrUyfemo_KTxQvHWDEMQnAu2K4Mn-kmqnhsy8qk/exec';

document.addEventListener('DOMContentLoaded', () => {
    // State
    const STORAGE_KEY = 'spoint_hackathon_votes';
    const AUTH_KEY = 'spoint_hackathon_auth';
    let votes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    let currentUser = JSON.parse(localStorage.getItem(AUTH_KEY)) || null;

    // DOM Elements - Auth
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const loggedUserName = document.getElementById('logged-user-name');
    const juradoInput = document.getElementById('jurado');

    // DOM Elements - App
    const form = document.getElementById('evaluation-form');
    const radios = form.querySelectorAll('input[type="radio"]');
    const sidebarTotal = document.getElementById('sidebar-total');
    const formTotal = document.getElementById('form-total-score');

    const navVote = document.getElementById('nav-vote');
    const navResults = document.getElementById('nav-results');
    const viewVote = document.getElementById('view-vote');
    const viewResults = document.getElementById('view-results');

    const resultsBody = document.getElementById('results-body');
    const emptyState = document.getElementById('empty-state');
    const resultsTable = document.getElementById('results-table');

    const exportBtn = document.getElementById('export-csv');
    const copyBtn = document.getElementById('copy-data');
    const clearBtn = document.getElementById('clear-data');
    const toast = document.getElementById('toast');

    // Auth Logic
    function checkAuth() {
        if (currentUser) {
            loginScreen.style.display = 'none';
            appScreen.style.display = 'flex';
            loggedUserName.textContent = currentUser.name;
            juradoInput.value = currentUser.name;
        } else {
            loginScreen.style.display = 'flex';
            appScreen.style.display = 'none';
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userVal = document.getElementById('login-username').value.trim().toLowerCase();
        const passVal = document.getElementById('login-password').value;

        const user = JURADOS.find(j => j.username === userVal && j.password === passVal);
        if (user) {
            currentUser = user;
            localStorage.setItem(AUTH_KEY, JSON.stringify(user));
            loginError.style.display = 'none';
            checkAuth();
        } else {
            loginError.style.display = 'block';
        }
    });

    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem(AUTH_KEY);
        loginForm.reset();
        checkAuth();
    });

    // Initialize Auth
    checkAuth();

    // Navigation
    function switchView(viewId) {
        if (viewId === 'vote') {
            navVote.classList.add('active');
            navResults.classList.remove('active');
            viewVote.classList.add('active-view');
            viewResults.classList.remove('active-view');
        } else {
            navResults.classList.add('active');
            navVote.classList.remove('active');
            viewResults.classList.add('active-view');
            viewVote.classList.remove('active-view');
            renderTable();
        }
    }

    navVote.addEventListener('click', () => switchView('vote'));
    navResults.addEventListener('click', () => switchView('results'));

    // Score Calculation (Weighted)
    function calculateTotal() {
        let total = 0;

        const engInput = form.querySelector('input[name="eng_score"]:checked');
        const negInput = form.querySelector('input[name="neg_score"]:checked');
        const expInput = form.querySelector('input[name="exp_score"]:checked');

        if (engInput) total += parseInt(engInput.value, 10) * 2; // Peso 2
        if (negInput) total += parseInt(negInput.value, 10) * 2; // Peso 2
        if (expInput) total += parseInt(expInput.value, 10) * 1; // Peso 1

        sidebarTotal.textContent = `${total}/10`;
        formTotal.textContent = total;

        return total;
    }

    radios.forEach(radio => {
        radio.addEventListener('change', calculateTotal);
    });

    // Form Submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!currentUser) return; // Segurança extra

        const projeto = document.getElementById('projeto').value;

        // Votos de 0 a 2
        const engVote = parseInt(form.querySelector('input[name="eng_score"]:checked').value, 10);
        const negVote = parseInt(form.querySelector('input[name="neg_score"]:checked').value, 10);
        const expVote = parseInt(form.querySelector('input[name="exp_score"]:checked').value, 10);

        // Pontos ponderados
        const engPts = engVote * 2;
        const negPts = negVote * 2;
        const expPts = expVote * 1;
        const totalPts = engPts + negPts + expPts;

        const date = new Date();

        const voteRecord = {
            id: Date.now().toString(),
            dataHora: date.toLocaleString('pt-BR'),
            jurado: currentUser.name,
            projeto,
            votosRaw: `${engVote}/${negVote}/${expVote}`,
            engPts,
            negPts,
            expPts,
            totalPts
        };

        votes.push(voteRecord);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));

        // Tentar enviar para o Google Sheets se a URL estiver configurada
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;

        if (GOOGLE_SHEETS_URL) {
            submitBtn.innerHTML = 'Enviando... <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>';
            submitBtn.disabled = true;

            const formData = new URLSearchParams();
            formData.append('dataHora', voteRecord.dataHora);
            formData.append('jurado', voteRecord.jurado);
            formData.append('projeto', voteRecord.projeto);
            formData.append('votoEng', engVote);
            formData.append('votoNeg', negVote);
            formData.append('votoExp', expVote);
            formData.append('ptsEng', engPts);
            formData.append('ptsNeg', negPts);
            formData.append('ptsExp', expPts);
            formData.append('total', totalPts);

            fetch(GOOGLE_SHEETS_URL, {
                method: 'POST',
                body: formData,
                mode: 'no-cors' // Necessário para evitar erro de CORS no Apps Script
            }).then(() => {
                showToast('Avaliação salva e enviada para o Sheets!');
            }).catch((error) => {
                console.error('Erro ao enviar para o Sheets:', error);
                showToast('Salvo localmente (Erro ao enviar pro Sheets)');
            }).finally(() => {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                resetForm();
            });
        } else {
            // Se não tiver URL, só salva local e avisa
            resetForm();
            showToast('Avaliação salva localmente com sucesso!');
        }

        function resetForm() {
            form.reset();
            juradoInput.value = currentUser.name;
            calculateTotal();
            renderTable();
        }
    });

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Render Results Table
    function renderTable() {
        resultsBody.innerHTML = '';

        if (votes.length === 0) {
            resultsTable.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        resultsTable.style.display = 'table';
        emptyState.style.display = 'none';

        // Sort by newest first
        const sortedVotes = [...votes].sort((a, b) => parseInt(b.id) - parseInt(a.id));

        sortedVotes.forEach(vote => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${vote.dataHora}</td>
                <td>${vote.jurado}</td>
                <td>${vote.projeto}</td>
                <td style="text-align:center; color: var(--text-muted);">${vote.votosRaw}</td>
                <td class="score-cell">${vote.engPts}</td>
                <td class="score-cell">${vote.negPts}</td>
                <td class="score-cell">${vote.expPts}</td>
                <td class="total-cell">${vote.totalPts}</td>
            `;
            resultsBody.appendChild(tr);
        });
    }

    // Export to CSV
    exportBtn.addEventListener('click', () => {
        if (votes.length === 0) {
            alert('Não há dados para exportar.');
            return;
        }

        const headers = ['Data/Hora', 'Jurado', 'Projeto', 'Voto_Engenharia', 'Voto_Negocio', 'Voto_Experiencia', 'Pontos_Engenharia(x2)', 'Pontos_Negocio(x2)', 'Pontos_Experiencia(x1)', 'Total_Pontos'];
        const csvRows = [headers.join(',')];

        votes.forEach(vote => {
            // Separa os votos crus
            const [vE, vN, vX] = vote.votosRaw.split('/');

            // Escape values that might contain commas
            const row = [
                `"${vote.dataHora}"`,
                `"${vote.jurado}"`,
                `"${vote.projeto}"`,
                vE, vN, vX, // Votos dados 0-2
                vote.engPts,
                vote.negPts,
                vote.expPts,
                vote.totalPts
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for Excel UTF-8 BOM
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', `hackathon_votes_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // Copy to Clipboard (Formatado para colar no Sheets)
    copyBtn.addEventListener('click', () => {
        if (votes.length === 0) {
            alert('Não há dados para copiar.');
            return;
        }

        const headers = ['Data/Hora', 'Jurado', 'Projeto', 'Voto_Engenharia', 'Voto_Negocio', 'Voto_Experiencia', 'Pontos_Engenharia(x2)', 'Pontos_Negocio(x2)', 'Pontos_Experiencia(x1)', 'Total_Pontos'];
        const tsvRows = [headers.join('\t')];

        votes.forEach(vote => {
            const [vE, vN, vX] = vote.votosRaw.split('/');
            const row = [
                vote.dataHora,
                vote.jurado,
                vote.projeto,
                vE, vN, vX,
                vote.engPts,
                vote.negPts,
                vote.expPts,
                vote.totalPts
            ];
            tsvRows.push(row.join('\t')); // Usa tabulação que é o padrão de colagem do Excel/Sheets
        });

        const tsvContent = tsvRows.join('\n');

        navigator.clipboard.writeText(tsvContent).then(() => {
            showToast('Dados copiados! Cole (Ctrl+V) no Sheets.');
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            alert('Não foi possível copiar. Use o botão Exportar para CSV.');
        });
    });

    // Clear Data
    clearBtn.addEventListener('click', () => {
        if (votes.length === 0) return;

        if (confirm('Tem certeza que deseja apagar TODAS as avaliações deste dispositivo? Esta ação não pode ser desfeita.')) {
            votes = [];
            localStorage.removeItem(STORAGE_KEY);
            renderTable();
            showToast('Dados apagados com sucesso.');
        }
    });
});
