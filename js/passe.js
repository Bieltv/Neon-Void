document.addEventListener('DOMContentLoaded', async () => {
    // === CONSTANTES GLOBAIS ===
    const LIMITE_RECURSO = 20000000;
    
    // === CARREGAMENTO ASSÍNCRONO DOS JSONs ===
    async function carregarJsonAssincrono(caminhoRelativo) {
        try {
            let res = await fetch(`../${caminhoRelativo}`);
            if (!res.ok) res = await fetch(caminhoRelativo);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn(`Erro ao carregar ${caminhoRelativo}, usando dados locais:`, e);
        }
        return null;
    }

    const bancoPasseJson = await carregarJsonAssincrono('data/passe.json');
    const bancoCaixaJson = await carregarJsonAssincrono('data/caixa.json');
    
    // === DEFINIR OPÇÕES DE CAIXA ===
    const opcoesCaixaSorte = bancoCaixaJson?.opcoes || [50, 100, 150, 200, 250];

    // === DETECÇÃO AUTOMÁTICA DO MÊS VIGENTE ===
    // === DETECÇÃO AUTOMÁTICA DE MÊS E ANO ===
    const nomesMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril',
        'Maio', 'Junho', 'Julho', 'Agosto',
        'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const hoje = new Date();
    const mesNome = nomesMeses[hoje.getMonth()];
    const anoAtual = hoje.getFullYear();

    // Cria a chave única da temporada (Ex: "Setembro_2026")
    const chaveTemporadaAtual = `${mesNome}_${anoAtual}`;

    // === VERIFICAÇÃO E RESET DE VIRADA DE TEMPORADA ===
    const ultimaTemporadaSalva = localStorage.getItem('nv_passe_mes_ativo');

    if (ultimaTemporadaSalva !== chaveTemporadaAtual) {
        // Virou o mês ou o ano! Reseta o progresso para a nova temporada
        localStorage.setItem('nv_passe_mes_ativo', chaveTemporadaAtual);
        localStorage.setItem('nv_nivel_passe', '1');
        localStorage.setItem('nv_xp', '0');
        localStorage.setItem('nv_passe_comprado', 'false');
        localStorage.setItem('nv_passe_resgatados', JSON.stringify([]));
    }

    // === SELEÇÃO DA TEMPORADA NO JSON ===
    const temporadas = bancoPasseJson?.temporadas || {};
    const dadosPasseAtual = temporadas[chaveTemporadaAtual] || null;

    const XP_POR_NIVEL = bancoPasseJson?.XP_POR_NIVEL || 200;
    const PRECO_PASSE_DIAMANTES = bancoPasseJson?.PRECO_PASSE_DIAMANTES || 420;

    // Listas limpas se não houver passe para o mês/ano atual
    const passeGratis = dadosPasseAtual?.passeGratis || [];
    const passePremium = dadosPasseAtual?.passePremium || [];

    // === BANCO DE DADOS CENTRAL (LocalStorage) ===
    let moedas = parseInt(localStorage.getItem('nv_moedas')) || 0;
    let diamantes = parseInt(localStorage.getItem('nv_diamantes')) || 0;
    let xpAtual = parseInt(localStorage.getItem('nv_xp')) || 0;
    let nivelJogador = parseInt(localStorage.getItem('nv_nivel_passe')) || 1;
    let passeComprado = localStorage.getItem('nv_passe_comprado') === 'true';
    let resgatados = JSON.parse(localStorage.getItem('nv_passe_resgatados')) || [];

    // === PROCESSAMENTO E SEGURANÇA DE XP / NÍVEL ===
    while (xpAtual >= XP_POR_NIVEL && nivelJogador < 15) {
        xpAtual -= XP_POR_NIVEL;
        nivelJogador++;
    }

    if (nivelJogador >= 15) {
        nivelJogador = 15;
    }

    localStorage.setItem('nv_xp', xpAtual);
    localStorage.setItem('nv_nivel_passe', nivelJogador);

    // ELEMENTOS DO DOM
    const elMoedas = document.getElementById('qtd-moedas');
    const elDiamantes = document.getElementById('qtd-diamantes');
    const listaGratis = document.getElementById('lista-gratis');
    const listaPremium = document.getElementById('lista-premium');
    const btnVoltar = document.getElementById('btn-voltar');
    const btnComprarPasse = document.getElementById('btn-comprar-passe');
    const btnColetarTudo = document.getElementById('btn-coletar-tudo');

    const elNivelPasse = document.getElementById('nivel-passe') || document.getElementById('hud-nivel-passe');
    const elTextoXp = document.getElementById('texto-xp') || document.getElementById('hud-xp-texto');
    const elBarraXp = document.getElementById('barra-xp-fill') || document.getElementById('hud-barra-xp');

    const modalCaixa = document.getElementById('modal-caixa');
    const resultadoCaixa = document.getElementById('resultado-caixa');
    const btnColetarCaixa = document.getElementById('btn-coletar-caixa');
    let recompensaCaixaPendente = 0;

    function sincronizarPasseNaConta() {
        const conta = window.NeonConta?.obterAtiva();
        if (!conta) return;
        window.NeonConta.atualizarConta(conta.id, {
            moedas,
            diamantes,
            passeComprado,
            passeTemporada: chaveTemporadaAtual,
            passeNivel: nivelJogador,
            passeXp: xpAtual,
            passeResgatados: resgatados
        });
    }

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
                font-size: 0.7rem;
                box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
                z-index: 10000;
                transition: opacity 0.3s ease;
                text-align: center;
            `;
            document.body.appendChild(toast);
        }

        if (tipo === 'erro') {
            toast.style.borderColor = '#ff4444';
            toast.style.boxShadow = '0 0 15px rgba(255, 68, 68, 0.5)';
        } else if (tipo === 'sucesso') {
            toast.style.borderColor = '#00ff66';
            toast.style.boxShadow = '0 0 15px rgba(0, 255, 102, 0.5)';
        } else {
            toast.style.borderColor = '#00f0ff';
            toast.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.5)';
        }

        toast.textContent = mensagem;
        toast.style.opacity = '1';

        setTimeout(() => {
            toast.style.opacity = '0';
        }, 3000);
    }

    function atualizarRecursos() {
        moedas = Math.min(LIMITE_RECURSO, Math.max(0, moedas));
        diamantes = Math.min(LIMITE_RECURSO, Math.max(0, diamantes));
        if (elMoedas) elMoedas.textContent = moedas;
        if (elDiamantes) elDiamantes.textContent = diamantes;

        localStorage.setItem('nv_moedas', moedas);
        localStorage.setItem('nv_diamantes', diamantes);
        sincronizarPasseNaConta();

        if (elNivelPasse) elNivelPasse.textContent = nivelJogador;
        if (elTextoXp) {
            elTextoXp.textContent = nivelJogador >= 15 ? 'MAX' : `${xpAtual} / ${XP_POR_NIVEL} XP`;
        }
        if (elBarraXp) {
            const porcentagem = nivelJogador >= 15 ? 100 : (xpAtual / XP_POR_NIVEL) * 100;
            elBarraXp.style.width = `${porcentagem}%`;
        }

        atualizarEstadoBotaoComprar();
    }

    function atualizarEstadoBotaoComprar() {
        if (!btnComprarPasse) return;

        if (passeComprado) {
            btnComprarPasse.textContent = "PASSE ATIVO";
            btnComprarPasse.disabled = true;
            btnComprarPasse.style.borderColor = "#00ff66";
            btnComprarPasse.style.color = "#00ff66";
        } else {
            btnComprarPasse.textContent = `COMPRAR PASSE (💎 ${PRECO_PASSE_DIAMANTES})`;
            btnComprarPasse.disabled = false;
        }
    }

    if (btnComprarPasse) {
        btnComprarPasse.addEventListener('click', () => {
            if (passeComprado) return;

            if (diamantes >= PRECO_PASSE_DIAMANTES) {
                if (!window.gastarDiamantes(PRECO_PASSE_DIAMANTES)) return;
                diamantes = window.lerDiamantes();
                passeComprado = true;

                atualizarRecursos();
                renderizarLista(passePremium, listaPremium, 'premium');
                mostrarNotificacao("PASSE PREMIUM ADQUIRIDO COM SUCESSO!", "sucesso");
            } else {
                mostrarNotificacao(`DIAMANTES INSUFICIENTES! VOCÊ PRECISA DE ${PRECO_PASSE_DIAMANTES} 💎`, "erro");
            }
        });
    }

    if (btnVoltar) {
        btnVoltar.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });
    }

    function renderizarLista(lista, container, tipoPasse) {
        if (!container) return;
        container.innerHTML = '';

        lista.forEach(item => {
            const idUnico = `${tipoPasse}_${item.nivel}`;
            const jaResgatado = resgatados.includes(idUnico);

            const bloqueadoNivel = item.nivel > nivelJogador;
            const bloqueadoPremium = (tipoPasse === 'premium' && !passeComprado);

            const card = document.createElement('div');
            card.className = `card-nivel ${item.especial ? 'pacote-rgb' : ''}`;

            let textoBotao = 'RESGATAR';
            if (jaResgatado) {
                textoBotao = 'COLETADO';
            } else if (bloqueadoNivel) {
                textoBotao = `NVL ${item.nivel}`;
            } else if (bloqueadoPremium) {
                textoBotao = 'BLOQUEADO';
            }

            card.innerHTML = `
                <span class="num-nivel">Nível ${item.nivel}</span>
                <div class="info-recompensa">
                    <span class="nome-rec">${item.nome}</span>
                    <span class="tipo-rec">${item.tipo.toUpperCase()}</span>
                </div>
                <button class="btn-resgatar ${jaResgatado ? 'resgatado' : ''}" 
                    ${(jaResgatado || bloqueadoNivel || bloqueadoPremium) ? 'disabled' : ''} 
                    data-id="${idUnico}">
                    ${textoBotao}
                </button>
            `;

            const btn = card.querySelector('.btn-resgatar');
            if (!jaResgatado && !bloqueadoNivel && !bloqueadoPremium) {
                btn.addEventListener('click', () => resgatarItem(item, idUnico, btn));
            }

            container.appendChild(card);
        });
    }

    function resgatarItem(item, idUnico, btn, silencioso = false) {
        if (resgatados.includes(idUnico)) return;
        if (item.nivel > nivelJogador) return;

        resgatados.push(idUnico);
        localStorage.setItem('nv_passe_resgatados', JSON.stringify(resgatados));
        sincronizarPasseNaConta();

        if (btn) {
            btn.classList.add('resgatado');
            btn.textContent = 'COLETADO';
            btn.disabled = true;
        }

        if (item.tipo === 'moeda') {
            moedas += item.qtd;
            atualizarRecursos();
            if (!silencioso) mostrarNotificacao(`+${item.qtd} Moedas Adicionadas!`, "sucesso");
        } else if (item.tipo === 'caixa') {
            if (!silencioso) {
                abrirCaixaDaSorte();
            } else {
                const sorteio = opcoesCaixaSorte[Math.floor(Math.random() * opcoesCaixaSorte.length)];
                moedas += sorteio;
                atualizarRecursos();
            }
        } else if (item.tipo === 'pacote_rgb') {
            localStorage.setItem('nv_skin_rgb_desbloqueada', 'true');
            if (!silencioso) mostrarNotificacao('PACOTE RGB COMPLETO DESBLOQUEADO!', "sucesso");
        }
    }

    if (btnColetarTudo) {
        btnColetarTudo.addEventListener('click', () => {
            let totalColetados = 0;

            passeGratis.forEach(item => {
                const id = `gratis_${item.nivel}`;
                if (item.nivel <= nivelJogador && !resgatados.includes(id)) {
                    resgatarItem(item, id, null, true);
                    totalColetados++;
                }
            });

            if (passeComprado) {
                passePremium.forEach(item => {
                    const id = `premium_${item.nivel}`;
                    if (item.nivel <= nivelJogador && !resgatados.includes(id)) {
                        resgatarItem(item, id, null, true);
                        totalColetados++;
                    }
                });
            }

            if (totalColetados > 0) {
                renderizarLista(passeGratis, listaGratis, 'gratis');
                renderizarLista(passePremium, listaPremium, 'premium');
                mostrarNotificacao(`${totalColetados} RECOMPENSAS COLETADAS!`, "sucesso");
            } else {
                mostrarNotificacao("NENHUMA RECOMPENSA PENDENTE NO SEU NÍVEL!", "info");
            }
        });
    }

    function abrirCaixaDaSorte() {
        if (!modalCaixa) return;

        modalCaixa.classList.remove('escondido');
        btnColetarCaixa.classList.add('escondido');
        resultadoCaixa.textContent = "Sorteando moedas...";

        setTimeout(() => {
            recompensaCaixaPendente = opcoesCaixaSorte[Math.floor(Math.random() * opcoesCaixaSorte.length)];
            resultadoCaixa.textContent = `+${recompensaCaixaPendente} MOEDAS!`;
            btnColetarCaixa.classList.remove('escondido');
        }, 1500);
    }

    if (btnColetarCaixa) {
        btnColetarCaixa.addEventListener('click', () => {
            moedas += recompensaCaixaPendente;
            atualizarRecursos();
            modalCaixa.classList.add('escondido');
            mostrarNotificacao(`+${recompensaCaixaPendente} Moedas Coletadas!`, "sucesso");
        });
    }

    atualizarRecursos();
    renderizarLista(passeGratis, listaGratis, 'gratis');
    renderizarLista(passePremium, listaPremium, 'premium');
});
