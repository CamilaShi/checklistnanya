const usuario = exigirLogin();

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;

  if (usuario.perfil !== "Admin") {
    // Essa tela é só pra Admin — quem não é, volta pra Central.
    window.location.href = "home.html";
  } else {
    carregarUsuarios();
  }
}

document.getElementById("botao-criar-usuario").addEventListener("click", async function () {
  const nome = document.getElementById("novo-nome").value.trim();
  const email = document.getElementById("novo-email").value.trim();
  const senha = document.getElementById("novo-senha").value;
  const perfil = document.getElementById("novo-perfil").value;
  const mensagem = document.getElementById("mensagem-novo-usuario");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  if (!nome || !email || !senha || !perfil) {
    mensagem.textContent = "Preencha nome, email, senha e perfil.";
    mensagem.classList.add("erro");
    return;
  }

  this.disabled = true;
  try {
    const resposta = await chamarApi({ acao: "criarUsuario", nome: nome, email: email, senha: senha, perfil: perfil });
    if (!resposta.sucesso) {
      mensagem.textContent = resposta.mensagem || "Não foi possível cadastrar.";
      mensagem.classList.add("erro");
      return;
    }
    mensagem.textContent = "Usuário " + nome + " cadastrado com sucesso.";
    mensagem.classList.add("sucesso");
    document.getElementById("novo-nome").value = "";
    document.getElementById("novo-email").value = "";
    document.getElementById("novo-senha").value = "";
    carregarUsuarios();
  } catch (erro) {
    mensagem.textContent = "Não foi possível cadastrar agora.";
    mensagem.classList.add("erro");
  } finally {
    this.disabled = false;
  }
});

async function carregarUsuarios() {
  const container = document.getElementById("lista-usuarios");
  try {
    const resposta = await chamarApi({ acao: "listarUsuarios" });
    if (!resposta.sucesso) {
      container.innerHTML = '<p class="aviso">' + (resposta.mensagem || "Não foi possível carregar.") + "</p>";
      return;
    }
    renderizarUsuarios(resposta.usuarios);
  } catch (erro) {
    container.innerHTML = '<p class="aviso">Não foi possível carregar agora.</p>';
  }
}

function renderizarUsuarios(lista) {
  const container = document.getElementById("lista-usuarios");
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = '<p class="aviso">Nenhum usuário cadastrado.</p>';
    return;
  }

  lista.forEach(function (u) {
    const linha = document.createElement("div");
    linha.className = "linha-os-selecionavel";
    linha.style.cursor = "default";
    linha.style.display = "flex";
    linha.style.justifyContent = "space-between";
    linha.style.alignItems = "center";

    const info = document.createElement("div");
    const ativo = u.ativo === "Sim";
    info.innerHTML =
      "<strong>" + u.nome + "</strong> — " + u.email +
      ' <span class="etiqueta-status">' + u.perfil + "</span>" +
      (ativo ? "" : ' <span class="etiqueta-status" style="background: #FCEAEA; color: var(--erro);">Inativo</span>');
    linha.appendChild(info);

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao-secundario";
    botao.textContent = ativo ? "Desativar" : "Reativar";
    botao.addEventListener("click", function () {
      alterarStatus(u.id, ativo ? "Não" : "Sim");
    });
    linha.appendChild(botao);

    container.appendChild(linha);
  });
}

async function alterarStatus(idUsuario, novoStatus) {
  try {
    const resposta = await chamarApi({ acao: "alterarStatusUsuario", id_usuario: idUsuario, ativo: novoStatus });
    if (resposta.sucesso) carregarUsuarios();
  } catch (erro) {
    // Se falhar, a lista simplesmente não muda — dá pra tentar de novo.
  }
}
