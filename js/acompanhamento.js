const usuario = exigirLogin();

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;
  if (usuario.perfil !== "Admin" && usuario.perfil !== "Coordenador") {
    const itemConfig = document.getElementById("menu-configuracoes");
    if (itemConfig) itemConfig.style.display = "none";
  }
  configurarQuadro();
}

// ---------------------------------------------------------------
// Quadro (cards por status)
// ---------------------------------------------------------------

const COLUNAS_QUADRO = [
  { valor: "Aberto", rotulo: "Aberto" },
  { valor: "Aguardando Aprovacao", rotulo: "Aguardando Aprovação" },
  { valor: "Aprovado", rotulo: "Aprovado" },
  { valor: "Em Execucao", rotulo: "Em Execução" },
  { valor: "Finalizado", rotulo: "Finalizado" },
];

function dataDeHoje() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return ano + "-" + mes + "-" + dia; // formato do <input type="date">
}

// A data da OS vem salva como "dd/mm/aaaa" — compara com o valor
// "aaaa-mm-dd" do seletor de data.
function dataBateComSeletor(dataOS, valorSeletor) {
  const partes = String(dataOS || "").split("/");
  if (partes.length !== 3) return false;
  const dataOSFormatoISO = partes[2] + "-" + partes[1] + "-" + partes[0];
  return dataOSFormatoISO === valorSeletor;
}

function configurarQuadro() {
  const seletor = document.getElementById("seletor-data-quadro");
  seletor.value = dataDeHoje();
  seletor.addEventListener("change", carregarQuadro);
  carregarQuadro();
}

async function carregarQuadro() {
  const container = document.getElementById("quadro-checklist");
  try {
    const resposta = await chamarApi({ acao: "listarOSAtivas" });
    if (!resposta.sucesso) {
      container.innerHTML = '<p class="aviso">Não foi possível carregar o quadro agora.</p>';
      return;
    }

    const dataSelecionada = document.getElementById("seletor-data-quadro").value;

    const osFiltradas = resposta.os.filter(function (os) {
      if (os.status === "Finalizado") {
        return dataBateComSeletor(os.data, dataSelecionada);
      }
      return true; // os em aberto/andamento aparecem sempre
    });

    renderizarQuadro(osFiltradas);
  } catch (erro) {
    container.innerHTML = '<p class="aviso">Não foi possível carregar o quadro agora.</p>';
  }
}

// Junta data ("dd/mm/aaaa") e hora ("HH:mm") da OS num texto
// "aaaa-mm-dd HH:mm" — assim dá pra comparar como texto e a ordem
// bate certinho com a ordem cronológica real.
function chaveDataHoraOS(os) {
  const partes = String(os.data || "").split("/");
  const dataISO = partes.length === 3 ? partes[2] + "-" + partes[1] + "-" + partes[0] : "0000-00-00";
  return dataISO + " " + (os.hora || "00:00");
}

function renderizarQuadro(listaOS) {
  const container = document.getElementById("quadro-checklist");
  container.innerHTML = "";

  COLUNAS_QUADRO.forEach(function (coluna) {
    const itensDaColuna = listaOS
      .filter(function (os) { return os.status === coluna.valor; })
      // Horário mais recente primeiro.
      .sort(function (a, b) { return chaveDataHoraOS(b).localeCompare(chaveDataHoraOS(a)); });

    const divColuna = document.createElement("div");
    divColuna.className = "coluna-kanban";
    divColuna.dataset.status = coluna.valor;

    const titulo = document.createElement("div");
    titulo.className = "titulo-coluna-kanban";
    titulo.innerHTML = "<span>" + coluna.rotulo + "</span><span class=\"contagem-coluna-kanban\">" + itensDaColuna.length + "</span>";
    divColuna.appendChild(titulo);

    itensDaColuna.forEach(function (os) {
      divColuna.appendChild(criarCardKanban(os));
    });

    // Arrastar e soltar: a coluna aceita o card que está sendo arrastado.
    divColuna.addEventListener("dragover", function (evento) {
      evento.preventDefault();
      divColuna.classList.add("arrastando-sobre");
    });
    divColuna.addEventListener("dragleave", function () {
      divColuna.classList.remove("arrastando-sobre");
    });
    divColuna.addEventListener("drop", function (evento) {
      evento.preventDefault();
      divColuna.classList.remove("arrastando-sobre");
      const idOS = evento.dataTransfer.getData("text/plain");
      if (idOS) moverCardParaStatus(idOS, coluna.valor);
    });

    container.appendChild(divColuna);
  });
}

