document.addEventListener('DOMContentLoaded', async () => {

    const canvas = document.getElementById('canvasJogo');
    // Interrompe o script em páginas que não possuem a área do jogo.
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = document.getElementById('game-container');

    function redimensionarCanvas() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    redimensionarCanvas();
    window.addEventListener('resize', redimensionarCanvas);

    // === INTEGRAÇÃO COM JOGO.JS (GERENCIADOR DE SKINS) ===
    const skinNaveId = window.ObterSkinEquipada ? window.ObterSkinEquipada('nave') : (localStorage.getItem('nv_skin_equipada_nave') || '#N001');
    const skinEscudoId = window.ObterSkinEquipada ? window.ObterSkinEquipada('escudo') : (localStorage.getItem('nv_skin_equipada_escudo') || '#E001');
    const skinTiroId = window.ObterSkinEquipada ? window.ObterSkinEquipada('tiro') : (localStorage.getItem('nv_skin_equipada_tiro') || '#T001');

    const rgbAtivoNave = localStorage.getItem('nv_rgb_ativo_nave') !== 'false';
    const rgbAtivoEscudo = localStorage.getItem('nv_rgb_ativo_escudo') !== 'false';
    const rgbAtivoTiro = localStorage.getItem('nv_rgb_ativo_tiro') !== 'false';

    const corCustomNave = localStorage.getItem('nv_cor_custom_nave') || '#ff0055';
    const corCustomEscudo = localStorage.getItem('nv_cor_custom_escudo') || '#00ff66';
    const corCustomTiro = localStorage.getItem('nv_cor_custom_tiro') || '#ffe600';

    // === CARREGAMENTO DE BANCOS DE DADOS ===
    if (window.CarregarBancoSkins) {
        await window.CarregarBancoSkins();
    }

    async function carregarJsonAssincrono(caminhoRelativo) {
        try {
            let res = await fetch(`../${caminhoRelativo}`);
            if (!res.ok) res = await fetch(caminhoRelativo);
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn(`Erro ao carregar ${caminhoRelativo}:`, e);
        }
        return null;
    }

    const bancoInimigosJson = await carregarJsonAssincrono('data/inimigos.json');

    const listaInimigosComuns = bancoInimigosJson?.comuns || [
        { id: 'batedor', tamanho: 26, velocidadeBase: 2.2, vida: 1, pontos: 100, cor: '#ff0055' }
    ];
    const dadosBossJson = bancoInimigosJson?.bosses?.[0] || {
        largura: 140, altura: 70, vidaBase: 100, corFase1: '#ff0055', corFase2: '#00f0ff'
    };

    const dadosNave = window.ObterDadosSkin ? window.ObterDadosSkin('nave', skinNaveId) : { cor: '#00f0ff', atributos: {} };
    const dadosEscudo = window.ObterDadosSkin ? window.ObterDadosSkin('escudo', skinEscudoId) : { cor: '#00f0ff', atributos: {} };
    const dadosTiro = window.ObterDadosSkin ? window.ObterDadosSkin('tiro', skinTiroId) : { cor: '#00f0ff', atributos: {} };

    const isNaveRgb = skinNaveId === '#N002';
    const isEscudoRgb = skinEscudoId === '#E002';
    const isTiroRgb = skinTiroId === '#T002';

    let hueRgb = 0;

    function obterCorSkin(dadosSkin, isRgb, rgbAtivo, corCustom) {
        if (window.CalcularCorSkin) {
            return window.CalcularCorSkin(dadosSkin, isRgb, rgbAtivo, corCustom, hueRgb);
        }
        if (isRgb) {
            return rgbAtivo ? `hsl(${hueRgb}, 100%, 50%)` : corCustom;
        }
        return dadosSkin.cor || '#00f0ff';
    }

    function prepararSkinParaRenderizacao(dadosSkin, isRgb, rgbAtivo, corCustom) {
        if (!isRgb) return dadosSkin;
        return {
            ...dadosSkin,
            cor: obterCorSkin(dadosSkin, true, rgbAtivo, corCustom)
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

        return {
            corInimigos: corInimigos,
            danoInimigo: danoInimigo,
            boss: bossConfig,
            escolhaInicial: {
                ativo: true,
                opcoes: opcoesDisponiveis
            }
        };
    }

    const eventoIdAtivo = sessionStorage.getItem('nv_evento_ativo_id');
    const faseAtualAtiva = sessionStorage.getItem('nv_evento_fase_atual')
        ? parseInt(sessionStorage.getItem('nv_evento_fase_atual'))
        : null;

    const arenaConfig = (eventoIdAtivo && faseAtualAtiva !== null)
        ? obterConfiguracaoDinamicaFase(faseAtualAtiva)
        : null;

    const multiplicadorDanoInimigo = arenaConfig ? arenaConfig.danoInimigo : 1;

    // === VARIÁVEIS BASE ===
    const DANO_COLISAO_BASE = 20;

    const pontosVidaNave = parseInt(dadosNave.atributos?.['VIDA'] || '3');
    const hpMaxNaveCalculado = pontosVidaNave * DANO_COLISAO_BASE;

    const pontosProtecaoEscudo = parseInt(dadosEscudo.atributos?.['PROTEÇÃO'] || '5');
    const hpMaxEscudoCalculado = pontosProtecaoEscudo * DANO_COLISAO_BASE;
    const tempoMaxEscudoSkin = parseInt(dadosEscudo.atributos?.['DURAÇÃO'] || '10');

    const danoBaseTiro = parseInt(dadosTiro.atributos?.['DANO'] || '1');
    const linhasTiroSkin = parseInt(dadosTiro.atributos?.['LINHAS DE TIRO'] || '1');

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

    const elBarraVida = document.getElementById('barra-vida-fill');
    const elPontos = document.getElementById('hud-pontos');
    const elTempo = document.getElementById('hud-tempo');
    const elFase = document.getElementById('hud-fase');
    const elAlertaBoss = document.getElementById('alerta-boss');
    const telaPause = document.getElementById('pause-screen');

    // === OBJETO DO JOGADOR ===
    const jogador = {
        x: canvas.width / 2,
        y: canvas.height - 100,
        raio: 18,

        vidaMax: hpMaxNaveCalculado,
        vida: hpMaxNaveCalculado,
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
        }

        const modal = document.getElementById('modal-escolha-inicial');
        if (modal) modal.style.display = 'none';

        iniciarPartida();
    }

    function iniciarPartida() {
        rodando = true;
        iniciarTimer();
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

    function gerarInimigo() {
        if (bossAtivo) return;

        const modelo = listaInimigosComuns[Math.floor(Math.random() * listaInimigosComuns.length)];
        const velMult = 1 + (ondaAtual - 1) * 0.2;

        inimigos.push({
            x: Math.random() * (canvas.width - modelo.tamanho),
            y: -modelo.tamanho,
            tamanho: modelo.tamanho,
            velocidade: (modelo.velocidadeBase || 2) * velMult,
            vida: modelo.vida || 1,
            vidaMax: modelo.vida || 1,
            pontos: modelo.pontos || 100,
            cor: arenaConfig ? arenaConfig.corInimigos : (modelo.cor || '#ff0055')
        });
    }

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

        const vidaInicial = arenaConfig?.boss?.vidaBase || dadosBossJson.vidaBase || 100;
        boss.vidaMax = vidaInicial + (ondaAtual - 1) * 50;
        boss.vida = boss.vidaMax;
        boss.fase = 1;

        elTempo.textContent = "BOSS";
        elTempo.style.color = "#ff0055";

        elAlertaBoss.style.display = 'block';
        setTimeout(() => {
            elAlertaBoss.style.display = 'none';
        }, 3000);

        boss.x = canvas.width / 2 - boss.largura / 2;
    }

    function resetarParaProximaOnda() {
        const eventoId = sessionStorage.getItem('nv_evento_ativo_id');
        const faseAtual = parseInt(sessionStorage.getItem('nv_evento_fase_atual'));
        const fasesTotais = parseInt(sessionStorage.getItem('nv_evento_fases_totais')) || 10;

        if (eventoId && faseAtual) {
            rodando = false;
            clearInterval(tempoTimer);

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
        tempoRestante = 60;
        elTempo.textContent = "60s";
        elTempo.style.color = "#ffe600";
        elFase.textContent = `ONDA: ${ondaAtual}`;
    }

    let ultimoTempo = 0;
    function loop(agora) {
        if (!rodando || pausado) return;

        const dt = agora - ultimoTempo;
        ultimoTempo = agora;

        hueRgb = (hueRgb + 2) % 360;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

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
            atualizarInimigos();
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

        jogador.x = Math.max(jogador.raio, Math.min(canvas.width - jogador.raio, jogador.x));
        jogador.y = Math.max(jogador.raio, Math.min(canvas.height - jogador.raio, jogador.y));

        if (agora - jogador.ultimoDisparo > jogador.cadencia) {
            atirar();
            jogador.ultimoDisparo = agora;
        }

        if (jogador.tiroEspecial) {
            jogador.tempoTiroEspecial -= 0.016;
            if (jogador.tempoTiroEspecial <= 0) jogador.tiroEspecial = false;
        }

        if (jogador.escudoAtivo && jogador.tempoEscudoMax < 9000) {
            jogador.tempoEscudoRestante -= 0.016;
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
        ctx.translate(jogador.x, jogador.y);

        const corEscudoAtual = obterCorSkin(dadosEscudo, isEscudoRgb, rgbAtivoEscudo, corCustomEscudo);
        const escudoParaRenderizar = prepararSkinParaRenderizacao(dadosEscudo, isEscudoRgb, rgbAtivoEscudo, corCustomEscudo);
        const naveParaRenderizar = prepararSkinParaRenderizacao(dadosNave, isNaveRgb, rgbAtivoNave, corCustomNave);

        if (jogador.escudoAtivo) {
            renderizarEscudoGeral(ctx, 0, 0, escudoParaRenderizar, performance.now());
            const raioEscudo = jogador.raio + 14;

            ctx.beginPath();
            ctx.arc(0, 0, raioEscudo, 0, Math.PI * 2);
            ctx.strokeStyle = corEscudoAtual;
            ctx.lineWidth = 3;
            ctx.shadowColor = corEscudoAtual;
            ctx.shadowBlur = 12;
            ctx.stroke();

            // Barra de vida do escudo em outline
            const larguraBarra = 36;
            const alturaBarra = 4;
            const posY = raioEscudo + 8;
            const pctEscudoVida = Math.max(0, jogador.escudoVida / jogador.escudoVidaMax);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-larguraBarra / 2, posY, larguraBarra, alturaBarra);

            ctx.strokeStyle = corEscudoAtual;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-larguraBarra / 2, posY + alturaBarra / 2);
            ctx.lineTo(-larguraBarra / 2 + (larguraBarra * pctEscudoVida), posY + alturaBarra / 2);
            ctx.stroke();
        }

        renderizarNaveGeral(ctx, 0, 0, naveParaRenderizar, jogador.nivelEvolutivo);

        ctx.restore();
    }

    function atualizarTiros() {
        for (let i = tiros.length - 1; i >= 0; i--) {
            const t = tiros[i];
            t.x += t.vx;
            t.y += t.vy;

            if (t.y < -10 || t.x < -10 || t.x > canvas.width + 10) {
                tiros.splice(i, 1);
            }
        }
    }

    function desenharTiros() {
        const tiroParaRenderizar = prepararSkinParaRenderizacao(dadosTiro, isTiroRgb, rgbAtivoTiro, corCustomTiro);

        tiros.forEach(t => {
            renderizarTiroGeral(ctx, t.x, t.y, tiroParaRenderizar);
        });

        ctx.shadowBlur = 0;
    }

    function atualizarInimigos() {
        for (let i = inimigos.length - 1; i >= 0; i--) {
            const inimi = inimigos[i];
            inimi.y += inimi.velocidade;

            if (inimi.y > canvas.height + inimi.tamanho) {
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
            ctx.strokeRect(inimi.x, inimi.y, inimi.tamanho, inimi.tamanho);

            if (inimi.vidaMax > 1) {
                const pct = inimi.vida / inimi.vidaMax;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(inimi.x, inimi.y - 6, inimi.tamanho, 3);

                ctx.strokeStyle = inimi.cor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(inimi.x, inimi.y - 4.5);
                ctx.lineTo(inimi.x + (inimi.tamanho * pct), inimi.y - 4.5);
                ctx.stroke();
            }
        });

        ctx.shadowBlur = 0;
    }

    function atualizarBoss(agora) {
        if (boss.y < boss.alvoY) {
            boss.y += 1.5;
            return;
        }

        boss.x += boss.velocidadeX;
        if (boss.x <= 10 || boss.x + boss.largura >= canvas.width - 10) {
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
            if (p.y > canvas.height + 20) projeteisBoss.splice(i, 1);
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

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, -15, larguraBarra, 6);

        ctx.strokeStyle = corBoss;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(larguraBarra * pctVida, -12);
        ctx.stroke();

        ctx.restore();

        // Projetéis e lasers em contorno
        ctx.strokeStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        projeteisBoss.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.stroke();
        });

        lasersBoss.forEach(l => {
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 2;
            ctx.strokeRect(l.x, boss.y + boss.altura, l.largura, canvas.height);
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
            if (p.y > canvas.height + 20) powerUps.splice(i, 1);
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

            if (bossAtivo && t) {
                if (t.x >= boss.x && t.x <= boss.x + boss.largura &&
                    t.y >= boss.y && t.y <= boss.y + boss.altura) {

                    boss.vida -= (2 * jogador.dano);
                    tiros.splice(i, 1);

                    if (boss.vida <= 0) {
                        pontos += 1000;
                        inimigosAbatidos++;
                        atualizarHUD();
                        resetarParaProximaOnda();
                    }
                    break;
                }
            }
        }

        for (let i = inimigos.length - 1; i >= 0; i--) {
            const inimi = inimigos[i];
            const dist = Math.hypot(jogador.x - (inimi.x + inimi.tamanho / 2), jogador.y - (inimi.y + inimi.tamanho / 2));

            if (dist < jogador.raio + inimi.tamanho / 2) {
                inimigos.splice(i, 1);
                causarDanoJogador(DANO_COLISAO_BASE * multiplicadorDanoInimigo);
            }
        }

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

        let moedasAtuais = parseInt(localStorage.getItem('nv_moedas')) || 0;
        localStorage.setItem('nv_moedas', moedasAtuais + moedasGanhas);

        let xpAtual = parseInt(localStorage.getItem('nv_xp')) || 0;
        let nivelPasse = parseInt(localStorage.getItem('nv_nivel_passe')) || 1;

        xpAtual += xpGanha;

        while (xpAtual >= 200) {
            xpAtual -= 200;
            nivelPasse++;
        }

        if (nivelPasse > 15) {
            nivelPasse = 15;
            xpAtual = 0;
        }

        localStorage.setItem('nv_xp', xpAtual);
        localStorage.setItem('nv_nivel_passe', nivelPasse);

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