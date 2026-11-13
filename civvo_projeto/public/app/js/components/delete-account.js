/* Exclusão da própria conta, dentro do perfil (doador e ONG).
   O bloco "Excluir conta" aparece no fim do perfil; o botão abre uma confirmação que exige digitar EXCLUIR.
   Modo real: chama DELETE /donor/account ou /ong/account (API.excluirContaDoador / excluirContaOng);
   se o back confirmar, encerra a sessão e volta para o início. */

const PALAVRA_EXCLUIR = 'EXCLUIR';

/* Bloco que vai no fim do perfil. Só existe para doador e ONG (admin não tem esta opção). */
function blocoExcluirConta() {
  if (ROLE != 'doador' && ROLE != 'ong') return '';

  const quem = ROLE == 'ong' ? 'da sua ONG' : 'do seu perfil';

  return `
    <section class="danger-zone" aria-labelledby="dzTit">
      <h4 id="dzTit">Excluir conta</h4>
      <p>Ao excluir, a conta ${quem} é desativada e você é desconectado. Esta ação não pode ser desfeita por aqui.</p>
      <button type="button" class="btn ghost danger sm" aria-haspopup="dialog" onclick="askDeleteAccount()">Excluir minha conta</button>
    </section>
  `;
}

function askDeleteAccount() {
  const ong = ROLE == 'ong';

  openModal(
    `<h3>${ong ? 'Excluir a conta da ONG?' : 'Excluir sua conta?'}</h3>
     <p style="color:var(--mut);font-size:14px;margin:8px 0 6px">
       ${ong ? 'A conta da sua organização será desativada' : 'Sua conta será desativada'} e você será desconectado agora.
       Você não poderá desfazer isso por aqui.
     </p>
     <label for="dcTxt">Para confirmar, digite <b>${PALAVRA_EXCLUIR}</b></label>
     <input id="dcTxt" class="in" autocomplete="off" autocapitalize="characters" spellcheck="false" oninput="checkDeleteWord()">
     <p class="dn-err" id="dcErr" role="alert"></p>
     <button class="btn danger full" id="dcOk" disabled onclick="deleteAccount(this)">Excluir minha conta</button>
     <button class="btn light full" style="margin-top:10px" onclick="closeModal()">Cancelar</button>`,
    'Excluir conta'
  );
}

/* só libera o botão quando a palavra de confirmação foi digitada */
function checkDeleteWord() {
  const ok = $('#dcTxt').value.trim().toUpperCase() == PALAVRA_EXCLUIR;
  $('#dcOk').disabled = !ok;
}

async function deleteAccount(btn) {
  if ($('#dcTxt').value.trim().toUpperCase() != PALAVRA_EXCLUIR) return;

  const ong = ROLE == 'ong';

  const ok = await comEspera(btn, 'Excluindo…', async () => {
    /* só o modo real fala com o back; no demo é só simulação */
    if (!DEMO) await (ong ? API.excluirContaOng() : API.excluirContaDoador());
  });

  if (!ok) return;

  closeModal();
  toast('Conta excluída. Até logo!');

  /* dá tempo de ler o aviso; #/sair limpa a sessão e recarrega no início */
  setTimeout(() => {
    location.hash = LOGIN_URL;
  }, 1500);
}
