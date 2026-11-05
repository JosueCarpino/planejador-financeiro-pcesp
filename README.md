# Planejador Financeiro PCESP

## Versão 3.0 — interface e fluxo de uso

O site permanece independente do TAF e utiliza o mesmo documento privado do Firebase do próprio financeiro (projeto financas-1c48a). A atualização **não apaga, migra nem modifica automaticamente** o documento remoto. Novos campos são opcionais e backups anteriores continuam legíveis.

- **Início:** saldos das contas, caixa mensal previsto, dívida para quitação, alertas e compromissos.
- **Transações:** busca, filtros, categorias, dia de vencimento, edição, exclusão, marcação informativa de pago e faturas.
- **Calendário:** visualiza somente vencimentos com dia informado; não presume datas bancárias nem compensações.
- **Contas:** atualização dos saldos bancários informados.
- **Dívidas:** cartão de cada contrato, quitação informada, parcela, dia de vencimento e progresso quando o prazo original é conhecido.
- **Simulador:** comparação dos três cenários já existentes e **calculadora separada** de amortizações extras de contratos Price, incluindo prazo original de 96 meses.
- **Ajustes:** rendas, despesas, importação/exportação JSON, exportação CSV, conta Google e sincronização manual.
- **Tema claro/escuro**, navegação inferior no celular, cartões de fluxo mensal expansíveis, visualização responsiva e PWA instalável em navegadores compatíveis.

### Importante: o que os cálculos não garantem

1. O **saldo de caixa projetado** não é extrato bancário nem patrimônio líquido.
2. O estado "Pago" de um lançamento é **informativo**: não debita ou credita automaticamente as contas. Atualize o saldo real com base no banco; mantenha a data do saldo consistente para evitar dupla contabilização.
3. O calendário só exibe vencimentos detalhados quando o dia foi informado. Datas especiais do serviço público e compensação bancária não são calculadas automaticamente.
4. O simulador de amortização usa um modelo Price com pagamento extra aplicado ao principal. A amortização efetiva do banco pode ter outros cálculos, tarifas, regras e datas. **Não substitui CET, contrato nem demonstrativo oficial**.
5. O PWA armazena **somente arquivos estáticos públicos** para abrir o site offline. Dados pessoais ficam no navegador e no Firestore. A sincronização requer internet.
6. O banco não tem conflito automático entre dois dispositivos: o aplicativo exige conferência da revisão remota antes de cada gravação e confirma o resultado no servidor. Exporte backup privado antes de importar ou sobrescrever.

### Testes automatizados

O pipeline do GitHub executa verificações de sintaxe, regressões das simulações Price e testes DOM da interface com valores fictícios. O site só é publicado quando todas as verificações passam.

---

Aplicativo web **independente**, hospedado em GitHub Pages, com opção de armazenamento privado pelo Firebase Authentication + Cloud Firestore. Não utiliza código, projeto Firebase ou banco de dados do painel TAF.

**Site:** https://josuecarpino.github.io/planejador-financeiro-pcesp/

**Firebase Web configurado:** projeto exclusivo `financas-1c48a`, via `firebase-config.js`. Para utilizar a sincronização, o Google Authentication, o domínio autorizado e as regras de acesso precisam permanecer ativos no Console.

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

## 2. Concluir o Firebase independente

O usuário criou o projeto `financas-1c48a`, **separado do TAF**, e a configuração Web já está registrada em `firebase-config.js`. Não reutilize `taf-acadepol`, não instale o SDK via npm e não ative Firebase Hosting.

1. Acesse [Authentication do projeto financeiro](https://console.firebase.google.com/project/financas-1c48a/authentication/providers) e ative o provedor **Google** em **Sign-in method**, selecionando um e-mail de suporte quando solicitado.
2. Em **Authentication → Settings → Authorized domains**, inclua **josuecarpino.github.io** (sem `https://` e sem caminho).
3. Acesse [Firestore Database](https://console.firebase.google.com/project/financas-1c48a/firestore) e crie o banco **(default)**, edição Standard, inicialmente em modo de produção, caso ainda não exista.
4. Abra [Firestore Rules](https://console.firebase.google.com/project/financas-1c48a/firestore/rules); cole **todo** o arquivo `firestore.rules` deste repositório e clique em **Publish**. As regras restringem cada plano financeiro à própria conta autenticada.
5. **Teste o login e a sincronização** no site e depois em outro navegador. O commit GitHub não aplica automaticamente as regras remotas.

A configuração publicada contém apenas identificadores públicos do SDK Firebase Web; as permissões de acesso dependem de Authentication e das regras do Firestore.

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
