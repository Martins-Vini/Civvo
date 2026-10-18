/* Ícones das redes sociais (uma cor só, herdam a cor do tema). As URLs vêm do perfil (ONGS_PROFILES / USERS); sem URL o ícone aparece apagado. */

const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');

const NET = [
  [
    'tiktok',
    'TikTok',
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 2h-3.2v12.4a2.9 2.9 0 11-2.9-2.9c.3 0 .6 0 .9.1V8.3a6.2 6.2 0 105.2 6.1V8.8a7.6 7.6 0 004.4 1.4V7a4.5 4.5 0 01-4.4-5z"/></svg>',
  ],
  [
    'instagram',
    'Instagram',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
  ],
  [
    'x',
    'X',
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2h3.4l-7.4 8.5L23.6 22h-6.8l-5.3-7-6.1 7H1.9l7.9-9.1L1.4 2h7l4.8 6.4zm-1.2 18h1.9L7.4 3.9H5.4z"/></svg>',
  ],
  [
    'facebook',
    'Facebook',
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.5-3.3h-3.3V8.4c0-.9.4-1.7 1.8-1.7h1.6V3.8s-1.4-.3-2.8-.3c-2.8 0-4.4 1.7-4.4 4.6v2.4H7v3.3h2.7V22z"/></svg>',
  ],
  [
    'youtube',
    'YouTube',
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 001.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 001.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z"/></svg>',
  ],
];

const socials = (s = {}, nome = '') => {
  const linksHtml = NET.map(([k, n, svg]) => {
    const u = safeUrl(s[k]);
    return u
      ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" aria-label="${n} de ${esc(nome)}">${svg}</a>`
      : `<a aria-disabled="true" title="${n}: não informado" aria-label="${n}: não informado">${svg}</a>`;
  }).join('');

  return `<div class="soc">${linksHtml}</div>`;
};