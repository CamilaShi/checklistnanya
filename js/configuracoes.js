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
    await chamarApiRapido({ acao: "listarUsuarios" }, function (resposta) {
      if (!resposta.sucesso) {
        container.innerHTML = '<p class="aviso">' + (resposta.mensagem || "Não foi possível carregar.") + "</p>";
        return;
      }
      renderizarUsuarios(resposta.usuarios);
    });
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
    seletorPerfil.title = coordenadorTravado ? "Coordenadores não podem alterar administradores." : "";
    seletorPerfil.addEventListener("change", function () {
      alterarPerfil(u.id, seletorPerfil.value);
    });
    acoes.appendChild(seletorPerfil);

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao-secundario";
    botao.textContent = ativo ? "Desativar" : "Reativar";
    botao.disabled = coordenadorTravado;
    botao.title = coordenadorTravado ? "Coordenadores não podem alterar administradores." : "";
    botao.addEventListener("click", function () {
      alterarStatus(u.id, ativo ? "Não" : "Sim");
    });
    acoes.appendChild(botao);

    // "Redefinir senha" é só do Admin — nem Coordenador vê esse botão.
    // Serve pra quando o usuário esquece a senha e não consegue usar
    // o "Alterar senha" (que exige a senha atual).
    if (usuario.perfil === "Admin") {
      const botaoRedefinir = document.createElement("button");
      botaoRedefinir.type = "button";
      botaoRedefinir.className = "botao-secundario botao-redefinir-senha";
      botaoRedefinir.textContent = "Redefinir senha";
      botaoRedefinir.addEventListener("click", function () {
        abrirModalRedefinirSenha(u.id, u.nome);
      });
      acoes.appendChild(botaoRedefinir);
    }

    linha.appendChild(acoes);
    container.appendChild(linha);
  });
}

// ---------------------------------------------------------------
// Modal "Redefinir senha" (Admin define uma senha nova pra outra
// pessoa, sem precisar saber a senha atual dela).
// ---------------------------------------------------------------

let idUsuarioRedefinindo = null;

function abrirModalRedefinirSenha(idUsuario, nomeUsuario) {
  idUsuarioRedefinindo = idUsuario;
  document.getElementById("texto-redefinir-usuario").textContent = "Usuário: " + nomeUsuario;
  document.getElementById("redefinir-senha-nova").value = "";
  document.getElementById("redefinir-senha-confirmar").value = "";
  const mensagem = document.getElementById("mensagem-redefinir-senha");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  document.getElementById("modal-redefinir-senha").classList.remove("oculto");
}

function fecharModalRedefinirSenha() {
  idUsuarioRedefinindo = null;
  document.getElementById("modal-redefinir-senha").classList.add("oculto");
}

document.getElementById("botao-cancelar-redefinir-senha").addEventListener("click", fecharModalRedefinirSenha);

document.getElementById("modal-redefinir-senha").addEventListener("click", function (evento) {
  if (evento.target === this) fecharModalRedefinirSenha();
});

document.getElementById("botao-confirmar-redefinir-senha").addEventListener("click", async function () {
  const senhaNova = document.getElementById("redefinir-senha-nova").value;
  const senhaConfirmar = document.getElementById("redefinir-senha-confirmar").value;
  const mensagem = document.getElementById("mensagem-redefinir-senha");
  const botao = this;

  if (!senhaNova || !senhaConfirmar) {
    mensagem.textContent = "Preencha a nova senha e a confirmação.";
    mensagem.className = "mensagem-inline erro";
    return;
  }
  if (senhaNova.length < 6) {
    mensagem.textContent = "A nova senha precisa ter pelo menos 6 caracteres.";
    mensagem.className = "mensagem-inline erro";
    return;
  }
  if (senhaNova !== senhaConfirmar) {
    mensagem.textContent = "A confirmação não é igual à nova senha.";
    mensagem.className = "mensagem-inline erro";
    return;
  }

  botao.disabled = true;
  mensagem.textContent = "Salvando...";
  mensagem.className = "mensagem-inline info";

  try {
    const resposta = await chamarApi({
      acao: "redefinirSenhaUsuario",
      id_usuario: idUsuarioRedefinindo,
      nova_senha: senhaNova,
    });

    if (resposta.sucesso) {
      mensagem.textContent = "Senha redefinida com sucesso!";
      mensagem.className = "mensagem-inline sucesso";
      setTimeout(fecharModalRedefinirSenha, 1200);
    } else {
      mensagem.textContent = resposta.mensagem || "Não foi possível redefinir a senha.";
      mensagem.className = "mensagem-inline erro";
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível conectar ao sistema.";
    mensagem.className = "mensagem-inline erro";
  } finally {
    botao.disabled = false;
  }
});

// Aviso fixo na tela (canto inferior), sempre visível mesmo com a lista
// rolada lá embaixo. Some sozinho depois de alguns segundos.
function avisarListaUsuarios(texto, erro) {
  let aviso = document.getElementById("aviso-flutuante-usuarios");
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = "aviso-flutuante-usuarios";
    aviso.setAttribute("role", "status");
    aviso.style.cssText =
      "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9999;" +
      "padding:12px 22px;border-radius:8px;color:#fff;font-size:15px;font-weight:600;" +
      "box-shadow:0 4px 16px rgba(0,0,0,0.25);max-width:90vw;text-align:center;";
    document.body.appendChild(aviso);
  }
  aviso.textContent = texto;
  aviso.style.background = erro ? "#C0392B" : "#1b7a3d";
  aviso.style.display = "block";
  clearTimeout(aviso._timer);
  aviso._timer = setTimeout(function () { aviso.style.display = "none"; }, 5000);
}

async function alterarStatus(idUsuario, novoStatus) {
  try {
    const resposta = await chamarApi({ acao: "alterarStatusUsuario", id_usuario: idUsuario, ativo: novoStatus });
    if (resposta.sucesso) {
      carregarUsuarios();
      avisarListaUsuarios("Salvo: usuário " + (novoStatus === "Sim" ? "ativado" : "desativado") + ".", false);
    } else {
      avisarListaUsuarios(resposta.mensagem || "Não foi possível alterar o status.", true);
    }
  } catch (erro) {
    avisarListaUsuarios("Não foi possível alterar o status agora.", true);
  }
}

async function alterarPerfil(idUsuario, novoPerfil) {
  try {
    const resposta = await chamarApi({ acao: "alterarPerfilUsuario", id_usuario: idUsuario, novo_perfil: novoPerfil });
    carregarUsuarios();
    if (resposta.sucesso) {
      avisarListaUsuarios("Salvo: perfil alterado para " + novoPerfil + ".", false);
    } else {
      avisarListaUsuarios(resposta.mensagem || "Não foi possível alterar o perfil.", true);
    }
  } catch (erro) {
    avisarListaUsuarios("Não foi possível alterar o perfil agora.", true);
    carregarUsuarios();
  }
}
