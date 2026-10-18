/* Denúncias de posts e comentários */

const MOTIVOS = [
  'Spam ou propaganda',
  'Ofensa ou discurso de ódio',
  'Golpe ou fraude',
  'Conteúdo impróprio',
  'Outro',
];

function openReport(kind, id) {
  const motivosHtml = MOTIVOS
    .map((m, i) => `<label class="rd"><input type="radio" name="mot" value="${i}" ${i ? '' : 'checked'}> ${m}</label>`)
    .join('');

  const content = `
    <h3>Denunciar ${kind == 'POST' ? 'publicação' : 'comentário'}</h3>
    <p class="sub">Nossa moderação analisa cada denúncia.</p>
    <fieldset class="mot">${motivosHtml}</fieldset>
    <label for="dt">Detalhes (opcional)</label>
    <textarea id="dt" class="in" rows="3"></textarea>
    <button class="btn full" style="margin-top:16px" onclick="sendReport('${kind}', ${id}, this)">Enviar denúncia</button>
  `;

  openModal(content, 'Denunciar');
}

async function sendReport(kind, id, btn) {
  const m = document.querySelector('input[name=mot]:checked').value;
  const motivoTexto = MOTIVOS[m];
  const detalheTexto = $('#dt').value;

  const ok = await comEspera(btn, 'Enviando…', () => {
    REPORTS.push({
      id: Date.now(),
      kind,
      alvo: id,
      motivo: motivoTexto,
      detalhe: detalheTexto,
      status: 'PENDENTE',
      data: new Date().toLocaleDateString('pt-BR'),
    });

    notify(
      'admin',
      'DENUNCIA',
      'Nova denúncia de ' +
        (kind == 'POST' ? 'publicação' : 'comentário') +
        ': ' +
        motivoTexto +
        '.'
    );
  });

  if (!ok) return;

  closeModal();
  toast('Denúncia enviada. Obrigado por cuidar da comunidade.');
}