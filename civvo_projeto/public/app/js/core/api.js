/* Camada única para falar com a API: carregamento, envio e falha.
   Em DEMO ela simula a latência da rede. Ao integrar o back-end, troque o corpo de chamar() por fetch() e o resto continua igual. */

const LATENCIA = { 
  min: 350, 
  max: 800, 
  falhar: false 
};

if (/[?&]sem-espera/.test(location.search)) {
  LATENCIA.min = LATENCIA.max = 0; /* ?sem-espera na URL desliga a latência simulada */
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function chamar(acao, ms) {
  if (DEMO) {
    await espera(ms ?? LATENCIA.min + Math.random() * (LATENCIA.max - LATENCIA.min));
    if (LATENCIA.falhar) {
      LATENCIA.falhar = false;
      throw new Error('Falha simulada da rede');
    }
  }
  return acao ? acao() : undefined;
}

async function comEspera(btn, texto, acao, ms) {
  if (btn && btn.dataset.busy) return false;
  
  const antes = btn && btn.innerHTML;
  if (btn) {
    btn.dataset.busy = '1';
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = `<span class="spin" aria-hidden="true"></span> ${texto}`;
  }

  try {
    await chamar(acao, ms);
    return true;
  } catch (e) {
    toast(
      e.name == 'AbortError' ? 'Envio cancelado.' : 'Não foi possível concluir. Tente novamente.'
    );
    return false;
  } finally {
    if (btn && btn.isConnected) {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.innerHTML = antes;
      delete btn.dataset.busy;
    }
  }
}

function simularUpload(arquivos, sinal, onTick) {
  const total = arquivos.reduce((t, f) => t + (f.size || 2e5), 0) || 1e5;
  
  return new Promise((ok, erro) => {
    let enviado = 0;
    
    const t = setInterval(
      () => {
        if (sinal.aborted) {
          clearInterval(t);
          erro(new DOMException('cancelado', 'AbortError'));
          return;
        }
        
        enviado = Math.min(total, enviado + total / 16 + (Math.random() * total) / 24);
        onTick(enviado / total);
        
        if (enviado >= total) {
          clearInterval(t);
          ok();
        }
      },
      DEMO && LATENCIA.max > 0 ? 90 : 0
    );
  });
}

async function upload(el, arquivos, rotulo) {
  const ac = new AbortController();
  
  el.innerHTML = `
    <div class="envio" role="status">
      <div class="bar"><b style="width:0%"></b></div>
      <div class="upr">
        <span>${esc(rotulo)} <b class="pc">0%</b></span>
        <button type="button" class="btn light sm" data-cancel>Cancelar</button>
      </div>
    </div>
  `;
  
  el.querySelector('[data-cancel]').onclick = () => ac.abort();
  
  try {
    await simularUpload(arquivos, ac.signal, (p) => {
      const b = el.querySelector('.bar b');
      const c = el.querySelector('.pc');
      if (b) {
        b.style.width = Math.round(p * 100) + '%';
        c.textContent = Math.round(p * 100) + '%';
      }
    });
    
    el.innerHTML = '';
    return true;
  } catch (e) {
    el.innerHTML = '';
    if (e.name == 'AbortError') return false;
    throw e;
  }
}