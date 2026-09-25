// ---------------------------------------------------------------
// Agrupar Esquerdo/Direito, em modo só-leitura (sem select, sem
// obrigatório) — usado pela tela Acompanhamento (quadro) e pela
// tela Check List (busca), nas duas por igual.
// ---------------------------------------------------------------

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

function agruparPares(itens) {
  const indicePorBase = {};
  const grupos = [];

  itens.forEach(function (item) {
    const info = detectarLado(item.nome);
    if (!info) {
      grupos.push({ tipo: "solto", item: item });
      return;
    }
    if (indicePorBase[info.base] === undefined) {
      indicePorBase[info.base] = grupos.length;
      grupos.push({ tipo: "par", base: info.base, E: null, D: null });
    }
    grupos[indicePorBase[info.base]][info.lado] = item;
  });

  return grupos.map(function (grupo) {
    if (grupo.tipo === "par" && (!grupo.E || !grupo.D)) {
      return { tipo: "solto", item: grupo.E || grupo.D };
    }
    return grupo;
  });
}

function aplicarLeituraColunar(container, quantidadeItens, colunasDesktop) {
  const largura = window.innerWidth;
  let colunas;
  if (largura <= 720) {
    colunas = 1;
  } else if (largura <= 1100) {
    colunas = Math.min(3, colunasDesktop);
  } else {
    colunas = colunasDesktop;
  }
  const linhas = Math.max(Math.ceil(quantidadeItens / colunas), 1);
  container.style.gridTemplateColumns = "repeat(" + colunas + ", 1fr)";
  container.style.gridAutoFlow = "column";
  container.style.gridTemplateRows = "repeat(" + linhas + ", auto)";
}

// Valor mostrado (não editável) por item, com cor conforme a resposta.
function criarValorResposta(valor) {
  const span = document.createElement("span");
  span.className = "valor-resposta";
  span.textContent = valor || "—";
  if (valor === "Não Ok" || valor === "Não") span.classList.add("valor-nao-ok");
  else if (valor) span.classList.add("valor-ok");
  return span;
}

function renderizarListaVisualizacao(container, itens, colunasDesktop) {
  container.innerHTML = "";
  container.className = "lista-checklist";
  container.style.display = "grid";
  container.style.gap = "2px 10px";

  if (itens.length === 0) {
    container.innerHTML = '<p class="aviso">Nenhum item respondido nessa seção.</p>';
    return;
  }

  const grupos = agruparPares(itens);

  grupos.forEach(function (grupo) {
    const item = document.createElement("div");
    item.className = "item-checklist-grade";

    if (grupo.tipo === "par") {
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
        grupoLado.appendChild(criarValorResposta(lado.campo ? lado.campo.resposta : ""));
        linhaLado.appendChild(grupoLado);
      });

      item.appendChild(linhaLado);
    } else {
      const nome = document.createElement("div");
      nome.className = "nome-item-checklist";
      nome.textContent = grupo.item.nome;
      item.appendChild(nome);
      item.appendChild(criarValorResposta(grupo.item.resposta));
    }

    container.appendChild(item);
  });

  aplicarLeituraColunar(container, grupos.length, colunasDesktop);
}

// ---------------------------------------------------------------
// Abrir o layout completo de uma OS (usada pelas duas telas) — a
// página que chama precisa ter os elementos #secao-visualizacao e
// #mensagem-busca (ou passar outro id de mensagem).
// ---------------------------------------------------------------

async function abrirVisualizacao(idOS, idSecaoParaEsconder) {
  const mensagem = document.getElementById("mensagem-busca");
  if (mensagem) {
    mensagem.textContent = "";
    mensagem.className = "mensagem-inline";
  }

  try {
    const resposta = await chamarApi({ acao: "obterChecklistCompleto", id_os: idOS });
    if (!resposta.sucesso) {
      if (mensagem) {
        mensagem.textContent = resposta.mensagem || "Não foi possível abrir esse Check List.";
        mensagem.classList.add("erro");
      }
      return;
    }
    preencherVisualizacao(resposta);
    if (idSecaoParaEsconder) document.getElementById(idSecaoParaEsconder).classList.add("oculto");
    document.getElementById("secao-visualizacao").classList.remove("oculto");
    window.scrollTo(0, 0);
  } catch (erro) {
    if (mensagem) {
      mensagem.textContent = "Não foi possível abrir agora.";
      mensagem.classList.add("erro");
    }
  }
}

