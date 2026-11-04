# LMF UFU — Site institucional

Site estático (HTML/CSS/JS puro, sem build step) da Liga do Mercado Financeiro da UFU.

## O que foi corrigido nesta versão

Com base na auditoria técnica completa realizada anteriormente, esta versão:

- Unifica o site em **um único `index.html`** (antes havia 3 versões concorrentes do arquivo).
- **Corrige o menu mobile**, que existia visualmente mas não tinha nenhuma função JS associada — agora abre/fecha corretamente e anima o ícone hambúrguer para um "X".
- Substitui todos os `onclick=""` inline por `data-page`/`data-tab` + `addEventListener`, o que também permite navegação **por teclado** (Tab + Enter/Espaço) em elementos como os slides do carrossel e os cards de núcleo.
- Adiciona `aria-label`, `aria-expanded`, `aria-selected`, `aria-current` e foco visível (`:focus-visible`) nos elementos interativos.
- Corrige a hierarquia de headings (havia dois `<h1>` na mesma página).
- Corrige o uso de múltiplos `<main>` simultâneos (agora há um único `<main id="app">`, com `<section>` para cada "página" da SPA).
- Adiciona `rel="noopener noreferrer"` em todos os links `target="_blank"` (proteção contra *reverse tabnabbing*).
- Adiciona meta description, Open Graph, favicon, `robots.txt` e `sitemap.xml` (SEO básico ausente antes).
- Adiciona `loading="lazy"` nas imagens fora da primeira dobra.
- **Redesenha a aba "Relatórios"**: a antiga versão embutia PDFs inteiros em `<iframe>` (4 iframes de 600px de altura, pesado e visualmente poluído). Agora todos os relatórios usam o mesmo card enxuto (tag do núcleo, título, descrição curta e botão "Ler Relatório" que abre o PDF em nova aba) — mais rápido de carregar, mais fácil de escanear visualmente, e consistente com o card de "Teses".
- Renomeia arquivos de imagem/PDF para `kebab-case` sem espaços (evita `%20` em URLs e problemas de case-sensitivity ao hospedar em Linux/GitHub Pages).
- **Nenhuma cor, fonte, espaçamento ou animação existente foi alterada** — todas as mudanças de CSS são aditivas (variáveis, paleta e `style.css` original permanecem intactos).

### Pendências que dependem de você (não são bugs de código)
- O e-mail, Instagram, LinkedIn e Linktree no rodapé já são reais — confirme que estão corretos.
- As fotos de perfil (`foto-perfil-generica.jpg`) e as imagens de capa (`*-generica.avif`) ainda são genéricas/placeholder. Assim que houver fotos reais da equipe, troque os arquivos em `imagens/` mantendo os mesmos nomes (ou atualize os `src` no `index.html`).
- Os 4 relatórios de trainees (INTB3, ABEV3, SMFT3, TFCO4) e as 3 teses de núcleo apontam todos para o mesmo PDF de exemplo (`pdfs/intelbras-relatorio-valuation.pdf`), pois só havia um PDF real no material enviado. Substitua cada link pelo PDF definitivo assim que estiver pronto.
- Gere um favicon dedicado (hoje usa a logo branca, que pode ficar pouco visível em abas de navegador com tema claro). Um gerador simples: https://realfavicongenerator.net

---

## Estrutura de pastas

```
.
├── index.html
├── style.css
├── script.js
├── robots.txt
├── sitemap.xml
├── imagens/
├── pdfs/
└── docs-marca/        (guia de cores/fontes da marca — não é usado pelo site, é só referência interna)
```

---

## Como hospedar no GitHub Pages

Supondo que você já tenha uma conta no GitHub e o Git instalado localmente.

### 1. Criar o repositório e subir o código

```bash
# dentro da pasta do site (a mesma onde está este README)
git init
git add .
git commit -m "Site institucional LMF UFU"

# crie antes um repositório vazio no GitHub (ex.: lmf-ufu-site) e depois rode:
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/lmf-ufu-site.git
git push -u origin main
```

