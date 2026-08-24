(() => {
    const CHAVE_CONTAS = 'nv_contas';
    const CHAVE_ATIVA = 'nv_conta_ativa';
    const CHAVE_PENDENTE = 'nv_conta_pendente';
    const CHAVE_SEQUENCIA = 'nv_conta_sequencia';

    function lerContas() {
        try {
            const contas = JSON.parse(localStorage.getItem(CHAVE_CONTAS) || '[]');
            return Array.isArray(contas) ? contas : [];
        } catch (erro) {
            return [];
        }
    }

    function salvarContas(contas) {
        localStorage.setItem(CHAVE_CONTAS, JSON.stringify(contas));
    }

    function lerMensagens() {
        try {
            const mensagens = JSON.parse(localStorage.getItem('nv_mensagens') || '[]');
            return Array.isArray(mensagens) ? mensagens : [];
        } catch (erro) {
            return [];
        }
    }

    function adicionarMensagem(titulo, texto, tipo = 'informacao') {
        const mensagens = lerMensagens();
        mensagens.unshift({ id: `MSG-${Date.now()}`, titulo, texto, tipo, lida: false, criadaEm: new Date().toISOString() });
        localStorage.setItem('nv_mensagens', JSON.stringify(mensagens.slice(0, 30)));
    }

    function marcarMensagensLidas() {
        const mensagens = lerMensagens().map(mensagem => ({ ...mensagem, lida: true }));
        localStorage.setItem('nv_mensagens', JSON.stringify(mensagens));
    }

    function obterConta(id) {
        return lerContas().find(conta => conta.id === String(id).trim().toUpperCase()) || null;
    }

    function chaveTemporadaAtual() {
        const agora = new Date();
        return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    }

    function prepararTemporada(conta) {
        if (!conta) return null;
        const temporada = chaveTemporadaAtual();
        if (conta.passeTemporada === temporada) return conta;
        return atualizarContaInterna(conta.id, {
            passeTemporada: temporada,
            passeComprado: false,
            passeNivel: 1,
            passeXp: 0,
            passeResgatados: []
        });
    }

    function atualizarContaInterna(id, alteracoes) {
        const contas = lerContas();
        const indice = contas.findIndex(conta => conta.id === String(id).trim().toUpperCase());
        if (indice < 0) return null;
        contas[indice] = { ...contas[indice], ...alteracoes };
        salvarContas(contas);
        return contas[indice];
    }

    function sincronizarJogo(conta) {
        if (!conta) return;
        conta = prepararTemporada(conta) || conta;
        localStorage.setItem('nv_moedas', String(conta.moedas || 0));
        localStorage.setItem('nv_diamantes', String(conta.diamantes || 0));
        localStorage.setItem('nv_tickets', String(conta.tickets || 0));
        localStorage.setItem('nv_passe_comprado', String(Boolean(conta.passeComprado)));
        localStorage.setItem('nv_passe_mes_ativo', conta.passeTemporada || chaveTemporadaAtual());
        localStorage.setItem('nv_nivel_passe', String(conta.passeNivel || 1));
        localStorage.setItem('nv_xp', String(conta.passeXp || 0));
        localStorage.setItem('nv_passe_resgatados', JSON.stringify(conta.passeResgatados || []));
    }

    function ativarConta(id) {
        const conta = obterConta(id);
        if (!conta) return null;
        localStorage.setItem(CHAVE_ATIVA, conta.id);
        sincronizarJogo(conta);
        return conta;
    }

    function criarConta(nome) {
        const contas = lerContas();
        const proximoNumero = Math.max(Number(localStorage.getItem(CHAVE_SEQUENCIA)) || 0, contas.length) + 1;
        const conta = {
            id: `ND-${String(proximoNumero).padStart(4, '0')}`,
            nome: String(nome).trim(),
            moedas: 0,
            tickets: 0,
            diamantes: 0,
            passeComprado: false,
            criadoEm: new Date().toISOString()
        };
        contas.push(conta);
        salvarContas(contas);
        localStorage.setItem(CHAVE_SEQUENCIA, String(proximoNumero));
        ativarConta(conta.id);
        return conta;
    }

    function atualizarConta(id, alteracoes) {
        const conta = atualizarContaInterna(id, alteracoes);
        if (!conta) return null;
        if (localStorage.getItem(CHAVE_ATIVA) === conta.id) sincronizarJogo(conta);
        return obterConta(conta.id);
    }

    window.NeonConta = {
        lerContas,
        obterConta,
        criarConta,
        ativarConta,
        atualizarConta,
        prepararTemporada,
        lerMensagens,
        adicionarMensagem,
        marcarMensagensLidas,
        sincronizarJogo,
        obterAtiva: () => obterConta(localStorage.getItem(CHAVE_ATIVA)),
        obterPendente: () => localStorage.getItem(CHAVE_PENDENTE),
        solicitar: id => localStorage.setItem(CHAVE_PENDENTE, String(id).trim().toUpperCase()),
        limparPendente: () => localStorage.removeItem(CHAVE_PENDENTE),
        chaveAtiva: CHAVE_ATIVA
    };
})();
