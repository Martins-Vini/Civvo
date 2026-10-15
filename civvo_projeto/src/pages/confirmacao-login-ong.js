import logoCivvoSvg from '../assets/logo-civvo.svg';

export function renderConfirmacaoLoginOng() {
    const app = document.getElementById('app');

    app.innerHTML = `
    <header class="topbar">
        <a href="#/inicio" class="back-link" aria-label="Voltar para a página inicial">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5"/>
                <path d="M12 19l-7-7 7-7"/>
            </svg>
        </a>
        <img class="logo-civvo" src="${logoCivvoSvg}" alt="Logo Civvo" />
    </header>

    <main class="auth-page">
        <section class="auth-card verification-card" aria-labelledby="verification-title">
            <svg class="verification-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2"/>
                <path d="m3 7 9 6 9-6"/>
                <path d="m9 16 2 2 4-4"/>
            </svg>
            <p class="auth-role">Confirmação de acesso</p>
            <h1 id="verification-title">Verifique seu e-mail</h1>
            <p>Enviamos um e-mail de confirmação para o endereço cadastrado da sua ONG.</p>
            <p class="verification-note">Abra a mensagem e confirme o acesso para concluir seu login. Se não encontrar o e-mail, verifique também a pasta de spam.</p>
            <a class="auth-button verification-back" href="#/login-ong">Voltar ao login</a>
        </section>
    </main>
    `;
}
