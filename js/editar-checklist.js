const usuario = exigirLogin();
const parametros = new URLSearchParams(window.location.search);
const idOS = parametros.get("os");
let osCarregada = null;

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;
  if (!idOS) {
    mostrarMensagem("OS não informada. Volte e abra o Check List pela tela Status ou Visualizar.", true);
    document.getElementById("botao-salvar").disabled = true;
  } else {
    iniciar();
  }
}

function itemEmConstrucao(evento) {
  evento.preventDefault();
  alert("Essa tela ainda vai ser construída nas próximas etapas do projeto.");
}

function mostrarMensagem(texto, erro) {
  const m = document.getElementById("mensagem-salvar");
  m.textContent = texto;
  m.className = "mensagem-inline" + (erro ? " erro" : " sucesso");
}

function adicionarLinhaSolicitacao(valor) {
  const linha = document.createElement("input");
  linha.type = "text";
  linha.className = "linha-solicitacao";
  linha.placeholder = "Ex: Cliente relatou barulho ao frear";
  linha.value = valor || "";
  document.getElementById("lista-solicitacoes").appendChild(linha);
}
document.getElementById("botao-add-solicitacao").addEventListener("click", function () { adicionarLinhaSolicitacao(""); });

// Detecta se um item é a metade Esquerda/Direita de um par (ex:
// "Farol baixo esquerdo" + "Farol baixo direito" viram um item só,
// "Farol baixo", com E e D lado a lado).
function detectarLado(nome) {
  const minusculo = nome.toLowerCase();
  const sufixos = [
    { texto: " esquerdo", lado: "E" },
    { texto: " esquerda", lado: "E" },
    { texto: " direito", lado: "D" },
    { texto: " direita", lado: "D" },
  ];
  for (const s of sufixos) {
    if (minusculo.endsWith(s.texto)) {
      return { base: nome.slice(0, nome.length - s.texto.length), lado: s.lado };
    }
  }
  return null;
}

// Agrupa a lista de campos em: pares (E+D juntos) e itens soltos.
// Agrupa a lista de campos em: pares (E+D juntos) e itens soltos —
// preservando a posição de cada um na ordem original (a coluna
// Ordem, vinda do backend). Um par entra na posição em que a
// primeira metade dele apareceu, não no final da lista.
function agruparPares(campos) {
  const indicePorBase = {}; // base -> posição em grupos
  const grupos = [];

  campos.forEach(function (campo) {
    const info = detectarLado(campo.nome);
    if (!info) {
      grupos.push({ tipo: "solto", campo: campo });
      return;
    }
    if (indicePorBase[info.base] === undefined) {
      indicePorBase[info.base] = grupos.length;
      grupos.push({ tipo: "par", base: info.base, E: null, D: null });
    }
    grupos[indicePorBase[info.base]][info.lado] = campo;
  });

  // Se algum "par" só achou um dos dois lados, vira solto — na mesma
  // posição em que estava, sem pular pro final.
  return grupos.map(function (grupo) {
    if (grupo.tipo === "par" && (!grupo.E || !grupo.D)) {
      return { tipo: "solto", campo: grupo.E || grupo.D };
    }
    return grupo;
  });
}

function criarSelectResposta(comObservacao) {
  const select = document.createElement("select");
  select.className = "resposta-item";
  const opcoes = comObservacao ? ["", "Ok", "Não Ok"] : ["", "Sim", "Não"];
  opcoes.forEach(function (opcao) {
    const el = document.createElement("option");
    el.value = opcao;
    el.textContent = opcao === "" ? "—" : opcao;
    select.appendChild(el);
  });
  select.addEventListener("change", function () {
    select.classList.remove("resposta-preenchida", "resposta-nao-ok");
    if (select.value === "Não Ok") {
      select.classList.add("resposta-nao-ok");
    } else if (select.value) {
      select.classList.add("resposta-preenchida");
    }
  });
  return select;
}

// Diz pro navegador quantas linhas cabem em cada coluna antes de
// pular pra próxima — sem isso, "grid-auto-flow: column" não sabe
// onde quebrar e põe tudo numa coluna só. Recalcula com base na
// largura da tela agora (os mesmos números dos breakpoints do CSS).
function aplicarLeituraColunar(container, quantidadeItens) {
  const largura = window.innerWidth;
  let colunas;
  if (container.classList.contains("grade-7col")) {
    colunas = largura <= 720 ? 1 : 7;
  } else {
    colunas = largura <= 720 ? 1 : largura <= 1100 ? 3 : 5;
  }
  const linhas = Math.max(Math.ceil(quantidadeItens / colunas), 1);
  container.style.gridTemplateRows = "repeat(" + linhas + ", auto)";
}

// Máscara de data: a pessoa digita só os números (ddmmaaaa) e o
// campo insere as barras sozinho, conforme ela digita.
function aplicarMascaraData(input) {
  input.addEventListener("input", function () {
    const digitos = input.value.replace(/\D/g, "").slice(0, 8);
    let formatado = digitos;
    if (digitos.length > 4) {
      formatado = digitos.slice(0, 2) + "/" + digitos.slice(2, 4) + "/" + digitos.slice(4);
    } else if (digitos.length > 2) {
      formatado = digitos.slice(0, 2) + "/" + digitos.slice(2);
    }
    input.value = formatado;
  });
}