function preencherVisualizacao(dados) {
  const os = dados.os;
  const cliente = dados.cliente || {};
  const endereco = dados.endereco;
  const veiculo = dados.veiculo || {};

  document.getElementById("v-data").value = os.data || "";
  document.getElementById("v-hora").value = os.hora || "";
  document.getElementById("v-atendente").value = dados.atendente_nome || "";
  document.getElementById("v-os").value = os.id_os || "";

  document.getElementById("v-documento").value = cliente.cpf_cnpj || "";
  document.getElementById("v-nome").value = cliente.nome || "";
  document.getElementById("v-nascimento").value = cliente.data_nascimento || "";
  document.getElementById("v-telefone").value = formatarTelefone(cliente.telefone);
  document.getElementById("v-email").value = cliente.email || "";

  const partesEndereco = [];
  if (endereco) {
    if (endereco.rua) partesEndereco.push(endereco.rua + (endereco.numero ? ", " + endereco.numero : ""));
    if (endereco.bairro) partesEndereco.push(endereco.bairro);
    if (endereco.cidade) partesEndereco.push(endereco.cidade + (endereco.uf ? "/" + endereco.uf : ""));
  }
  document.getElementById("v-endereco").value = partesEndereco.join(" - ");

  document.getElementById("v-placa").value = veiculo.placa || "";
  document.getElementById("v-km").value = veiculo.km || "";
  document.getElementById("v-marca").value = veiculo.marca || "";
  document.getElementById("v-modelo").value = veiculo.modelo || "";
  document.getElementById("v-ano").value = veiculo.ano_modelo || "";
  document.getElementById("v-combustivel").value = veiculo.combustivel || "";

  const faixaNivel = document.getElementById("v-nivel-combustivel");
  faixaNivel.innerHTML = "";
  ["0", "1/4", "1/2", "3/4", "1"].forEach(function (valor) {
    const marcado = os.nivel_combustivel === valor;
    const span = document.createElement("span");
    span.className = "ponto-nivel" + (marcado ? " ponto-nivel-marcado" : "");
    span.textContent = valor;
    faixaNivel.appendChild(span);
  });

  document.getElementById("v-cliente-presente").value = os.cliente_presente === "Sim" ? "Presente" : "Ausente";
  document.getElementById("v-km-oleo").value = os.km_ultima_troca_oleo || "";
  document.getElementById("v-data-oleo").value = os.data_ultima_troca_oleo || "";

  const containerSolicitacoes = document.getElementById("v-solicitacoes");
  containerSolicitacoes.innerHTML = "";
  const linhasSolicitacoes = (os.solicitacoes_cliente || "").split("\n").filter(Boolean);
  if (linhasSolicitacoes.length === 0) {
    containerSolicitacoes.innerHTML = '<p class="aviso">Nenhuma solicitação registrada.</p>';
  } else {
    linhasSolicitacoes.forEach(function (texto) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "linha-solicitacao";
      input.readOnly = true;
      input.value = texto;
      containerSolicitacoes.appendChild(input);
    });
  }

  const acessorios = dados.respostas.filter(function (r) { return r.categoria === "Acessório" || r.categoria === "Acessorio"; });
  const tecnicos = dados.respostas.filter(function (r) { return r.categoria === "Técnico" || r.categoria === "Tecnico"; });

  renderizarListaVisualizacao(document.getElementById("v-lista-acessorios"), acessorios, 7);
  renderizarListaVisualizacao(document.getElementById("v-lista-tecnicos"), tecnicos, 5);

  document.getElementById("v-observacao-acessorios").value = os.observacao_acessorios || "";
  document.getElementById("v-observacao-tecnicos").value = os.observacao_tecnicos || "";
}
