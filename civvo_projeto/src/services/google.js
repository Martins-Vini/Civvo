/* Login/cadastro com Google (Google Identity Services).
   O back (POST /api/auth/google) espera o ID token do Google no campo "token" e valida com GOOGLE_CLIENT_ID,
   por isso usamos o botão oficial do Google, que devolve esse ID token (credential).
   Requer VITE_GOOGLE_CLIENT_ID no .env do front (o MESMO client id configurado no back). */

export const GOOGLE_CLIENT_ID = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let carregando = null;

export const googleConfigurado = () => Boolean(GOOGLE_CLIENT_ID);

function carregarGsi() {
    if (window.google?.accounts?.id) return Promise.resolve();

    carregando ??= new Promise((ok, erro) => {
        const s = document.createElement('script');
        s.src = GSI_SRC;
        s.async = true;
        s.defer = true;
        s.onload = ok;
        s.onerror = () => {
            carregando = null; /* permite tentar de novo */
            erro(new Error('Não foi possível carregar o login do Google. Verifique sua conexão.'));
        };
        document.head.append(s);
    });

    return carregando;
}

/* Lê só o e-mail do ID token (para guardar na sessão). Quem valida a assinatura é o back. */
export function emailDoCredential(credential) {
    try {
        const base64 = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(base64).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
        );
        return JSON.parse(json).email;
    } catch {
        return undefined;
    }
}

/* Troca o botão "de enfeite" por um funcional: o botão oficial do Google é renderizado invisível
   por cima do botão estilizado da Civvo, então o visual continua o mesmo e o clique abre o popup do Google.
   aoCredencial(credential) é chamado quando a pessoa escolhe a conta. */
export async function ativarBotaoGoogle({ botao, texto = 'signin_with', aoCredencial, aoErro }) {
    if (!googleConfigurado()) {
        botao.addEventListener('click', () =>
            aoErro(new Error('Login com Google indisponível: falta configurar VITE_GOOGLE_CLIENT_ID.'))
        );
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'google-wrapper';
    botao.replaceWith(wrapper);

    const camada = document.createElement('div');
    camada.className = 'google-wrapper__oficial';
    wrapper.append(botao, camada);

    try {
        await carregarGsi();
    } catch (erro) {
        botao.addEventListener('click', () => aoErro(erro));
        return;
    }

    window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resposta) => {
            if (resposta?.credential) aoCredencial(resposta.credential);
            else aoErro(new Error('Não foi possível entrar com o Google.'));
        },
        ux_mode: 'popup',
        auto_select: false,
    });

    /* o botão oficial aceita largura de 200 a 400 px */
    const largura = Math.min(400, Math.max(200, Math.round(wrapper.getBoundingClientRect().width) || 320));
    window.google.accounts.id.renderButton(camada, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: texto,
        shape: 'rectangular',
        locale: 'pt-BR',
        width: largura,
    });
}
