const usuario = exigirLogin();

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;

  if (usuario.perfil !== "Admin" && usuario.perfil !== "Coordenador") {
    const itemConfig = document.getElementById("menu-configuracoes");
    if (itemConfig) itemConfig.style.display = "none";
  }

  prepararFiltroAnoHistorico();
  carregarResumoGeral();
  carregarDropdownClientesHistorico();
  carregarDropdownPlacasHistorico();
}

function itemEmConstrucao(evento) {
  evento.preventDefault();
  alert("Essa tela ainda vai ser construída nas próximas etapas do projeto.");
}

// Guarda o último filtro buscado (placa ou cliente), pra o botão
// "Exportar PDF deste resultado" saber o que gerar sem precisar
// buscar tudo de novo.
let ultimoFiltroHistorico = null;

// Monta a faixa de "badges" com a contagem por status (ex: "Aprovado: 3").
function faixaStatus(contagemStatus) {
  if (!contagemStatus || Object.keys(contagemStatus).length === 0) return "";
  return Object.keys(contagemStatus).map(function (status) {
    return '<span class="badge-status-historico">' + status + ": " + contagemStatus[status] + "</span>";
  }).join("");
}

// Preenche o dropdown de Ano do filtro geral: ano atual + 4 anos
// pra trás, mais recente primeiro. Começa em "Todos os anos".
function prepararFiltroAnoHistorico() {
  const select = document.getElementById("historico-geral-ano");
  const anoAtual = new Date().getFullYear();
  const opcaoTodos = document.createElement("option");
  opcaoTodos.value = "";
  opcaoTodos.textContent = "Todos os anos";
  select.appendChild(opcaoTodos);
  for (let ano = anoAtual; ano >= anoAtual - 4; ano--) {
    const opcao = document.createElement("option");
    opcao.value = ano;
    opcao.textContent = ano;
    select.appendChild(opcao);
  }
}

async function carregarResumoGeral() {
  const mes = document.getElementById("historico-geral-mes").value;
  const ano = document.getElementById("historico-geral-ano").value;
  try {
    const resposta = await chamarApi({ acao: "obterHistoricoGeral", mes: mes, ano: ano });
    if (!resposta.sucesso) return;
    document.getElementById("resumo-total-clientes").textContent = resposta.total_clientes;
    document.getElementById("resumo-total-veiculos").textContent = resposta.total_veiculos;
    document.getElementById("resumo-total-atendimentos").textContent = resposta.total_atendimentos;
    document.getElementById("resumo-valor-total").textContent = resposta.valor_total_formatado;
    document.getElementById("faixa-status-geral").innerHTML = faixaStatus(resposta.contagem_status);
  } catch (erro) {
    // Os cartões ficam com "—" — a pessoa ainda pode usar o resto da tela.
  }
}

document.getElementById("botao-filtrar-historico-geral").addEventListener("click", carregarResumoGeral);

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

async function carregarDropdownPlacasHistorico() {
  try {
    const resposta = await chamarApi({ acao: "listarPlacas" });
    if (!resposta.sucesso) return;
    const select = document.getElementById("historico-placa");
    resposta.veiculos.forEach(function (v) {
      const opcao = document.createElement("option");
      opcao.value = v.placa;
      opcao.textContent = v.placa + ([v.marca, v.modelo].filter(Boolean).join(" ") ? " — " + [v.marca, v.modelo].filter(Boolean).join(" ") : "");
      select.appendChild(opcao);
    });
  } catch (erro) {
    // Sem dropdown carregado, a busca por placa fica indisponível até recarregar.
  }
}

document.getElementById("botao-buscar-historico-placa").addEventListener("click", async function () {
  const placa = document.getElementById("historico-placa").value.trim();
  const mensagem = document.getElementById("mensagem-busca-historico");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  if (!placa) {
    mensagem.textContent = "Escolha uma placa pra buscar.";
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
    "<th>Data</th><th>Status</th><th>Solicitação do cliente</th><th>O que foi feito</th><th>Valor</th>" +
    "</tr></thead><tbody>";
  atendimentos.forEach(function (a) {
    html += "<tr><td>" + (a.data || "") + "</td><td>" + (a.status || "") + "</td>" +
      "<td>" + (a.solicitacoes_cliente || "—") + "</td>" +
      "<td>" + (a.servicos_realizados || "—") + "</td>" +
      "<td>" + (a.valor_formatado || "—") + "</td></tr>";
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

  document.getElementById("faixa-status-resultado").innerHTML = faixaStatus(resposta.contagem_status);

  const container = document.getElementById("lista-resultado-historico");
  container.innerHTML =
    '<div class="bloco-veiculo-historico">' +
    '<div class="titulo-veiculo-historico">' + resposta.veiculo.placa + "</div>" +
    tabelaAtendimentos(resposta.atendimentos) +
    "</div>";

  document.getElementById("valor-total-resultado").textContent = "Valor total: " + resposta.valor_total_formatado;

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

  document.getElementById("faixa-status-resultado").innerHTML = faixaStatus(resposta.contagem_status);

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
        tabelaAtendimentos(v.atendimentos) +
        '<div class="linha-valor-total-historico">Valor deste veículo: ' + v.valor_total_formatado + "</div>";
      container.appendChild(bloco);
    });
  }

  document.getElementById("valor-total-resultado").textContent = "Valor total do cliente: " + resposta.valor_total_formatado;

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
  const mes = document.getElementById("historico-geral-mes").value;
  const ano = document.getElementById("historico-geral-ano").value;
  exportarPdfHistorico({ tipo: "geral", mes: mes, ano: ano }, this, document.getElementById("mensagem-pdf-geral"));
});

document.getElementById("botao-pdf-resultado").addEventListener("click", function () {
  if (!ultimoFiltroHistorico) return;
  exportarPdfHistorico(ultimoFiltroHistorico, this, document.getElementById("mensagem-pdf-resultado"));
});
