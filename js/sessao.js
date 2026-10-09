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
  aquecerCache();
  return usuario;
}

function sair() {
  const token = tokenSessao();
  limparCache();
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

  // Qualquer ação que não seja só consulta pode ter mudado as listas:
  // zera o cache pra a próxima tela já abrir com dado atualizado.
  if (!/^(listar|buscar|obter|consultar)/.test(String(corpo.acao || "")) && dados && dados.sucesso !== false) {
    limparCache();
  }

  if (dados.sessao_invalida) {
    sessionStorage.removeItem("usuario");
    sessionStorage.removeItem("token");
    window.location.href = "index.html";
  }

  return dados;
}

// ---------------------------------------------------------------
// Cache rápido ("mostra o que já tem, atualiza em segundo plano").
// As telas de consulta mostram na hora a última resposta guardada
// neste navegador e, enquanto isso, buscam a versão nova no servidor;
// se mudou algo, a tela se atualiza sozinha. O cache vive só na aba
// (sessionStorage), é apagado ao sair e a cada gravação.
// ---------------------------------------------------------------

const PREFIXO_CACHE = "cacheApi:";

function chaveCache(corpo) {
  const copia = Object.assign({}, corpo);
  delete copia.token;
  return PREFIXO_CACHE + String(tokenSessao() || "").slice(-10) + ":" + JSON.stringify(copia);
}

function lerCache(corpo) {
  try {
    const texto = sessionStorage.getItem(chaveCache(corpo));
    return texto ? JSON.parse(texto) : null;
  } catch (erro) {
    return null;
  }
}

function gravarCache(corpo, dados) {
  try {
    sessionStorage.setItem(chaveCache(corpo), JSON.stringify(dados));
  } catch (erro) {
    // Sem espaço: limpa e segue sem cache, nunca atrapalha a tela.
    limparCache();
  }
}

function limparCache() {
  try {
    Object.keys(sessionStorage).forEach(function (chave) {
      if (chave.indexOf(PREFIXO_CACHE) === 0) sessionStorage.removeItem(chave);
    });
    sessionStorage.removeItem("cacheAquecido");
  } catch (erro) {
    // ignora
  }
}

// Chama o backend mostrando primeiro o que já está guardado.
// aoReceber(dados, veioDoCache) roda 1x com o cache (se houver) e
// de novo com o dado novo, só se ele for diferente.
async function chamarApiRapido(corpo, aoReceber) {
  const guardado = lerCache(corpo);
  const textoGuardado = guardado ? JSON.stringify(guardado) : null;
  if (guardado) {
    try { aoReceber(guardado, true); } catch (erro) { console.error(erro); }
  }

  try {
    const dados = await chamarApi(corpo);
    if (dados && dados.sucesso) {
      gravarCache(corpo, dados);
      if (JSON.stringify(dados) !== textoGuardado) aoReceber(dados, false);
    } else if (!guardado) {
      aoReceber(dados, false);
    }
    return dados;
  } catch (erro) {
    if (!guardado) throw erro;
    return guardado;
  }
}

// Depois do login, busca em segundo plano as listas das telas
// principais pra elas abrirem na hora.
function aquecerCache() {
  try {
    if (sessionStorage.getItem("cacheAquecido")) return;
    sessionStorage.setItem("cacheAquecido", "1");
  } catch (erro) {
    return;
  }

  const lista = [
    { acao: "listarOSAtivas" },
    { acao: "listarModelos" },
    { acao: "listarClientes" },
    { acao: "listarPlacas" },
    { acao: "listarCadastrosDoDia" },
  ];
  const quem = usuarioLogado();
  if (quem && (quem.perfil === "Admin" || quem.perfil === "Coordenador")) lista.push({ acao: "listarUsuarios" });

  setTimeout(async function () {
    for (let i = 0; i < lista.length; i++) {
      if (lerCache(lista[i])) continue;
      try {
        const dados = await chamarApi(lista[i]);
        if (dados && dados.sucesso) gravarCache(lista[i], dados);
      } catch (erro) {
        // segue pro próximo
      }
    }
  }, 1500);
}

