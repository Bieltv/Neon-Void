document.addEventListener('DOMContentLoaded', () => {

    let eventoAtivoSelecionado = null;
    let girando = false;

    // === 1. ECONOMIA E INVENTÁRIO (LOCALSTORAGE) ===
    function sincronizarEconomia() {
        if (localStorage.getItem('nv_moedas') === null) localStorage.setItem('nv_moedas', '0');
        if (localStorage.getItem('nv_diamantes') === null) localStorage.setItem('nv_diamantes', '0');
        if (localStorage.getItem('nv_skins_adquiridas') === null) {
            localStorage.setItem('nv_skins_adquiridas', JSON.stringify([]));
        }

        const moedas = parseInt(localStorage.getItem('nv_moedas')) || 0;
        const diamantes = parseInt(localStorage.getItem('nv_diamantes')) || 0;

        document.getElementById('saldo-moedas').textContent = moedas;
        document.getElementById('saldo-diamantes').textContent = diamantes;
        const saldoRoleta = document.getElementById('saldo-roleta');
        if (saldoRoleta) saldoRoleta.textContent = diamantes;
    }

    sincronizarEconomia();

    function obterSkinsAdquiridas() {
        return JSON.parse(localStorage.getItem('nv_skins_adquiridas')) || [];
    }

    const idsLegados = {
        skin_evento_fenix: '#N005',
        skin_destaque_01: '#N006'
    };

    function idCanonico(id) {
        return idsLegados[id] || id;
    }

    function skinJaAdquirida(id) {
        const canonico = idCanonico(id);
        return obterSkinsAdquiridas().some(item => idCanonico(item) === canonico) ||
            localStorage.getItem(`nv_skin_desbloqueada_${canonico}`) === 'true';
    }

    function registrarSkinAdquirida(id) {
        id = idCanonico(id);
        const adquiridas = obterSkinsAdquiridas();
        if (!adquiridas.includes(id)) {
            adquiridas.push(id);
            localStorage.setItem('nv_skins_adquiridas', JSON.stringify(adquiridas));
        }

        // Mantem a recompensa sincronizada com o cofre de skins.
        localStorage.setItem(`nv_skin_desbloqueada_${id}`, 'true');
    }

    // Botão Voltar para o Menu
    const btnVoltar = document.getElementById('btn-voltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });
    }

    // === 2. CONTROLE DE NAVEGAÇÃO DE ABAS ===
    const botoesAba = document.querySelectorAll('.btn-aba');
    const secoesAba = document.querySelectorAll('.secao-aba');

    botoesAba.forEach(botao => {
        botao.addEventListener('click', () => {
            const abaAlvo = botao.getAttribute('data-aba');

            botoesAba.forEach(b => b.classList.remove('ativa'));
            secoesAba.forEach(s => s.classList.remove('ativa'));

            botao.classList.add('ativa');
            document.getElementById(`aba-${abaAlvo}`).classList.add('ativa');
        });
    });

    // === 3. RENDERIZADOR DE SKINS (BORDAS VAZADAS NEON) ===
    function criarRepresentacaoSkin(desenho) {
        const box = document.createElement('div');
        const largura = desenho.largura || 30;
        const altura = desenho.altura || 30;
        const corLinha = desenho.cor || '#ffffff';
        const corBrilho = desenho.corBrilho || corLinha;

        box.style.width = `${largura}px`;
        box.style.height = `${altura}px`;
        box.style.backgroundColor = 'transparent';
        box.style.margin = "0 auto";
        box.style.filter = `drop-shadow(0 0 6px ${corBrilho})`;

        if (desenho.forma === 'circulo') {
            box.style.border = `2px solid ${corLinha}`;
            box.style.borderRadius = '50%';
        } else if (desenho.forma === 'triangulo') {
            box.style.background = `linear-gradient(to bottom right, transparent 50%, ${corLinha} 50%)`;
            box.style.borderLeft = `2px solid ${corLinha}`;
            box.style.borderBottom = `2px solid ${corLinha}`;
            box.style.transform = 'rotate(-45deg)';
        } else if (desenho.forma === 'losango') {
            box.style.border = `2px solid ${corLinha}`;
            box.style.transform = 'rotate(45deg) scale(0.8)';
        } else {
            box.style.border = `2px solid ${corLinha}`;
            box.style.borderRadius = '3px';
        }

        return box;
    }

    // === 4. SISTEMA DO CANVAS DA ROLETA ===
    const canvasRoleta = document.getElementById('canvas-roleta');
    const ctx = canvasRoleta ? canvasRoleta.getContext('2d') : null;
    let anguloAtual = 0;

    function desenharRoleta(angulo, recompensas = []) {
        if (!ctx) return;
        const numFatias = recompensas.length || 8;
        const fatiaAngulo = (2 * Math.PI) / numFatias;
        const raio = canvasRoleta.width / 2;

        ctx.clearRect(0, 0, canvasRoleta.width, canvasRoleta.height);
        ctx.save();
        ctx.translate(raio, raio);
        ctx.rotate(angulo);

        for (let i = 0; i < numFatias; i++) {
            const item = recompensas[i];
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, raio - 5, i * fatiaAngulo, (i + 1) * fatiaAngulo);

            if (item && item.tipo === 'skin_principal') {
                ctx.fillStyle = '#ff3333';
            } else if (i % 2 === 0) {
                ctx.fillStyle = '#11111a';
            } else {
                ctx.fillStyle = '#1a1a2e';
            }

            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#222233';
            ctx.stroke();
        }

        ctx.restore();
    }

    desenharRoleta(0);

    // === 5. MATEMÁTICA DE SORTEIO POR PORCENTAGEM ===
    function sortearItem(recompensas) {
        const numeroSorteado = Math.random() * 100;
        let acumulado = 0;

        for (const item of recompensas) {
            acumulado += item.chance_porcentagem;
            if (numeroSorteado <= acumulado) {
                return item;
            }
        }
        return recompensas[recompensas.length - 1];
    }

    // === 6. MODAIS (ROLETA E CONFIRMAÇÃO) ===
    const modalRoleta = document.getElementById('modal-roleta');
    const btnFecharRoleta = document.getElementById('btn-fechar-roleta');
    const btnGirar = document.getElementById('btn-girar-roleta');
    const custoRoletaTexto = document.getElementById('custo-roleta-texto');
    const previewSkinRoleta = document.getElementById('preview-skin-roleta');
    const porcentagemSkinRoleta = document.getElementById('porcentagem-skin-roleta');

    const modalSucesso = document.getElementById('modal-sucesso');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalPreview = document.getElementById('modal-preview');
    const modalMensagem = document.getElementById('modal-mensagem');
    const btnFecharModal = document.getElementById('btn-fechar-modal');

    function exibirModalSucesso(titulo, mensagem, desenhoSkin = null) {
        modalTitulo.textContent = titulo;
        modalMensagem.textContent = mensagem;
        modalPreview.innerHTML = '';

        if (desenhoSkin) {
            modalPreview.appendChild(criarRepresentacaoSkin(desenhoSkin));
        }

        modalSucesso.classList.remove('oculto');
    }

    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', () => {
            modalSucesso.classList.add('oculto');
        });
    }

    function abrirModalRoleta(evento) {
        eventoAtivoSelecionado = evento;
        const skinPrincipal = evento.recompensas.find(r => r.tipo === 'skin_principal');

        custoRoletaTexto.textContent = `💎 ${evento.custo_giro_diamantes}`;
        porcentagemSkinRoleta.textContent = skinPrincipal ? `${skinPrincipal.chance_porcentagem}%` : "5%";

        const listaRecompensas = document.getElementById('lista-recompensas-roleta');
        if (listaRecompensas) {
            listaRecompensas.innerHTML = evento.recompensas.map(item =>
                `<div><span>${item.nome}</span><strong>${item.chance_porcentagem}%</strong></div>`
            ).join('');
        }

        previewSkinRoleta.innerHTML = '';
        if (skinPrincipal) {
            previewSkinRoleta.appendChild(criarRepresentacaoSkin(skinPrincipal.desenho));
        }

        desenharRoleta(anguloAtual, evento.recompensas);
        modalRoleta.classList.remove('oculto');
    }

    if (btnFecharRoleta) {
        btnFecharRoleta.addEventListener('click', () => {
            if (!girando) modalRoleta.classList.add('oculto');
        });
    }

    const btnGirar5x = document.getElementById('btn-girar-5x');

    // === AÇÃO DOS GIROS NA ROLETA (MANTÉM O MODAL ABERTO) ===
    function executarGiros(quantidade) {
        if (girando || !eventoAtivoSelecionado) return;

        let diamantes = parseInt(localStorage.getItem('nv_diamantes')) || 0;
        const custo = quantidade === 5
            ? (eventoAtivoSelecionado.custo_giro_5x_diamantes || eventoAtivoSelecionado.custo_giro_diamantes * 5)
            : eventoAtivoSelecionado.custo_giro_diamantes;

        if (diamantes < custo) {
            exibirModalSucesso("RECURSOS INSUFICIENTES", "Você precisa de mais Diamantes para girar.");
            return;
        }

        // Desconta a economia
        if (!window.gastarDiamantes(custo)) return;
        diamantes = window.lerDiamantes();
        sincronizarEconomia();

        // Sorteia o prêmio antecipadamente com base nas porcentagens
        const itensGanhos = Array.from({ length: quantidade }, () =>
            sortearItem(eventoAtivoSelecionado.recompensas)
        );

        girando = true;
        let girosRotacao = anguloAtual + Math.PI * 2 * (6 + Math.random() * 2);
        let tempoInicio = null;
        const duracao = 4300; // 4.3 segundos de animação

        function animarRoleta(timestamp) {
            if (!tempoInicio) tempoInicio = timestamp;
            let progresso = (timestamp - tempoInicio) / duracao;

            if (progresso < 1) {
                let desaceleracao = 1 - Math.pow(1 - progresso, 3);
                anguloAtual = girosRotacao * desaceleracao;
                desenharRoleta(anguloAtual, eventoAtivoSelecionado.recompensas);
                requestAnimationFrame(animarRoleta);
            } else {
                girando = false;

                // O MODAL CONTINUA ABERTO AQUI! Apenas entregamos a recompensa:
                itensGanhos.forEach(itemGanho => {
                    if (itemGanho.tipo === 'skin_principal' || itemGanho.tipo === 'skin') {
                        registrarSkinAdquirida(itemGanho.id);
                    } else if (itemGanho.id.includes('moedas')) {
                        const qtd = itemGanho.quantidade || parseInt(itemGanho.nome.replace(/\D/g, '')) || 100;
                        adicionarMoedas(qtd);
                    } else if (itemGanho.id.includes('diamantes')) {
                        const qtd = itemGanho.quantidade || parseInt(itemGanho.nome.replace(/\D/g, '')) || 10;
                        adicionarDiamantes(qtd);
                    }
                });
                sincronizarEconomia();
                atualizarBotoesCard();
                exibirModalSucesso(
                    quantidade === 5 ? 'RECOMPENSAS DO GIRO 5X!' : 'RECOMPENSA!',
                    itensGanhos.map(item => item.nome).join(' + '),
                    itensGanhos.find(item => item.tipo === 'skin_principal')?.desenho
                );
            }
        }

        requestAnimationFrame(animarRoleta);
    }

    if (btnGirar) btnGirar.addEventListener('click', () => executarGiros(1));
    if (btnGirar5x) btnGirar5x.addEventListener('click', () => executarGiros(5));

    // === 7. CARREGAMENTO DO JSON DA LOJA ===
    function isEventoAtivo(evento) {
        if (!evento) return false;

        const inicioTexto = evento.data_inicio || evento.dataInicio;
        const fimTexto = evento.data_fim || evento.dataFim;
        const inicio = new Date(inicioTexto).getTime();
        const fim = new Date(fimTexto).getTime();

        if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return false;
        return Date.now() >= inicio && Date.now() <= fim;
    }

    function obterRoletasValidas(dadosLoja) {
        return (dadosLoja?.roletas_ativas || []).filter(isEventoAtivo);
    }

    function obterRoletasDisponiveis(dadosLoja) {
        return (dadosLoja?.roletas_ativas || []).filter(evento => {
            const inicio = new Date(evento.data_inicio || evento.dataInicio).getTime();
            const fim = new Date(evento.data_fim || evento.dataFim).getTime();
            return Number.isFinite(inicio) && Number.isFinite(fim) && Date.now() <= fim;
        });
    }

    function versaoCompativel(item, versaoAtual) {
        const versao = String(item.versao || '1.0.0').split('.').map(Number);
        const atual = String(versaoAtual || '1.0.0').split('.').map(Number);
        for (let indice = 0; indice < 3; indice += 1) {
            const itemValor = Number.isFinite(versao[indice]) ? versao[indice] : 0;
            const atualValor = Number.isFinite(atual[indice]) ? atual[indice] : 0;
            if (itemValor !== atualValor) return itemValor < atualValor;
        }
        return true;
    }

    // Disponibiliza a mesma regra para outras telas que carregarem a loja.
    window.isEventoAtivo = isEventoAtivo;
    window.obterRoletasValidas = obterRoletasValidas;

    function aplicarEstadoBotao(botao, idItem, preco, moedaTipo, ehEvento = false) {
        if (skinJaAdquirida(idItem)) {
            botao.textContent = 'ADQUIRIDO';
            botao.classList.add('adquirido');
            botao.disabled = true;
        } else {
            if (ehEvento) {
                botao.textContent = `🎰 ABRIR ROLETA`;
            } else {
                const icone = moedaTipo === 'diamante' ? '💎' : '🪙';
                botao.textContent = `${icone} ${preco}`;
            }
        }
    }

    function pacoteJaAdquirido(item) {
        return item.tipo === 'pacote' && (item.skins || []).every(skinJaAdquirida);
    }

    function registrarPacote(item) {
        const expiraEm = new Date(item.data_fim).getTime();
        (item.skins || []).forEach(id => {
            registrarSkinAdquirida(id);
            if (Number.isFinite(expiraEm)) localStorage.setItem(`nv_skin_expira_${id}`, String(expiraEm));
        });
    }

    function atualizarBotoesCard() {
        document.querySelectorAll('.btn-acao-card').forEach(botao => {
            const id = botao.getAttribute('data-id');
            if (id && skinJaAdquirida(id)) {
                botao.textContent = 'ADQUIRIDO';
                botao.classList.add('adquirido');
                botao.disabled = true;
            }
        });
    }

    function marcarPacoteAdquirido(botao) {
        botao.textContent = 'ADQUIRIDO';
        botao.classList.add('adquirido');
        botao.disabled = true;
    }

    Promise.all([fetch('../data/loja.json'), fetch('../data/versao.json', { cache: 'no-store' })])
        .then(async ([resLoja, resVersao]) => {
            if (!resLoja.ok) throw new Error("Erro ao carregar o arquivo JSON");
            const dadosLoja = await resLoja.json();
            const controleVersao = resVersao.ok ? await resVersao.json() : {};
            const versaoAtual = controleVersao.versaoAtual || '1.0.0';
            if (dadosLoja.destaques) {
                carregarSkinsNormais(dadosLoja.destaques.filter(item => versaoCompativel(item, versaoAtual)));
            }
            if (dadosLoja.roletas_ativas) {
                const roletasValidas = dadosLoja.roletas_ativas.filter(item => versaoCompativel(item, versaoAtual));
                carregarSkinsEventos(obterRoletasDisponiveis({ ...dadosLoja, roletas_ativas: roletasValidas }));
            }
        })
        .catch(err => console.error("Erro ao carregar dados da loja:", err));

    function carregarSkinsNormais(lista) {
        const container = document.getElementById('container-destaques');
        if (!container) return;
        container.innerHTML = '';

        lista.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card-item';

            const areaPreview = document.createElement('div');
            areaPreview.style.width = '50px';
            areaPreview.style.display = 'flex';
            areaPreview.style.justifyContent = 'center';
            areaPreview.appendChild(criarRepresentacaoSkin(item.desenho));

            const info = document.createElement('div');
            info.className = 'card-info';
            info.innerHTML = `
                <span class="card-nome">${item.nome}</span>
                <span class="card-desc">${item.descricao}</span>
            `;

            const botao = document.createElement('button');
            botao.className = 'btn-acao-card';
            botao.setAttribute('data-id', item.id);
            if (pacoteJaAdquirido(item)) {
                botao.textContent = 'ADQUIRIDO';
                botao.classList.add('adquirido');
                botao.disabled = true;
            } else {
                aplicarEstadoBotao(botao, item.id, item.preco, item.moeda_tipo, false);
                if (item.data_inicio && !isEventoAtivo(item)) {
                    botao.textContent = 'EM BREVE';
                    botao.disabled = true;
                }
            }

            botao.addEventListener('click', () => {
                processarCompraDireta(item, botao);
            });

            card.appendChild(areaPreview);
            card.appendChild(info);
            if (item.data_fim) {
                const prazo = document.createElement('span');
                prazo.className = 'contador-card';
                prazo.dataset.fim = item.data_fim;
                prazo.dataset.inicio = item.data_inicio;
                prazo.textContent = '45 DIAS';
                card.appendChild(prazo);
            }
            card.appendChild(botao);
            container.appendChild(card);
        });
    }

    function carregarSkinsEventos(listaRoletas) {
        const container = document.getElementById('container-eventos');
        if (!container) return;
        container.innerHTML = '';

        const eventosValidos = listaRoletas;

        if (eventosValidos.length === 0) {
            container.innerHTML = `<p style="font-size: 0.6rem; color: #8888a0; text-align: center; margin-top: 20px;">Nenhum evento ativo no momento!</p>`;
            return;
        }

        eventosValidos.forEach(evento => {
            const skinPrincipal = evento.recompensas.find(r => r.tipo === 'skin_principal');
            if (!skinPrincipal) return;

            const card = document.createElement('div');
            card.className = 'card-item card-evento';

            const areaPreview = document.createElement('div');
            areaPreview.style.width = '50px';
            areaPreview.style.display = 'flex';
            areaPreview.style.justifyContent = 'center';
            areaPreview.appendChild(criarRepresentacaoSkin(skinPrincipal.desenho));

            const info = document.createElement('div');
            info.className = 'card-info';
            info.innerHTML = `
                <span class="card-nome">${evento.nome_evento}</span>
                <span class="card-desc">${evento.descricao}</span>
                <span class="contador-card" data-inicio="${evento.data_inicio}" data-fim="${evento.data_fim}"></span>
            `;

            const botao = document.createElement('button');
            botao.className = 'btn-acao-card btn-evento';
            botao.setAttribute('data-id', skinPrincipal.id);
            aplicarEstadoBotao(botao, skinPrincipal.id, 0, 'diamante', true);
            const eventoAtivo = isEventoAtivo(evento);
            if (!eventoAtivo) {
                botao.textContent = 'EM BREVE';
                botao.disabled = true;
            }

            botao.addEventListener('click', () => {
                if (eventoAtivo && !skinJaAdquirida(skinPrincipal.id)) {
                    abrirModalRoleta(evento);
                }
            });

            card.appendChild(areaPreview);
            card.appendChild(info);
            card.appendChild(botao);
            container.appendChild(card);
        });
    }

    function processarCompraDireta(item, elementoBotao) {
        if (pacoteJaAdquirido(item) || (item.tipo !== 'pacote' && skinJaAdquirida(item.id))) return;

        let moedas = parseInt(localStorage.getItem('nv_moedas')) || 0;
        let diamantes = parseInt(localStorage.getItem('nv_diamantes')) || 0;

        if (item.moeda_tipo === 'diamante') {
            if (diamantes >= item.preco) {
                if (!window.gastarDiamantes(item.preco)) return;
                diamantes = window.lerDiamantes();
                sincronizarEconomia();
                if (item.tipo === 'pacote') registrarPacote(item);
                else registrarSkinAdquirida(item.id);
                if (item.tipo === 'pacote') marcarPacoteAdquirido(elementoBotao);
                else aplicarEstadoBotao(elementoBotao, item.id, item.preco, item.moeda_tipo, false);
                exibirModalSucesso("COMPRA REALIZADA!", `Você adquiriu ${item.nome} com sucesso!`, item.desenho);
            } else {
                exibirModalSucesso("RECURSOS INSUFICIENTES", "Você não possui Diamantes suficientes.");
            }
        } else {
            if (moedas >= item.preco) {
                moedas -= item.preco;
                localStorage.setItem('nv_moedas', moedas);
                sincronizarEconomia();
                if (item.tipo === 'pacote') registrarPacote(item);
                else registrarSkinAdquirida(item.id);
                if (item.tipo === 'pacote') marcarPacoteAdquirido(elementoBotao);
                else aplicarEstadoBotao(elementoBotao, item.id, item.preco, item.moeda_tipo, false);
                exibirModalSucesso("COMPRA REALIZADA!", `Você adquiriu ${item.nome} com sucesso!`, item.desenho);
            } else {
                exibirModalSucesso("RECURSOS INSUFICIENTES", "Você não possui Moedas suficientes.");
            }
        }
    }

    function atualizarContadores() {
        document.querySelectorAll('[data-fim]').forEach(elemento => {
            const agora = Date.now();
            const inicio = elemento.dataset.inicio ? new Date(elemento.dataset.inicio).getTime() : null;
            if (inicio && agora < inicio) {
                const dias = Math.ceil((inicio - agora) / 86400000);
                elemento.textContent = `INICIA EM ${dias} DIAS`;
                return;
            }
            const restante = new Date(elemento.dataset.fim).getTime() - agora;
            if (restante <= 0) {
                elemento.textContent = 'ENCERRADO';
                return;
            }
            const dias = Math.floor(restante / 86400000);
            const horas = Math.floor((restante % 86400000) / 3600000);
            const minutos = Math.floor((restante % 3600000) / 60000);
            elemento.textContent = `${dias}D ${horas}H ${minutos}MIN RESTANTES`;
        });
    }

    setInterval(atualizarContadores, 60000);
    setTimeout(atualizarContadores, 100);
});
