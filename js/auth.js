document.getElementById("form-login").addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;
  const elementoErro = document.getElementById("erro");
  const botao = document.getElementById("botao-entrar");

  elementoErro.textContent = "";

  if (!email || !senha) {
    elementoErro.textContent = "Email ou senha inválidos";
    return;
  }

  botao.disabled = true;
  botao.textContent = "Entrando...";

  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ acao: "login", email: email, senha: senha }),
    });

    const dados = await resposta.json();

    if (dados.sucesso) {
      sessionStorage.setItem("usuario", JSON.stringify(dados.usuario));
      sessionStorage.setItem("token", dados.token);
      window.location.href = "home.html";
    } else {
      elementoErro.textContent = "Email ou senha inválidos";
    }
  } catch (erro) {
    elementoErro.textContent = "Não foi possível conectar ao sistema. Verifique sua internet.";
  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
});
