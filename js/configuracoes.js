const usuario = exigirLogin();
const PERFIS_DISPONIVEIS = ["Vendedor", "Oficina", "Coordenador", "Admin"];

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;

  if (usuario.perfil !== "Admin" && usuario.perfil !== "Coordenador") {
    // Essa tela é só pra Admin e Coordenador — quem não é, volta pra Central.
    window.location.href = "home.html";
  } else {
    if (usuario.perfil === "Coordenador") {
      // Coordenador não pode cadastrar Admin — a opção nem aparece pra ele.
      const opcaoAdmin = document.querySelector('#novo-perfil option[value="Admin"]');
      if (opcaoAdmin) opcaoAdmin.remove();
    }
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
    // Coordenador não pode tocar em quem já é Admin (nem status, nem perfil) —
    // trava também na tela, além da trava que já existe no servidor.
    const coordenadorTravado = usuario.perfil === "Coordenador" && u.perfil === "Admin";

    const linha = document.createElement("div");
    linha.className = "linha-os-selecionavel";
    linha.style.cursor = "default";
    linha.style.display = "flex";
    linha.style.justifyContent = "space-between";
    linha.style.alignItems = "center";
    linha.style.gap = "12px";

    const info = document.createElement("div");
    const ativo = u.ativo === "Sim";
    info.innerHTML =
      "<strong>" + u.nome + "</strong> — " + u.email +
      (ativo ? "" : ' <span class="etiqueta-status" style="background: #FCEAEA; color: var(--erro);">Inativo</span>');
    linha.appendChild(info);

    const acoes = document.createElement("div");
    acoes.style.display = "flex";
    acoes.style.gap = "8px";
    acoes.style.alignItems = "center";

    const seletorPerfil = document.createElement("select");
    seletorPerfil.className = "seletor-perfil-usuario";
    PERFIS_DISPONIVEIS.forEach(function (perfil) {
      if (usuario.perfil === "Coordenador" && perfil === "Admin" && perfil !== u.perfil) return;
      const opcao = document.createElement("option");
      opcao.value = perfil;
      opcao.textContent = perfil;
      if (perfil === u.perfil) opcao.selected = true;
      seletorPerfil.appendChild(opcao);
    });
    seletorPerfil.disabled = coordenadorTravado;
    seletorPerfil.title = coordenadorTravado ? "Coordenadors não podem alterar administradores." : "";
    seletorPerfil.addEventListener("change", function () {
      alterarPerfil(u.id, seletorPerfil.value);
    });
    acoes.appendChild(seletorPerfil);

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao-secundario";
    botao.textContent = ativo ? "Desativar" : "Reativar";
    botao.disabled = coordenadorTravado;
    botao.title = coordenadorTravado ? "Coordenadors não podem alterar administradores." : "";
    botao.addEventListener("click", function () {
      alterarStatus(u.id, ativo ? "Não" : "Sim");
    });
    acoes.appendChild(botao);

    linha.appendChild(acoes);
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

async function alterarPerfil(idUsuario, novoPerfil) {
  try {
    const resposta = await chamarApi({ acao: "alterarPerfilUsuario", id_usuario: idUsuario, novo_perfil: novoPerfil });
    carregarUsuarios();
    if (!resposta.sucesso) {
      alert(resposta.mensagem || "Não foi possível alterar o perfil.");
    }
  } catch (erro) {
    alert("Não foi possível alterar o perfil agora.");
    carregarUsuarios();
  }
}