### 2. Ativar o GitHub Pages

```bash
# opção simples via linha de comando, usando a branch main na raiz:
gh repo edit SEU-USUARIO/lmf-ufu-site --enable-pages 2>/dev/null || true
```

Se não tiver o `gh` (GitHub CLI) instalado, faça pela interface web (mais simples e não exige nada instalado):

1. No repositório no GitHub, vá em **Settings → Pages**.
2. Em "Build and deployment", escolha **Source: Deploy from a branch**.
3. Em "Branch", selecione **main** e a pasta **/(root)**.
4. Clique em **Save**.
5. Em alguns minutos o site estará em:
   `https://SEU-USUARIO.github.io/lmf-ufu-site/`

### 3. Atualizar `robots.txt` e `sitemap.xml`

Troque `SEU-USUARIO` e `SEU-REPOSITORIO` nos dois arquivos pela URL real do GitHub Pages (ou pelo domínio próprio, se for configurar um):

```bash
sed -i 's#SEU-USUARIO.github.io/SEU-REPOSITORIO#SEU-USUARIO.github.io/lmf-ufu-site#g' robots.txt sitemap.xml
git add robots.txt sitemap.xml
git commit -m "Atualiza URLs do sitemap/robots"
git push
```

### 4. (Opcional) Domínio próprio

Se a liga tiver um domínio (ex.: `lmfufu.com.br`), crie um arquivo `CNAME` na raiz:

```bash
echo "lmfufu.com.br" > CNAME
git add CNAME
git commit -m "Configura domínio customizado"
git push
```

E aponte o DNS do domínio para o GitHub Pages (registro `A` para os IPs do GitHub Pages, ou `CNAME` para `SEU-USUARIO.github.io`, conforme a documentação oficial do GitHub Pages).

---

## Como testar/ajustar para mobile antes de publicar

Você não precisa de nenhuma ferramenta além do navegador para validar o comportamento mobile:

### Testar localmente com um servidor simples

```bash
# Python (já vem instalado na maioria dos sistemas)
python3 -m http.server 8000
# depois abra http://localhost:8000 no navegador
```

```bash
# ou, se tiver Node.js instalado:
npx serve .
```

### Simular mobile no navegador (Chrome/Edge)

1. Abra o site local (`http://localhost:8000`).
2. Pressione `F12` (DevTools) → clique no ícone de celular/tablet (**Toggle device toolbar**), ou `Ctrl+Shift+M` / `Cmd+Shift+M`.
3. Selecione um dispositivo (ex.: iPhone 12, Galaxy S20) e teste:
   - o menu hambúrguer abre e fecha;
   - os links do menu levam para a página certa e fecham o menu sozinhos;
   - o carrossel funciona com toque e com as bolinhas indicadoras;
   - a grade de relatórios vira 1 coluna e continua legível;
   - nenhum texto/botão fica cortado nas laterais.

### Testar em um celular real na mesma rede Wi-Fi

```bash
# descubra o IP da sua máquina na rede local
# Linux/Mac:
ip a | grep "inet " 
# ou
ifconfig | grep "inet "
```

Depois, no celular (conectado ao mesmo Wi-Fi), acesse `http://SEU-IP-LOCAL:8000` no navegador.

### Checklist de aceite antes de publicar

- [ ] Menu mobile abre/fecha e o ícone anima para "X"
- [ ] Todos os 4 links do menu funcionam (Início, Equipe, Núcleos, Relatórios)
- [ ] Carrossel troca automaticamente e ao clicar nas bolinhas/slides
- [ ] Abas "Diretores"/"Membros" alternam corretamente
- [ ] Cards de Núcleos na página "Núcleos" levam à tese correspondente em "Relatórios"
- [ ] Todos os botões "Ler Relatório" abrem o PDF em nova aba
- [ ] Site funciona sem JavaScript quebrar em nenhuma etapa (teste com o DevTools em modo mobile e desktop)
- [ ] Links de redes sociais/e-mail no rodapé abrem corretamente
