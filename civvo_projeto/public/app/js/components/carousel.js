/* Carrossel de fotos (publicações e campanhas com mais de uma imagem). Rolagem com snap, setas, pontos e contador. */

const carousel = (imgs) => {
  if (imgs.length == 1) {
    return `<img class="pimg" src="${esc(imgs[0])}" alt="">`;
  }

  const imagesHtml = imgs
    .map((s, i) => `<img src="${esc(s)}" alt="Foto ${i + 1} de ${imgs.length}">`)
    .join('');

  const dotsHtml = imgs
    .map((_, i) => `<i class="${i ? '' : 'on'}"></i>`)
    .join('');

  return `
    <div class="carw">
      <div class="car" onscroll="carDots(this)">
        ${imagesHtml}
      </div>
      <button class="cb prev" aria-label="Foto anterior" onclick="carGo(this, -1)">‹</button>
      <button class="cb next" aria-label="Próxima foto" onclick="carGo(this, 1)">›</button>
      <div class="dots">${dotsHtml}</div>
      <span class="cnt">1/${imgs.length}</span>
    </div>
  `;
};

function carGo(b, d) {
  event.stopPropagation();
  const c = b.parentNode.querySelector('.car');
  c.scrollBy({ left: d * c.clientWidth, behavior: 'smooth' });
}

function carDots(c) {
  const i = Math.round(c.scrollLeft / c.clientWidth);
  const w = c.parentNode;

  w.querySelectorAll('.dots i').forEach((e, k) => e.classList.toggle('on', k == i));
  w.querySelector('.cnt').textContent = i + 1 + '/' + c.children.length;
}