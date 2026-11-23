const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );

const ong = (id) => ONGS.find((o) => o.id == id),
  ini = (n) =>
    n
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

const money = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hoje = () => new Date().toISOString().slice(0, 10),

  dataBR = (d) => new Date(d + 'T00:00').toLocaleDateString('pt-BR');

const dia = (s) => {
  s = String(s || '');
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : /^\d{2}\/\d{2}\/\d{4}/.test(s) ? s.slice(0, 10) : s;
};
