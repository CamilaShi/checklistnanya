const usuario = exigirLogin();

const PERFIS_DASHBOARD = ["Admin", "Coordenador"];

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;

  if (PERFIS_DASHBOARD.indexOf(usuario.perfil) === -1) {
    // Quem não tem acesso volta pro início; o backend também recusa.
    window.location.href = "home.html";
  } else {
    iniciarDashboard();
  }
}

function itemEmConstrucao(evento) {
  evento.preventDefault();
  alert("Essa tela ainda vai ser construída nas próximas etapas do projeto.");
}

const ROTULO_STATUS = {
  "Aberto": "Aberto",
  "Aguardando Aprovacao": "Aguardando Aprovação",
  "Aprovado": "Aprovado",
  "Em Execucao": "Em Execução",
  "Finalizado": "Finalizado",
};
const COR_STATUS = {
  "Aberto": "#FC843A",
  "Aguardando Aprovacao": "#A62679",
  "Aprovado": "#7FA2D6",
  "Em Execucao": "#0A99A2",
  "Finalizado": "#013D8F",
};
const CORES_ROSCA = ["#013D8F", "#0A99A2", "#FC843A", "#A62679", "#8B98AC"];

function esc(texto) {
  return String(texto === undefined || texto === null ? "" : texto)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function moeda(numero) {
  return Number(numero || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function moedaCentavos(numero) {
  return Number(numero || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function numero(n, casas) {
  return Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 });
}
function milhares(n) {
  n = Number(n || 0);
  return n >= 1000 ? numero(n / 1000, n >= 10000 ? 0 : 1) + "k" : numero(n);
}

// ---------- datas / atalhos ----------

function paraIso(data) {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return data.getFullYear() + "-" + mes + "-" + dia;
}

function aplicarAtalho(nome) {
  const hoje = new Date();
  let ini = hoje;
  let fim = hoje;
  if (nome === "mes") {
    ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  } else if (nome === "mes-passado") {
    ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  } else if (nome === "ano") {
    ini = new Date(hoje.getFullYear(), 0, 1);
  } else if (nome === "ano-passado") {
    ini = new Date(hoje.getFullYear() - 1, 0, 1);
    fim = new Date(hoje.getFullYear() - 1, 11, 31);
  }
  document.getElementById("dash-data-inicial").value = paraIso(ini);
  document.getElementById("dash-data-final").value = paraIso(fim);
  marcarAtalho(nome);
}

function marcarAtalho(nome) {
  document.querySelectorAll(".dash-atalho").forEach(function (b) {
    b.classList.toggle("ativo", b.dataset.atalho === nome);
  });
}

// ---------- dropdowns ----------

function preencherSelect(id, itens, valorDe, textoDe) {
  const select = document.getElementById(id);
  const escolhido = select.value;
  while (select.options.length > 1) select.remove(1);
  itens.forEach(function (item) {
    const opcao = document.createElement("option");
    opcao.value = valorDe(item);
    opcao.textContent = textoDe(item);
    select.appendChild(opcao);
  });
  select.value = escolhido;
}

async function carregarDropdowns() {
  try {
    await chamarApiRapido({ acao: "listarClientes" }, function (clientes) {
      if (clientes.sucesso) preencherSelect("dash-cliente", clientes.clientes, function (c) { return c.id; }, function (c) { return c.nome; });
    });
  } catch (erro) { /* filtro de cliente fica só com "Todos" */ }
  try {
    await chamarApiRapido({ acao: "listarPlacas" }, function (placas) {
      if (placas.sucesso) {
        preencherSelect("dash-placa", placas.veiculos, function (v) { return v.placa; }, function (v) {
          const nome = [v.marca, v.modelo].filter(Boolean).join(" ");
          return v.placa + (nome ? " — " + nome : "");
        });
      }
    });
  } catch (erro) { /* filtro de placa fica só com "Todas" */ }
}

// Marcas e atendentes vêm junto da primeira resposta do dashboard.
let opcoesCarregadas = false;
function carregarOpcoes(opcoes) {
  if (opcoesCarregadas || !opcoes) return;
  opcoesCarregadas = true;
  preencherSelect("dash-marca", opcoes.marcas || [], function (m) { return m; }, function (m) { return m; });
  preencherSelect("dash-atendente", opcoes.atendentes || [], function (a) { return a.id; }, function (a) { return a.nome; });
}

// ---------- buscar ----------

function iniciarDashboard() {
  document.querySelectorAll(".dash-atalho").forEach(function (botao) {
    botao.addEventListener("click", function () {
      aplicarAtalho(botao.dataset.atalho);
      buscarDashboard();
    });
  });
  document.getElementById("dash-buscar").addEventListener("click", function () {
    marcarAtalho("");
    buscarDashboard();
  });
  document.getElementById("dash-limpar").addEventListener("click", function () {
    ["dash-status", "dash-atendente", "dash-cliente", "dash-placa", "dash-marca"].forEach(function (id) {
      document.getElementById(id).value = "";
    });
    aplicarAtalho("ano");
    buscarDashboard();
  });

  carregarDropdowns();
  aplicarAtalho("ano");
  buscarDashboard();
}

async function buscarDashboard() {
  const mensagem = document.getElementById("dash-mensagem");
  const dataInicial = document.getElementById("dash-data-inicial").value;
  const dataFinal = document.getElementById("dash-data-final").value;
  mensagem.className = "mensagem-inline";
  if (dataFinal && !dataInicial) {
    mensagem.textContent = "Escolha também a data inicial.";
    mensagem.className = "mensagem-inline erro";
    return;
  }
  if (dataInicial && dataFinal && dataFinal < dataInicial) {
    mensagem.textContent = "A data final não pode ser antes da inicial.";
    mensagem.className = "mensagem-inline erro";
    return;
  }

  mensagem.textContent = "Carregando indicadores...";
  const botao = document.getElementById("dash-buscar");
  botao.disabled = true;

  try {
    await chamarApiRapido({
      acao: "obterDashboard",
      data_inicial: dataInicial,
      data_final: dataFinal,
      status: document.getElementById("dash-status").value,
      id_atendente: document.getElementById("dash-atendente").value,
      id_cliente: document.getElementById("dash-cliente").value,
      placa: document.getElementById("dash-placa").value,
      marca: document.getElementById("dash-marca").value,
    }, function (resposta, doCache) {
      if (!resposta.sucesso) {
        mensagem.textContent = resposta.mensagem || "Não foi possível carregar o Dashboard.";
        mensagem.className = "mensagem-inline erro";
        return;
      }
      mensagem.textContent = doCache ? "Atualizando em segundo plano..." : "";
      mensagem.className = "mensagem-inline";
      carregarOpcoes(resposta.opcoes);
      desenharDashboard(resposta);
    });
    if (mensagem.textContent === "Atualizando em segundo plano...") mensagem.textContent = "";
  } catch (erro) {
    mensagem.textContent = "Erro ao carregar o Dashboard. Tente de novo.";
    mensagem.className = "mensagem-inline erro";
  } finally {
    botao.disabled = false;
  }
}

// ---------- desenho ----------

function delta(valor, sufixo, invertido) {
  if (valor === null || valor === undefined) return '<span class="dash-delta">sem comparação</span>';
  if (valor === 0) return '<span class="dash-delta">igual ao ano anterior</span>';
  const subiu = valor > 0;
  const bom = invertido ? !subiu : subiu;
  return '<span class="dash-delta"><b class="' + (bom ? "bom" : "ruim") + '">' + (subiu ? "▲ " : "▼ ") +
    numero(Math.abs(valor), sufixo === " dia" ? 1 : 0) + (sufixo === " pts" ? " pts" : sufixo === " dia" ? " dia" : "%") +
    "</b> vs ano anterior</span>";
}

function kpi(classe, rotulo, valor, rodape) {
  return '<div class="dash-kpi ' + classe + '"><div class="dash-kpi-rotulo">' + rotulo + '</div><div class="dash-kpi-valor">' +
    valor + '</div><div>' + rodape + "</div></div>";
}

function cartao(titulo, sub, corpo, classe) {
  return '<article class="dash-cartao ' + (classe || "") + '"><h2>' + titulo + '</h2><div class="dash-sub">' + sub + "</div>" + corpo + "</article>";
}

function linhaBarra(nome, qtd, maximo, cor, texto) {
  const largura = maximo > 0 ? Math.max(2, Math.round((qtd / maximo) * 100)) : 0;
  return '<div class="dash-linha-barra"><span class="dash-nome">' + nome + '</span><span class="dash-trilho"><span style="width:' +
    largura + "%;background:" + cor + '"></span></span><span class="dash-num">' + texto + "</span></div>";
}

function vazio() {
  return '<div class="dash-vazio">Sem dados no período.</div>';
}

function graficoMeses(meses, fimTexto) {
  if (!meses.length) return vazio();
  const maxValor = Math.max.apply(null, meses.map(function (m) { return m.valor; })) || 1;
  const largura = 700, base = 200, topo = 24, area = base - topo - 18;
  const faixa = 640 / meses.length;
  const larguraBarra = Math.min(36, faixa * 0.62);
  const hoje = new Date();
  const partes = (fimTexto || "").split("/");
  const parcial = partes.length === 3 && Number(partes[1]) === hoje.getMonth() + 1 && Number(partes[2]) === hoje.getFullYear();
  let svg = '<svg viewBox="0 0 ' + largura + ' 250" width="100%" role="img" aria-label="Faturamento por mês">';
  [0, 0.5, 1].forEach(function (f) {
    const y = base - f * area;
    svg += '<line x1="40" y1="' + y + '" x2="680" y2="' + y + '" stroke="' + (f === 0 ? "#C9D0DC" : "#E9ECF1") + '"/>';
    svg += '<text x="34" y="' + (y + 4) + '" text-anchor="end" font-size="10" fill="#6B7280">' + (f === 0 ? "0" : milhares(maxValor * f)) + "</text>";
  });
  meses.forEach(function (m, i) {
    const altura = (m.valor / maxValor) * area;
    const x = 40 + i * faixa + (faixa - larguraBarra) / 2;
    const centro = x + larguraBarra / 2;
    const ultima = i === meses.length - 1 && parcial;
    svg += '<rect x="' + x.toFixed(1) + '" y="' + (base - altura).toFixed(1) + '" width="' + larguraBarra.toFixed(1) + '" height="' + altura.toFixed(1) +
      '" rx="4" fill="' + (ultima ? "#013D8F" : "#7FA2D6") + '"/>';
    svg += '<text x="' + centro.toFixed(1) + '" y="' + (base - altura - 6).toFixed(1) + '" text-anchor="middle" font-size="11" fill="#1B1F26">' + milhares(m.valor) + "</text>";
    svg += '<text x="' + centro.toFixed(1) + '" y="218" text-anchor="middle" font-size="11" fill="#6B7280">' + esc(m.rotulo) + "</text>";
    svg += '<text x="' + centro.toFixed(1) + '" y="238" text-anchor="middle" font-size="10" fill="#6B7280">' + m.qtd + " CL</text>";
  });
  return svg + "</svg>";
}

function rosca(fatias, totalTexto, rotuloTotal) {
  const C = 2 * Math.PI * 60;
  const total = fatias.reduce(function (a, f) { return a + f.qtd; }, 0);
  if (!total) return vazio();
  let deslocamento = 0;
  let circulos = "";
  fatias.forEach(function (f) {
    const parte = (f.qtd / total) * C;
    circulos += '<circle cx="70" cy="70" r="60" stroke="' + f.cor + '" stroke-dasharray="' + parte.toFixed(1) + " " + (C - parte).toFixed(1) +
      '" stroke-dashoffset="-' + deslocamento.toFixed(1) + '"/>';
    deslocamento += parte;
  });
  const legenda = fatias.map(function (f) {
    return '<div><i style="background:' + f.cor + '"></i>' + esc(f.nome) + " · <b>" + numero(f.qtd) + "</b> · " + f.pct + "%</div>";
  }).join("");
  return '<div class="dash-rosca"><svg viewBox="0 0 140 140" width="140" height="140"><g transform="rotate(-90 70 70)" fill="none" stroke-width="22">' +
    circulos + '</g><text x="70" y="68" text-anchor="middle" font-size="20" font-weight="700" fill="#013D8F">' + esc(totalTexto) +
    '</text><text x="70" y="84" text-anchor="middle" font-size="10" fill="#6B7280">' + esc(rotuloTotal) + '</text></svg><div class="dash-legenda">' + legenda + "</div></div>";
}

function listaModeloAno(itens, inicio, maximo) {
  return itens.map(function (m, i) {
    const largura = maximo > 0 ? Math.max(4, Math.round((m.qtd / maximo) * 100)) : 0;
    return '<div class="dash-rank"><span class="dash-pos">' + (inicio + i) + '</span><span class="dash-rank-nome"><b>' + esc(m.modelo + " " + m.ano) +
      '</b> <span class="dash-sec">· ' + esc(m.marca) + '</span></span><span class="dash-trilho-mini"><span style="width:' + largura +
      '%"></span></span><span class="dash-rank-num">' + m.qtd + " · " + m.pct + "%</span></div>";
  }).join("");
}

function desenharDashboard(r) {
  const k = r.kpis;

  document.getElementById("dash-kpis").innerHTML =
    kpi("", "Faturamento", moeda(k.faturamento), delta(k.faturamento_var)) +
    kpi("c2", "Check Lists realizados", numero(k.os), delta(k.os_var)) +
    kpi("c3", "Ticket médio", moeda(k.ticket), delta(k.ticket_var)) +
    kpi("c4", "Clientes atendidos", numero(k.clientes), numero(k.veiculos) + " veículos") +
    kpi("c5", "Clientes que voltaram", k.pct_voltaram + "%", delta(k.pct_voltaram_var, " pts")) +
    kpi("c6", "Tempo médio abertura → finalização", k.tempo_medio_dias ? numero(k.tempo_medio_dias, 1) + " dias" : "—", delta(k.tempo_medio_var, " dia", true));

  const cartoes = [];

  cartoes.push(cartao("Faturamento por mês",
    "Valor lançado no verso dos Check Lists · quantidade de Check Lists (CL) embaixo de cada mês",
    graficoMeses(r.meses, r.periodo.fim), "dobro"));

  const maxStatus = Math.max.apply(null, [0].concat(r.status.map(function (s) { return s.qtd; })));
  cartoes.push(cartao("Check Lists por status", "Onde estão os " + numero(k.os) + " Check Lists do período",
    r.status.length ? r.status.map(function (s) {
      return linhaBarra(esc(ROTULO_STATUS[s.status] || s.status), s.qtd, maxStatus, COR_STATUS[s.status] || "#8B98AC", numero(s.qtd));
    }).join("") : vazio()));

  const maxServ = Math.max.apply(null, [0].concat(r.servicos.map(function (s) { return s.valor; })));
  cartoes.push(cartao("Serviços e produtos que mais faturam", "Soma do valor lançado no verso do Check List",
    r.servicos.length ? r.servicos.map(function (s) {
      return linhaBarra(esc(s.nome), s.valor, maxServ, "#013D8F", moeda(s.valor));
    }).join("") : vazio()));

  cartoes.push(cartao("Maiores clientes", "Por valor no período",
    r.clientes_top.length ? r.clientes_top.map(function (c, i) {
      return '<div class="dash-rank"><span class="dash-pos">' + (i + 1) + '</span><span class="dash-rank-nome">' + esc(c.nome) +
        '<br><span class="dash-sec">' + c.os + " Check List" + (c.os === 1 ? "" : "s") + " · " + c.veiculos + " veículo" + (c.veiculos === 1 ? "" : "s") +
        '</span></span><span class="dash-rank-num">' + moeda(c.valor) + "</span></div>";
    }).join("") : vazio()));

  cartoes.push(cartao("Marcas mais atendidas", "Quantidade e % dos veículos atendidos no período",
    rosca(r.marcas.map(function (m, i) { return { nome: m.nome, qtd: m.qtd, pct: m.pct, cor: CORES_ROSCA[i % CORES_ROSCA.length] }; }),
      numero(k.veiculos), "veículos")));

  const maxModelo = Math.max.apply(null, [0].concat(r.modelos.map(function (m) { return m.qtd; })));
  cartoes.push(cartao("Modelos mais atendidos",
    "Top " + r.modelos.length + " modelos · quantidade de veículos e % do total (" + numero(k.veiculos) + ")" +
      (r.modelos_outros_qtd ? ". Os demais modelos somam " + numero(r.modelos_outros_qtd) + " veículos." : ""),
    r.modelos.length ? r.modelos.map(function (m) {
      return linhaBarra(esc(m.modelo) + ' <span class="dash-sec">· ' + esc(m.marca) + "</span>", m.qtd, maxModelo, "#013D8F", m.qtd + " · " + m.pct + "%");
    }).join("") : vazio(), "dobro"));

  const metade = Math.ceil(r.modelo_ano.length / 2);
  const maxMA = r.modelo_ano.length ? r.modelo_ano[0].qtd : 0;
  cartoes.push(cartao("Top 20 modelo + ano de fabricação",
    "Combinações mais atendidas (ex.: Gol 2014), com quantidade de veículos e % do total" +
      (r.modelo_ano.length ? ". Juntas somam " + numero(r.modelo_ano_qtd) + " veículos (" + (k.veiculos ? Math.round((r.modelo_ano_qtd / k.veiculos) * 100) : 0) + "%)." : ""),
    r.modelo_ano.length
      ? '<div class="dash-duas-colunas"><div>' + listaModeloAno(r.modelo_ano.slice(0, metade), 1, maxMA) + "</div><div>" +
        listaModeloAno(r.modelo_ano.slice(metade), metade + 1, maxMA) + "</div></div>"
      : vazio(), "inteiro"));

  cartoes.push(cartao("Clientes novos x que voltaram", "Quem já tinha Check List antes do período conta como \"voltou\"",
    rosca([
      { nome: "Novos", qtd: k.novos, pct: k.clientes ? Math.round((k.novos / k.clientes) * 100) : 0, cor: "#FC843A" },
      { nome: "Voltaram", qtd: k.voltaram, pct: k.clientes ? Math.round((k.voltaram / k.clientes) * 100) : 0, cor: "#013D8F" },
    ], numero(k.clientes), "clientes")));

  const COR_SEXO = { "Feminino": "#FC843A", "Masculino": "#013D8F", "Empresa": "#0A99A2", "Não informado": "#8B98AC" };
  const totalSexo = (r.sexo || []).reduce(function (a, g) { return a + g.clientes; }, 0);
  cartoes.push(cartao("Clientes por sexo",
    "Quantidade de clientes atendidos e % do total. Pessoa Jurídica aparece como Empresa. Dado só para análise interna.",
    totalSexo
      ? rosca(r.sexo.map(function (g) { return { nome: g.nome, qtd: g.clientes, pct: g.pct, cor: COR_SEXO[g.nome] || "#8B98AC" }; }),
          numero(totalSexo), "clientes") +
        '<div class="dash-rolagem"><table class="dash-tabela centralizada"><tr><th>Grupo</th><th>Clientes</th><th>%</th><th>Check Lists</th>' +
        '<th class="dir">Faturado</th></tr>' +
        r.sexo.map(function (g) {
          return "<tr><td><b>" + esc(g.nome) + "</b></td><td>" + numero(g.clientes) + "</td><td>" + g.pct + "%</td><td>" + numero(g.os) +
            '</td><td class="dir">' + moeda(g.valor) + "</td></tr>";
        }).join("") + "</table></div>"
      : vazio()));

  const maxDia = Math.max.apply(null, [0].concat(r.dias_semana.map(function (d) { return d.qtd; })));
  cartoes.push(cartao("Movimento por dia da semana", "Check Lists abertos no período",
    k.os ? r.dias_semana.map(function (d) { return linhaBarra(d.dia, d.qtd, maxDia, "#0A99A2", numero(d.qtd)); }).join("") : vazio()));

  const maxAt = Math.max.apply(null, [0].concat(r.atendentes.map(function (a) { return a.os; })));
  cartoes.push(cartao("Desempenho por atendente",
    "Quem abriu o Check List. Volume, faturamento e qualidade do atendimento no período filtrado.",
    r.atendentes.length
      ? '<div class="dash-rolagem"><table class="dash-tabela centralizada"><tr><th>Atendente</th><th style="width:26%">Check Lists abertos</th><th>% do total</th>' +
        '<th class="dir">Faturamento</th><th class="dir">Ticket médio</th><th class="dir">Finalizados</th><th class="dir">Tempo médio</th></tr>' +
        r.atendentes.map(function (a) {
          return "<tr><td><b>" + esc(a.nome) + "</b></td><td>" + linhaBarra("", a.os, maxAt, "#013D8F", numero(a.os)).replace('<span class="dash-nome"></span>', "") +
            "</td><td>" + a.pct + '%</td><td class="dir">' + moeda(a.valor) + '</td><td class="dir">' + moeda(a.ticket) + '</td><td class="dir">' +
            a.pct_finalizados + '%</td><td class="dir">' + (a.tempo_medio ? numero(a.tempo_medio, 1) + " dias" : "—") + "</td></tr>";
        }).join("") +
        '<tr class="total"><td>Total</td><td>' + numero(k.os) + "</td><td>100%</td><td class=\"dir\">" + moeda(k.faturamento) + '</td><td class="dir">' +
        moeda(k.ticket) + '</td><td class="dir"></td><td class="dir">' + (k.tempo_medio_dias ? numero(k.tempo_medio_dias, 1) + " dias" : "—") + "</td></tr></table></div>"
      : vazio(), "inteiro"));

  cartoes.push(cartao("Atenção: Check Lists parados",
    "Ainda não finalizados, do mais antigo para o mais recente (não depende do período)." +
      (r.parados_total > r.parados.length ? " Mostrando " + r.parados.length + " de " + r.parados_total + "." : ""),
    r.parados.length
      ? '<div class="dash-rolagem"><table class="dash-tabela"><tr><th>Data</th><th>Cliente</th><th>Veículo</th><th>Status</th><th>Parado há</th><th class="dir">Valor</th></tr>' +
        r.parados.map(function (p) {
          return "<tr><td>" + esc(p.data) + "</td><td>" + esc(p.cliente) + (p.cliente_doc ? '<br><span class="dash-sec">' + esc(p.cliente_doc) + "</span>" : "") + "</td><td>" + esc(p.veiculo) + (p.veiculo_desc ? '<br><span class="dash-sec">' + esc(p.veiculo_desc) + "</span>" : "") + '</td><td><span class="dash-selo" style="color:' +
            (COR_STATUS[p.status] || "#1B1F26") + '">' + esc(ROTULO_STATUS[p.status] || p.status) + "</span></td><td><b>" + p.dias +
            " dia" + (p.dias === 1 ? "" : "s") + '</b></td><td class="dir">' + moedaCentavos(p.valor) + "</td></tr>";
        }).join("") + "</table></div>"
      : '<div class="dash-vazio">Nenhum Check List parado.</div>', "dobro"));

  document.getElementById("dash-grade").innerHTML = cartoes.join("");
  document.getElementById("dash-nota").textContent =
    "Período: " + r.periodo.inicio + " a " + r.periodo.fim + ". Comparações são com o mesmo período do ano anterior. Os filtros valem para todos os indicadores e gráficos.";
  document.getElementById("dash-conteudo").classList.remove("oculto");
}
