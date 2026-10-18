/* Tela: feed com Momentos e postagens. */

const emptySt = () =>
  '<div class="st" aria-hidden="true"><div class="ring e"></div></div>'.repeat(5);

const skel = () => {
  setTimeout(() => {
    FEED = 1;
    go();
  }, 700);

  const storiesSkel = '<div class="st"><div class="sk av" style="width:64px;height:64px"></div></div>'.repeat(5);
  const postsSkel = '<div class="card post" style="padding:16px" aria-busy="true"><div class="sk" style="height:18px;width:40%;margin-bottom:14px"></div><div class="sk" style="aspect-ratio:16/10"></div><div class="sk" style="height:14px;width:70%;margin-top:14px"></div></div>'.repeat(2);

  return shell(
    `<div class="top"><h2>Momentos</h2></div>
     <div class="stories">${storiesSkel}</div>
     ${postsSkel}`,
    'feed'
  );
};

V.feed = () => {
  if (!FEED) return skel();

  const isOng = ROLE == 'ong';
  const createBtn = isOng ? '<button class="btn sm desk" onclick="openCreate()">Criar conteúdo</button>' : '';
  const storyCreateBtn = isOng 
    ? '<button class="st" onclick="openCreate(\'MOMENTO\')" aria-label="Novo momento"><div class="ring e plus">+</div>Novo</button>' 
    : '';

  const storiesHtml = STORIES.map((s, i) => {
    const o = ong(s.o);
    const label = i == 0 && isOng ? 'Eu' : esc(o.name.split(' ')[0]);
    return `
      <div class="st" onclick="openStory(${i})">
        <div class="ring">
          <div>${av(o.name, o.h, 58)}</div>
        </div>
        ${label}
      </div>
    `;
  }).join('') || emptySt();

  const postsHtml = feedPosts() || '<div class="card emp">Ainda não há nenhum post por aqui.</div>';

  return shell(
    `<div class="top">
       <h2>Momentos</h2>
       ${createBtn}
     </div>
     <div class="stories">
       ${storyCreateBtn}
       ${storiesHtml}
     </div>
     ${postsHtml}
     ${feedFim()}`,
    'feed'
  );
};

const PAG = 8;
let FEED_N = PAG;

const feedPosts = () => POSTS.slice(0, FEED_N).map(postH).join('');

const feedFim = () => {
  if (POSTS.length > FEED_N) {
    return '<p id="mais" class="mais" role="status"><span class="spin" aria-hidden="true"></span> Carregando mais…</p>';
  }
  return POSTS.length ? '<p>Fim do seu Feed</p>' : '';
};

function maisRetry() {
  const m = document.getElementById('mais');
  if (m) {
    m.innerHTML = '<span class="spin" aria-hidden="true"></span> Carregando mais…';
  }
  observarMais();
}

function observarMais() {
  const el = document.getElementById('mais');
  if (!el || !('IntersectionObserver' in window)) return;

  new IntersectionObserver(
    async (es, ob) => {
      if (!es[0].isIntersecting) return;
      ob.disconnect();

      try {
        await chamar();
      } catch (e) {
        el.innerHTML = 'Não foi possível carregar. <button class="lk" style="margin:0" onclick="maisRetry()">Tentar de novo</button>';
        return;
      }

      const m = document.getElementById('mais');
      if (!m) return;

      const de = FEED_N;
      FEED_N += PAG;
      m.insertAdjacentHTML('beforebegin', POSTS.slice(de, FEED_N).map(postH).join(''));

      if (POSTS.length > FEED_N) {
        observarMais();
      } else {
        m.outerHTML = '<p>Fim do seu Feed</p>';
      }
    },
    { rootMargin: '400px' }
  ).observe(el);
}