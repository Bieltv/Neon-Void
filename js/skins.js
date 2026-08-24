document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificação do Passe (Nível 15)
    const rgbDesbloqueado = localStorage.getItem('nv_skin_rgb_desbloqueada') === 'true';

    // Skins Ativas salvas
    const idsLegados = {
        nave: { '#0001': '#N001', '#0002': '#N002', '#0003': '#N003', '#0004': '#N004', '#0005': '#N005' },
        escudo: { '#0001': '#E001', '#0002': '#E002', '#0003': '#E003' },
        tiro: { '#0001': '#T001', '#0002': '#T002', '#0003': '#T003' }
    };

    function obterIdSkin(cat, idPadrao) {
        const idSalvo = localStorage.getItem(`nv_skin_equipada_${cat}`) || idPadrao;
        const idAtual = idsLegados[cat][idSalvo] || idSalvo;
        if (idAtual !== idSalvo) localStorage.setItem(`nv_skin_equipada_${cat}`, idAtual);
        return idAtual;
    }

    let skinEquipadaNave = obterIdSkin('nave', '#N001');
    let skinEquipadaEscudo = obterIdSkin('escudo', '#E001');
    let skinEquipadaTiro = obterIdSkin('tiro', '#T001');

    // Estados Individuais do RGB
    let rgbAtivoMap = {
        nave: localStorage.getItem('nv_rgb_ativo_nave') !== 'false',
        escudo: localStorage.getItem('nv_rgb_ativo_escudo') !== 'false',
        tiro: localStorage.getItem('nv_rgb_ativo_tiro') !== 'false'
    };

    // Cores Selecionadas da Paleta
    let corCustomMap = {
        nave: localStorage.getItem('nv_cor_custom_nave') || '#ff0055',
        escudo: localStorage.getItem('nv_cor_custom_escudo') || '#00ff66',
        tiro: localStorage.getItem('nv_cor_custom_tiro') || '#ffe600'
    };

    // BANCO DE DADOS GLOBAL DE SKINS
    window.skinsData = { nave: [], escudo: [], tiro: [] };
    window.cardsData = { nave: [], escudo: [], tiro: [] };

    // Função segura para buscar JSON
    async function fetchJsonSeguro(caminhoPrincipal, caminhoAlternativo) {
        try {
            let res = await fetch(caminhoPrincipal);
            if (res.ok) return await res.json();

            let resAlt = await fetch(caminhoAlternativo);
            if (resAlt.ok) return await resAlt.json();

            throw new Error(`Arquivo não encontrado em: ${caminhoPrincipal} nem em: ${caminhoAlternativo}`);
        } catch (e) {
            console.warn(`Aviso de Fetch: ${e.message}`);
            return null;
        }
    }

    async function carregarEProcessarSkins() {
        const [naves, escudos, tiros] = await Promise.all([
            fetchJsonSeguro('../data/nave.json', 'data/nave.json'),
            fetchJsonSeguro('../data/escudo.json', 'data/escudo.json'),
            fetchJsonSeguro('../data/tiro.json', 'data/tiro.json')
        ]);
        const jsonSkins = { nave: naves || [], escudo: escudos || [], tiro: tiros || [] };
        const cards = await fetchJsonSeguro('../data/cards.json', 'data/cards.json') || {};
        window.cardsData = cards;
        const dadosLoja = await fetchJsonSeguro('../data/loja.json', 'data/loja.json') || {};
        const dadosEventos = await fetchJsonSeguro('../data/eventos.json', 'data/eventos.json') || [];
        const controleVersao = await fetchJsonSeguro('../data/versao.json', 'data/versao.json') || {};

        function versaoCompativel(item) {
            const versaoAtual = controleVersao.versaoAtual || '1.0.0';
            const partesItem = String(item.versao || '1.0.0').split('.').map(Number);
            const partesAtual = String(versaoAtual).split('.').map(Number);
            for (let indice = 0; indice < 3; indice += 1) {
                const itemValor = Number.isFinite(partesItem[indice]) ? partesItem[indice] : 0;
                const atualValor = Number.isFinite(partesAtual[indice]) ? partesAtual[indice] : 0;
                if (itemValor !== atualValor) return itemValor < atualValor;
            }
            return true;
        }

        if (!naves || !escudos || !tiros) {
            console.error('CRÍTICO: Um dos arquivos de skins não foi encontrado na pasta /data/!');
            return;
        }

        function isEventoAtivo(evento) {
            if (!evento) return false;

            const inicio = new Date(evento.data_inicio || evento.dataInicio).getTime();
            const fim = new Date(evento.data_fim || evento.dataFim).getTime();

            return Number.isFinite(inicio) && Number.isFinite(fim) &&
                Date.now() >= inicio && Date.now() <= fim;
        }

        function deveExibirNoCofre(skinId, eventoId = null) {
            const expiraTexto = localStorage.getItem(`nv_skin_expira_${skinId}`);
            const expiraEm = expiraTexto ? Number(expiraTexto) : null;
            if (expiraEm !== null && Number.isFinite(expiraEm) && Date.now() > expiraEm) return false;
            const estaDesbloqueada = localStorage.getItem(`nv_skin_desbloqueada_${skinId}`) === 'true';
            if (estaDesbloqueada) return true;

            if (eventoId) {
                const eventoRoleta = (dadosLoja.roletas_ativas || []).find(roleta =>
                    roleta.id_evento === eventoId
                );
                const eventoFase = Array.isArray(dadosEventos)
                    ? dadosEventos.find(evento => evento.id === eventoId)
                    : null;
                const evento = eventoRoleta || eventoFase;

                if (!evento || !isEventoAtivo(evento)) return false;
            }

            return true;
        }

        window.deveExibirNoCofre = deveExibirNoCofre;

        try {
            const listaEventos = await fetchJsonSeguro('../data/eventos.json', 'data/eventos.json');
            if (Array.isArray(listaEventos)) {
                listaEventos.forEach(evento => {
                    const foiConcluido = localStorage.getItem(`nv_evento_concluido_${evento.id}`) === 'true';

                    if (foiConcluido && evento.recompensaConclusao && evento.recompensaConclusao.tipo === 'skin') {
                        const skinIdRecompensa = evento.recompensaConclusao.skinId;
                        localStorage.setItem(`nv_skin_desbloqueada_${skinIdRecompensa}`, 'true');
                    }
                });
            }
        } catch (errEv) {
            console.warn('Eventos não puderam ser verificados, ignorando:', errEv);
        }


        // Mapeamento dos meses para comparação amigável por nome
        // Mapeamento dos meses para criar a chave única do ano corrente
        const nomesMeses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril',
            'Maio', 'Junho', 'Julho', 'Agosto',
            'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        ['nave', 'escudo', 'tiro'].forEach(cat => {
            if (jsonSkins[cat]) {
                const hoje = new Date();
                const mesNome = nomesMeses[hoje.getMonth()];
                const anoAtual = hoje.getFullYear();

                // Gera a chave da temporada atual (Exemplo: "Setembro_2026")
                const mesAtualChave = `${mesNome}_${anoAtual}`;

                const skinsProcessadas = jsonSkins[cat].map(skin => {
                    const expiraTexto = localStorage.getItem(`nv_skin_expira_${skin.id}`);
                    const expiraEm = expiraTexto ? Number(expiraTexto) : null;
                    const jaPossui = localStorage.getItem(`nv_skin_desbloqueada_${skin.id}`) === 'true' &&
                        (expiraEm === null || !Number.isFinite(expiraEm) || Date.now() <= expiraEm);

                    // 1. Verificação do Passe (Temporada Exata)
                    let passeAtivo = true;
                    if (skin.requerPasse && skin.mesPasse) {
                        // Compara "Setembro_2026" com "Setembro_2026"
                        passeAtivo = (skin.mesPasse.trim().toLowerCase() === mesAtualChave.toLowerCase());
                    }

                    // ... [resto das verificações de evento e desbloqueio continuam iguais] ...

                    // 2. Verificação de Eventos Temporais
                    let eventoAtivo = true;
                    if (skin.dataInicio && skin.dataFim) {
                        const inicio = new Date(skin.dataInicio + 'T00:00:00');
                        const fim = new Date(skin.dataFim + 'T23:59:59');
                        eventoAtivo = hoje >= inicio && hoje <= fim;
                    }

                    // 3. Define Status de Desbloqueio
                    let estaDesbloqueada = false;
                    if (jaPossui) {
                        estaDesbloqueada = true;
                    } else if (skin.desbloqueadaPadrao) {
                        estaDesbloqueada = true;
                    } else if (skin.requerPasse && passeAtivo) {
                        estaDesbloqueada = rgbDesbloqueado;
                    }

                    return {
                        ...skin,
                        desbloqueada: estaDesbloqueada,
                        jaPossui,
                        passeAtivo,
                        eventoAtivo,
                        eventoValido: !skin.requerEvento || eventoAtivo,
                        card: (cards[cat] || []).find(card => card.skinId === skin.id)
                    };
                });

                // FILTRO: Só mantém no cofre o que for desbloqueado OU do mês/evento ativo
                window.skinsData[cat] = skinsProcessadas.filter(skin => {
                    if (!versaoCompativel(skin)) return false;
                    const eventoId = skin.eventoId || skin.requerEvento || null;

                    // Evolutivas permanecem visíveis para consulta fora da temporada.
                    if (Array.isArray(skin.niveis)) return true;
                    // Skins desbloqueadas ficam no cofre; eventos expirados saem.
                    const pacoteLimitado = skin.requerEvento?.startsWith('pacote_');
                    if (pacoteLimitado && !skin.jaPossui) return false;
                    if (!pacoteLimitado && !deveExibirNoCofre(skin.id, eventoId)) return false;

                    if (skin.jaPossui) return true;

                    // Se for do Passe, só aparece se passeAtivo for true (mês atual)
                    if (skin.requerPasse && skin.mesPasse) {
                        return skin.passeAtivo;
                    }

                    // Se for de Evento, só aparece durante as datas do evento
                    if (skin.requerEvento) {
                        return skin.eventoAtivo;
                    }

                    return true;
                });
            }
        });
    }

    await carregarEProcessarSkins();

    ['nave', 'escudo', 'tiro'].forEach(categoria => {
        const idAtual = categoria === 'nave' ? skinEquipadaNave :
            categoria === 'escudo' ? skinEquipadaEscudo : skinEquipadaTiro;
        if (window.skinsData[categoria].some(skin => skin.id === idAtual)) return;

        const idPadrao = categoria === 'nave' ? '#N001' :
            categoria === 'escudo' ? '#E001' : '#T001';
        localStorage.setItem(`nv_skin_equipada_${categoria}`, idPadrao);
        if (categoria === 'nave') skinEquipadaNave = idPadrao;
        if (categoria === 'escudo') skinEquipadaEscudo = idPadrao;
        if (categoria === 'tiro') skinEquipadaTiro = idPadrao;
    });

    let categoriaAtual = 'nave';
    let skinSelecionada = (window.skinsData.nave && window.skinsData.nave.length > 0) ? window.skinsData.nave[0] : {};
    let nivelEvoSelecionado = Math.min(3, Math.max(1,
        parseInt(localStorage.getItem('nv_nivel_skin_nave'), 10) || 1
    ));

    let hue = 0;
    let animacaoId = null;
    let cicloProjecao = 0;
    let ultimoFrameProjecao = 0;

    const canvas = document.getElementById('canvas-preview');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const btnVoltar = document.getElementById('btn-voltar');
    const abas = document.querySelectorAll('.btn-aba');
    const gaveta = document.getElementById('gaveta-skins');
    const painelAtributos = document.getElementById('painel-atributos');
    const btnEquipar = document.getElementById('btn-equipar');
    const btnToggleRgb = document.getElementById('btn-toggle-rgb');
    const painelPaleta = document.getElementById('painel-paleta-cores');
    const painelMensagem = document.createElement('div');
    let mensagemTimeout = null;

    painelMensagem.className = 'mensagem-skin';
    painelMensagem.style.display = 'none';
    painelMensagem.style.width = '100%';
    painelMensagem.style.padding = '10px';
    painelMensagem.style.marginBottom = '12px';
    painelMensagem.style.border = '2px solid';
    painelMensagem.style.fontSize = '0.6rem';
    painelMensagem.style.lineHeight = '1.6';
    painelMensagem.style.textAlign = 'center';

    if (btnEquipar?.parentElement) {
        btnEquipar.parentElement.insertBefore(painelMensagem, btnEquipar);
    }

    function exibirMensagemSkin(texto, tipo) {
        clearTimeout(mensagemTimeout);
        const sucesso = tipo === 'sucesso';
        const cor = sucesso ? '#00ff66' : '#ff4444';

        painelMensagem.textContent = texto;
        painelMensagem.style.display = 'block';
        painelMensagem.style.color = cor;
        painelMensagem.style.borderColor = cor;
        painelMensagem.style.backgroundColor = sucesso ? 'rgba(0, 255, 102, 0.08)' : 'rgba(255, 68, 68, 0.08)';
        painelMensagem.style.boxShadow = `0 0 10px ${sucesso ? 'rgba(0, 255, 102, 0.25)' : 'rgba(255, 68, 68, 0.25)'}`;

        mensagemTimeout = setTimeout(() => {
            painelMensagem.style.display = 'none';
        }, 4500);
    }

    function ganharSkinEvento(skinId) {
        if (!skinId) return false;

        localStorage.setItem(`nv_skin_desbloqueada_${skinId}`, 'true');
        exibirMensagemSkin('SKIN EXCLUSIVA DE EVENTO ADQUIRIDA!', 'sucesso');

        const categoriaSkin = Object.keys(window.skinsData).find(categoria =>
            window.skinsData[categoria].some(skin => skin.id === skinId)
        );

        if (categoriaSkin) {
            const skin = window.skinsData[categoriaSkin].find(item => item.id === skinId);
            if (skin) {
                skin.jaPossui = true;
                skin.desbloqueada = true;
            }

            renderizarGaveta();
            atualizarProjecao();
        }

        return true;
    }

    window.ganharSkinEvento = ganharSkinEvento;

    if (btnVoltar) {
        btnVoltar.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });
    }

    if (btnToggleRgb) {
        btnToggleRgb.addEventListener('click', () => {
            rgbAtivoMap[categoriaAtual] = !rgbAtivoMap[categoriaAtual];
            localStorage.setItem(`nv_rgb_ativo_${categoriaAtual}`, rgbAtivoMap[categoriaAtual].toString());
            atualizarControlesRgbEPaleta();
            desenharProjecao();
        });
    }

    function atualizarControlesRgbEPaleta() {
        if (!btnToggleRgb || !painelPaleta) return;
        const estaRgbAtivo = rgbAtivoMap[categoriaAtual];

        if (skinSelecionada.isRgb && skinSelecionada.desbloqueada) {
            btnToggleRgb.classList.remove('escondido');
            if (estaRgbAtivo) {
                btnToggleRgb.textContent = 'MODO RGB: LIGADO';
                btnToggleRgb.classList.remove('desativado');
                painelPaleta.classList.add('escondido');
            } else {
                btnToggleRgb.textContent = 'MODO RGB: DESLIGADO';
                btnToggleRgb.classList.add('desativado');
                renderizarPaletaCores();
            }
        } else {
            btnToggleRgb.classList.add('escondido');
            painelPaleta.classList.add('escondido');
        }
    }

    function renderizarPaletaCores() {
        if (!painelPaleta) return;
        painelPaleta.innerHTML = '';
        if (!skinSelecionada.paletaCores) return;

        painelPaleta.classList.remove('escondido');
        const corAtual = corCustomMap[categoriaAtual];

        skinSelecionada.paletaCores.forEach(cor => {
            const btnCor = document.createElement('div');
            btnCor.className = `bolinha-cor ${cor === corAtual ? 'selecionada' : ''}`;
            btnCor.style.backgroundColor = cor;

            btnCor.addEventListener('click', () => {
                corCustomMap[categoriaAtual] = cor;
                localStorage.setItem(`nv_cor_custom_${categoriaAtual}`, cor);
                renderizarPaletaCores();
                desenharProjecao();
            });

            painelPaleta.appendChild(btnCor);
        });
    }

    function isNivelDesbloqueado(skinId, nivel, nivelObj = {}) {
        const skinAdquirida = localStorage.getItem(`nv_skin_desbloqueada_${skinId}`) === 'true';
        if (!skinAdquirida) return false;
        if (nivelObj.desbloqueadoPadrao === true) return true;
        return localStorage.getItem(`nv_evo_desbloqueada_${skinId}_lvl_${nivel}`) === 'true';
    }

    function desbloquearEEquiparNivelEvolutivo(skin, nivelObj) {
        const skinId = skin.id;
        const nivelNum = nivelObj.nivel;
        const custo = Math.max(0, Number(nivelObj.custoDiamantes) || 0);
        let diamantesAtuais = parseInt(localStorage.getItem('nv_diamantes'), 10) || 0;

        if (localStorage.getItem(`nv_skin_desbloqueada_${skinId}`) !== 'true') {
            exibirMensagemSkin('CONQUISTE A SKIN PRINCIPAL ANTES DE USAR A EVOLUÇÃO.', 'erro');
            return false;
        }

        if (!isNivelDesbloqueado(skinId, nivelNum, nivelObj)) {
            if (diamantesAtuais < custo) {
                exibirMensagemSkin(`DIAMANTES INSUFICIENTES: VOCÊ PRECISA DE ${custo}.`, 'erro');
                return false;
            }

            if (!window.gastarDiamantes(custo)) return false;
            diamantesAtuais = window.lerDiamantes();
            localStorage.setItem(`nv_evo_desbloqueada_${skinId}_lvl_${nivelNum}`, 'true');
            exibirMensagemSkin(`NÍVEL ${nivelNum} DESBLOQUEADO COM SUCESSO.`, 'sucesso');
        }

        skinEquipadaNave = skinId;
        nivelEvoSelecionado = nivelNum;
        skin.nivelExibicao = nivelNum;
        localStorage.setItem('nv_skin_equipada_nave', skinId);
        localStorage.setItem('nv_nivel_skin_nave', nivelNum.toString());
        localStorage.setItem('nv_cor_skin_equipada', nivelObj.cor || '');
        exibirMensagemSkin(`SKIN EQUIPADA NO NÍVEL ${nivelNum}.`, 'sucesso');

        return true;
    }

    abas.forEach(aba => {
        aba.addEventListener('click', (e) => {
            abas.forEach(a => a.classList.remove('ativa'));
            e.target.classList.add('ativa');
            categoriaAtual = e.target.getAttribute('data-cat');
            skinSelecionada = (window.skinsData[categoriaAtual] && window.skinsData[categoriaAtual].length > 0) ? window.skinsData[categoriaAtual][0] : {};
            renderizarGaveta();
            atualizarProjecao();
        });
    });

    function renderizarGaveta() {
        if (!gaveta) return;
        gaveta.innerHTML = '';

        if (categoriaAtual === 'evolutiva') {
            const skinsEvo = (window.skinsData.nave || []).filter(skin =>
                Array.isArray(skin.niveis)
            );

            if (skinsEvo.length === 0) return;
            if (!skinsEvo.some(skin => skin.id === skinSelecionada.id)) skinSelecionada = skinsEvo[0];

            const conteinerEvo = document.createElement('div');
            conteinerEvo.className = 'painel-evolutivo';

            skinsEvo.forEach(skin => {
                const cardSkin = document.createElement('button');
                const indisponivel = !skin.desbloqueada && !skin.jaPossui;
                cardSkin.className = `card-skin-evolutiva ${skin.id === skinSelecionada.id ? 'ativo' : ''}`;
                const coresNiveis = skin.niveis.map(nivel => nivel.cor).filter(Boolean);
                if (coresNiveis.length > 0) {
                    cardSkin.style.background = `linear-gradient(120deg, ${coresNiveis.join(', ')})`;
                    cardSkin.style.backgroundBlendMode = 'screen';
                }
                cardSkin.innerHTML = `<strong>${skin.card?.nome || skin.nome}</strong><span>${indisponivel ? 'SKIN MAIS INDISPONÍVEL' : 'VISUALIZAR'}</span>${skin.requerEvento ? `<small>EVENTO: ${skin.requerEvento}</small><button type="button" class="btn-loja-evolutiva">IR PARA A LOJA</button>` : ''}`;
                cardSkin.addEventListener('click', () => {
                    skinSelecionada = skin;
                    nivelEvoSelecionado = skin.niveis?.[0]?.nivel || 1;
                    renderizarGaveta();
                    atualizarProjecao();
                });
                cardSkin.querySelector('.btn-loja-evolutiva')?.addEventListener('click', (evento) => {
                    evento.stopPropagation();
                    window.location.href = 'loja.html';
                });
                conteinerEvo.appendChild(cardSkin);
            });

            skinSelecionada.nivelExibicao = nivelEvoSelecionado;
            const skinIndisponivel = !skinSelecionada.desbloqueada && !skinSelecionada.jaPossui;
            const statusEvo = document.createElement('div');
            statusEvo.className = 'status-evolutiva';
            statusEvo.textContent = skinIndisponivel
                ? `SKIN MAIS INDISPONÍVEL${skinSelecionada.requerEvento ? ' - DISPONÍVEL NA LOJA/EVENTO' : ''}`
                : 'SKIN DISPONÍVEL';
            conteinerEvo.appendChild(statusEvo);

            skinSelecionada.niveis.forEach(nivel => {
                const cardNivel = document.createElement('div');
                cardNivel.className = `card-nivel-evo ${nivel.nivel === nivelEvoSelecionado ? 'ativo' : ''}`;
                const desbloqueado = isNivelDesbloqueado(skinSelecionada.id, nivel.nivel, nivel);
                const equipado = skinEquipadaNave === skinSelecionada.id &&
                    parseInt(localStorage.getItem('nv_nivel_skin_nave'), 10) === nivel.nivel;
                cardNivel.innerHTML = `
                    <div class="info-nivel">
                        <span class="num-nivel">NÍVEL ${nivel.nivel}</span>
                        <span class="nome-nivel">${nivel.nomeEstagio || ''}</span>
                    </div>
                    <span class="tag-nivel-status">${equipado ? 'EQUIPADO' : (desbloqueado ? 'DESBLOQUEADO' : 'BLOQUEADO')}</span>
                `;

                cardNivel.addEventListener('click', () => {
                    nivelEvoSelecionado = nivel.nivel;
                    skinSelecionada.nivelExibicao = nivel.nivel;
                    renderizarGaveta();
                    atualizarProjecao();
                    if (skinIndisponivel) return;
                    if (desbloquearEEquiparNivelEvolutivo(skinSelecionada, nivel)) {
                        renderizarGaveta();
                        atualizarProjecao();
                    }
                });

                conteinerEvo.appendChild(cardNivel);
            });

            gaveta.appendChild(conteinerEvo);
            return;
        }

        if (!window.skinsData[categoriaAtual]) return;

        window.skinsData[categoriaAtual].forEach(skin => {
            const nomeMinusculo = (skin.nome || '').toLowerCase();

            // 1. O Glitch é identificado pelo nome ou pelo ID da nave.
            const isGlitch = nomeMinusculo.includes('glitch') || (skin.id === '#N003' && categoriaAtual === 'nave');

            // 2. O Passe é identificado pelo nome, requisito ou ID da skin RGB.
            const isPasse = skin.id === '#N002' ||
                skin.id === '#E002' || skin.id === '#T002' ||
                nomeMinusculo.includes('tríade') ||
                nomeMinusculo.includes('triade') ||
                skin.requerPasse === true ||
                (skin.mesPasse && skin.mesPasse.toLowerCase().includes('outubro'));

            // 3. Define a classe visual: o pacote RGB tem prioridade visual.
            let classeEspecial = '';
            if (skin.isRgb) {
                classeEspecial = 'card-rgb';
            } else if (isPasse) {
                classeEspecial = 'card-passe';
            } else if (isGlitch) {
                classeEspecial = 'card-glitch';
            }

            const card = document.createElement('div');
            card.className = `item-card-skin ${skin.id === skinSelecionada.id ? 'selecionado' : ''} ${classeEspecial}`;

            let textoStatus = 'BLOQUEADO';
            if (skin.desbloqueada) {
                const idEquipado = getSkinEquipadaId(categoriaAtual);
                textoStatus = (skin.id === idEquipado) ? 'EQUIPADO' : 'DESBLOQUEADO';
            }

            card.innerHTML = `
                <div class="item-info">
                    <span class="item-id">${skin.codigoExibicao || skin.id}</span>
                    <span class="item-nome">${skin.nome}</span>
                </div>
                <span class="item-status ${!skin.desbloqueada ? 'status-bloqueado' : ''}">${textoStatus}</span>
            `;

            card.addEventListener('click', () => {
                skinSelecionada = skin;
                renderizarGaveta();
                atualizarProjecao();
            });

            gaveta.appendChild(card);
        });
    }

    function getSkinEquipadaId(cat) {
        if (cat === 'nave') return skinEquipadaNave;
        if (cat === 'escudo') return skinEquipadaEscudo;
        if (cat === 'tiro') return skinEquipadaTiro;
    }

    function atualizarProjecao() {
        const elId = document.getElementById('skin-id');
        const elNome = document.getElementById('skin-nome');
        if (elId) elId.textContent = skinSelecionada.codigoExibicao || skinSelecionada.id || '';
        if (elNome) elNome.textContent = skinSelecionada.nome || '';

        if (painelAtributos) {
            painelAtributos.innerHTML = '';
            if (skinSelecionada.atributos) {
                for (const [chave, valor] of Object.entries(skinSelecionada.atributos)) {
                    const item = document.createElement('div');
                    item.className = 'atributo-item';

                    let valorExibido = valor;
                    if (chave === 'PROTEÇÃO') valorExibido = `+${valor} VIDA EXTRA`;
                    if (chave === 'DURAÇÃO') valorExibido = `${valor}s`;

                    item.innerHTML = `<span>${chave}:</span><span class="valor-attr">${valorExibido}</span>`;
                    painelAtributos.appendChild(item);
                }
            }
        }

        atualizarBotaoEquipar();
        atualizarControlesRgbEPaleta();
        iniciarLoopProjecao();
    }

    function atualizarBotaoEquipar() {
        if (!btnEquipar) return;

        if (categoriaAtual === 'evolutiva' && skinSelecionada.niveis) {
            const nivelSelecionado = skinSelecionada.niveis.find(nivel =>
                nivel.nivel === nivelEvoSelecionado
            ) || skinSelecionada.niveis[0];
            const desbloqueado = isNivelDesbloqueado(
                skinSelecionada.id,
                nivelSelecionado.nivel,
                nivelSelecionado
            );
            const equipado = skinEquipadaNave === skinSelecionada.id &&
                parseInt(localStorage.getItem('nv_nivel_skin_nave'), 10) === nivelSelecionado.nivel;

            btnEquipar.textContent = equipado ? 'EQUIPADO' :
                (desbloqueado ? 'EQUIPAR' : `DESBLOQUEAR: ${nivelSelecionado.custoDiamantes || 0} DIAMANTES`);
            btnEquipar.disabled = false;
            btnEquipar.className = equipado ? 'btn-equipar equipado' : 'btn-equipar';
            return;
        }

        const idEquipado = getSkinEquipadaId(categoriaAtual);

        if (!skinSelecionada.desbloqueada) {
            btnEquipar.textContent = skinSelecionada.requerPasse ? 'PASSE NÍVEL 15 REQUERIDO' : 'CONCLUA O MODO CAOS';
            btnEquipar.disabled = true;
            btnEquipar.className = 'btn-equipar bloqueado';
        } else if (skinSelecionada.id === idEquipado) {
            btnEquipar.textContent = 'EQUIPADO';
            btnEquipar.disabled = true;
            btnEquipar.className = 'btn-equipar equipado';
        } else {
            btnEquipar.textContent = 'EQUIPAR';
            btnEquipar.disabled = false;
            btnEquipar.className = 'btn-equipar';
        }
    }

    if (btnEquipar) {
        btnEquipar.addEventListener('click', () => {
            if (categoriaAtual === 'evolutiva' && skinSelecionada.niveis) {
                const nivelSelecionado = skinSelecionada.niveis.find(nivel =>
                    nivel.nivel === nivelEvoSelecionado
                ) || skinSelecionada.niveis[0];

                if (desbloquearEEquiparNivelEvolutivo(skinSelecionada, nivelSelecionado)) {
                    renderizarGaveta();
                    atualizarProjecao();
                }
                return;
            }

            if (!skinSelecionada.desbloqueada) return;

            if (categoriaAtual === 'nave') {
                skinEquipadaNave = skinSelecionada.id;
                localStorage.setItem('nv_skin_equipada_nave', skinEquipadaNave);
            } else if (categoriaAtual === 'escudo') {
                skinEquipadaEscudo = skinSelecionada.id;
                localStorage.setItem('nv_skin_equipada_escudo', skinEquipadaEscudo);
            } else if (categoriaAtual === 'tiro') {
                skinEquipadaTiro = skinSelecionada.id;
                localStorage.setItem('nv_skin_equipada_tiro', skinEquipadaTiro);
            }

            renderizarGaveta();
            atualizarBotaoEquipar();
        });
    }

    function iniciarLoopProjecao() {
        if (!ctx) return;
        if (animacaoId) cancelAnimationFrame(animacaoId);

        const cicloAtual = ++cicloProjecao;
        ultimoFrameProjecao = 0;

        function render(tempoAtual) {
            if (cicloAtual !== cicloProjecao) return;

            if (document.hidden) {
                animacaoId = requestAnimationFrame(render);
                return;
            }

            if (tempoAtual - ultimoFrameProjecao < 33) {
                animacaoId = requestAnimationFrame(render);
                return;
            }

            ultimoFrameProjecao = tempoAtual;
            hue = (hue + 2) % 360;
            desenharProjecao();
            animacaoId = requestAnimationFrame(render);
        }
        render(performance.now());
    }

    // === RENDERIZADOR DE PREVIEW DO CANVAS ===
    // === RENDERIZADOR DE PREVIEW DO CANVAS ===
    // === RENDERIZADOR DE PREVIEW DO CANVAS ===
    function desenharProjecao() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let cx = canvas.width / 2;
        let cy = canvas.height / 2;

        let corAtual = skinSelecionada.cor || '#00f0ff';

        // 1. Resolve a cor atual da skin, sem substituir animações definidas no JSON.
        const nomeMinusculo = (skinSelecionada.nome || '').toLowerCase();
        if (skinSelecionada.isRgb) {
            const estaRgbAtivo = rgbAtivoMap[categoriaAtual];
            corAtual = estaRgbAtivo ? `hsl(${hue}, 100%, 50%)` : corCustomMap[categoriaAtual];
        }

        // --- VERIFICAÇÃO RIGOROSA DE GLITCH ---
        const isGlitch = nomeMinusculo.includes('glitch') || (skinSelecionada.id === '#N003' && categoriaAtual === 'nave');

        // SE FOR A SKIN GLITCH VERDADEIRA: Aplica tremor
        if (isGlitch) {
            const offsetX = (Math.random() - 0.5) * 8;
            const offsetY = (Math.random() - 0.5) * 8;
            cx += offsetX;
            cy += offsetY;

            const coresGlitch = ['#7f8c8d', '#a6a6a6', '#00f0ff', '#ff0055', '#ffffff', '#333333'];
            corAtual = coresGlitch[Math.floor(Math.random() * coresGlitch.length)];
        }

        ctx.shadowBlur = isGlitch ? 18 : 12;
        ctx.shadowColor = corAtual;
        ctx.strokeStyle = corAtual;
        ctx.fillStyle = corAtual;

        const skinParaRenderizar = skinSelecionada.isRgb
            ? { ...skinSelecionada, cor: corAtual }
            : skinSelecionada;

        if ((categoriaAtual === 'nave' || categoriaAtual === 'evolutiva') &&
            (skinSelecionada.forma || skinSelecionada.niveis)) {
            const nivelParaPreview = skinSelecionada.nivelExibicao || 1;
            renderizarNaveGeral(ctx, cx, cy, skinParaRenderizar, nivelParaPreview);

        } else if (categoriaAtual === 'nave') {
            ctx.lineWidth = isGlitch ? 3.5 : 3;

            // Desenho principal da nave
            ctx.beginPath();
            ctx.moveTo(cx, cy - 40);
            ctx.lineTo(cx - 35, cy + 35);
            ctx.lineTo(cx, cy + 18);
            ctx.lineTo(cx + 35, cy + 35);
            ctx.closePath();
            ctx.stroke();

            // Cabine
            ctx.beginPath();
            ctx.rect(cx - 6, cy - 10, 12, 16);
            ctx.stroke();

            // Aberração Cromática exclusiva do Glitch
            if (isGlitch && Math.random() > 0.3) {
                ctx.strokeStyle = Math.random() > 0.5 ? '#ff0055' : '#00f0ff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx + 4, cy - 40);
                ctx.lineTo(cx - 31, cy + 35);
                ctx.stroke();
            }

        } else if (categoriaAtual === 'escudo') {
            renderizarEscudoGeral(ctx, cx, cy, skinParaRenderizar, performance.now());

        } else if (categoriaAtual === 'tiro') {
            if (skinSelecionada.tipo === 'projetil') {
                renderizarTiroGeral(ctx, cx, cy, skinParaRenderizar);
                return;
            }
            const qtdLinhas = skinSelecionada.linhasTiro || 1;

            if (qtdLinhas === 2) {
                const espacamento = 12;
                const larguraLaser = 6;
                const alturaLaser = 80;

                ctx.fillRect(cx - espacamento - (larguraLaser / 2), cy - (alturaLaser / 2), larguraLaser, alturaLaser);
                ctx.fillRect(cx + espacamento - (larguraLaser / 2), cy - (alturaLaser / 2), larguraLaser, alturaLaser);
            } else {
                ctx.fillRect(cx - 5, cy - 40, 10, 80);
            }
        }
    }

    // Inicialização final
    renderizarGaveta();
    atualizarProjecao();
});