// ---------------------------------------------------------------
// Modal "Alterar senha" — disponível em qualquer usuário logado
// (Admin, Vendedor ou Oficina), em qualquer tela. O HTML do modal
// é injetado uma única vez no body, na primeira vez que é aberto.
// ---------------------------------------------------------------

function garantirModalSenha() {
  if (document.getElementById("modal-alterar-senha")) return;

  const fundo = document.createElement("div");
  fundo.id = "modal-alterar-senha";
  fundo.className = "fundo-modal oculto";
  fundo.innerHTML =
    '<div class="caixa-modal">' +
    "<h2>Alterar senha</h2>" +
    '<div class="campo">' +
    '<label for="senha-atual-modal">Senha atual</label>' +
    '<input type="password" id="senha-atual-modal" autocomplete="current-password" />' +
    "</div>" +
    '<div class="campo">' +
    '<label for="senha-nova-modal">Nova senha</label>' +
    '<input type="password" id="senha-nova-modal" autocomplete="new-password" />' +
    "</div>" +
    '<div class="campo">' +
    '<label for="senha-confirmar-modal">Confirmar nova senha</label>' +
    '<input type="password" id="senha-confirmar-modal" autocomplete="new-password" />' +
    "</div>" +
    '<div class="mensagem-inline" id="mensagem-senha-modal"></div>' +
    '<div class="barra-acoes">' +
    '<button type="button" class="botao-cancelar-modal" onclick="fecharModalSenha()">Cancelar</button>' +
    '<button type="button" class="botao-primario" id="botao-confirmar-senha" onclick="confirmarTrocaSenha()">Salvar</button>' +
    "</div>" +
    "</div>";

  document.body.appendChild(fundo);

  fundo.addEventListener("click", function (evento) {
    if (evento.target === fundo) fecharModalSenha();
  });
}

function abrirModalSenha() {
  garantirModalSenha();
  document.getElementById("senha-atual-modal").value = "";
  document.getElementById("senha-nova-modal").value = "";
  document.getElementById("senha-confirmar-modal").value = "";
  const mensagem = document.getElementById("mensagem-senha-modal");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  document.getElementById("modal-alterar-senha").classList.remove("oculto");
}

function fecharModalSenha() {
  const modal = document.getElementById("modal-alterar-senha");
  if (modal) modal.classList.add("oculto");
}

async function confirmarTrocaSenha() {
  const senhaAtual = document.getElementById("senha-atual-modal").value;
  const senhaNova = document.getElementById("senha-nova-modal").value;
  const senhaConfirmar = document.getElementById("senha-confirmar-modal").value;
  const mensagem = document.getElementById("mensagem-senha-modal");
  const botao = document.getElementById("botao-confirmar-senha");

  if (!senhaAtual || !senhaNova || !senhaConfirmar) {
    mensagem.textContent = "Preencha todos os campos.";
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
      acao: "trocarPropriaSenha",
      senha_atual: senhaAtual,
      senha_nova: senhaNova,
    });

    if (resposta.sucesso) {
      mensagem.textContent = "Senha alterada com sucesso!";
      mensagem.className = "mensagem-inline sucesso";
      setTimeout(fecharModalSenha, 1200);
    } else {
      mensagem.textContent = resposta.mensagem || "Não foi possível alterar a senha.";
      mensagem.className = "mensagem-inline erro";
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível conectar ao sistema.";
    mensagem.className = "mensagem-inline erro";
  } finally {
    botao.disabled = false;
  }
}

// Formata um telefone (vindo do cadastro ou de uma busca) no padrão
// "XX XXXXX-XXXX" (celular, 9 dígitos) ou "XX XXXX-XXXX" (fixo, 8
// dígitos). Se não bater com nenhum dos dois, devolve como veio.
function formatarTelefone(numero) {
  const digitos = String(numero || "").replace(/\D/g, "");
  if (digitos.length === 11) {
    return digitos.slice(0, 2) + " " + digitos.slice(2, 7) + "-" + digitos.slice(7);
  }
  if (digitos.length === 10) {
    return digitos.slice(0, 2) + " " + digitos.slice(2, 6) + "-" + digitos.slice(6);
  }
  return numero || "";
}
