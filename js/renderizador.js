// renderizador.js

function renderizarEscudoGeral(ctx, cx, cy, skin, tempo) {
    if (skin.tipo === 'animado' && !skin.animacao) {
        const geometria = skin.geometria || {};
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, geometria.inclinacao || 0.4);
        ctx.rotate((tempo / 1000) * Math.PI * 2 * (skin.velocidadeRotacao || 0.05));
        const gradiente = ctx.createRadialGradient(0, 0, geometria.raioInterno || 18, 0, 0, geometria.raioExterno || 38);
        gradiente.addColorStop(0, skin.corDiscoInterno || '#fff3cc');
        gradiente.addColorStop(0.4, skin.corDiscoMedio || '#ffaa00');
        gradiente.addColorStop(1, skin.corDiscoExterno || '#ff3300');
        ctx.fillStyle = gradiente;
        ctx.shadowColor = skin.sombraCor || '#ffaa00';
        ctx.shadowBlur = skin.shadowBlur || 20;
        ctx.beginPath();
        ctx.arc(0, 0, geometria.raioExterno || 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, geometria.raioInterno || 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    } else if (skin.animacao && skin.animacao.tipo === 'orbes_giratorios') {
        const cfg = skin.animacao || skin;
        const qtd = cfg.quantidade || 3;
        const raioOrbita = cfg.raioOrbita || 28;
        const raioOrbe = cfg.raioOrbe || 5;
        const cores = cfg.paletaCores || [skin.cor || '#00f0ff'];
        const intervalo = cfg.intervaloTrocaCor || 500;
        const vel = cfg.velocidadeRotacao || 1.0;

        const anguloBase = (tempo / 1000) * Math.PI * 2 * vel;
        const indiceCorInicial = Math.floor(tempo / intervalo) % cores.length;

        for (let i = 0; i < qtd; i++) {
            const angulo = anguloBase + (i * (Math.PI * 2 / qtd));
            const x = cx + Math.cos(angulo) * raioOrbita;
            const y = cy + Math.sin(angulo) * raioOrbita;

            const corAtual = cores[(indiceCorInicial + i) % cores.length];

            ctx.strokeStyle = corAtual;
            ctx.shadowColor = corAtual;
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(x, y, raioOrbe, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else {
        const cor = skin.cor || '#00f0ff';
        ctx.strokeStyle = cor;
        ctx.shadowColor = cor;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Particulas ativas do efeito de faiscas da nave.
let particulasFaisca = [];
const LIMITE_PARTICULAS_FAISCA = 32;

function renderizarNaveLosango(ctx, x, y, skin, nivelAtual = 1) {
    if (!skin) return;

    const dadosNivel = skin.niveis?.find(n => n.nivel === nivelAtual) || skin.niveis?.[0];
    const dados = dadosNivel || skin;
    const efeitos = dados.efeitos || {};
    const largura = dados.geometria?.largura || 26;
    const altura = dados.geometria?.altura || 42;

    ctx.save();

    if (efeitos.brilhoEstelar) {
        const tempo = performance.now() * 0.005;
        const pulso = efeitos.pulsoRitmico ? Math.sin(tempo) * 5 : 0;

        ctx.beginPath();
        ctx.arc(x, y, (altura / 1.5) + pulso, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 102, 255, 0.15)';
        ctx.fill();

        ctx.shadowBlur = (dados.shadowBlur || 0) + pulso;
        ctx.shadowColor = '#00f0ff';
    } else {
        ctx.shadowBlur = dados.shadowBlur || 0;
        ctx.shadowColor = dados.sombraCor || dados.cor;
    }

    ctx.strokeStyle = dados.cor || '#00f0ff';
    ctx.fillStyle = dados.cor || '#00f0ff';
    ctx.lineWidth = nivelAtual === 3 ? 3.5 : 2.5;

    ctx.beginPath();
    ctx.moveTo(x, y - (altura / 2));
    ctx.lineTo(x + (largura / 2), y);
    ctx.lineTo(x, y + (altura / 2));
    ctx.lineTo(x - (largura / 2), y);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - (altura / 4));
    ctx.lineTo(x + (largura / 4), y);
    ctx.lineTo(x, y + (altura / 4));
    ctx.lineTo(x - (largura / 4), y);
    ctx.closePath();
    ctx.stroke();

    const taxaFaiscas = efeitos.taxaFaiscas ?? (nivelAtual === 3 ? 0.24 : 0.16);
    if (efeitos.faiscas && particulasFaisca.length < LIMITE_PARTICULAS_FAISCA &&
        Math.random() < taxaFaiscas) {
        particulasFaisca.push({
            x: x + (Math.random() - 0.5) * largura,
            y: y + (altura / 2),
            vx: (Math.random() - 0.5) * 1.5,
            vy: Math.random() * 2 + 1,
            tamanho: Math.random() * 2.5 + 1,
            vida: 1.0,
            cor: efeitos.faiscasCor || dados.cor
        });
    }

    for (let i = particulasFaisca.length - 1; i >= 0; i--) {
        const particula = particulasFaisca[i];

        ctx.beginPath();
        ctx.arc(particula.x, particula.y, particula.tamanho, 0, Math.PI * 2);
        ctx.fillStyle = particula.cor;
        ctx.globalAlpha = particula.vida;
        ctx.fill();

        particula.x += particula.vx;
        particula.y += particula.vy;
        particula.vida -= 0.04;

        if (particula.vida <= 0) {
            particulasFaisca.splice(i, 1);
        }
    }

    ctx.restore();
}

function desenharNaveCirculo(ctx, x, y, dadosNave) {
    ctx.save();
    ctx.beginPath();

    // Pega o raio da geometria ou usa 16 como padrão
    const raio = dadosNave.geometria?.raio || (dadosNave.geometria?.largura / 2) || 16;
    ctx.arc(x, y, raio, 0, Math.PI * 2);

    // Preenchimento e brilho definidos pela skin.
    ctx.fillStyle = dadosNave.cor || '#000000';
    ctx.fill();

    // 2. Brilho Neon (Glow)
    if (dadosNave.sombraCor || dadosNave.corBrilho) {
        ctx.shadowColor = dadosNave.sombraCor || dadosNave.corBrilho;
        ctx.shadowBlur = dadosNave.shadowBlur || 15;
    }

    // 3. Desenho Dinâmico da Borda (Lê qualquer cor definida no JSON)
    const temCorBorda = dadosNave.corBorda && dadosNave.corBorda !== 'none';

    if (temCorBorda) {
        ctx.strokeStyle = dadosNave.corBorda; // Usa a cor do JSON (ex: "#9900ff", "#00ff66", etc)
        ctx.lineWidth = dadosNave.larguraBorda || 1.5; // Usa a largura do JSON ou 1.5 por padrão
        ctx.stroke();
    }

    ctx.restore();
}

function renderizarNaveGeral(ctx, x, y, skin, nivelAtual = 1) {
    if (!skin) return;
    const nivel = skin.niveis?.find(item => item.nivel === nivelAtual);
    const dados = nivel ? { ...skin, ...nivel, geometria: { ...skin.geometria, ...nivel.geometria } } : skin;

    if (dados.forma === 'circulo') {
        desenharNaveCirculo(ctx, x, y, dados);
        return;
    }

    if (dados.forma === 'losango' || dados.geometria?.tipo === 'losango' || skin.niveis) {
        renderizarNaveLosango(ctx, x, y, skin, nivelAtual);
        return;
    }

    ctx.save();
    const deslocamento = dados.isGlitch && Math.random() < 0.25 ? 3 : 0;
    ctx.translate(x + (Math.random() - 0.5) * deslocamento, y + (Math.random() - 0.5) * deslocamento);
    const largura = dados.geometria?.largura || 36;
    const altura = dados.geometria?.altura || 44;
    ctx.strokeStyle = dados.cor || '#00f0ff';
    ctx.shadowColor = dados.sombraCor || dados.cor || '#00f0ff';
    ctx.shadowBlur = dados.shadowBlur || 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -altura / 2);
    ctx.lineTo(-largura / 2, altura / 2);
    ctx.lineTo(0, altura / 4);
    ctx.lineTo(largura / 2, altura / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

function renderizarNave(ctx, x, y, skin, nivelAtual = 1) {
    renderizarNaveGeral(ctx, x, y, skin, nivelAtual);
}

function renderizarTiroGeral(ctx, x, y, skin) {
    if (skin.tipo === 'projetil') {
        const largura = skin.geometria?.largura || 6;
        const comprimento = skin.geometria?.comprimento || 34;
        const gradiente = ctx.createLinearGradient(x, y - comprimento / 2, x, y + comprimento / 2);
        gradiente.addColorStop(0, skin.corNucleo || '#ffffff');
        gradiente.addColorStop(0.4, skin.corAura || '#fff3b0');
        gradiente.addColorStop(1, 'rgba(255, 176, 0, 0)');
        ctx.save();
        ctx.fillStyle = gradiente;
        ctx.shadowColor = skin.corBrilho || skin.corAura || '#ffb000';
        ctx.shadowBlur = skin.shadowBlur || 15;
        ctx.beginPath();
        ctx.moveTo(x, y - comprimento / 2);
        ctx.lineTo(x - largura / 2, y + comprimento / 2);
        ctx.lineTo(x + largura / 2, y + comprimento / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
    }

    ctx.fillStyle = skin.cor || '#00f0ff';
    ctx.fillRect(x - 2, y - 8, 4, 12);
}