function renderizarLista(container, campos, comObservacao) {
  container.innerHTML = "";
  container.className = comObservacao ? "lista-checklist grade-3col" : "lista-checklist grade-7col";

  if (campos.length === 0) {
    container.innerHTML = '<p class="aviso">Nenhum item nessa seção ainda.</p>';
    return;
  }

  const grupos = agruparPares(campos);

  // Dois campos especiais da etiqueta de troca de óleo — não são
  // item Ok/Não Ok, são pra digitar (Km e Data). Só fazem sentido na
  // seção Técnica, logo antes de "Nível de óleo do motor".
  if (comObservacao) {
    const indiceOleo = grupos.findIndex(function (g) {
      return g.tipo === "solto" && g.campo.nome === "Nível de óleo do motor";
    });
    const posicao = indiceOleo === -1 ? 0 : indiceOleo;
    grupos.splice(posicao, 0, { tipo: "km-etiqueta" }, { tipo: "data-etiqueta" });
  }

  grupos.forEach(function (grupo) {
    const item = document.createElement("div");
    item.className = "item-checklist-grade";

    if (grupo.tipo === "km-etiqueta") {
      const nome = document.createElement("div");
      nome.className = "nome-item-checklist";
      nome.textContent = "Km última troca de óleo";
      item.appendChild(nome);

      const input = document.createElement("input");
      input.type = "text";
      input.id = "km-ultima-troca-oleo";
      input.placeholder = "Ex: 32000";
      item.appendChild(input);

      container.appendChild(item);
      return;
    }

    if (grupo.tipo === "data-etiqueta") {
      const nome = document.createElement("div");
      nome.className = "nome-item-checklist";
      nome.textContent = "Data última troca de óleo";
      item.appendChild(nome);

      const input = document.createElement("input");
      input.type = "text";
      input.id = "data-ultima-troca-oleo";
      input.placeholder = "dd/mm/aaaa";
      input.inputMode = "numeric";
      aplicarMascaraData(input);
      item.appendChild(input);

      container.appendChild(item);
      return;
    }

    if (grupo.tipo === "par") {
      item.dataset.par = "1";

      const nome = document.createElement("div");
      nome.className = "nome-item-checklist";
      nome.textContent = grupo.base;
      item.appendChild(nome);

      const linhaLado = document.createElement("div");
      linhaLado.className = "linha-lado";

      [{ letra: "E", campo: grupo.E }, { letra: "D", campo: grupo.D }].forEach(function (lado) {
        const grupoLado = document.createElement("div");
        grupoLado.className = "grupo-lado";

        const letra = document.createElement("label");
        letra.textContent = lado.letra;
        grupoLado.appendChild(letra);

        const select = criarSelectResposta(true);
        select.dataset.idCampo = lado.campo.id;
        grupoLado.appendChild(select);

        linhaLado.appendChild(grupoLado);
      });

      item.appendChild(linhaLado);
    } else {
      const campo = grupo.campo;

      const nome = document.createElement("div");
      nome.className = "nome-item-checklist";
      nome.textContent = campo.nome;
      item.appendChild(nome);

      const select = criarSelectResposta(comObservacao);
      select.classList.add("resposta-item-solto");
      select.dataset.idCampo = campo.id;
      item.appendChild(select);
    }

    container.appendChild(item);
  });

  aplicarLeituraColunar(container, grupos.length);
}


function renderizarPorCategoria(campos) {
  const acessorios = campos.filter(function (c) { return c.categoria === "Acessório" || c.categoria === "Acessorio"; });
  const tecnicos = campos.filter(function (c) { return c.categoria === "Técnico" || c.categoria === "Tecnico"; });
  renderizarLista(document.getElementById("lista-acessorios"), acessorios, false);
  renderizarLista(document.getElementById("lista-tecnicos"), tecnicos, true);
}

function definirSelect(select, valor) {
  // Valor antigo que não está nas opções atuais: mantém, para não apagar sem querer.
  if (valor && !Array.from(select.options).some(function (o) { return o.value === valor; })) {
    const extra = document.createElement("option");
    extra.value = valor;
    extra.textContent = valor;
    select.appendChild(extra);
  }
  select.value = valor || "";
  select.dispatchEvent(new Event("change"));
}

