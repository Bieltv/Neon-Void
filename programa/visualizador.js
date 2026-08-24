document.addEventListener('DOMContentLoaded', () => {
    let abaAtual = 'nave'; // 'nave', 'escudo' ou 'tiro'
    let bancoSkinsLocal = null;

    // Elementos da DOM
    const jsonInput = document.querySelector('textarea');
    const btnRenderizar = document.querySelector('.btn-renderizar') || document.querySelector('button');
    const containerExibicao = document.querySelectorAll('.painel-direito, .aba-conteudo')[0];

    // Botões das abas
    const btnNaves = document.querySelectorAll('.btn-aba')[0] || document.querySelector('button:nth-child(1)');
    const btnEscudos = document.querySelectorAll('.btn-aba')[1] || document.querySelector('button:nth-child(2)');
    const btnTiros = document.querySelectorAll('.btn-aba')[2] || document.querySelector('button:nth-child(3)');

    // === TROCA DE ABAS ===
    function alternarAba(novaAba, btnAtivo) {
        abaAtual = novaAba;

        [btnNaves, btnEscudos, btnTiros].forEach(btn => {
            if (btn) btn.classList.remove('ativo');
        });
        if (btnAtivo) btnAtivo.classList.add('ativo');

        renderizarGradeSkins();
    }

    if (btnNaves) btnNaves.addEventListener('click', () => alternarAba('nave', btnNaves));
    if (btnEscudos) btnEscudos.addEventListener('click', () => alternarAba('escudo', btnEscudos));
    if (btnTiros) btnTiros.addEventListener('click', () => alternarAba('tiro', btnTiros));

    // === PROCESSAMENTO DO JSON ===
    btnRenderizar.addEventListener('click', () => {
        const textoJson = jsonInput.value.trim();
        if (!textoJson) {
            alert('Por favor, cole um JSON válido antes de renderizar.');
            return;
        }

        try {
            bancoSkinsLocal = JSON.parse(textoJson);
            renderizarGradeSkins();
        } catch (e) {
            alert('Erro de sintaxe no JSON! Verifique se a formatação está correta.');
            console.error(e);
        }
    });

    // === MONTAGEM DA GRADE DE CANVASES ===
    function renderizarGradeSkins() {
        if (!bancoSkinsLocal) return;

        // Limpa a área de exibição
        const areaCards = document.getElementById('grid-skins') || containerExibicao;
        areaCards.innerHTML = '';

        const listaSkins = bancoSkinsLocal[abaAtual] || [];

        if (listaSkins.length === 0) {
            areaCards.innerHTML = `<p style="color: #666; text-align: center; width: 100%;">Nenhuma skin encontrada para a categoria ${abaAtual.toUpperCase()}.</p>`;
            return;
        }

        listaSkins.forEach(skin => {
            const card = document.createElement('div');
            card.className = 'skin-card';
            card.style.cssText = 'display: inline-block; margin: 10px; background: #0a0a16; border: 1px solid #00f0ff; border-radius: 8px; padding: 10px; text-align: center;';

            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 120;

            const titulo = document.createElement('h4');
            titulo.textContent = skin.nome || skin.id;
            titulo.style.cssText = 'color: #fff; margin-top: 5px; font-family: sans-serif; font-size: 12px;';

            card.appendChild(canvas);
            card.appendChild(titulo);
            areaCards.appendChild(card);

            if (abaAtual === 'escudo') {
                animarPreviewEscudo(canvas, skin);
            } else {
                desenharPreviewSkin(canvas, skin, abaAtual);
            }
        });
    }

    function animarPreviewEscudo(canvas, skin) {
        const ctx = canvas.getContext('2d');
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        function loopAnimacao() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            renderizarEscudoGeral(ctx, cx, cy, skin, performance.now());
            requestAnimationFrame(loopAnimacao);
        }

        loopAnimacao();
    }

    // === RENDERIZADOR ESPECÍFICO DE ESCUDOS ANIMADOS ===
    function renderizarEscudoGeral(ctx, cx, cy, skin, tempo) {
        if (skin.nome === 'Disco Quasar' || skin.id === '#0101' || skin.tipo === 'animado') {
            ctx.save();
            ctx.translate(cx, cy);

            // Ângulo de rotação contínua
            const angulo = (tempo * (skin.velocidadeRotacao || 0.05)) % (Math.PI * 2);

            // Simula a inclinação do disco de acreção
            ctx.scale(1, skin.geometria?.inclinacao || 0.4);
            ctx.rotate(angulo);

            // Gradiente Radial do Quasar
            const radGrad = ctx.createRadialGradient(
                0, 0, skin.geometria?.raioInterno || 18,
                0, 0, skin.geometria?.raioExterno || 38
            );
            radGrad.addColorStop(0, skin.corDiscoInterno || '#fff3cc');
            radGrad.addColorStop(0.4, skin.corDiscoMedio || '#ffaa00');
            radGrad.addColorStop(1, skin.corDiscoExterno || '#ff3300');

            ctx.beginPath();
            ctx.arc(0, 0, skin.geometria?.raioExterno || 38, 0, Math.PI * 2);
            ctx.fillStyle = radGrad;
            ctx.shadowColor = skin.sombraCor || '#ffaa00';
            ctx.shadowBlur = skin.shadowBlur || 20;
            ctx.fill();

            // Núcleo central escuro do buraco
            ctx.beginPath();
            ctx.arc(0, 0, skin.geometria?.raioInterno || 18, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();

            ctx.restore();
        } else {
            // Escudo Estático Padrão
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, 28, 0, Math.PI * 2);
            ctx.strokeStyle = skin.cor || '#00f0ff';
            ctx.shadowColor = skin.cor || '#00f0ff';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }
    }

    // === DESENHISTA DE SKINS (VISUALIZADOR) ===
    function desenharPreviewSkin(canvas, skin, tipo) {
        const ctx = canvas.getContext('2d');
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Renderização para naves circulares.
        if (tipo === 'nave' && skin.forma === 'circulo') {
            ctx.save();
            ctx.beginPath();

            const raio = skin.geometria?.raio || (skin.geometria?.largura / 2) || 16;
            ctx.arc(cx, cy, raio, 0, Math.PI * 2);

            // Núcleo
            ctx.fillStyle = skin.cor || '#000000';
            ctx.fill();

            // Glow Neon e Borda (Aplica apenas se larguraBorda > 0 ou shadowBlur > 0)
            if (skin.shadowBlur && skin.shadowBlur > 0) {
                ctx.shadowColor = skin.sombraCor || skin.corBrilho || '#9900ff';
                ctx.shadowBlur = skin.shadowBlur;
            }
            if (skin.larguraBorda && skin.larguraBorda > 0) {
                ctx.strokeStyle = skin.corBorda || '#9900ff';
                ctx.lineWidth = skin.larguraBorda;
                ctx.stroke();
            }

            ctx.restore();
            return;
        }

        // 2. Renderização para Tiros Especiais (Ex: Jato Relativístico)
        if (tipo === 'tiro' && skin.tipo === 'projetil') {
            ctx.save();

            // Aura externa do jato
            const gradTiro = ctx.createLinearGradient(cx, cy - 20, cx, cy + 15);
            gradTiro.addColorStop(0, skin.corNucleo || '#ffffff');
            gradTiro.addColorStop(0.3, skin.corAura || '#ffaa00');
            gradTiro.addColorStop(1, 'transparent');

            ctx.fillStyle = gradTiro;
            ctx.shadowColor = skin.corBrilho || '#ff4500';
            ctx.shadowBlur = skin.shadowBlur || 15;

            // Forma pontiaguda do jato
            ctx.beginPath();
            ctx.moveTo(cx, cy - 20);
            ctx.lineTo(cx - 4, cy + 15);
            ctx.lineTo(cx + 4, cy + 15);
            ctx.closePath();
            ctx.fill();

            // Núcleo brilhante no centro
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 1, cy - 18, 2, 25);

            ctx.restore();
            return;
        }

        // 3. Desenhos Padrão para Outras Formas / Tipos[cite: 10]
        const cor = skin.cor || '#00f0ff';
        ctx.strokeStyle = cor;
        ctx.shadowColor = cor;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 3;

        if (tipo === 'nave') {
            ctx.beginPath();
            ctx.moveTo(cx, cy - 20);
            ctx.lineTo(cx - 18, cy + 18);
            ctx.lineTo(cx, cy + 10);
            ctx.lineTo(cx + 18, cy + 18);
            ctx.closePath();
            ctx.stroke();
        } else if (tipo === 'tiro') {
            ctx.strokeRect(cx - 3, cy - 15, 6, 30);
        }
    }
});