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

// Recarrega só a galeria "Fotos do veículo" (sem tocar em mais nada
// da tela) — chamada pelo execucao-midia.js depois de mandar fotos ou
// vídeos novos, pra eles já aparecerem ali junto, sem precisar de um
// reload completo (que resetaria a mensagem de sucesso da seção de
// Execução logo depois dela aparecer).
async function recarregarFotosVisualizacao(idOS) {
  try {
    const resposta = await chamarApi({ acao: "obterChecklistCompleto", id_os: idOS });
    if (resposta.sucesso) renderizarFotosVisualizacao(resposta.fotos);
  } catch (erro) {
    // Sem problema — as miniaturas já mandadas continuam aparecendo
    // na seção de Execução mesmo que essa atualização falhe.
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

  renderizarFotosVisualizacao(dados.fotos);
  prepararBotoesPdf(dados.pdf_id, dados.os.id_os);
  // Sempre fecha o verso ao abrir outro Check List, pra não deixar a
  // tabela de uma OS anterior visível por engano.
  const secaoVerso = document.getElementById("secao-verso-checklist");
  if (secaoVerso) secaoVerso.classList.add("oculto");
  prepararBotaoVerso(dados.os.id_os);
  prepararBotaoExcluir(dados.os.id_os);
  if (typeof prepararSecaoExecucaoMidia === "function") {
    prepararSecaoExecucaoMidia(dados.os.id_os, os.status);
  }
}

// ---------------------------------------------------------------
// Excluir Check List — recurso restrito a um pequeno grupo de
// emails (checagem repetida no servidor, essa aqui é só pra não
// mostrar o botão pra quem não pode usar). Disponível tanto na tela
// de visualização quanto no menu "⋮" do card do Kanban
// (acompanhamento.js chama excluirChecklistComConfirmacao direto).
// ---------------------------------------------------------------

const EMAILS_PERMITIDOS_EXCLUIR_CHECKLIST = ["noborub@nanya.com.br", "camila@nanya.com.br"];

function podeExcluirChecklist() {
  const usuario = typeof usuarioLogado === "function" ? usuarioLogado() : null;
  if (!usuario || !usuario.email) return false;
  return EMAILS_PERMITIDOS_EXCLUIR_CHECKLIST.indexOf(String(usuario.email).trim().toLowerCase()) !== -1;
}

function prepararBotaoExcluir(idOS) {
  const botao = document.getElementById("botao-excluir-checklist");
  if (!botao) return;

  if (!podeExcluirChecklist()) {
    botao.classList.add("oculto");
    botao.onclick = null;
    return;
  }

  botao.classList.remove("oculto");
  botao.onclick = function () {
    excluirChecklistComConfirmacao(idOS);
  };
}

// Confirma, chama o servidor e limpa a tela/lista depois de excluir.
// Usada tanto pelo botão da tela de visualização quanto pelo menu do
// card do Kanban.
async function excluirChecklistComConfirmacao(idOS) {
  if (!window.confirm("Excluir definitivamente o Check List da OS " + idOS + "? Essa ação apaga o checklist, o verso, as fotos e o PDF, e não pode ser desfeita.")) {
    return;
  }

  try {
    const resposta = await chamarApi({ acao: "excluirChecklist", id_os: idOS });
    if (!resposta.sucesso) {
      window.alert(resposta.mensagem || "Não foi possível excluir esse Check List.");
      return;
    }

    // Tira o card da tela (Kanban e/ou lista de resultado da busca),
    // se algum dos dois estiver com ele visível no momento.
    document.querySelectorAll('[data-id-os="' + idOS + '"]').forEach(function (elemento) {
      elemento.remove();
    });

    // Se a tela de visualização dessa OS estiver aberta, volta pra lista.
    const botaoVoltar = document.getElementById("botao-voltar-lista");
    if (botaoVoltar && !document.getElementById("secao-visualizacao").classList.contains("oculto")) {
      botaoVoltar.click();
    }

    if (typeof carregarQuadro === "function") carregarQuadro();
  } catch (erro) {
    window.alert("Não foi possível excluir agora.");
  }
}

// Botões "Abrir PDF" e "Salvar PDF" — só aparecem quando esse Check
// List já tem o PDF automático gerado no Drive (Check Lists salvos
// antes desse recurso existir não têm).
//   • Abrir PDF: mostra o PDF na tela (visualizador do Drive, sem
//     baixar nada).
//   • Salvar PDF: baixa o arquivo pro computador/celular de quem tá
//     usando — o PDF já está salvo no Drive automaticamente; esse
//     botão é só pra quem quiser guardar uma cópia local também, e a
//     pasta de destino é escolhida pelas configurações de download
//     do próprio navegador.
//   • Gerar PDF novamente: reemite o PDF com os dados e o layout
//     atuais (apaga o antigo do Drive e cria um novo) — chamado
//     sozinho quando o Verso é finalizado (ver verso-checklist.js),
//     sem precisar de um botão manual pra isso.
// O PDF é um arquivo só, com o Check List e o Verso juntos (o verso
// entra numa página nova, depois da última foto). Por isso os mesmos
// dois botões (Abrir/Salvar) aparecem duas vezes — uma na tela da
// frente, outra na tela do verso — sempre apontando pro mesmo arquivo.
function prepararBotoesPdf(pdfId, idOS) {
  ligarBotoesPdf(pdfId, idOS, "");
  ligarBotoesPdf(pdfId, idOS, "-verso");
}

function ligarBotoesPdf(pdfId, idOS, sufixo) {
  const botaoAbrir = document.getElementById("botao-abrir-pdf-drive" + sufixo);
  const botaoSalvar = document.getElementById("botao-salvar-pdf-drive" + sufixo);

  if (!botaoAbrir && !botaoSalvar) return;

  if (!pdfId) {
    if (botaoAbrir) { botaoAbrir.classList.add("oculto"); botaoAbrir.onclick = null; }
    if (botaoSalvar) { botaoSalvar.classList.add("oculto"); botaoSalvar.onclick = null; }
    return;
  }

  if (botaoAbrir) {
    botaoAbrir.classList.remove("oculto");
    botaoAbrir.onclick = function () {
      window.open("https://drive.google.com/file/d/" + pdfId + "/preview", "_blank", "noopener");
    };
  }

  if (botaoSalvar) {
    botaoSalvar.classList.remove("oculto");
    botaoSalvar.onclick = function () {
      const link = document.createElement("a");
      link.href = "https://drive.google.com/uc?export=download&id=" + pdfId;
      link.download = "Checklist_" + (idOS || "") + ".pdf";
      link.target = "_blank";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    };
  }
}

// Regera o PDF (Check List + Verso) sem precisar de botão manual —
// chamado sozinho pelo verso-checklist.js assim que o Verso é
// finalizado, pra garantir que o PDF salvo no Drive já saia com as
// duas páginas. "Abrir PDF" e "Salvar PDF" continuam apontando pro
// mesmo arquivo depois disso. Devolve a resposta da API pra quem
// chamou decidir se avisa o usuário ou não.
async function regenerarPdfComVerso(idOS) {
  try {
    const resposta = await chamarApi({ acao: "gerarPdfChecklist", id_os: idOS, incluir_verso: true });
    if (resposta && resposta.sucesso && resposta.pdf_id) {
      prepararBotoesPdf(resposta.pdf_id, idOS);
    }
    return resposta;
  } catch (erro) {
    return { sucesso: false, mensagem: "Não foi possível gerar o PDF agora." };
  }
}

// Mostra as fotos da OS (4 lados + extras), cada uma com a legenda
// do lado/tipo e quem enviou. Clicar abre a foto em tamanho real
// numa aba nova (o link já é o do Drive).
function renderizarFotosVisualizacao(fotos) {
  const container = document.getElementById("v-lista-fotos");
  if (!container) return;
  container.innerHTML = "";

  if (!fotos || fotos.length === 0) {
    container.innerHTML = '<p class="aviso">Nenhuma foto enviada nesse check list.</p>';
    return;
  }

  fotos.forEach(function (foto) {
    const ehVideo = foto.tipo === "Vídeo" || foto.tipo === "Video";
    const rotuloEtapa = foto.etapa === "Execucao" ? "Execução" : "";

    const bloco = document.createElement("a");
    bloco.href = foto.link;
    bloco.target = "_blank";
    bloco.rel = "noopener";
    bloco.className = "miniatura-foto miniatura-foto-visualizacao";
    bloco.title = (rotuloEtapa ? rotuloEtapa + " — " : "") + foto.tipo + (foto.usuario_nome ? " — enviada por " + foto.usuario_nome : "");

    const legenda = (rotuloEtapa ? rotuloEtapa + " · " : "") + foto.tipo + (foto.usuario_nome ? " — " + foto.usuario_nome : "");
    const midia = ehVideo
      ? '<video src="' + foto.link + '" muted></video>'
      : '<img src="' + foto.link + '" alt="' + foto.tipo + '" />';
    bloco.innerHTML = midia + '<span class="selo-status">' + legenda + "</span>";
    container.appendChild(bloco);
  });
}
