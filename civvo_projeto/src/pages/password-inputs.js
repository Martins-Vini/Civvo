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

        toggle.addEventListener('click', () => {
            const isVisible = input.type === 'text';
            input.type = isVisible ? 'password' : 'text';
            toggle.textContent = isVisible ? 'Mostrar' : 'Ocultar';
            toggle.setAttribute('aria-label', `${isVisible ? 'Mostrar' : 'Ocultar'} senha`);
            toggle.setAttribute('aria-pressed', String(!isVisible));
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
