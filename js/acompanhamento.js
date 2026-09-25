const usuario = exigirLogin();

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;
  if (usuario.perfil !== "Admin") {
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
  const dataOSFormatoISO = partes[2] + "-" + partes[0] + "-" + partes[1];
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

function renderizarQuadro(listaOS) {
  const container = document.getElementById("quadro-checklist");
  container.innerHTML = "";

  COLUNAS_QUADRO.forEach(function (coluna) {
    const itensDaColuna = listaOS.filter(function (os) { return os.status === coluna.valor; });

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
    abrirMenuStatus(evento, os.id_os);
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

function abrirMenuStatus(evento, idOS) {
  idOSDoMenuAberto = idOS;
  const menu = document.getElementById("menu-status");
  const retangulo = evento.target.getBoundingClientRect();
  menu.style.top = retangulo.bottom + 4 + "px";
  menu.style.left = Math.max(retangulo.right - 190, 8) + "px";
  menu.classList.remove("oculto");
}

document.querySelectorAll("#menu-status button").forEach(function (botao) {
  botao.addEventListener("click", function () {
    if (idOSDoMenuAberto) moverCardParaStatus(idOSDoMenuAberto, botao.dataset.status);
    document.getElementById("menu-status").classList.add("oculto");
  });
});

document.addEventListener("click", function (evento) {
  const menu = document.getElementById("menu-status");
  if (!menu.classList.contains("oculto") && !menu.contains(evento.target)) {
    menu.classList.add("oculto");
  }
});

async function moverCardParaStatus(idOS, novoStatus) {
  try {
    const resposta = await chamarApi({ acao: "atualizarStatusOS", id_os: idOS, novo_status: novoStatus });
    if (resposta.sucesso) {
      carregarQuadro();
    }
  } catch (erro) {
    // Se falhar, o quadro simplesmente não muda — a pessoa pode tentar de novo.
  }
}

document.getElementById("botao-voltar-lista").addEventListener("click", function () {
  document.getElementById("secao-visualizacao").classList.add("oculto");
  document.getElementById("secao-quadro").classList.remove("oculto");
});
