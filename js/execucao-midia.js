// ---------------------------------------------------------------
// Fotos/Vídeos da Execução (parte 2) — depois que o Check List já
// foi salvo (e trava), a oficina ainda pode mandar mais fotos e
// vídeos enquanto o serviço está "Em Execução". Essa seção NUNCA
// edita nada do Check List em si (cliente, veículo, respostas etc.)
// — só adiciona arquivos novos na mesma pasta da OS no Drive.
// Usada nas telas Acompanhamento e Visualizar Check List (o
// preencherVisualizacao, em visualizacao-checklist.js, chama
// prepararSecaoExecucaoMidia depois de montar o resto da tela).
// ---------------------------------------------------------------

let execucaoMidiaIdOS = null;

// Tamanho máximo aceito por vídeo (antes de virar base64). Vídeo não
// passa por compressão (diferente de foto), então um arquivo grande
// demais pode travar o envio ou estourar o limite de requisição do
// Apps Script — 25MB dá folga suficiente pra um vídeo curto de
// celular e ainda evita esse problema.
const TAMANHO_MAXIMO_VIDEO_MB = 25;

// Mostra ou esconde a seção conforme o status da OS — só faz sentido
// mandar mídia de execução enquanto o serviço está "Em Execução".
function prepararSecaoExecucaoMidia(idOS, status) {
  const secao = document.getElementById("secao-execucao-midia");
  if (!secao) return;

  execucaoMidiaIdOS = idOS;

  if (status !== "Em Execucao") {
    secao.classList.add("oculto");
    return;
  }
  secao.classList.remove("oculto");

  const mensagem = document.getElementById("execucao-mensagem-midia");
  const linkPasta = document.getElementById("execucao-link-pasta");
  if (mensagem) { mensagem.textContent = ""; mensagem.className = "mensagem-inline"; }
  if (linkPasta) linkPasta.classList.add("oculto");

  const lista = document.getElementById("execucao-lista-midia");
  if (lista) lista.innerHTML = "";
}

// Mesma lógica de compressão usada no Check List (checklist.js) —
// redesenha num canvas menor (lado maior até 1600px) e reexporta como
// JPEG qualidade 0.75, pra não mandar fotos de celular gigantes.
function comprimirImagemExecucao(arquivo, ladoMaximo, qualidade) {
  return new Promise(function (resolve) {
    const leitor = new FileReader();
    leitor.onload = function () {
      const imagem = new Image();
      imagem.onload = function () {
        let largura = imagem.width;
        let altura = imagem.height;
        const maiorLado = Math.max(largura, altura);
        if (maiorLado > ladoMaximo) {
          const fator = ladoMaximo / maiorLado;
          largura = Math.round(largura * fator);
          altura = Math.round(altura * fator);
        }
        const tela = document.createElement("canvas");
        tela.width = largura;
        tela.height = altura;
        tela.getContext("2d").drawImage(imagem, 0, 0, largura, altura);
        const dataUrl = tela.toDataURL("image/jpeg", qualidade || 0.75);
        resolve({ dataUrl: dataUrl, base64: dataUrl.split(",")[1], tipoMime: "image/jpeg" });
      };
      imagem.onerror = function () {
        resolve({ dataUrl: leitor.result, base64: leitor.result.split(",")[1], tipoMime: arquivo.type || "image/jpeg" });
      };
      imagem.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

// Vídeo não é comprimido — só lê como base64 direto.
function lerArquivoComoBase64(arquivo) {
  return new Promise(function (resolve) {
    const leitor = new FileReader();
    leitor.onload = function () {
      resolve({ dataUrl: leitor.result, base64: leitor.result.split(",")[1], tipoMime: arquivo.type || "video/mp4" });
    };
    leitor.readAsDataURL(arquivo);
  });
}

function adicionarMiniaturaExecucao(dataUrl, ehVideo, nomeArquivo) {
  const lista = document.getElementById("execucao-lista-midia");
  if (!lista) return;
  const div = document.createElement("div");
  div.className = "miniatura-foto";
  div.title = nomeArquivo || "";
  div.innerHTML = ehVideo
    ? '<video src="' + dataUrl + '" muted></video>'
    : '<img src="' + dataUrl + '" alt="' + (nomeArquivo || "") + '" />';
  lista.appendChild(div);
}

document.addEventListener("DOMContentLoaded", function () {
  const input = document.getElementById("execucao-input-midia");
  if (!input) return;

  input.addEventListener("change", async function (evento) {
    const arquivos = Array.from(evento.target.files || []);
    evento.target.value = "";
    if (!arquivos.length || !execucaoMidiaIdOS) return;

    const mensagem = document.getElementById("execucao-mensagem-midia");
    const linkPasta = document.getElementById("execucao-link-pasta");
    input.disabled = true;
    if (mensagem) { mensagem.textContent = "Enviando..."; mensagem.className = "mensagem-inline"; }

    try {
      const fotosParaEnviar = [];
      const previews = [];

      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const ehVideo = arquivo.type.indexOf("video/") === 0;

        if (ehVideo && arquivo.size > TAMANHO_MAXIMO_VIDEO_MB * 1024 * 1024) {
          if (mensagem) {
            mensagem.textContent = '"' + arquivo.name + '" passa de ' + TAMANHO_MAXIMO_VIDEO_MB + "MB — grave um vídeo mais curto ou em qualidade menor.";
            mensagem.classList.add("erro");
          }
          continue;
        }

        const resultado = ehVideo
          ? await lerArquivoComoBase64(arquivo)
          : await comprimirImagemExecucao(arquivo, 1600, 0.75);

        fotosParaEnviar.push({
          dados_base64: resultado.base64,
          tipo_mime: resultado.tipoMime,
          nome_arquivo: arquivo.name,
          etapa: "Execucao",
          tipo: ehVideo ? "Vídeo" : "Foto",
        });
        previews.push({ dataUrl: resultado.dataUrl, ehVideo: ehVideo, nome: arquivo.name });
      }

      if (!fotosParaEnviar.length) {
        input.disabled = false;
        return;
      }

      const resposta = await chamarApi({
        acao: "salvarFotosOS",
        id_os: execucaoMidiaIdOS,
        fotos: fotosParaEnviar,
      });

      if (resposta.sucesso) {
        previews.forEach(function (p) { adicionarMiniaturaExecucao(p.dataUrl, p.ehVideo, p.nome); });
        if (mensagem) {
          mensagem.textContent = fotosParaEnviar.length === 1 ? "Arquivo enviado." : fotosParaEnviar.length + " arquivos enviados.";
          mensagem.className = "mensagem-inline sucesso";
        }
        const linkPastaHref = document.getElementById("execucao-link-pasta-href");
        if (linkPasta && linkPastaHref && resposta.pasta_url) {
          linkPastaHref.href = resposta.pasta_url;
          linkPasta.classList.remove("oculto");
        }
        // A galeria principal (Fotos do veículo) também escuta essa
        // mesma OS — recarrega ela pra já aparecer lá junto, com a
        // etiqueta "Execução".
        if (typeof recarregarFotosVisualizacao === "function") {
          recarregarFotosVisualizacao(execucaoMidiaIdOS);
        }
      } else {
        if (mensagem) {
          mensagem.textContent = resposta.mensagem || "Não foi possível enviar agora.";
          mensagem.classList.add("erro");
        }
      }
    } catch (erro) {
      if (mensagem) {
        mensagem.textContent = "Não foi possível enviar agora.";
        mensagem.classList.add("erro");
      }
    } finally {
      input.disabled = false;
    }
  });
});
