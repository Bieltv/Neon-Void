document.addEventListener('DOMContentLoaded', () => {
    // ELEMENTOS DO DOM
    const btnVoltar = document.getElementById('btn-voltar');
    const inputCodigo = document.getElementById('input-codigo');
    const btnResgatarCodigo = document.getElementById('btn-resgatar-codigo');
    const btnResetarDados = document.getElementById('btn-resetar-dados');

    // PAINEL ADM
    const painelADM = document.getElementById('painel-adm');
    const admMoedas = document.getElementById('adm-moedas');
    const admDiamantes = document.getElementById('adm-diamantes');
    const admPasse = document.getElementById('adm-passe');
    const admRGB = document.getElementById('adm-rgb');
    const admDesbloquearNiveisPasse = document.getElementById('adm-desbloquear-niveis-passe');
    const btnSalvarADM = document.getElementById('btn-salvar-adm');
    admMoedas.max = LIMITE_RECURSO;
    admDiamantes.max = LIMITE_RECURSO;

    // === SISTEMA DE NOTIFICAÇÃO DO JOGO ===
    function mostrarNotificacao(mensagem, tipo = 'info') {
        let toast = document.getElementById('notificacao-jogo');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'notificacao-jogo';
            toast.style.cssText = `
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%);
                background: #11111a;
                border: 2px solid #00f0ff;
                color: #ffffff;
                padding: 12px 24px;
                font-family: 'Press Start 2P', monospace;
                font-size: 0.65rem;
                box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
                z-index: 10000;
                transition: opacity 0.3s ease;
                text-align: center;
            `;
            document.body.appendChild(toast);
        }

        toast.style.borderColor = tipo === 'erro' ? '#ff4444' : (tipo === 'sucesso' ? '#00ff66' : '#00f0ff');
        toast.style.boxShadow = `0 0 15px ${toast.style.borderColor}`;
        toast.textContent = mensagem;
        toast.style.opacity = '1';

        setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    }

    // === VOLTAR AO MENU ===
    btnVoltar.addEventListener('click', () => {
        window.location.href = 'menu.html';
    });

    // === CÓDIGOS SECRETOS / MODO ADM ===
    btnResgatarCodigo.addEventListener('click', () => {
        const codigo = inputCodigo.value.trim();

        if (codigo === '89056') {
            painelADM.classList.remove('escondido');
            carregarDadosADM();
            mostrarNotificacao("MODO ADM ATIVADO COM SUCESSO!", "sucesso");
            inputCodigo.value = '';
        } else if (codigo !== '') {
            mostrarNotificacao("CÓDIGO INVÁLIDO OU EXPIRADO!", "erro");
        }
    });

    // === EXCLUIR DADOS DA CONTA (LIMPAR LOCALSTORAGE) ===
    btnResetarDados.addEventListener('click', () => {
        const confirmacao = confirm("TEM CERTEZA? Isso excluirá todas as moedas, diamantes e progresso permanentemente!");

        if (confirmacao) {
            localStorage.clear();
            mostrarNotificacao("TODOS OS DADOS FORAM APAGADOS!", "sucesso");
            setTimeout(() => {
                window.location.href = 'menu.html';
            }, 1500);
        }
    });

    // === FUNÇÕES DO MODO ADM ===
    function carregarDadosADM() {
        admMoedas.value = localStorage.getItem('nv_moedas') || 0;
        admDiamantes.value = localStorage.getItem('nv_diamantes') || 0;

        // Verifica se a opção de "Todos os Passes" está ativada
        const todosPassesAtivos = localStorage.getItem('nv_todos_passes_desbloqueados') === 'true';
        admPasse.checked = todosPassesAtivos || (localStorage.getItem('nv_passe_comprado') === 'true');

        admRGB.checked = localStorage.getItem('nv_skin_rgb_desbloqueada') === 'true';

        // Checa se o nível do passe já está no máximo (15)
        const nivelAtual = parseInt(localStorage.getItem('nv_nivel_passe')) || 1;
        admDesbloquearNiveisPasse.checked = (nivelAtual >= 15);
    }

    btnSalvarADM.addEventListener('click', () => {
        salvarMoedas(admMoedas.value);
        salvarDiamantes(admDiamantes.value);

        // Se a caixinha do Passe estiver marcada, ativa o passe de todos os meses
        if (admPasse.checked) {
            localStorage.setItem('nv_todos_passes_desbloqueados', 'true');
            localStorage.setItem('nv_passe_comprado', 'true');
        } else {
            localStorage.setItem('nv_todos_passes_desbloqueados', 'false');
            localStorage.setItem('nv_passe_comprado', 'false');
        }

        localStorage.setItem('nv_skin_rgb_desbloqueada', admRGB.checked ? 'true' : 'false');

        // Lógica para desbloquear os 15 níveis e liberar todas as recompensas
        if (admDesbloquearNiveisPasse.checked) {
            localStorage.setItem('nv_nivel_passe', 15);
            localStorage.setItem('nv_xp', 0);

            // Resgata automaticamente todas as 15 recompensas das faixas Grátis e Premium
            const todasRecompensas = [];
            for (let i = 1; i <= 15; i++) {
                todasRecompensas.push(`gratis_${i}`);
                todasRecompensas.push(`premium_${i}`);
            }

            localStorage.setItem('nv_recompensas_resgatadas', JSON.stringify(todasRecompensas));
        }

        mostrarNotificacao("TODOS OS PASSES E RECOMPENSAS LIBERADOS!", "sucesso");
    });
});