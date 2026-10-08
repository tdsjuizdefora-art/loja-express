# 🛍️ LojaExpress Pro Delivery — PWA & ERP Comercial

> **Aplicação Web Progressiva (PWA)** completa com arquitetura *Single-Page Application* (SPA), integrando **Loja Virtual (Visão do Cliente)** e **Back-Office ERP (Visão do Administrador)** sobre um banco relacional simulado em `localStorage`.

![PWA Ready](https://img.shields.io/badge/PWA-Ready-success?style=for-the-badge&logo=pwa)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript Vanilla](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-blue?style=for-the-badge&logo=github)

---

## 📌 Sumário

1. [Sobre o Projeto](#-sobre-o-projeto)
2. [Estrutura de Arquivos](#-estrutura-de-arquivos)
3. [Arquitetura & Esquema do LocalStorage](#-arquitetura--esquema-do-localstorage)
4. [Regras de Negócio Implementadas](#-regras-de-negócio-implementadas)
5. [Configuração PWA (Manifest & Service Worker)](#-configuração-pwa)
6. [Credenciais de Acesso Padrão](#-credenciais-de-acesso-padrão)
7. [Como Executar e Testar Localmente](#-como-executar-e-testar-localmente)
8. [Como Publicar no GitHub Pages (HTTPS)](#-como-publicar-no-github-pages-https)
9. [Desafio Prático para Estudantes](#-desafio-prático-para-estudantes)

---

## 📖 Sobre o Projeto

O **LojaExpress Pro Delivery** foi desenvolvido para a disciplina de **Programação Mobile**, demonstrando como uma aplicação web moderna em arquivo único pode:

- Funcionar como aplicativo nativo em smartphones via **PWA (Progressive Web App)**;
- Operar em **modo offline** por meio de interceptação de rede e cache com **Service Worker**;
- Gerenciar catálogo, carrinho, baixas de estoque, autenticação de clientes e painel administrativo usando apenas o **`localStorage`** do navegador (sem dependência de banco de dados SQL externo ou back-end dedicado).

---

## 📂 Estrutura de Arquivos

Para o correto funcionamento do PWA e publicação no GitHub Pages, mantenha os três arquivos na raiz do repositório:

```text
loja-express-pwa/
├── 📄 index.html        # Interface completa (Cliente + Admin ERP + CSS + JS)
├── 📄 manifest.json     # Metadados de instalação do PWA (ícone, nome, display)
├── 📄 sw.js             # Service Worker (Cache Storage e resiliência offline)
└── 📄 README.md         # Documentação técnica do projeto
```

---

## 🗄️ Arquitetura & Esquema do LocalStorage

O sistema simula um banco de dados relacional gravando dados serializados em JSON nas seguintes chaves:

| **Chave**      | **Entidade**         | **Estrutura dos Dados (JSON)**                                                                                    |
| -------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| db_produtos    | Catálogo de Produtos | [{ id, nome, categoria, preco, precoAntigo, estoque, img, rating, totalRatings, descricao, avaliacoes: [] }]      |
| db_clientes    | Usuários / Clientes  | [{ id, nome, email, senha, cpf, telefone, endereco, cidade }]                                                     |
| db_pedidos     | Pedidos de Venda     | [{ id, clienteId, clienteNome, data, status, total, itens: [{ produtoId, nome, qtd, precoUnit, subtotalItem }] }] |
| db_cupons      | Regras de Cupons     | [{ codigo, tipo, valor, minPedido, expiraEm, ativo, desc }]                                                       |
| db_config      | Credenciais Admin    | { adminEmail, adminSenha }                                                                                        |
| sessao_cliente | Sessão Ativa         | Objeto com dados do cliente logado                                                                                |
| sessao_admin   | Sessão Admin         | Booleano (true / false)                                                                                           |

---

## ⚙️ Regras de Negócio Implementadas

1. **Seletor de Quantidade Interativo ([ - ] QTD [ + ]):** Na tela de detalhes do produto, o subtotal é recalculado dinamicamente antes de adicionar ao pedido.
2. **Baixa Automática no Estoque:** Ao concluir a compra no carrinho, o sistema subtrai a quantidade de cada produto em db_produtos.
3. **Validação de Cupons de Mercado:**
   - O cupom deve estar ativo (ativo: true);
   - A data atual não pode ultrapassar expiraEm;
   - O subtotal do carrinho deve ser maior ou igual a minPedido;
   - Suporte a descontos percentuais (tipo: "pct") e fixos em reais (tipo: "reais").
4. **Desbloqueio Condicional de Avaliação (Pós-Entrega):**
   - O formulário de avaliação por estrelas (⭐⭐⭐⭐⭐) permanece bloqueado;
   - **Gatilho de liberação:** O cliente precisa estar logado, possuir o produto em seu histórico e o pedido deve estar com status **Entregue** (atualizado pelo Administrador).
5. **Venda Manual de Balcão (ERP):** O administrador pode registrar pedidos manuais realizados presencialmente ou por telefone, vinculando cliente, produto e quantidade diretamente ao faturamento geral.
6. **Backup Relacional Completo:** Exportação e restauração de todo o banco em arquivo .json.

---

## 📱 Configuração PWA

### 1. manifest.json

Define os parâmetros de instalação no sistema operacional:

```json
{
  "name": "LojaExpress Pro Delivery",
  "short_name": "LojaExpress",
  "description": "App de pedidos, catálogo de lanches e ERP administrativo",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#4f46e5",
  "orientation": "portrait",
  "icons": [
    {
      "src": "https://cdn-icons-png.flaticon.com/512/3081/3081840.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "https://cdn-icons-png.flaticon.com/512/3081/3081840.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2. sw.js (Estratégia Cache First com Fallback)

Armazena a aplicação no Cache Storage durante o evento install, remove versões antigas no evento activate e intercepta requisições de rede com o evento fetch:

```javascript
const CACHE_NAME = 'lojaexpress-cache-v1';
const RECURSOS_ESSENCIAIS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn-icons-png.flaticon.com/512/3081/3081840.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(RECURSOS_ESSENCIAIS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves.map((chave) => {
          if (chave !== CACHE_NAME) return caches.delete(chave);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => {
      return respostaCache || fetch(evento.request).catch(() => {
        if (evento.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
```

---

## 🔑 Credenciais de Acesso Padrão

Para facilitar testes didáticos em sala de aula, o banco inicial carrega as seguintes contas:

### 👤 Visão do Cliente

- **E-mail:** ana@email.com
- **Senha:** 123
- *Nota: Você também pode usar o botão "Criar Conta" para cadastrar novos clientes.*

### 🛠️ Visão do Administrador (Back-Office ERP)

- **E-mail:** admin@loja.com
- **Senha:** admin123
- *Nota: A senha pode ser alterada na aba "Backup & Senha".*

### 🎟️ Cupons Iniciais

- PROMO20: 20% de desconto (pedido mínimo: R$ 30,00)
- PRIMEIRA10: R$ 10,00 de desconto (pedido mínimo: R$ 40,00).



---

## 💻 Como Executar e Testar Localmente

PWAs e Service Workers **não funcionam** ao abrir arquivos com duplo clique direto (file:///C:/index.html). É obrigatório o uso de um servidor local (localhost).

1. Baixe ou clone este repositório no seu computador:

```bash
   # Baixe o ZIP do repositório ou clone-o após substituir seu-usuario pelo seu usuário GitHub
git clone https://github.com/SEU-USUARIO/loja-express-pwa.git
```
2. Abra a pasta do projeto no **VS Code**.
3. Certifique-se de ter a extensão **Live Server** instalada.
4. Clique com o botão direito sobre o arquivo index.html e selecione **"Open with Live Server"**.
5. O aplicativo abrirá em http://127.0.0.1:5500.

### 🔍 Testando o PWA no DevTools (F12)

1. Pressione F12 (ou botão direito ➔ *Inspecionar*) e vá na aba **Application** (ou *Aplicativo*):
   - **Manifest:** Verifique se os ícones, cor tema (#4f46e5) e nome foram carregados.
   - **Service Workers:** Confirme o status verde (*activated and is running*).
2. Na aba **Network** (Rede):
   - Alterne o *Throttling* para **Offline** ou ative a opção **Offline** na aba *Application > Service Workers*.
   - Recarregue a página: o aplicativo continuará abrindo perfeitamente a partir do cache local.

---

## 🚀 Como Publicar no GitHub Pages (HTTPS)

Para instalar o app em celulares físicos, é necessário disponibilizá-lo em uma URL com certificado de segurança **HTTPS**:

1. Crie um repositório público no seu GitHub (exemplo: loja-express-pwa).
2. Envie os arquivos (index.html, manifest.json, sw.js e README.md) para o repositório.
3. No GitHub, acesse a aba **Settings** (Configurações do repositório).
4. No menu lateral esquerdo, clique em **Pages**.
5. Em **Build and deployment > Branch**:
   - Selecione a branch main (ou master);
   - Mantenha a pasta como /(root);
   - Clique em **Save**.
6. Aguarde cerca de 1 a 2 minutos e recarregue a página. O link público será exibido no topo:
   https://seu-usuario.github.io/loja-express-pwa/

### 📲 Instalando no Celular Real

- **Android (Chrome):** Acesse a URL do GitHub Pages, toque nos três pontinhos e selecione **"Instalar aplicativo"** (ou toque no banner inferior).
- **iOS / iPhone (Safari):** Acesse a URL, toque no botão **Compartilhar** (quadrado com seta para cima) e selecione **"Adicionar à Tela de Início"**.
- **O Teste do Modo Avião:** Abra o aplicativo instalado, ative o Modo Avião do celular (sem Wi-Fi e sem 4G) e veja o app continuar funcionando.

---

## 🎯 Desafio Prático para Estudantes

Personalize este projeto para um nicho de mercado de sua escolha (ex.: *Cafeteria, Pet Shop, Loja Geek, Farmácia, Livraria ou Açaiteria*):

- **Identidade:** Altere o título da página, nome da marca e as variáveis de cores CSS em :root (--primary, --secondary);

  **Catálogo:** No arquivo index.html, localize o array SEED_PRODUTOS e adicione produtos reais do seu segmento com preços e emojis correspondentes;

  **Regras Promocionais:** No array SEED_CUPONS, crie um cupom exclusivo para sua loja;

  **Configurações:** Altere as credenciais iniciais do administrador em SEED_CONFIG;

  **Manifest:** Ajuste o name e short_name dentro do manifest.json;

  **Publicação:** Faça o commit no GitHub Pages e compartilhe o link do seu app em funcionamento!

---

## 📜 Licença

Projeto desenvolvido para fins educacionais e didáticos na disciplina de **Programação Mobile**. Código livre para estudos, adaptações e apresentações acadêmicas.
