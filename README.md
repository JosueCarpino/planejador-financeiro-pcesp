# Planejador Financeiro PCESP

Aplicativo web **independente**, hospedado em GitHub Pages, com opção de armazenamento privado pelo Firebase Authentication + Cloud Firestore. Não utiliza código, projeto Firebase ou banco de dados do painel TAF.

**Endereço previsto após publicação:** https://josuecarpino.github.io/planejador-financeiro-pcesp/

## O que o aplicativo faz

- Compara manter os contratos, consolidar as dívidas caras ou consolidar todas as dívidas.
- Simula a Tabela Price do novo consignado, com taxa, prazo e carência editáveis.
- Projeta renda, despesas, reserva de emergência e fluxo de caixa mês a mês.
- Aceita lançamentos pontuais e recorrentes, exporta fluxo em CSV e backup JSON.
- Salva automaticamente no navegador e, depois da configuração, sincroniza os dados privados em um Firestore **exclusivo** usando a própria conta Google.

O código-fonte é público, mas o repositório **não contém dados financeiros pessoais**. Não envie backups, documentos, extratos, tokens, senhas ou chaves de administrador para o GitHub.

## 1. Publicação pelo GitHub Pages

Este repositório tem um fluxo em `.github/workflows/pages.yml` que verifica o JavaScript e publica exclusivamente `index.html`, `app.js`, `cloud.js`, `style.css` e `firebase-config.js`. O arquivo de regras e os testes não são publicados como parte do site.

Acesse **Settings → Pages → Build and deployment** e selecione **GitHub Actions**, se ainda não estiver configurado. Veja o progresso na aba **Actions**. O endereço só deve ser considerado ativo depois de uma implantação bem-sucedida.

## 2. Criar um Firebase exclusivo para as finanças

**Não reutilize o projeto Firebase `taf-acadepol`.** Use um projeto novo, por exemplo `financeiro-pcesp-web`.

1. Entre em https://console.firebase.google.com/ e crie um projeto Firebase no plano Spark (gratuito dentro das cotas).
2. Em **Project settings → Your apps**, registre um novo aplicativo **Web** (ícone `</>`).
3. Copie os valores fornecidos pelo Firebase para o arquivo `firebase-config.js` deste repositório, preservando a variável `window.FIN_FIREBASE_CONFIG`.
4. Em **Authentication → Sign-in method**, ative **Google**. Em **Settings → Authorized domains**, adicione **josuecarpino.github.io**.
5. Em **Firestore Database**, crie o banco **(default)**, Standard, inicialmente em **production mode**.
6. Em **Firestore → Rules**, cole **todo** o conteúdo de `firestore.rules` e clique **Publish**. O arquivo no GitHub não aplica regras automaticamente ao serviço Firebase.

### Teste de sincronização

1. Abra o site. Preencha os campos e exporte primeiro um backup JSON para uma pasta privada.
2. Clique **Entrar com Google** → **Enviar à nuvem**. Aguarde confirmação de sucesso.
3. Em outro navegador ou dispositivo, acesse o mesmo site, entre com a mesma conta e clique **Carregar da nuvem**. Confira os valores.

O salvamento **local** é automático. No primeiro acesso autenticado, não há envio ou carregamento automático: você decide qual versão manter. Depois da primeira sincronização, novas alterações locais passam a ser enviadas automaticamente. O aplicativo não resolve conflitos entre dispositivos; faça backup antes de substituir versões.

Os dados remotos ficam em `users/{uid}/finance/plan`. As regras só permitem acesso ao usuário autenticado cujo UID corresponde ao caminho. Não use regras abertas como `allow read, write: if true`.

## 3. Testes

Com Node.js instalado:

```sh
node --check app.js
node --check cloud.js
node verify.cjs
```

Para rodar localmente, abra um servidor estático na pasta:

```sh
python -m http.server 8000
```

Abra `http://localhost:8000`. Para usar autenticação Google em localhost, autorize o domínio nas configurações Firebase, se necessário.

## Premissas e limitações

O saldo projetado representa **caixa**, não patrimônio líquido. A consolidação parcial continua pagando o Bradesco antigo. Não se presume amortização nem prazo final dos contratos originais sem taxa/prazo remanescentes. CET, tarifas e valores efetivos de quitação devem ser consultados no banco.

GitHub Pages não armazena registros privados. O Firestore oferece cotas gratuitas sujeitas a limites; mantenha backups exportados em lugar privado.
