(async () => {
    function obterJanela(configuracao) {
        const agendamento = configuracao.atualizacaoAgendada;
        if (!agendamento || agendamento.ativa !== true || !agendamento.inicio) {
            return configuracao.atualizar === true ? { fim: null, mensagem: null } : null;
        }
        const inicio = new Date(agendamento.inicio).getTime();
        const fim = inicio + Math.max(Number(agendamento.duracaoMinutos) || 0, 0) * 60000;
        if (Date.now() >= inicio && Date.now() < fim) return { fim, mensagem: agendamento.mensagem || null };
        return configuracao.atualizar === true ? { fim: null, mensagem: null } : null;
    }

    function exibirAtualizacao(janela) {
        document.body.innerHTML = `<main class="nv-atualizacao"><h1>NEON VOID</h1><h2>ATUALIZAÇÃO NECESSÁRIA</h2><p>${janela.mensagem || 'O jogo está recebendo uma atualização. Aguarde para continuar.'}</p><strong id="nv-contagem"></strong></main>`;
        const estilo = document.createElement('style');
        estilo.textContent = `.nv-atualizacao{min-height:100vh;display:grid;place-content:center;gap:18px;padding:32px;color:#fff;background:radial-gradient(circle,#1a102f,#050508 70%);font-family:'Press Start 2P',monospace;text-align:center}.nv-atualizacao h1{color:#00f0ff;font-size:clamp(1.4rem,6vw,2.5rem);text-shadow:0 0 18px #00f0ff}.nv-atualizacao h2{color:#ff0055;font-size:.9rem}.nv-atualizacao p{max-width:620px;color:#aeb8d0;font-size:.65rem;line-height:2}.nv-atualizacao strong{color:#00f0ff;font-size:.7rem}`;
        document.head.appendChild(estilo);
        const contagem = document.getElementById('nv-contagem');
        if (!janela.fim) { contagem.textContent = 'AGUARDE A LIBERAÇÃO'; return; }
        const atualizarContagem = () => {
            const restante = Math.max(janela.fim - Date.now(), 0);
            contagem.textContent = `RETORNO ESTIMADO: ${Math.floor(restante / 60000)}M ${Math.floor((restante % 60000) / 1000).toString().padStart(2, '0')}S`;
            if (restante <= 0) window.location.reload();
        };
        atualizarContagem();
        setInterval(atualizarContagem, 1000);
    }

    try {
        const resposta = await fetch('../data/versao.json', { cache: 'no-store' });
        if (resposta.ok) {
            const janela = obterJanela(await resposta.json());
            if (janela) exibirAtualizacao(janela);
        }
    } catch (erro) {
        console.warn('Controle de versão indisponível:', erro);
    }
})();