async function iniciar() {
  try {
    const r = await chamarApi({ acao: "obterChecklistCompleto", id_os: idOS });
    if (!r.sucesso) { mostrarMensagem(r.mensagem || "Check List não encontrado.", true); return; }
    osCarregada = r;
    const os = r.os;

    const ehOficina = usuario.perfil === "Oficina";
    if (!(podeFazer("editar_parte1") || (ehOficina && os.liberada_oficina))) {
      mostrarMensagem(ehOficina
        ? "Este Check List está travado para a Oficina. Peça ao Coordenador ou Admin para liberar."
        : "Você não tem permissão para editar este Check List.", true);
      document.getElementById("botao-salvar").disabled = true;
      return;
    }

    document.getElementById("titulo-os").textContent = "OS " + os.id_os + " · " + (os.data || "") + " " + (os.hora || "");
    const c = r.cliente || {};
    const v = r.veiculo || {};
    document.getElementById("resumo-cliente").textContent =
      (c.nome || c.razao_social || "—") + (c.cpf ? " · " + c.cpf : "") + (c.cnpj ? " · " + c.cnpj : "");
    document.getElementById("resumo-veiculo").textContent =
      [v.placa, v.marca, v.modelo, v.ano_modelo].filter(Boolean).join(" · ") || "—";
    document.getElementById("km-veiculo").value = v.km || "";

    const solic = String(os.solicitacoes_cliente || "").split("\n").filter(Boolean);
    (solic.length ? solic : [""]).forEach(adicionarLinhaSolicitacao);

    document.querySelectorAll('input[name="cliente-presente"]').forEach(function (rd) { rd.checked = rd.value === os.cliente_presente; });
    document.querySelectorAll('input[name="nivel-combustivel"]').forEach(function (rd) { rd.checked = String(rd.value) === String(os.nivel_combustivel); });
    document.getElementById("observacao-acessorios").value = os.observacao_acessorios || "";
    document.getElementById("observacao-tecnicos").value = os.observacao_tecnicos || "";

    const rc = await chamarApi({ acao: "listarCamposModelo", id_modelo: os.id_modelo });
    if (rc.sucesso && rc.campos) renderizarPorCategoria(rc.campos);

    const kmOleo = document.getElementById("km-ultima-troca-oleo");
    const dtOleo = document.getElementById("data-ultima-troca-oleo");
    if (kmOleo) kmOleo.value = os.km_ultima_troca_oleo || "";
    if (dtOleo) dtOleo.value = os.data_ultima_troca_oleo || "";

    const mapa = {};
    (r.respostas || []).forEach(function (x) { mapa[x.id_campo] = x; });
    document.querySelectorAll("select.resposta-item").forEach(function (sel) {
      const x = mapa[sel.dataset.idCampo];
      if (x) definirSelect(sel, x.resposta);
    });
  } catch (erro) {
    mostrarMensagem("Não foi possível carregar o Check List agora.", true);
  }
}

document.getElementById("form-checklist").addEventListener("submit", async function (evento) {
  evento.preventDefault();
  const botao = document.getElementById("botao-salvar");
  const solicitacoes = Array.from(document.querySelectorAll(".linha-solicitacao"))
    .map(function (l) { return l.value.trim(); }).filter(Boolean).join("\n");
  if (!solicitacoes) { mostrarMensagem("Preencha antes de salvar: Solicitações do Cliente.", true); return; }

  const respostas = [];
  document.querySelectorAll("select.resposta-item").forEach(function (sel) {
    if (sel.dataset.idCampo) respostas.push({ id_campo: sel.dataset.idCampo, resposta: sel.value, observacao: "" });
  });
  const pres = document.querySelector('input[name="cliente-presente"]:checked');
  const comb = document.querySelector('input[name="nivel-combustivel"]:checked');
  const kmOleo = document.getElementById("km-ultima-troca-oleo");
  const dtOleo = document.getElementById("data-ultima-troca-oleo");

  botao.disabled = true;
  mostrarMensagem("Salvando…", false);
  try {
    const r = await chamarApi({
      acao: "atualizarChecklist",
      id_os: idOS,
      cliente_presente: pres ? pres.value : "",
      solicitacoes_cliente: solicitacoes,
      observacao_acessorios: document.getElementById("observacao-acessorios").value.trim(),
      observacao_tecnicos: document.getElementById("observacao-tecnicos").value.trim(),
      nivel_combustivel: comb ? comb.value : "",
      km_ultima_troca_oleo: kmOleo ? kmOleo.value.trim() : "",
      data_ultima_troca_oleo: dtOleo ? dtOleo.value.trim() : "",
      km_veiculo: document.getElementById("km-veiculo").value.trim(),
      respostas: respostas
    });
    if (!r.sucesso) {
      mostrarMensagem(r.mensagem || "Não foi possível salvar.", true);
      botao.disabled = false;
      return;
    }
    mostrarMensagem("Salvo. Atualizando o PDF…", false);
    let pdf = null;
    try { pdf = await chamarApi({ acao: "gerarPdfChecklist", id_os: idOS }); } catch (e) {}
    mostrarMensagem(pdf && pdf.sucesso
      ? "Check List atualizado e PDF refeito."
      : "Check List atualizado, mas o PDF não foi refeito agora (abra em Visualizar para gerar de novo).", !(pdf && pdf.sucesso));
    document.getElementById("botao-voltar-os").classList.remove("oculto");
  } catch (erro) {
    mostrarMensagem("Não foi possível salvar agora.", true);
    botao.disabled = false;
  }
});

document.getElementById("botao-voltar-os").addEventListener("click", function () {
  if (history.length > 1) history.back(); else window.location.href = "visualizar-checklist.html";
});
