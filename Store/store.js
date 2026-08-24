document.addEventListener('DOMContentLoaded', () => {
    const gate = document.getElementById('gate');
    const conteudo = document.getElementById('store-content');
    const formDestino = document.getElementById('form-destino');
    const statusGate = document.getElementById('status-gate');
    const idDestino = document.getElementById('id-destino');
    const pacotes = [140, 340, 680, 1800, 2780, 3890, 6100].map((diamantes, indice) => ({ diamantes, tickets: [15, 30, 50, 75, 120, 190, 300][indice] }));
    let contaAtual = null;
    let lojaLiberada = false;

    function dataHoje() { return new Date().toISOString().slice(0, 10); }
    function novaRodada() {
        const numero = Math.floor(Math.random() * 200) + 1;
        const opcoes = new Set([numero]);
        while (opcoes.size < 3) opcoes.add(Math.floor(Math.random() * 200) + 1);
        return { numero, opcoes: [...opcoes].sort(() => Math.random() - 0.5) };
    }
    function estadoPalpites() {
        const chave = `nv_adivinhacao_${contaAtual ? contaAtual.id : 'sem-conta'}`;
        const salvo = JSON.parse(localStorage.getItem(chave) || '{}');
        if (salvo.data !== dataHoje() || !Array.isArray(salvo.opcoes) || salvo.opcoes.length !== 3) {
            const rodada = novaRodada();
            const novoEstado = { data: dataHoje(), tentativas: 0, ...rodada };
            salvarEstado(novoEstado);
            return novoEstado;
        }
        return salvo;
    }
    function salvarEstado(estado) { localStorage.setItem(`nv_adivinhacao_${contaAtual.id}`, JSON.stringify(estado)); }
    function atualizarTela() {
        const conta = window.NeonConta.prepararTemporada(window.NeonConta.obterAtiva());
        if (!lojaLiberada && conta && localStorage.getItem('nv_store_autorizada') === conta.id && !window.NeonConta.obterPendente()) lojaLiberada = true;
        if (!lojaLiberada || !conta) return;
        contaAtual = conta;
        gate.hidden = true;
        conteudo.hidden = false;
        document.getElementById('conta-nome').textContent = `${conta.nome} / ${conta.id}`;
        document.getElementById('saldo-tickets').textContent = conta.tickets || 0;
        document.getElementById('saldo-diamantes').textContent = conta.diamantes || 0;
        const estado = estadoPalpites();
        document.getElementById('tentativas').textContent = `${estado.tentativas} / 40 tentativas usadas hoje`;
        document.getElementById('opcoes-palpite').innerHTML = estado.opcoes.map(numero => `<button class="opcao-palpite" data-numero="${numero}">${numero}</button>`).join('');
        renderizarCatalogo();
    }
    function renderizarCatalogo() {
        const catalogo = document.getElementById('catalogo');
        catalogo.innerHTML = [...pacotes.map(pacote => `<article><div class="produto-icon">💎</div><h3>${pacote.diamantes.toLocaleString('pt-BR')} diamantes</h3><p>${pacote.tickets} tickets</p><button data-diamantes="${pacote.diamantes}" data-preco="${pacote.tickets}">COMPRAR</button></article>`), `<article class="passe"><div class="produto-icon">★</div><h3>Passe de batalha</h3><p>250 tickets</p><button data-passe="true" data-preco="250">COMPRAR</button></article>`].join('');
        catalogo.querySelectorAll('button').forEach(botao => botao.addEventListener('click', () => comprar(botao)));
    }
    function comprar(botao) {
        contaAtual = window.NeonConta.prepararTemporada(contaAtual);
        const preco = Number(botao.dataset.preco);
        if ((contaAtual.tickets || 0) < preco) return alert('Tickets insuficientes. Jogue para ganhar mais tickets.');
        const dados = botao.dataset.passe ? { tickets: contaAtual.tickets - preco, passeComprado: true } : { tickets: contaAtual.tickets - preco, diamantes: (contaAtual.diamantes || 0) + Number(botao.dataset.diamantes) };
        contaAtual = window.NeonConta.atualizarConta(contaAtual.id, dados);
        atualizarTela();
        alert('Compra enviada para sua conta!');
    }
    formDestino.addEventListener('submit', evento => {
        evento.preventDefault();
        const id = idDestino.value.trim().toUpperCase();
        if (!window.NeonConta.obterConta(id)) { statusGate.textContent = 'Neon ID não encontrado.'; return; }
        window.NeonConta.solicitar(id);
        statusGate.textContent = 'Pedido enviado. Abra o menu do jogo e confirme na caixa de entrada.';
    });
    document.getElementById('opcoes-palpite').addEventListener('click', evento => {
        const botao = evento.target.closest('.opcao-palpite');
        if (!botao) return;
        const estado = estadoPalpites();
        const palpite = Number(botao.dataset.numero);
        const resultado = document.getElementById('resultado-palpite');
        if (estado.tentativas >= 40) { resultado.textContent = 'Limite diário atingido. Volte amanhã.'; return; }
        estado.tentativas += 1;
        if (palpite === estado.numero) { contaAtual = window.NeonConta.atualizarConta(contaAtual.id, { tickets: (contaAtual.tickets || 0) + 1 }); resultado.textContent = 'Acertou! +1 ticket.'; } else resultado.textContent = 'Errou. Nada acontece.';
        Object.assign(estado, novaRodada());
        salvarEstado(estado); atualizarTela();
    });
    atualizarTela();
    setInterval(atualizarTela, 800);
});