function criarCardKanban(os) {
  const card = document.createElement("div");
  card.className = "card-kanban";
  card.draggable = true;
  card.dataset.idOs = os.id_os;
  card.dataset.status = os.status || "";
  if (os.usuario_ultimo_status) {
    card.title = "Movido por último por: " + os.usuario_ultimo_status;
  }

  const nome = document.createElement("div");
  nome.className = "nome-cliente-card";
  nome.textContent = os.cliente_nome;
  card.appendChild(nome);

  const veiculo = document.createElement("div");
  veiculo.className = "veiculo-card";
  veiculo.textContent = (os.veiculo_texto || "Veículo") + " — " + os.veiculo_placa;
  card.appendChild(veiculo);

  const rodape = document.createElement("div");
  rodape.className = "rodape-card";

  const dataHoraOS = document.createElement("span");
  dataHoraOS.textContent = os.data + " " + os.hora + " · OS " + os.id_os;
  rodape.appendChild(dataHoraOS);

  const botaoMover = document.createElement("button");
  botaoMover.type = "button";
  botaoMover.className = "botao-mover-card";
  botaoMover.title = "Mover pra outro status";
  botaoMover.textContent = "⋮";
  botaoMover.addEventListener("click", function (evento) {
    evento.stopPropagation(); // não abre o card, só o menu
    abrirMenuStatus(evento, os.id_os, os.status);
  });
  rodape.appendChild(botaoMover);

  card.appendChild(rodape);

  // Clicar no corpo do card abre a visualização completa.
  card.addEventListener("click", function () {
    abrirVisualizacao(os.id_os, "secao-quadro");
  });

  // Arrastar: guarda o ID da OS sendo arrastada.
  card.addEventListener("dragstart", function (evento) {
    evento.dataTransfer.setData("text/plain", os.id_os);
  });

  return card;
}

// Menu flutuante que abre perto do botão "⋮" clicado.
let idOSDoMenuAberto = null;

function abrirMenuStatus(evento, idOS, statusAtual) {
  idOSDoMenuAberto = idOS;
  const menu = document.getElementById("menu-status");

  // Não faz sentido oferecer "mover pra Aberto" se o card já está em
  // Aberto — esconde da lista a opção que é o status atual do card.
  document.querySelectorAll("#menu-status button[data-status]").forEach(function (botao) {
    botao.classList.toggle("oculto", botao.dataset.status === statusAtual);
  });

  const botaoExcluir = document.getElementById("botao-excluir-menu-status");
  if (botaoExcluir) {
    botaoExcluir.classList.toggle("oculto", typeof podeExcluirChecklist !== "function" || !podeExcluirChecklist());
  }

  const retangulo = evento.target.getBoundingClientRect();
  menu.style.top = retangulo.bottom + 4 + "px";
  menu.style.left = Math.max(retangulo.right - 190, 8) + "px";
  menu.classList.remove("oculto");
}

document.querySelectorAll("#menu-status button[data-status]").forEach(function (botao) {
  botao.addEventListener("click", function () {
    if (idOSDoMenuAberto) moverCardParaStatus(idOSDoMenuAberto, botao.dataset.status);
    document.getElementById("menu-status").classList.add("oculto");
  });
});

const botaoExcluirMenuStatus = document.getElementById("botao-excluir-menu-status");
if (botaoExcluirMenuStatus) {
  botaoExcluirMenuStatus.addEventListener("click", function () {
    document.getElementById("menu-status").classList.add("oculto");
    if (idOSDoMenuAberto && typeof excluirChecklistComConfirmacao === "function") {
      excluirChecklistComConfirmacao(idOSDoMenuAberto);
    }
  });
}

document.addEventListener("click", function (evento) {
  const menu = document.getElementById("menu-status");
  if (!menu.classList.contains("oculto") && !menu.contains(evento.target)) {
    menu.classList.add("oculto");
  }
});

// Move o card na tela na hora, sem esperar o servidor — dá a
// sensação de instantâneo. O card fica no lugar novo, e a contagem
// de cada coluna é recalculada junto.
function moverCardVisualmente(idOS, novoStatus) {
  const card = document.querySelector('.card-kanban[data-id-os="' + idOS + '"]');
  const novaColuna = document.querySelector('.coluna-kanban[data-status="' + novoStatus + '"]');
  if (!card || !novaColuna) return;

  novaColuna.appendChild(card);
  if (usuario) card.title = "Movido por último por: " + usuario.nome;

  document.querySelectorAll(".coluna-kanban").forEach(function (coluna) {
    const contagem = coluna.querySelectorAll(".card-kanban").length;
    const spanContagem = coluna.querySelector(".contagem-coluna-kanban");
    if (spanContagem) spanContagem.textContent = contagem;
  });
}

async function moverCardParaStatus(idOS, novoStatus) {
  if (novoStatus === "Finalizado") {
    if (!window.confirm("Deseja finalizar esta OS? Depois de finalizada, o verso (peças e serviços) não poderá mais ser editado.")) {
      return; // usuário cancelou — não move o card nem muda nada
    }
  }

  moverCardVisualmente(idOS, novoStatus);
  try {
    const resposta = await chamarApi({ acao: "atualizarStatusOS", id_os: idOS, novo_status: novoStatus });
    if (!resposta.sucesso) {
      carregarQuadro(); // não salvou de verdade — desfaz recarregando do zero
      return;
    }
  } catch (erro) {
    carregarQuadro(); // sem resposta do servidor — mesma coisa, desfaz
    return;
  }

  if (novoStatus === "Finalizado") {
    await finalizarOSAoMoverCard(idOS);
  }

  if (novoStatus === "Aguardando Aprovacao") {
    gerarEMostrarLinkWhatsApp(idOS);
  }
}

