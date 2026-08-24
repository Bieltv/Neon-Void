document.addEventListener('DOMContentLoaded', () => {

    let eventoSelecionadoId = null;

    function textoContagem(dataFim, dataInicio = null) {
        const agora = Date.now();
        const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`).getTime() : null;
        if (inicio && agora < inicio) {
            return `INICIA EM ${Math.ceil((inicio - agora) / 86400000)} DIAS`;
        }
        const restante = new Date(`${dataFim}T23:59:59`).getTime() - agora;
        if (restante <= 0) return 'ENCERRADO';
        const dias = Math.floor(restante / 86400000);
        const horas = Math.floor((restante % 86400000) / 3600000);
        return `${dias}D ${horas}H RESTANTES`;
    }

    function estaNosSeteDiasAntes(dataInicio) {
        const inicio = new Date(`${dataInicio}T00:00:00`).getTime();
        const restante = inicio - Date.now();
        return restante > 0 && restante <= 7 * 86400000;
    }

    const btnVoltar = document.getElementById('btn-voltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });
    }

    async function carregarEventos() {
        let eventosDisponiveis = [];

        try {
            const resposta = await fetch('../data/eventos.json');
            if (!resposta.ok) throw new Error('Falha ao carregar eventos.json');
            eventosDisponiveis = await resposta.json();
            const respostaVersao = await fetch('../data/versao.json', { cache: 'no-store' });
            const controleVersao = respostaVersao.ok ? await respostaVersao.json() : {};
            const atual = String(controleVersao.versaoAtual || '1.0.0').split('.').map(Number);
            eventosDisponiveis = eventosDisponiveis.filter(evento => {
                const versao = String(evento.versao || '1.0.0').split('.').map(Number);
                return versao.every((parte, indice) => (parte || 0) <= (atual[indice] || 0));
            });
        } catch (erro) {
            console.warn('Não foi possível carregar os eventos via JSON:', erro);
        }

        const dataHoje = new Date();
        const ano = dataHoje.getFullYear();
        const mes = String(dataHoje.getMonth() + 1).padStart(2, '0');
        const dia = String(dataHoje.getDate()).padStart(2, '0');
        const hoje = `${ano}-${mes}-${dia}`;

        const eventosAtivos = eventosDisponiveis.filter(ev => hoje <= ev.dataFim);

        if (eventosAtivos.length === 0) {
            document.getElementById('vazio-lista').style.display = 'flex';
            document.getElementById('cards-lista').style.display = 'none';
            document.getElementById('vazio-progresso').style.display = 'flex';
            document.getElementById('trilha-fases').style.display = 'none';
            return;
        }

        document.getElementById('vazio-lista').style.display = 'none';
        const elCards = document.getElementById('cards-lista');
        elCards.style.display = 'flex';
        elCards.innerHTML = '';

        eventosAtivos.forEach((evento) => {
            const concluido = localStorage.getItem(`nv_evento_concluido_${evento.id}`) === 'true';
            const disponivel = hoje >= evento.dataInicio && hoje <= evento.dataFim;
            const bloqueadoPorAntecedencia = estaNosSeteDiasAntes(evento.dataInicio);
            const card = document.createElement('div');
            card.className = `card-evento ${concluido ? 'concluido' : ''} ${!disponivel ? 'em-breve' : ''} ${bloqueadoPorAntecedencia ? 'pre-lancamento' : ''}`;
            card.dataset.id = evento.id;

            card.innerHTML = `
                <span class="icone-evento">${evento.icone}${bloqueadoPorAntecedencia ? ' 🔒' : ''}</span>
                <div class="info-evento">
                    <h3>${evento.titulo} ${concluido ? '🏆 (CONCLUÍDO)' : (bloqueadoPorAntecedencia ? '[🔒 BLOQUEADO]' : (!disponivel ? '[EM BREVE]' : ''))}</h3>
                    <p>${evento.descricao}</p>
                    <strong class="contador-evento" data-inicio="${evento.dataInicio}" data-fim="${evento.dataFim}">${textoContagem(evento.dataFim, evento.dataInicio)}</strong>
                    <small class="resumo-recompensas">${(evento.recompensasFases || []).map(item => `FASE ${item.fase}: ${item.diamantes ? `+${item.diamantes}💎 ` : ''}${item.moedas ? `+${item.moedas}🪙` : ''}`).join(' | ')}</small>
                </div>
            `;

            card.addEventListener('click', () => {
                selecionarEvento(evento);
            });

            elCards.appendChild(card);
        });

        selecionarEvento(eventosAtivos[0]);
    }

    function selecionarEvento(evento) {
        eventoSelecionadoId = evento.id;

        const cards = document.querySelectorAll('.card-evento');
        cards.forEach(card => {
            if (card.dataset.id === evento.id) {
                card.classList.add('ativo');
            } else {
                card.classList.remove('ativo');
            }
        });

        gerarTrilhaFases(evento);
    }

    function gerarTrilhaFases(evento) {
        document.getElementById('vazio-progresso').style.display = 'none';
        const elTrilha = document.getElementById('trilha-fases');
        elTrilha.style.display = 'flex';
        elTrilha.innerHTML = '';

        const progressoSalvo = parseInt(localStorage.getItem(`nv_progresso_${evento.id}`)) || 1;
        const posicoes = ['centro', 'esquerda', 'centro', 'direita'];

        for (let i = 1; i <= evento.fasesTotais; i++) {
            let classeStatus = 'bloqueada';
            if (i < progressoSalvo) classeStatus = 'concluida';
            if (i === progressoSalvo) classeStatus = 'atual';

            const posClass = posicoes[(i - 1) % posicoes.length];

            const noFase = document.createElement('div');
            noFase.className = `no-fase ${posClass} ${classeStatus}`;

            const recompensa = (evento.recompensasFases || []).find(item => item.fase === i);
            const textoRecompensa = recompensa?.diamantes
                ? `+${recompensa.diamantes}D`
                : recompensa?.moedas
                    ? `+${recompensa.moedas >= 1000 ? `${recompensa.moedas / 1000}K` : recompensa.moedas}🪙`
                    : '';
            noFase.innerHTML = recompensa
                ? `${i}<small>${textoRecompensa}</small>`
                : String(i);
            if (recompensa) {
                noFase.title = `RECOMPENSA: +${recompensa.diamantes || 0} DIAMANTES / +${recompensa.moedas || 0} MOEDAS`;
                noFase.dataset.recompensa = 'true';
            }

            if (i <= progressoSalvo && isEventoAtivo(evento)) {
                noFase.addEventListener('click', () => {
                    jogarFaseEvento(evento, i);
                });
            }

            elTrilha.appendChild(noFase);
        }
    }

    function isEventoAtivo(evento) {
        const hoje = new Date().toISOString().slice(0, 10);
        return hoje >= evento.dataInicio && hoje <= evento.dataFim;
    }

    function jogarFaseEvento(evento, numeroFase) {
        sessionStorage.setItem('nv_evento_ativo_id', evento.id);
        sessionStorage.setItem('nv_evento_fase_atual', numeroFase);
        sessionStorage.setItem('nv_evento_fases_totais', evento.fasesTotais);

        window.location.href = 'jogo.html';
    }

    carregarEventos();
    setInterval(() => {
        document.querySelectorAll('.contador-evento').forEach(elemento => {
            elemento.textContent = textoContagem(elemento.dataset.fim, elemento.dataset.inicio);
        });
    }, 60000);
});