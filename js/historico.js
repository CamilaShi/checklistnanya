const usuario = exigirLogin();

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;

  if (usuario.perfil !== "Admin" && usuario.perfil !== "Coordenador") {
    const itemConfig = document.getElementById("menu-configuracoes");
    if (itemConfig) itemConfig.style.display = "none";
  }

  carregarResumoGeral();
  carregarDropdownClientesHistorico();
}

function itemEmConstrucao(evento) {
  evento.preventDefault();
  alert("Essa tela ainda vai ser construída nas próximas etapas do projeto.");
}

// Guarda o último filtro buscado (placa ou cliente), pra o botão
// "Exportar PDF deste resultado" saber o que gerar sem precisar
// buscar tudo de novo.
let ultimoFiltroHistorico = null;

async function carregarResumoGeral() {
  try {
    const resposta = await chamarApi({ acao: "obterHistoricoGeral" });
    if (!resposta.sucesso) return;
    document.getElementById("resumo-total-clientes").textContent = resposta.total_clientes;
    document.getElementById("resumo-total-veiculos").textContent = resposta.total_veiculos;
    document.getElementById("resumo-total-atendimentos").textContent = resposta.total_atendimentos;
  } catch (erro) {
    // Os cartões ficam com "—" — a pessoa ainda pode usar o resto da tela.
  }
}

async function carregarDropdownClientesHistorico() {
  try {
    const resposta = await chamarApi({ acao: "listarClientes" });
    if (!resposta.sucesso) return;
    const select = document.getElementById("historico-cliente");
    resposta.clientes.forEach(function (cliente) {
      const opcao = document.createElement("option");
      opcao.value = cliente.id;
      opcao.textContent = cliente.nome;
      select.appendChild(opcao);
    });
  } catch (erro) {
    // Sem dropdown carregado, a busca por cliente fica indisponível até recarregar.
  }
}

document.getElementById("botao-buscar-historico-placa").addEventListener("click", async function () {
  const placa = document.getElementById("historico-placa").value.trim();
  const mensagem = document.getElementById("mensagem-busca-historico");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  if (!placa) {
    mensagem.textContent = "Digite a placa pra buscar.";
    mensagem.classList.add("erro");
    return;
  }

  this.disabled = true;
  try {
    const resposta = await chamarApi({ acao: "obterHistoricoVeiculo", placa: placa });
    if (!resposta.sucesso) {
      mensagem.textContent = resposta.mensagem || "Não foi possível buscar agora.";
      mensagem.classList.add("erro");
      document.getElementById("secao-resultado-historico").classList.add("oculto");
      return;
    }
    ultimoFiltroHistorico = { tipo: "veiculo", placa: placa };
    renderizarResultadoVeiculo(resposta);
  } catch (erro) {
    mensagem.textContent = "Não foi possível buscar agora.";
    mensagem.classList.add("erro");
  } finally {
    this.disabled = false;
  }
});

document.getElementById("botao-buscar-historico-cliente").addEventListener("click", async function () {
  const idCliente = document.getElementById("historico-cliente").value;
  const mensagem = document.getElementById("mensagem-busca-historico");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  if (!idCliente) {
    mensagem.textContent = "Escolha um cliente pra buscar.";
    mensagem.classList.add("erro");
    return;
  }

  this.disabled = true;
  try {
    const resposta = await chamarApi({ acao: "obterHistoricoCliente", id_cliente: idCliente });
    if (!resposta.sucesso) {
      mensagem.textContent = resposta.mensagem || "Não foi possível buscar agora.";
      mensagem.classList.add("erro");
      document.getElementById("secao-resultado-historico").classList.add("oculto");
      return;
    }
    ultimoFiltroHistorico = { tipo: "cliente", id_cliente: idCliente };
    renderizarResultadoCliente(resposta);
  } catch (erro) {
    mensagem.textContent = "Não foi possível buscar agora.";
    mensagem.classList.add("erro");
  } finally {
    this.disabled = false;
  }
});

function tabelaAtendimentos(atendimentos) {
  if (!atendimentos || atendimentos.length === 0) {
    return '<p class="aviso">Nenhum atendimento registrado.</p>';
  }
  let html = '<table class="tabela-atendimentos-historico"><thead><tr>' +
    "<th>Data</th><th>Status</th><th>Solicitação do cliente</th><th>O que foi feito</th>" +
    "</tr></thead><tbody>";
  atendimentos.forEach(function (a) {
    html += "<tr><td>" + (a.data || "") + "</td><td>" + (a.status || "") + "</td>" +
      "<td>" + (a.solicitacoes_cliente || "—") + "</td>" +
      "<td>" + (a.servicos_realizados || "—") + "</td></tr>";
  });
  html += "</tbody></table>";
  return html;
}

