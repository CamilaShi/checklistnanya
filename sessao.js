// Devolve o usuário logado (ou null se ninguém estiver logado).
function usuarioLogado() {
  const dados = sessionStorage.getItem("usuario");
  return dados ? JSON.parse(dados) : null;
}

// Chame no início de toda página interna. Se não houver login, manda pra tela de login.
function exigirLogin() {
  const usuario = usuarioLogado();
  if (!usuario) {
    window.location.href = "index.html";
    return null;
  }
  return usuario;
}

function sair() {
  sessionStorage.removeItem("usuario");
  window.location.href = "index.html";
}