// ---------------------------------------------------------------
// Mandar o orçamento pro WhatsApp do cliente — assim que o card
// entra em "Aguardando Aprovação", monta o link "wa.me" (já com o
// número do cliente e a mensagem com o link do PDF) e mostra um
// botão pra abrir o WhatsApp Web/app com um clique. O cliente
// aprova respondendo lá mesmo; depois o atendente marca "Aprovado"
// no quadro (pelo menu de status ou arrastando o card).
// ---------------------------------------------------------------

function garantirModalLinkWhatsApp() {
  if (document.getElementById("modal-link-whatsapp")) return;

  const fundo = document.createElement("div");
  fundo.id = "modal-link-whatsapp";
  fundo.className = "fundo-modal oculto";
  fundo.innerHTML =
    '<div class="caixa-modal">' +
    "<h2>Mandar orçamento pro WhatsApp</h2>" +
    '<p class="aviso">Abre o WhatsApp Web/app já com o número do cliente e a mensagem com o link do PDF — é só conferir e clicar em enviar.</p>' +
    '<div class="campo">' +
    '<input type="text" id="texto-link-whatsapp" readonly onclick="this.select()" />' +
    "</div>" +
    '<div class="mensagem-inline" id="mensagem-link-whatsapp"></div>' +
    '<div class="barra-acoes">' +
    '<button type="button" class="botao-cancelar-modal" onclick="fecharModalLinkWhatsApp()">Fechar</button>' +
    '<button type="button" class="botao-primario" onclick="abrirLinkWhatsApp()">Abrir WhatsApp</button>' +
    "</div>" +
    "</div>";

  document.body.appendChild(fundo);

  fundo.addEventListener("click", function (evento) {
    if (evento.target === fundo) fecharModalLinkWhatsApp();
  });
}

function fecharModalLinkWhatsApp() {
  const modal = document.getElementById("modal-link-whatsapp");
  if (modal) modal.classList.add("oculto");
}

function abrirLinkWhatsApp() {
  const campo = document.getElementById("texto-link-whatsapp");
  if (campo && campo.value) window.open(campo.value, "_blank", "noopener");
}

async function gerarEMostrarLinkWhatsApp(idOS) {
  try {
    const resposta = await chamarApi({ acao: "gerarLinkWhatsApp", id_os: idOS });
    if (!resposta.sucesso) {
      if (resposta.mensagem) alert(resposta.mensagem);
      return;
    }

    garantirModalLinkWhatsApp();
    document.getElementById("texto-link-whatsapp").value = resposta.link;
    const mensagem = document.getElementById("mensagem-link-whatsapp");
    mensagem.textContent = "";
    mensagem.className = "mensagem-inline";
    document.getElementById("modal-link-whatsapp").classList.remove("oculto");
  } catch (erro) {
    // Sem link agora — dá pra mandar depois pela tela de visualização.
  }
}

// Ao mover o card para "Finalizado", finaliza o verso da mesma forma
// que o botão "Finalizar" da tela de verso: busca o que já está
// salvo (itens/inspeção/técnico/data), envia pra finalizarVersoOS
// (o que bloqueia a edição) e regenera o PDF já com a página do
// verso. Se não tiver nada lançado no verso ainda, segue o mesmo
// caminho — finaliza vazio, igual finalizaria pela tela.
async function finalizarOSAoMoverCard(idOS) {
  try {
    const versoAtual = await chamarApi({ acao: "obterVersoOS", id_os: idOS });
    if (!versoAtual || !versoAtual.sucesso) return;

    if (versoAtual.status === "Finalizado") return; // já estava finalizado, nada a fazer

    const respostaFinalizar = await chamarApi({
      acao: "finalizarVersoOS",
      id_os: idOS,
      itens: versoAtual.itens || [],
      inspecao: versoAtual.inspecao || "",
      tecnico_responsavel: versoAtual.tecnico_responsavel || "",
      data_inspecao: versoAtual.data_inspecao || "",
    });

    if (respostaFinalizar && respostaFinalizar.sucesso && typeof regenerarPdfComVerso === "function") {
      await regenerarPdfComVerso(idOS);
    }
  } catch (erro) {
    // Não bloqueia a movimentação do card por causa disso — o card já
    // foi movido e o status da OS já foi salvo; só a finalização do
    // verso/PDF não rolou agora.
  }
}

document.getElementById("botao-voltar-lista").addEventListener("click", function () {
  document.getElementById("secao-visualizacao").classList.add("oculto");
  document.getElementById("secao-quadro").classList.remove("oculto");
});
