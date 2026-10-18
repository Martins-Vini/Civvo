/* Avatar: usa a imagem (parâmetro src ou logo da ONG) quando existir, senão as iniciais. */

const av = (n, h, s = 44, src) => {
  const o = ONGS.find((x) => x.name == n);
  const u = src || (o && o.logo);

  if (u) {
    return `<img class="av" src="${esc(u)}" alt="Foto de ${esc(n)}" style="width:${s}px;height:${s}px">`;
  }

  const bgColors = ['#39677e', '#4a778b', '#b7e7ff'];
  const bg = bgColors[(o ? o.id : 0) % bgColors.length];
  const color = o && o.id % 3 == 2 ? '#39677e' : '#fff';

  return `
    <div class="av" role="img" aria-label="${esc(n)}" style="width:${s}px;height:${s}px;font-size:${s / 3}px;background:${bg};color:${color}">
      ${esc(ini(n))}
    </div>
  `;
};