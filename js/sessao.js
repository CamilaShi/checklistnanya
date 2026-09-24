// Devolve o usuário logado (ou null se ninguém estiver logado).
function usuarioLogado() {
  const dados = sessionStorage.getItem("usuario");
  return dados ? JSON.parse(dados) : null;
}

// Devolve o crachá (token) da sessão atual, ou null.
function tokenSessao() {
  return sessionStorage.getItem("token");
}

// Chame no início de toda página interna. Se não houver login
// (usuário ou crachá faltando), manda pra tela de login.
function exigirLogin() {
  const usuario = usuarioLogado();
  const token = tokenSessao();
  if (!usuario || !token) {
    window.location.href = "index.html";
    return null;
  }
  return usuario;
}

function sair() {
  const token = tokenSessao();
  sessionStorage.removeItem("usuario");
  sessionStorage.removeItem("token");

  if (token) {
    // Avisa o backend pra encerrar a sessão, mas não espera resposta
    // pra sair da tela — o importante é limpar o navegador na hora.
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ acao: "logout", token: token }),
    }).catch(function () {});
  }

  window.location.href = "index.html";
}

// Chama o backend já incluindo o crachá de sessão. Use esta função
// (em vez de fetch direto) em qualquer chamada de uma página logada.
async function chamarApi(corpo) {
  const corpoComToken = Object.assign({}, corpo, { token: tokenSessao() });

  const resposta = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(corpoComToken),
  });
  const dados = await resposta.json();

  if (dados.sessao_invalida) {
    sessionStorage.removeItem("usuario");
    sessionStorage.removeItem("token");
    window.location.href = "index.html";
  }

  return dados;
}
