document.addEventListener('DOMContentLoaded', async () => {

    const canvas = document.getElementById('canvasJogo');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('game-container');
    let larguraArena = 1;
    let alturaArena = 1;

    function redimensionarCanvas() {
        larguraArena = Math.max(1, container.clientWidth);
        alturaArena = Math.max(1, container.clientHeight);

        // Mantem coordenadas do jogo em pixels CSS e melhora a nitidez em telas Retina.
        const densidadePixels = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(larguraArena * densidadePixels);
        canvas.height = Math.round(alturaArena * densidadePixels);
        canvas.style.width = `${larguraArena}px`;
        canvas.style.height = `${alturaArena}px`;
        ctx.setTransform(densidadePixels, 0, 0, densidadePixels, 0, 0);
    }
    redimensionarCanvas();
    window.addEventListener('resize', redimensionarCanvas);

    // === INTEGRAÇÃO COM SKINS.JS E LOCALSTORAGE ===
    const idsLegados = {
        nave: { '#0001': '#N001', '#0002': '#N002', '#0003': '#N003', '#0004': '#N004', '#0005': '#N005' },
        escudo: { '#0001': '#E001', '#0002': '#E002', '#0003': '#E003' },
        tiro: { '#0001': '#T001', '#0002': '#T002', '#0003': '#T003' }
    };
    function idSkinAtual(cat, idPadrao) {
        const idSalvo = localStorage.getItem(`nv_skin_equipada_${cat}`) || idPadrao;
        const idAtual = idsLegados[cat][idSalvo] || idSalvo;
        if (idAtual !== idSalvo) localStorage.setItem(`nv_skin_equipada_${cat}`, idAtual);
        return idAtual;
    }
    let skinNaveId = idSkinAtual('nave', '#N001');
    let skinEscudoId = idSkinAtual('escudo', '#E001');
    let skinTiroId = idSkinAtual('tiro', '#T001');

    const rgbAtivoNave = localStorage.getItem('nv_rgb_ativo_nave') !== 'false';
    const rgbAtivoEscudo = localStorage.getItem('nv_rgb_ativo_escudo') !== 'false';
    const rgbAtivoTiro = localStorage.getItem('nv_rgb_ativo_tiro') !== 'false';

    const corCustomNave = localStorage.getItem('nv_cor_custom_nave') || '#ff0055';
    const corCustomEscudo = localStorage.getItem('nv_cor_custom_escudo') || '#00ff66';
    const corCustomTiro = localStorage.getItem('nv_cor_custom_tiro') || '#ffe600';

    const nivelNaveSalvo = parseInt(localStorage.getItem('nv_nivel_skin_nave')) || 1;

    // === CARREGAMENTO ASSÍNCRONO DE JSONs (SKINS E INIMIGOS) ===
    async function carregarJsonAssincrono(caminhoRelativo) {
        try {
            let res = await fetch(`../${caminhoRelativo}`);
            if (!res.ok) res = await fetch(caminhoRelativo);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn(`Erro ao carregar ${caminhoRelativo}, usando fallback:`, e);
        }
        return null;
    }

    const [naves, escudos, tirosJson] = await Promise.all([
        carregarJsonAssincrono('data/nave.json'),
        carregarJsonAssincrono('data/escudo.json'),
        carregarJsonAssincrono('data/tiro.json')
    ]);
    const bancoSkinsJson = { nave: naves || [], escudo: escudos || [], tiro: tirosJson || [] };
    function validarSkinSelecionada(categoria, id, padrao) {
        if (bancoSkinsJson[categoria].some(skin => skin.id === id)) return id;
        localStorage.setItem(`nv_skin_equipada_${categoria}`, padrao);
        return padrao;
    }
    skinNaveId = validarSkinSelecionada('nave', skinNaveId, '#N001');
    skinEscudoId = validarSkinSelecionada('escudo', skinEscudoId, '#E001');
    skinTiroId = validarSkinSelecionada('tiro', skinTiroId, '#T001');
    const bancoInimigosJson = await carregarJsonAssincrono('data/inimigos.json');
    const bancoInimigosEventoJson = await carregarJsonAssincrono('data/inimigosEV.json');
    const bancoEventosJson = await carregarJsonAssincrono('data/eventos.json');

    const eventoIdAtivo = sessionStorage.getItem('nv_evento_ativo_id');
    const faseAtualAtiva = sessionStorage.getItem('nv_evento_fase_atual')
        ? parseInt(sessionStorage.getItem('nv_evento_fase_atual'))
        : null;
    const eventoAtual = Array.isArray(bancoEventosJson)
        ? bancoEventosJson.find(evento => evento.id === eventoIdAtivo)
        : null;
    const inimigosEvento = bancoInimigosEventoJson?.eventos?.[eventoIdAtivo] || {};

    // Fallback padrão para inimigos caso o JSON falhe
    const listaInimigosComuns = inimigosEvento.comuns || bancoInimigosJson?.comuns || [
        { id: 'batedor', tamanho: 26, velocidadeBase: 2.2, vida: 1, pontos: 100, cor: '#ff0055' }
    ];
    const dadosBossJson = inimigosEvento.bosses?.[0] || bancoInimigosJson?.bosses?.[0] || {
        largura: 140, altura: 70, vidaBase: 100, corFase1: '#ff0055', corFase2: '#00f0ff'
    };

    // Busca de dados de Skins
    const dadosNave = (bancoSkinsJson?.nave?.find(s => s.id === skinNaveId)) || window.skinsData?.nave?.find(s => s.id === skinNaveId) || { cor: '#00f0ff', atributos: {} };
    const dadosEscudo = (bancoSkinsJson?.escudo?.find(s => s.id === skinEscudoId)) || window.skinsData?.escudo?.find(s => s.id === skinEscudoId) || { cor: '#00f0ff', atributos: {} };
    const dadosTiro = (bancoSkinsJson?.tiro?.find(s => s.id === skinTiroId)) || window.skinsData?.tiro?.find(s => s.id === skinTiroId) || { cor: '#00f0ff', atributos: {} };

    const isNaveRgb = skinNaveId === '#N002';
    const isEscudoRgb = skinEscudoId === '#E002';
    const isTiroRgb = skinTiroId === '#T002';

    let hueRgb = 0;

    function calcularCorEvolutiva(pontosAtuais, animacao) {
        const maxPontos = Number(animacao.maxPontos) || 18000;
        const progresso = Math.min(Math.max(pontosAtuais / maxPontos, 0), 1);

        if (progresso <= 0.5) {
            const etapa = progresso / 0.5;
            const verde = Math.round(102 * etapa);
            return `rgb(255, ${verde}, 0)`;
        }

        const etapa = (progresso - 0.5) / 0.5;
        const verde = Math.round(102 + (153 * etapa));
        const azul = Math.round(255 * etapa);
        return `rgb(255, ${verde}, ${azul})`;
    }

    function obterCorSkin(dadosSkin, isRgb, rgbAtivo, corCustom, pontosAtuais = 0) {
        if (dadosSkin.animacao?.tipo === 'evolutivo_progresso') {
            return calcularCorEvolutiva(pontosAtuais, dadosSkin.animacao);
        }

        if (isRgb) {
            return rgbAtivo ? `hsl(${hueRgb}, 100%, 50%)` : corCustom;
        }
        return dadosSkin.cor || '#00f0ff';
    }

    function prepararSkinParaRenderizacao(dadosSkin, isRgb, rgbAtivo, corCustom, pontosAtuais = 0) {
        if (!isRgb) return dadosSkin;
        return {
            ...dadosSkin,
            cor: obterCorSkin(dadosSkin, true, rgbAtivo, corCustom, pontosAtuais)
        };
    }

    // === GERADOR DINÂMICO DE MODIFICADORES POR FASE ===
    function obterConfiguracaoDinamicaFase(fase) {
        const danoInimigo = 1 + (fase - 1) * 0.2;
        const cores = ['#ff6600', '#ff3300', '#ff0055', '#cc00ff', '#00ffcc', '#ffe600', '#00f0ff'];
        const corInimigos = cores[(fase - 1) % cores.length];

        let bossConfig = {
            velocidade: 1 + (fase * 0.1),
            somenteLaser: fase % 2 === 0,
            vidaBase: dadosBossJson.vidaBase
        };

        let opcoesDisponiveis = [
            { id: 'escudo_50', nome: 'ESCUDO CAÓTICO', descricao: '+50 de Escudo' },
            { id: 'tiro_quadruplo', nome: 'DISPARO QUÁDRUPLO', descricao: '4 Linhas de Tiro' }
        ];

        if (fase >= 3) opcoesDisponiveis.push({ id: 'dano_duplo', nome: 'TIRO PESADO', descricao: 'Dano dos tiros dobrado' });
        if (fase >= 5) opcoesDisponiveis.push({ id: 'super_velocidade', nome: 'PROPULSOR NEON', descricao: '+50% de Velocidade' });
        if (fase >= 7) opcoesDisponiveis.push({ id: 'cadencia_rapida', nome: 'METRALHADORA', descricao: 'Tiros super rápidos' });
        if (fase >= 9) opcoesDisponiveis.push({ id: 'super_nave', nome: 'MODO DESTRUIDOR', descricao: 'Dano Dobrado + Escudo de 100' });
        if (fase >= 12) opcoesDisponiveis.push({ id: 'gravidade_caotica', nome: 'GRAVIDADE CAÓTICA', descricao: 'Inimigos aceleram durante a queda' });
        if (fase >= 20) opcoesDisponiveis.push({ id: 'blindagem_inimiga', nome: 'BLINDAGEM INIMIGA', descricao: 'Inimigos surgem com vida extra' });

        const usaModificadores = eventoAtual?.usaModificadores !== false;
        return {
            corInimigos: usaModificadores ? corInimigos : null,
            danoInimigo: danoInimigo,
            boss: bossConfig,
            escolhaInicial: {
                ativo: usaModificadores,
                opcoes: opcoesDisponiveis
            }
        };
    }

    const arenaConfig = (eventoIdAtivo && faseAtualAtiva !== null)
        ? obterConfiguracaoDinamicaFase(faseAtualAtiva)
        : null;

    const multiplicadorDanoInimigo = arenaConfig ? arenaConfig.danoInimigo : 1;

    // === VARIÁVEIS BASE ===
    const DANO_COLISAO_BASE = 20;

    const pontosVidaNave = Number(dadosNave.atributos?.['VIDA']) || 3;
    const hpMaxNaveCalculado = pontosVidaNave * DANO_COLISAO_BASE;

    const pontosProtecaoEscudo = Number(dadosEscudo.atributos?.['PROTEÇÃO']) || 5;
    const hpMaxEscudoCalculado = pontosProtecaoEscudo * DANO_COLISAO_BASE;
    const tempoMaxEscudoSkin = Number(dadosEscudo.atributos?.['DURAÇÃO']) || 10;

    const danoBaseTiro = Number(dadosTiro.atributos?.['DANO']) || 1;
    const linhasTiroSkin = Number(dadosTiro.atributos?.['LINHAS DE TIRO']) || 1;

    // === ESTADO DO JOGO ===
    let rodando = false;
    let pausado = false;
    let ondaAtual = 1;
    let tempoRestante = 60;
    let tempoTimer = null;
    let pontos = 0;
    let inimigosAbatidos = 0;
    let bossAtivo = false;
    let bossSpawned = false;
    let estadoBoss = 'inativo';
    let ultimoTempo = 0;
    let ultimoTempoAtualizacaoJogador = performance.now();

    const elBarraVida = document.getElementById('barra-vida-fill');
    const elPontos = document.getElementById('hud-pontos');
    const elTempo = document.getElementById('hud-tempo');
    const elFase = document.getElementById('hud-fase');
    const elAlertaBoss = document.getElementById('alerta-boss');
    const telaPause = document.getElementById('pause-screen');

    // === OBJETO DO JOGADOR ===
    const jogador = {
        x: larguraArena / 2,
        y: alturaArena - 100,
        raio: 18,

        vidaMax: hpMaxNaveCalculado,
        vida: hpMaxNaveCalculado,
        cor: dadosNave.cor || '#00f0ff',
        nivelEvolutivo: nivelNaveSalvo,
        dadosSkin: dadosNave,
        velocidade: 7,
        dano: danoBaseTiro,
        linhasTiro: linhasTiroSkin,

        escudoAtivo: false,
        escudoVidaMax: hpMaxEscudoCalculado,
        escudoVida: hpMaxEscudoCalculado,
        tempoEscudoMax: tempoMaxEscudoSkin,
        tempoEscudoRestante: 0,
        tempoRecargaEscudo: 0,

        tiroEspecial: false,
        tempoTiroEspecial: 0,

        ultimoDisparo: 0,
        cadencia: 400
    };

    function inicializarAtributosJogador() {
        const nivelEvoAtual = Math.min(3, Math.max(1, nivelNaveSalvo));
        const estagio = dadosNave.tipo === 'evolutiva' && Array.isArray(dadosNave.niveis)
            ? dadosNave.niveis.find(nivel => nivel.nivel === nivelEvoAtual) || dadosNave.niveis[0]
            : null;
        const vidaBase = Number(dadosNave.atributos?.VIDA) || 3;
        const danoBase = Number(dadosNave.atributos?.DANO) || 1;

        jogador.vidaMax = vidaBase * DANO_COLISAO_BASE;
        jogador.vida = jogador.vidaMax;
        jogador.dano = danoBase;
        jogador.cor = estagio?.cor || dadosNave.cor || '#00f0ff';
        jogador.nivelEvolutivo = estagio?.nivel || nivelEvoAtual;
        jogador.dadosSkin = dadosNave;
    }

    inicializarAtributosJogador();

    if (arenaConfig && arenaConfig.escolhaInicial && arenaConfig.escolhaInicial.ativo) {
        exibirEscolhaInicial(arenaConfig.escolhaInicial.opcoes);
    } else {
        iniciarPartida();
    }

    function exibirEscolhaInicial(opcoes) {
        const modal = document.getElementById('modal-escolha-inicial');
        const container = document.getElementById('container-opcoes');
        if (!modal || !container) {
            iniciarPartida();
            return;
        }

        container.innerHTML = '';
        opcoes.forEach(opcao => {
            const btn = document.createElement('button');
            btn.className = 'btn-opcao';
            btn.innerHTML = `
                <h3>${opcao.nome}</h3>
                <p>${opcao.descricao}</p>
            `;
            btn.addEventListener('click', () => aplicarEscolha(opcao.id));
            container.appendChild(btn);
        });

        modal.style.display = 'flex';
    }

    function aplicarEscolha(opcaoId) {
        if (opcaoId === 'escudo_50') {
            jogador.escudoVidaMax = 50 * DANO_COLISAO_BASE;
            jogador.escudoVida = jogador.escudoVidaMax;
            jogador.escudoAtivo = true;
        } else if (opcaoId === 'escudo_100') {
            jogador.escudoVidaMax = 100 * DANO_COLISAO_BASE;
            jogador.escudoVida = jogador.escudoVidaMax;
            jogador.escudoAtivo = true;
        } else if (opcaoId === 'tiro_quadruplo') {
            jogador.linhasTiro = 4;
            jogador.cadencia = 1200;
        } else if (opcaoId === 'super_velocidade') {
            jogador.velocidade *= 1.5;
        } else if (opcaoId === 'dano_duplo') {
            jogador.dano *= 2;
        } else if (opcaoId === 'cadencia_rapida') {
            jogador.cadencia = 150;
        } else if (opcaoId === 'super_nave') {
            jogador.dano *= 2;
            jogador.escudoVidaMax = 100 * DANO_COLISAO_BASE;
            jogador.escudoVida = jogador.escudoVidaMax;
            jogador.escudoAtivo = true;
        } else if (opcaoId === 'gravidade_caotica') {
            jogador.velocidade *= 1.25;
        } else if (opcaoId === 'blindagem_inimiga') {
            jogador.dano *= 1.15;
        }

        const modal = document.getElementById('modal-escolha-inicial');
        if (modal) modal.style.display = 'none';

        iniciarPartida();
    }

    function iniciarPartida() {
        rodando = true;
        iniciarTimer();
        ultimoTempo = performance.now();
        requestAnimationFrame(loop);
    }

    const teclas = {};
    let mouseX = jogador.x;
    let mouseY = jogador.y;
    let usandoMouse = false;

    window.addEventListener('keydown', (e) => {
        teclas[e.code] = true;
        usandoMouse = false;

        if (e.code === 'KeyP' || e.code === 'Escape') {
            alternarPause();
        }
    });

    window.addEventListener('keyup', (e) => teclas[e.code] = false);

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        usandoMouse = true;
    });

    canvas.addEventListener('touchmove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.touches[0].clientX - rect.left;
        mouseY = e.touches[0].clientY - rect.top;
        usandoMouse = true;
    });

    document.getElementById('btn-pause').addEventListener('click', alternarPause);
    document.getElementById('btn-retomar').addEventListener('click', alternarPause);
    document.getElementById('btn-pause-menu').addEventListener('click', () => {
        window.location.href = 'menu.html';
    });

    function alternarPause() {
        if (!rodando) return;
        pausado = !pausado;
        if (pausado) {
            telaPause.classList.add('ativo');
        } else {
            telaPause.classList.remove('ativo');
            requestAnimationFrame(loop);
        }
    }

    let tiros = [];
    let inimigos = [];
    let powerUps = [];
    let projeteisBoss = [];
    let lasersBoss = [];

    function iniciarTimer() {
        if (tempoTimer) clearInterval(tempoTimer);
        tempoTimer = setInterval(() => {
            if (!rodando || pausado) return;

            if (tempoRestante > 0) {
                tempoRestante--;
                elTempo.textContent = `${tempoRestante}s`;
            } else if (!bossSpawned) {
                iniciarBoss();
            }
        }, 1000);
    }

    let timerInimigos = 0;

    // === GERAR INIMIGO A PARTIR DO JSON ===
    function gerarInimigo() {
        if (bossAtivo) return;

        // Sortear modelo de inimigo do JSON
        const modelo = listaInimigosComuns[Math.floor(Math.random() * listaInimigosComuns.length)];
        const velMult = 1 + (ondaAtual - 1) * 0.2;

        inimigos.push({
            x: Math.random() * (larguraArena - modelo.tamanho),
            y: -modelo.tamanho,
            tamanho: modelo.tamanho,
            velocidade: (modelo.velocidadeBase || 2) * velMult,
            vida: modelo.vida || 1,
            vidaMax: modelo.vida || 1,
            tipo: modelo.tipo || 'comum',
            tempoContato: 0,
            tempoExplosao: modelo.tempoExplosao || 1.2,
            pontos: modelo.pontos || 100,
            cor: arenaConfig?.corInimigos || modelo.cor || '#ff0055'
        });
    }

    // === OBJETO BOSS BASEADO NO JSON ===
    const boss = {
        x: 0,
        y: -120,
        largura: dadosBossJson.largura || 140,
        altura: dadosBossJson.altura || 70,
        vidaMax: dadosBossJson.vidaBase || 100,
        vida: dadosBossJson.vidaBase || 100,
        fase: 1,
        velocidadeX: arenaConfig?.boss?.velocidade ? 3 * arenaConfig.boss.velocidade : 3,
        ultimoAtaque: 0,
        alvoY: 70
    };

    function iniciarBoss() {
        bossSpawned = true;
        bossAtivo = true;
        estadoBoss = 'entrada';

        // Remove inimigos que ficaram fora da tela durante a luta do boss.
        inimigos.length = 0;
        projeteisBoss.length = 0;
        lasersBoss.length = 0;

        const vidaInicial = arenaConfig?.boss?.vidaBase || dadosBossJson.vidaBase || 100;
        const escalaBoss = eventoAtual?.escalaBossPorOnda !== false;
        boss.vidaMax = escalaBoss ? vidaInicial + (ondaAtual - 1) * 250 : vidaInicial;
        boss.vida = boss.vidaMax;
        boss.fase = 1;

        elTempo.textContent = "BOSS";
        elTempo.style.color = "#ff0055";

        elAlertaBoss.style.display = 'block';
        setTimeout(() => {
            elAlertaBoss.style.display = 'none';
        }, 3000);

        boss.x = larguraArena / 2 - boss.largura / 2;
        boss.y = -boss.altura - 20;
    }

    function entregarRecompensaDaFase(eventoId, fase) {
        const evento = Array.isArray(bancoEventosJson)
            ? bancoEventosJson.find(item => item.id === eventoId)
            : null;
        const recompensa = evento?.recompensasFases?.find(item => item.fase === fase);
        if (!recompensa || localStorage.getItem(`nv_recompensa_${eventoId}_${fase}`) === 'true') return;

        adicionarMoedas(recompensa.moedas || 0);
        adicionarDiamantes(recompensa.diamantes || 0);
        localStorage.setItem(`nv_recompensa_${eventoId}_${fase}`, 'true');
    }

    function resetarParaProximaOnda() {
        const eventoId = sessionStorage.getItem('nv_evento_ativo_id');
        const faseAtual = parseInt(sessionStorage.getItem('nv_evento_fase_atual'));
        const fasesTotais = parseInt(sessionStorage.getItem('nv_evento_fases_totais')) || 10;

        if (eventoId && faseAtual) {
            rodando = false;
            clearInterval(tempoTimer);
            entregarRecompensaDaFase(eventoId, faseAtual);

            const progressoSalvo = parseInt(localStorage.getItem(`nv_progresso_${eventoId}`)) || 1;

            if (faseAtual >= progressoSalvo) {
                localStorage.setItem(`nv_progresso_${eventoId}`, faseAtual + 1);
            }

            if (faseAtual >= fasesTotais) {
                localStorage.setItem(`nv_evento_concluido_${eventoId}`, 'true');
                alert(`🎉 PARABÉNS! Você completou todas as ${fasesTotais} fases e ZEROU o evento!`);
            } else {
                alert(`Fase ${faseAtual} Concluída! Próxima fase liberada.`);
            }

            window.location.href = 'eventos.html';
            return;
        }

        ondaAtual++;
        bossAtivo = false;
        bossSpawned = false;
        estadoBoss = 'inativo';
        inimigos.length = 0;
        projeteisBoss.length = 0;
        lasersBoss.length = 0;
        tempoRestante = 60;
        elTempo.textContent = "60s";
        elTempo.style.color = "#ffe600";
        elFase.textContent = `ONDA: ${ondaAtual}`;
    }

    function loop(agora) {
        if (!rodando || pausado) return;

        const dt = Math.min(agora - ultimoTempo, 50);
        ultimoTempo = agora;

        hueRgb = (hueRgb + 2) % 360;

        ctx.clearRect(0, 0, larguraArena, alturaArena);

        atualizarJogador(agora);
        desenharJogador();

        atualizarTiros();
        desenharTiros();

        if (!bossAtivo) {
            timerInimigos += dt || 0;
            const intervaloInimigo = Math.max(200, 700 - (ondaAtual * 50));
            if (timerInimigos > intervaloInimigo) {
                gerarInimigo();
                timerInimigos = 0;
            }
            atualizarInimigos(dt);
            desenharInimigos();
        } else {
            atualizarBoss(agora);
            desenharBoss();
        }

        atualizarPowerUps();
        desenharPowerUps();

        checarColisoes();

        requestAnimationFrame(loop);
    }

    function atualizarJogador(agora) {
        const deltaSegundos = Math.min(
            Math.max((agora - ultimoTempoAtualizacaoJogador) / 1000, 0),
            0.05
        );
        ultimoTempoAtualizacaoJogador = agora;

        if (usandoMouse) {
            const dx = mouseX - jogador.x;
            const dy = mouseY - jogador.y;
            jogador.x += dx * 0.2;
            jogador.y += dy * 0.2;
        }

        if (teclas['ArrowLeft'] || teclas['KeyA']) jogador.x -= jogador.velocidade;
        if (teclas['ArrowRight'] || teclas['KeyD']) jogador.x += jogador.velocidade;
        if (teclas['ArrowUp'] || teclas['KeyW']) jogador.y -= jogador.velocidade;
        if (teclas['ArrowDown'] || teclas['KeyS']) jogador.y += jogador.velocidade;

        jogador.x = Math.max(jogador.raio, Math.min(larguraArena - jogador.raio, jogador.x));
        jogador.y = Math.max(jogador.raio, Math.min(alturaArena - jogador.raio, jogador.y));

        if (agora - jogador.ultimoDisparo > jogador.cadencia) {
            atirar();
            jogador.ultimoDisparo = agora;
        }

        if (jogador.tiroEspecial) {
            jogador.tempoTiroEspecial -= 0.016;
            if (jogador.tempoTiroEspecial <= 0) jogador.tiroEspecial = false;
        }

        if (jogador.escudoAtivo && jogador.tempoEscudoMax < 9000) {
            jogador.tempoEscudoRestante -= deltaSegundos;
            if (jogador.tempoEscudoRestante <= 0 || jogador.escudoVida <= 0) {
                jogador.escudoAtivo = false;
                jogador.tempoEscudoRestante = 0;
                jogador.escudoVida = 0;
            }
        }
    }

    function atirar() {
        if (jogador.tiroEspecial) {
            tiros.push({ x: jogador.x - 14, y: jogador.y - 15, vx: -3, vy: -10 });
            tiros.push({ x: jogador.x - 5, y: jogador.y - 20, vx: -1, vy: -10 });
            tiros.push({ x: jogador.x + 5, y: jogador.y - 20, vx: 1, vy: -10 });
            tiros.push({ x: jogador.x + 14, y: jogador.y - 15, vx: 3, vy: -10 });
        } else {
            if (jogador.linhasTiro === 4) {
                tiros.push({ x: jogador.x - 18, y: jogador.y - 10, vx: -2, vy: -11 });
                tiros.push({ x: jogador.x - 6, y: jogador.y - 18, vx: 0, vy: -11 });
                tiros.push({ x: jogador.x + 6, y: jogador.y - 18, vx: 0, vy: -11 });
                tiros.push({ x: jogador.x + 18, y: jogador.y - 10, vx: 2, vy: -11 });
            } else if (jogador.linhasTiro >= 2) {
                tiros.push({ x: jogador.x - 8, y: jogador.y - 18, vx: 0, vy: -11 });
                tiros.push({ x: jogador.x + 8, y: jogador.y - 18, vx: 0, vy: -11 });
            } else {
                tiros.push({ x: jogador.x, y: jogador.y - 20, vx: 0, vy: -10 });
            }
        }
    }

    function desenharJogador() {
        ctx.save();

        // 1. RENDERIZAÇÃO DO ESCUDO
        if (jogador.escudoAtivo) {
            const escudoParaRenderizar = prepararSkinParaRenderizacao(
                dadosEscudo,
                isEscudoRgb,
                rgbAtivoEscudo,
                corCustomEscudo
            );
            renderizarEscudoGeral(ctx, jogador.x, jogador.y, escudoParaRenderizar, performance.now());

            const raioEscudo = jogador.raio + 14;
            const larguraBarra = 36;
            const alturaBarra = 4;
            const posY = jogador.y + raioEscudo + 8;
            const pctEscudoVida = Math.max(0, jogador.escudoVida / jogador.escudoVidaMax);
            const corEscudoAtual = obterCorSkin(dadosEscudo, isEscudoRgb, rgbAtivoEscudo, corCustomEscudo);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(jogador.x - larguraBarra / 2, posY, larguraBarra, alturaBarra);

            ctx.fillStyle = corEscudoAtual;
            ctx.shadowBlur = 6;
            ctx.shadowColor = corEscudoAtual;
            ctx.fillRect(jogador.x - larguraBarra / 2, posY, larguraBarra * pctEscudoVida, alturaBarra);
        }

        // 2. RENDERIZAÇÃO DA NAVE
        if (typeof renderizarNaveGeral === 'function') {
            const naveParaRenderizar = prepararSkinParaRenderizacao(
                jogador.dadosSkin,
                isNaveRgb,
                rgbAtivoNave,
                corCustomNave,
                pontos
            );
            renderizarNaveGeral(
                ctx,
                jogador.x,
                jogador.y,
                naveParaRenderizar,
                jogador.nivelEvolutivo
            );
        }

        ctx.restore();
    }

    function atualizarTiros() {
        for (let i = tiros.length - 1; i >= 0; i--) {
            const t = tiros[i];
            t.x += t.vx;
            t.y += t.vy;

            if (t.y < -10 || t.x < -10 || t.x > larguraArena + 10) {
                tiros.splice(i, 1);
            }
        }
    }

    function desenharTiros() {
        const tiroParaRenderizar = prepararSkinParaRenderizacao(
            dadosTiro,
            isTiroRgb,
            rgbAtivoTiro,
            corCustomTiro
        );
        tiros.forEach(t => {
            if (typeof renderizarTiroGeral === 'function') {
                renderizarTiroGeral(ctx, t.x, t.y, tiroParaRenderizar);
            } else {
                const corTiroAtual = obterCorSkin(dadosTiro, isTiroRgb, rgbAtivoTiro, corCustomTiro);
                ctx.fillStyle = corTiroAtual;
                ctx.fillRect(t.x - 2, t.y - 8, 4, 12);
            }
        });
        ctx.shadowBlur = 0;
    }

    function atualizarInimigos(dt) {
        for (let i = inimigos.length - 1; i >= 0; i--) {
            const inimi = inimigos[i];
            if (inimi.tipo === 'perseguidor_explosivo') {
                const centroX = inimi.x + inimi.tamanho / 2;
                const centroY = inimi.y + inimi.tamanho / 2;
                const distancia = Math.max(1, Math.hypot(jogador.x - centroX, jogador.y - centroY));
                inimi.x += ((jogador.x - centroX) / distancia) * inimi.velocidade;
                inimi.y += ((jogador.y - centroY) / distancia) * inimi.velocidade;
            } else {
                inimi.y += inimi.velocidade;
            }

            if (inimi.y > alturaArena + inimi.tamanho) {
                inimigos.splice(i, 1);
            }
        }
    }

    function desenharInimigos() {
        ctx.lineWidth = 3;

        inimigos.forEach(inimi => {
            ctx.strokeStyle = inimi.cor;
            ctx.shadowColor = inimi.cor;
            ctx.shadowBlur = 10;
            if (inimi.tipo === 'perseguidor_explosivo') {
                const piscando = Math.floor(performance.now() / 140) % 2 === 0;
                ctx.fillStyle = piscando ? '#ffb347' : '#ff8c00';
                ctx.beginPath();
                ctx.arc(inimi.x + inimi.tamanho / 2, inimi.y + inimi.tamanho / 2, inimi.tamanho / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffcc66';
                ctx.stroke();
            } else {
                ctx.strokeRect(inimi.x, inimi.y, inimi.tamanho, inimi.tamanho);
            }

            // Barra de vida para inimigos com mais de 1 HP
            if (inimi.vidaMax > 1) {
                const pct = inimi.vida / inimi.vidaMax;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(inimi.x, inimi.y - 6, inimi.tamanho, 3);
                ctx.fillStyle = inimi.cor;
                ctx.fillRect(inimi.x, inimi.y - 6, inimi.tamanho * pct, 3);
            }
        });

        ctx.shadowBlur = 0;
    }

    function atualizarBoss(agora) {
        if (estadoBoss === 'entrada') {
            boss.y += 2.5;
            if (boss.y >= boss.alvoY) {
                boss.y = boss.alvoY;
                estadoBoss = 'ativo';
                boss.ultimoAtaque = agora;
            }
            return;
        }

        if (estadoBoss === 'saida') {
            boss.y -= 3.5;
            if (boss.y + boss.altura < -20) {
                bossAtivo = false;
                resetarParaProximaOnda();
            }
            return;
        }

        boss.x += boss.velocidadeX;
        if (boss.x <= 10 || boss.x + boss.largura >= larguraArena - 10) {
            boss.velocidadeX *= -1;
        }

        if (boss.vida <= (boss.vidaMax / 2) && boss.fase === 1) {
            boss.fase = 2;
        }

        const cadenciaBoss = Math.max(600, (boss.fase === 1 ? 1200 : 1800) - (ondaAtual * 100));

        if (agora - boss.ultimoAtaque > cadenciaBoss) {
            const somenteLaser = arenaConfig?.boss?.somenteLaser || false;

            if (boss.fase === 1 && !somenteLaser) {
                projeteisBoss.push({ x: boss.x + 20, y: boss.y + boss.altura, vy: 4 });
                projeteisBoss.push({ x: boss.x + boss.largura / 2, y: boss.y + boss.altura, vy: 5 });
                projeteisBoss.push({ x: boss.x + boss.largura - 20, y: boss.y + boss.altura, vy: 4 });
            } else {
                lasersBoss.push({
                    x: boss.x + boss.largura / 2 - 15,
                    largura: 30,
                    tempo: 1.2
                });
            }
            boss.ultimoAtaque = agora;
        }

        for (let i = projeteisBoss.length - 1; i >= 0; i--) {
            const p = projeteisBoss[i];
            p.y += p.vy;
            if (p.y > alturaArena + 20) projeteisBoss.splice(i, 1);
        }

        for (let i = lasersBoss.length - 1; i >= 0; i--) {
            const l = lasersBoss[i];
            l.tempo -= 0.016;
            if (l.tempo <= 0) lasersBoss.splice(i, 1);
        }
    }

    function desenharBoss() {
        ctx.save();
        ctx.translate(boss.x, boss.y);

        const corBoss = boss.fase === 1 ? (dadosBossJson.corFase1 || '#ff0055') : (dadosBossJson.corFase2 || '#00f0ff');
        ctx.strokeStyle = corBoss;
        ctx.lineWidth = 4;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 15;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(boss.largura, 0);
        ctx.lineTo(boss.largura - 20, boss.altura);
        ctx.lineTo(boss.largura / 2 + 10, boss.altura + 15);
        ctx.lineTo(boss.largura / 2 - 10, boss.altura + 15);
        ctx.lineTo(20, boss.altura);
        ctx.closePath();
        ctx.stroke();

        const larguraBarra = boss.largura;
        const pctVida = Math.max(0, boss.vida / boss.vidaMax);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(0, -15, larguraBarra, 6);
        ctx.fillStyle = corBoss;
        ctx.fillRect(0, -15, larguraBarra * pctVida, 6);

        ctx.restore();

        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 8;
        projeteisBoss.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.fill();
        });

        lasersBoss.forEach(l => {
            ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 20;
            ctx.fillRect(l.x, boss.y + boss.altura, l.largura, alturaArena);
        });

        ctx.shadowBlur = 0;
    }

    function tentarDroparPowerUp(x, y) {
        if (Math.random() < 0.3) {
            const tipo = Math.random() < 0.5 ? 'escudo' : 'tiro';
            powerUps.push({ x, y, tipo, tamanho: 18, velocidade: 1.8 });
        }
    }

    function atualizarPowerUps() {
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const p = powerUps[i];
            p.y += p.velocidade;
            if (p.y > alturaArena + 20) powerUps.splice(i, 1);
        }
    }

    function desenharPowerUps() {
        const corEscudoAtual = obterCorSkin(dadosEscudo, isEscudoRgb, rgbAtivoEscudo, corCustomEscudo);

        powerUps.forEach(p => {
            ctx.lineWidth = 2;
            ctx.strokeStyle = p.tipo === 'escudo' ? corEscudoAtual : '#ffe600';
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 10;

            ctx.strokeRect(p.x - p.tamanho / 2, p.y - p.tamanho / 2, p.tamanho, p.tamanho);

            ctx.fillStyle = ctx.strokeStyle;
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(p.tipo === 'escudo' ? 'E' : 'T', p.x, p.y + 4);
        });
        ctx.shadowBlur = 0;
    }

    function checarColisoes() {
        for (let i = tiros.length - 1; i >= 0; i--) {
            const t = tiros[i];

            for (let j = inimigos.length - 1; j >= 0; j--) {
                const inimi = inimigos[j];

                if (t.x >= inimi.x && t.x <= inimi.x + inimi.tamanho &&
                    t.y >= inimi.y && t.y <= inimi.y + inimi.tamanho) {

                    inimi.vida -= jogador.dano;
                    tiros.splice(i, 1);

                    if (inimi.vida <= 0) {
                        tentarDroparPowerUp(inimi.x + inimi.tamanho / 2, inimi.y + inimi.tamanho / 2);
                        inimigos.splice(j, 1);
                        pontos += inimi.pontos;
                        inimigosAbatidos++;
                        atualizarHUD();
                    }
                    break;
                }
            }

            if (bossAtivo && estadoBoss === 'ativo' && t) {
                if (t.x >= boss.x && t.x <= boss.x + boss.largura &&
                    t.y >= boss.y && t.y <= boss.y + boss.altura) {

                    boss.vida -= (2 * jogador.dano);
                    tiros.splice(i, 1);

                    if (boss.vida <= 0) {
                        pontos += 1000;
                        inimigosAbatidos++;
                        atualizarHUD();
                        estadoBoss = 'saida';
                        projeteisBoss.length = 0;
                        lasersBoss.length = 0;
                    }
                    break;
                }
            }
        }

        for (let i = inimigos.length - 1; i >= 0; i--) {
            const inimi = inimigos[i];
            const dist = Math.hypot(jogador.x - (inimi.x + inimi.tamanho / 2), jogador.y - (inimi.y + inimi.tamanho / 2));

            if (dist < jogador.raio + inimi.tamanho / 2) {
                if (inimi.tipo === 'perseguidor_explosivo') {
                    inimi.tempoContato += Math.max(dt || 16.67, 16.67) / 1000;
                    if (inimi.tempoContato >= inimi.tempoExplosao) {
                        inimigos.splice(i, 1);
                        jogador.vida = 0;
                        atualizarHUD();
                        encerrarJogo();
                    }
                } else {
                    inimigos.splice(i, 1);
                    causarDanoJogador(DANO_COLISAO_BASE * multiplicadorDanoInimigo);
                }
            } else if (inimi.tipo === 'perseguidor_explosivo') {
                inimi.tempoContato = 0;
            }
        }

        if (bossAtivo && estadoBoss !== 'ativo') return;

        for (let i = projeteisBoss.length - 1; i >= 0; i--) {
            const p = projeteisBoss[i];
            const dist = Math.hypot(jogador.x - p.x, jogador.y - p.y);

            if (dist < jogador.raio + 6) {
                projeteisBoss.splice(i, 1);
                causarDanoJogador(15 * multiplicadorDanoInimigo);
            }
        }

        lasersBoss.forEach(l => {
            if (jogador.x >= l.x && jogador.x <= l.x + l.largura) {
                causarDanoJogador(1.2 * multiplicadorDanoInimigo);
            }
        });

        for (let i = powerUps.length - 1; i >= 0; i--) {
            const p = powerUps[i];
            const dist = Math.hypot(jogador.x - p.x, jogador.y - p.y);

            if (dist < jogador.raio + p.tamanho / 2) {
                if (p.tipo === 'escudo') {
                    jogador.escudoAtivo = true;
                    jogador.escudoVida = jogador.escudoVidaMax;
                    jogador.tempoEscudoRestante = jogador.tempoEscudoMax;
                } else if (p.tipo === 'tiro') {
                    jogador.tiroEspecial = true;
                    jogador.tempoTiroEspecial = 10;
                }
                powerUps.splice(i, 1);
            }
        }
    }

    function causarDanoJogador(qtd) {
        if (jogador.escudoAtivo) {
            jogador.escudoVida -= qtd;
            if (jogador.escudoVida <= 0) {
                jogador.escudoAtivo = false;
                jogador.escudoVida = 0;
                jogador.tempoEscudoRestante = 0;
            }
            return;
        }

        jogador.vida -= qtd;
        if (jogador.vida <= 0) {
            jogador.vida = 0;
            encerrarJogo();
        }
        atualizarHUD();
    }

    function atualizarHUD() {
        elPontos.textContent = `PONTOS: ${pontos}`;
        const pctVida = Math.max(0, (jogador.vida / jogador.vidaMax) * 100);
        elBarraVida.style.width = `${pctVida}%`;
    }

    function encerrarJogo() {
        rodando = false;
        clearInterval(tempoTimer);

        const moedasGanhas = Math.floor(pontos / 10);
        const xpGanha = inimigosAbatidos * 1;

        adicionarMoedas(moedasGanhas);

        let xpAtual = parseInt(localStorage.getItem('nv_xp')) || 0;
        let nivelPasse = parseInt(localStorage.getItem('nv_nivel_passe')) || 1;

        xpAtual += xpGanha;

        // Adiciona a trava "&& nivelPasse < 15" dentro do próprio loop
        while (xpAtual >= 200 && nivelPasse < 15) {
            xpAtual -= 200;
            nivelPasse++;
        }

        if (nivelPasse >= 15) {
            nivelPasse = 15;
            xpAtual = 0;
        }

        localStorage.setItem('nv_xp', xpAtual);
        localStorage.setItem('nv_nivel_passe', nivelPasse);
        const conta = window.NeonConta?.obterAtiva();
        if (conta) window.NeonConta.atualizarConta(conta.id, { passeXp: xpAtual, passeNivel: nivelPasse });

        document.getElementById('go-titulo').textContent = "FIM DE JOGO";
        document.getElementById('go-pontos').textContent = pontos;
        document.getElementById('go-inimigos').textContent = inimigosAbatidos;
        document.getElementById('go-ondas').textContent = ondaAtual;
        document.getElementById('go-moedas').textContent = `+${moedasGanhas} 🪙`;
        document.getElementById('go-xp').textContent = `+${xpGanha} XP`;

        document.getElementById('game-over-screen').classList.add('ativo');
    }

    document.getElementById('btn-jogar-novamente').addEventListener('click', () => {
        window.location.reload();
    });

    document.getElementById('btn-voltar-menu').addEventListener('click', () => {
        window.location.href = 'menu.html';
    });

    atualizarHUD();
});