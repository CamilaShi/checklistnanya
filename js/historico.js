const usuario = exigirLogin();

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;

  if (usuario.perfil !== "Admin" && usuario.perfil !== "Coordenador") {
    const itemConfig = document.getElementById("menu-configuracoes");
    if (itemConfig) itemConfig.style.display = "none";
  }

  prepararFiltroAnoHistorico();
  prepararFiltroAnoPeriodo();
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

// Dropdown "Ano" da busca por período: ano atual + 4 anos pra trás.
function prepararFiltroAnoPeriodo() {
  const select = document.getElementById("historico-ano");
  const anoAtual = new Date().getFullYear();
  for (let ano = anoAtual; ano >= anoAtual - 4; ano--) {
    const opcao = document.createElement("option");
    opcao.value = ano;
    opcao.textContent = ano;
    select.appendChild(opcao);
  }
}

// Ano e datas não se misturam: escolher um limpa o outro.
document.getElementById("historico-ano").addEventListener("change", function () {
  if (this.value) {
    document.getElementById("historico-data-inicial").value = "";
    document.getElementById("historico-data-final").value = "";
  }
});
["historico-data-inicial", "historico-data-final"].forEach(function (id) {
  document.getElementById(id).addEventListener("change", function () {
    if (this.value) document.getElementById("historico-ano").value = "";
  });
});

function escaparHtmlTela(texto) {
  return String(texto === undefined || texto === null ? "" : texto)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

// Uma busca só: placa, cliente e período (ano, dia ou intervalo) são
// opcionais e se combinam. Só placa ou só cliente (sem período) mostra o
// histórico agrupado de antes; qualquer outra combinação lista as OS
// numa tabela única.
document.getElementById("botao-buscar-historico").addEventListener("click", async function () {
  const placa = document.getElementById("historico-placa").value.trim();
  const idCliente = document.getElementById("historico-cliente").value;
  const dataInicial = document.getElementById("historico-data-inicial").value;
  const dataFinal = document.getElementById("historico-data-final").value;
  const ano = document.getElementById("historico-ano").value;
  const mensagem = document.getElementById("mensagem-busca-historico");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  if (!placa && !idCliente && !dataInicial && !ano) {
    mensagem.textContent = "Escolha uma placa, um cliente, um ano ou uma data.";
    mensagem.classList.add("erro");
    return;
  }
  if (dataInicial && dataFinal && dataFinal < dataInicial) {
    mensagem.textContent = "A data final não pode ser antes da inicial.";
    mensagem.classList.add("erro");
    return;
  }

  const temPeriodo = !!(dataInicial || ano);
  let acao = "obterHistoricoPeriodo";
  let filtro = {};
  if (placa) filtro.placa = placa;
  if (idCliente) filtro.id_cliente = idCliente;
  if (dataInicial) {
    filtro.data_inicial = dataInicial;
    filtro.data_final = dataFinal || "";
  } else if (ano) {
    filtro.ano = ano;
  }

  let tipo = "periodo";
  if (!temPeriodo && placa && !idCliente) { acao = "obterHistoricoVeiculo"; tipo = "veiculo"; }
  if (!temPeriodo && idCliente && !placa) { acao = "obterHistoricoCliente"; tipo = "cliente"; }

  this.disabled = true;
  mensagem.textContent = "Buscando...";
  try {
    const resposta = await chamarApi(Object.assign({ acao: acao }, filtro));
    mensagem.textContent = "";
    if (!resposta.sucesso) {
      mensagem.textContent = resposta.mensagem || "Não foi possível buscar agora.";
      mensagem.classList.add("erro");
      document.getElementById("secao-resultado-historico").classList.add("oculto");
      return;
    }
    ultimoFiltroHistorico = Object.assign({ tipo: tipo }, filtro);
    if (tipo === "veiculo") renderizarResultadoVeiculo(resposta);
    else if (tipo === "cliente") renderizarResultadoCliente(resposta);
    else renderizarResultadoPeriodo(resposta);
  } catch (erro) {
    mensagem.textContent = "Não foi possível buscar agora.";
    mensagem.classList.add("erro");
  } finally {
    this.disabled = false;
  }
});



function renderizarResultadoPeriodo(resposta) {
  document.getElementById("titulo-resultado-historico").textContent = "Check Lists — " + (resposta.titulo || resposta.periodo);
  document.getElementById("resumo-resultado-historico").textContent =
    resposta.total_atendimentos + " atendimento(s) · " + resposta.total_clientes + " cliente(s) · " +
    resposta.total_veiculos + " veículo(s)";

  document.getElementById("faixa-status-resultado").innerHTML = faixaStatus(resposta.contagem_status);

  const container = document.getElementById("lista-resultado-historico");
  if (!resposta.atendimentos || resposta.atendimentos.length === 0) {
    container.innerHTML = '<p class="aviso">Nenhum Check List com esses filtros.</p>';
  } else {
    let html = '<table class="tabela-atendimentos-historico"><thead><tr>' +
      "<th>Data</th><th>Cliente</th><th>Veículo</th><th>Status</th><th>Solicitação do cliente</th><th>O que foi feito</th><th>Valor</th>" +
      "</tr></thead><tbody>";
    resposta.atendimentos.forEach(function (a) {
      html += "<tr><td>" + escaparHtmlTela(a.data) + "</td>" +
        '<td class="coluna-cliente-historico">' + escaparHtmlTela(a.cliente_nome) + "</td>" +
        "<td>" + escaparHtmlTela(a.placa) + (a.veiculo ? "<br>" + escaparHtmlTela(a.veiculo) : "") + "</td>" +
        "<td>" + escaparHtmlTela(a.status) + "</td>" +
        "<td>" + escaparHtmlTela(a.solicitacoes_cliente || "—") + "</td>" +
        "<td>" + escaparHtmlTela(a.servicos_realizados || "—") + "</td>" +
        "<td>" + escaparHtmlTela(a.valor_formatado || "—") + "</td></tr>";
    });
    html += "</tbody></table>";
    container.innerHTML = html;
  }

  document.getElementById("valor-total-resultado").textContent = "Valor total: " + resposta.valor_total_formatado;

  document.getElementById("secao-resultado-historico").classList.remove("oculto");
  const mensagemPdf = document.getElementById("mensagem-pdf-resultado");
  mensagemPdf.textContent = "";
  mensagemPdf.className = "mensagem-inline";
}

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
