(() => {
    const LIMITE_RECURSO = 20000000;
    const contaAtiva = window.NeonConta?.obterAtiva();
    if (contaAtiva) window.NeonConta.sincronizarJogo(contaAtiva);

    function lerRecurso(chave) {
        const valor = Number.parseInt(localStorage.getItem(chave), 10);
        return Math.min(Math.max(Number.isFinite(valor) ? valor : 0, 0), LIMITE_RECURSO);
    }

    function adicionarRecurso(chave, quantidade) {
        const valor = Math.max(0, Number(quantidade) || 0);
        const atual = lerRecurso(chave);
        const novoValor = Math.min(LIMITE_RECURSO, atual + valor);
        localStorage.setItem(chave, String(novoValor));
        sincronizarConta(chave, novoValor);
        return novoValor - atual;
    }

    function salvarRecurso(chave, valor) {
        const novoValor = Math.min(LIMITE_RECURSO, Math.max(0, Number(valor) || 0));
        localStorage.setItem(chave, String(novoValor));
        sincronizarConta(chave, novoValor);
        return novoValor;
    }

    function sincronizarConta(chave, valor) {
        const conta = window.NeonConta?.obterAtiva();
        const campo = { nv_moedas: 'moedas', nv_diamantes: 'diamantes' }[chave];
        if (conta && campo) window.NeonConta.atualizarConta(conta.id, { [campo]: valor });
    }

    salvarRecurso('nv_moedas', localStorage.getItem('nv_moedas'));
    salvarRecurso('nv_diamantes', localStorage.getItem('nv_diamantes'));

    window.LIMITE_RECURSO = LIMITE_RECURSO;
    window.adicionarMoedas = quantidade => adicionarRecurso('nv_moedas', quantidade);
    window.adicionarDiamantes = quantidade => adicionarRecurso('nv_diamantes', quantidade);
    window.gastarDiamantes = quantidade => {
        const custo = Math.max(0, Number(quantidade) || 0);
        const atual = lerRecurso('nv_diamantes');
        if (atual < custo) return false;
        salvarRecurso('nv_diamantes', atual - custo);
        return true;
    };
    window.salvarMoedas = valor => salvarRecurso('nv_moedas', valor);
    window.salvarDiamantes = valor => salvarRecurso('nv_diamantes', valor);
    window.lerMoedas = () => lerRecurso('nv_moedas');
    window.lerDiamantes = () => lerRecurso('nv_diamantes');
})();
