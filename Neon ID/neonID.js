document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-conta');
    const resultado = document.getElementById('resultado-conta');

    form.addEventListener('submit', evento => {
        evento.preventDefault();
        const nome = new FormData(form).get('nome');
        const conta = window.NeonConta.criarConta(nome);
        resultado.hidden = false;
        resultado.replaceChildren();
        const id = document.createElement('strong');
        const mensagem = document.createElement('span');
        id.textContent = conta.id;
        mensagem.textContent = `Conta criada para ${conta.nome}.`;
        resultado.append(id, mensagem);
        form.reset();
    });
});