function renderizarResultadoVeiculo(resposta) {
  document.getElementById("titulo-resultado-historico").textContent =
    "Histórico — " + resposta.veiculo.placa;
  document.getElementById("resumo-resultado-historico").textContent =
    [resposta.veiculo.marca, resposta.veiculo.modelo].filter(Boolean).join(" ") +
    (resposta.veiculo.cliente_nome ? " · Cliente: " + resposta.veiculo.cliente_nome : "") +
    " · " + resposta.total_atendimentos + " atendimento(s)";

  const container = document.getElementById("lista-resultado-historico");
  container.innerHTML =
    '<div class="bloco-veiculo-historico">' +
    '<div class="titulo-veiculo-historico">' + resposta.veiculo.placa + "</div>" +
    tabelaAtendimentos(resposta.atendimentos) +
    "</div>";

  document.getElementById("secao-resultado-historico").classList.remove("oculto");
  const mensagemPdf = document.getElementById("mensagem-pdf-resultado");
  mensagemPdf.textContent = "";
  mensagemPdf.className = "mensagem-inline";
}

function renderizarResultadoCliente(resposta) {
  document.getElementById("titulo-resultado-historico").textContent =
    "Histórico — " + resposta.cliente.nome;
  document.getElementById("resumo-resultado-historico").textContent =
    resposta.veiculos.length + " veículo(s) · " + resposta.total_atendimentos + " atendimento(s) no total";

  const container = document.getElementById("lista-resultado-historico");
  container.innerHTML = "";

  if (resposta.veiculos.length === 0) {
    container.innerHTML = '<p class="aviso">Esse cliente ainda não trouxe nenhum veículo pra um Check List.</p>';
  } else {
    resposta.veiculos.forEach(function (v) {
      const bloco = document.createElement("div");
      bloco.className = "bloco-veiculo-historico";
      bloco.innerHTML =
        '<div class="titulo-veiculo-historico">' + v.placa + " — " + [v.marca, v.modelo].filter(Boolean).join(" ") + "</div>" +
        tabelaAtendimentos(v.atendimentos);
      container.appendChild(bloco);
    });
  }

  document.getElementById("secao-resultado-historico").classList.remove("oculto");
  const mensagemPdf = document.getElementById("mensagem-pdf-resultado");
  mensagemPdf.textContent = "";
  mensagemPdf.className = "mensagem-inline";
}

// ---------------------------------------------------------------
// Exportar PDF — o resumo geral e o resultado da busca (veículo ou
// cliente) cada um tem seu próprio botão. Os dois chamam a mesma
// ação no servidor (gerarPdfHistorico), só muda o "tipo" mandado.
// ---------------------------------------------------------------

async function exportarPdfHistorico(dadosFiltro, botao, mensagem) {
  botao.disabled = true;
  const textoOriginal = botao.textContent;
  botao.textContent = "Gerando PDF...";
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  try {
    const resposta = await chamarApi(Object.assign({ acao: "gerarPdfHistorico" }, dadosFiltro));
    if (!resposta.sucesso) {
      mensagem.textContent = resposta.mensagem || "Não foi possível gerar o PDF agora.";
      mensagem.classList.add("erro");
      return;
    }
    window.open("https://drive.google.com/file/d/" + resposta.pdf_id + "/view", "_blank", "noopener");
    mensagem.textContent = "PDF gerado.";
    mensagem.classList.add("sucesso");
  } catch (erro) {
    mensagem.textContent = "Não foi possível gerar o PDF agora.";
    mensagem.classList.add("erro");
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

document.getElementById("botao-pdf-geral").addEventListener("click", function () {
  exportarPdfHistorico({ tipo: "geral" }, this, document.getElementById("mensagem-pdf-geral"));
});

document.getElementById("botao-pdf-resultado").addEventListener("click", function () {
  if (!ultimoFiltroHistorico) return;
  exportarPdfHistorico(ultimoFiltroHistorico, this, document.getElementById("mensagem-pdf-resultado"));
});
