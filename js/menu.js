document.addEventListener('DOMContentLoaded', () => {
    if (window.NeonConta.lerContas().length === 0) {
        window.location.href = '../Neon ID/neonID.HTML';
        return;
    }

    // === 1. BANCO CENTRAL DE ECONOMIA E PROGRESSÃO ===
    function carregarBancoCentral() {
        // Inicializa valores caso ainda não existam no localStorage
        if (localStorage.getItem('nv_moedas') === null) localStorage.setItem('nv_moedas', '0');
        if (localStorage.getItem('nv_diamantes') === null) localStorage.setItem('nv_diamantes', '0');
        if (localStorage.getItem('nv_xp') === null) localStorage.setItem('nv_xp', '0');
        if (localStorage.getItem('nv_nivel_passe') === null) localStorage.setItem('nv_nivel_passe', '1');

        // Lê os valores atualizados
        const moedas = parseInt(localStorage.getItem('nv_moedas')) || 0;
        const diamantes = parseInt(localStorage.getItem('nv_diamantes')) || 0;

        // Atualiza a interface do Menu Principal (se os elementos existirem)
        const elMoedas = document.getElementById('saldo-moedas');
        const elDiamantes = document.getElementById('saldo-diamantes');

        if (elMoedas) elMoedas.textContent = moedas;
        if (elDiamantes) elDiamantes.textContent = diamantes;
    }

    // Carrega e sincroniza o Banco Central assim que o Menu abre
    carregarBancoCentral();

    // === 2. NAVEGAÇÃO DOS BOTÕES DO MENU ===
    const botoes = document.querySelectorAll('.btn-menu');
    // Ação do Botão de Eventos
    const btnEvento = document.getElementById('btn-evento');
    if (btnEvento) {
        btnEvento.addEventListener('click', () => {
            // Redireciona para a página de eventos ou abre um modal
            window.location.href = 'eventos.html';
        });
    }

    const modalInbox = document.getElementById('modal-inbox');
    const listaMensagens = document.getElementById('lista-mensagens');
    const badgeInbox = document.getElementById('badge-inbox');
    function atualizarInbox() {
        const pendente = window.NeonConta.obterPendente();
        const mensagens = window.NeonConta.lerMensagens();
        badgeInbox.hidden = !pendente && !mensagens.some(mensagem => !mensagem.lida);
        listaMensagens.replaceChildren();
        if (pendente) {
            const pedido = document.createElement('article');
            pedido.className = 'mensagem mensagem-store';
            pedido.innerHTML = `<strong>Acesso à Store</strong><p>A conta ${pendente} pediu autorização para entrar na Store externa.</p>`;
            const acoes = document.createElement('div');
            acoes.className = 'inbox-acoes';
            acoes.innerHTML = '<button id="confirmar-store">CONFIRMAR</button><button id="recusar-store">RECUSAR</button>';
            pedido.appendChild(acoes);
            listaMensagens.appendChild(pedido);
            document.getElementById('confirmar-store').addEventListener('click', () => {
                const conta = window.NeonConta.ativarConta(window.NeonConta.obterPendente());
                if (conta) { localStorage.setItem('nv_store_autorizada', conta.id); window.NeonConta.limparPendente(); modalInbox.hidden = true; carregarBancoCentral(); atualizarInbox(); }
            });
            document.getElementById('recusar-store').addEventListener('click', () => { window.NeonConta.limparPendente(); modalInbox.hidden = true; atualizarInbox(); });
        }
        mensagens.forEach(mensagem => {
            const item = document.createElement('article');
            item.className = `mensagem${mensagem.lida ? ' lida' : ''}`;
            item.innerHTML = `<strong>${mensagem.titulo}</strong><p>${mensagem.texto}</p>`;
            listaMensagens.appendChild(item);
        });
        if (!pendente && mensagens.length === 0) listaMensagens.innerHTML = '<p class="sem-mensagens">Nenhuma mensagem nova.</p>';
    }
    document.getElementById('btn-inbox').addEventListener('click', () => { window.NeonConta.marcarMensagensLidas(); atualizarInbox(); modalInbox.hidden = false; });
    document.getElementById('fechar-inbox').addEventListener('click', () => { modalInbox.hidden = true; });
    document.getElementById('btn-store-externa').addEventListener('click', () => { window.location.href = '../Store/store.html'; });
    atualizarInbox();

    botoes.forEach(botao => {
        botao.addEventListener('click', (e) => {
            // Pega a ação do botão ou do elemento pai (para garantir o clique correto no texto)
            const elementoClicado = e.target.closest('.btn-menu');
            const acao = elementoClicado ? elementoClicado.getAttribute('data-action') : null;

            switch (acao) {
                case 'jogar':
                    sessionStorage.removeItem('nv_evento_ativo_id');
                    sessionStorage.removeItem('nv_evento_fase_atual');
                    sessionStorage.removeItem('nv_evento_fases_totais');
                    window.location.href = 'jogo.html';
                    break;

                case 'configuracoes':
                    window.location.href = 'configuracoes.html';
                    break;

                case 'loja':
                    window.location.href = 'loja.html';
                    break;

                case 'passe':
                    window.location.href = 'passe.html';
                    break;

                case 'skins':
                    window.location.href = 'skins.html';
                    break;

                case 'sair':
                    alert('Obrigado por jogar Neon Void!');
                    break;

            }
        });
    });
});

// === 3. FUNÇÃO GLOBAL PARA ADICIONAR XP AO BANCO CENTRAL ===
// Esta função pode ser chamada em qualquer lugar do jogo (ex: no encerramento da partida em jogo.js)
window.adicionarXPAoBanco = function (qtd) {
    let xpAtual = parseInt(localStorage.getItem('nv_xp')) || 0;
    let nivelAtual = parseInt(localStorage.getItem('nv_nivel_passe')) || 1;

    xpAtual += qtd;

    // A cada 200 de XP, avança 1 Nível no Passe de Batalha
    while (xpAtual >= 200) {
        xpAtual -= 200;
        nivelAtual += 1;
    }

    localStorage.setItem('nv_xp', xpAtual);
    localStorage.setItem('nv_nivel_passe', nivelAtual);
    const conta = window.NeonConta?.obterAtiva();
    if (conta) window.NeonConta.atualizarConta(conta.id, { passeXp: xpAtual, passeNivel: nivelAtual });
};