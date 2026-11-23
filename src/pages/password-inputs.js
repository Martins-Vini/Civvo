/* Olho aberto = "mostrar a senha"; olho riscado = "ocultar a senha" (o ícone mostra a ação do clique). */
const EYE_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

const EYE_OPEN = `<svg ${EYE_ATTRS}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;

const EYE_CLOSED = `<svg ${EYE_ATTRS}><path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0112 5c6.4 0 10 7 10 7a17.7 17.7 0 01-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a10.6 10.6 0 004.6-1.1"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/></svg>`;

function showPasswordState(toggle, visible) {
    toggle.innerHTML = visible ? EYE_CLOSED : EYE_OPEN;
    toggle.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
    toggle.setAttribute('aria-pressed', String(visible));
    toggle.title = visible ? 'Ocultar senha' : 'Mostrar senha';
}

function getPasswordStrength(password) {
    const length = [...password].length;
    const characterTypes = [
        /\p{Ll}/u.test(password),
        /\p{Lu}/u.test(password),
        /\p{N}/u.test(password),
        /[^\p{L}\p{N}]/u.test(password),
    ].filter(Boolean).length;

    if (length < 8 || (length < 12 && characterTypes < 2)) {
        return { level: 'weak', score: 1, label: 'Fraca' };
    }

    if (length >= 12 && characterTypes >= 3) {
        return { level: 'strong', score: 3, label: 'Forte' };
    }

    return { level: 'medium', score: 2, label: 'Média' };
}

export function setupPasswordInputs(form) {
    form.querySelectorAll('[data-password-field]').forEach((field) => {
        const input = field.querySelector('input');
        const toggle = field.querySelector('button');

        if (!(input instanceof HTMLInputElement) || !(toggle instanceof HTMLButtonElement)) {
            return;
        }

        showPasswordState(toggle, input.type === 'text');

        toggle.addEventListener('click', () => {
            const makeVisible = input.type === 'password';
            input.type = makeVisible ? 'text' : 'password';
            showPasswordState(toggle, makeVisible);
        });
    });

    const input = form.querySelector('[data-password-strength-input]');
    if (!(input instanceof HTMLInputElement)) {
        return;
    }

    const strengthIndicator = form.querySelector('[data-password-strength]');
    const strengthMeter = strengthIndicator?.querySelector('[role="meter"]');
    const strengthText = strengthIndicator?.querySelector('.password-strength-text');

    if (!strengthIndicator || !strengthMeter || !strengthText) {
        return;
    }

    input.addEventListener('input', () => {
        if (!input.value) {
            strengthIndicator.dataset.strength = 'none';
            strengthMeter.setAttribute('aria-valuenow', '0');
            strengthMeter.setAttribute('aria-valuetext', 'Sem avaliação');
            strengthText.textContent = 'Digite uma senha para ver a força.';
            return;
        }

        const strength = getPasswordStrength(input.value);
        strengthIndicator.dataset.strength = strength.level;
        strengthMeter.setAttribute('aria-valuenow', String(strength.score));
        strengthMeter.setAttribute('aria-valuetext', strength.label);
        strengthText.textContent = `Força estimada: ${strength.label}.`;
    });
}
