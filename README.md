<p align="center">
  <img src="./src/assets/hero.png" alt="FiGif" width="180" />
</p>

<h1 align="center">FiGif</h1>

<p align="center">
  GIF maker focado em navegador para criar figurinhas animadas com trim, crop e renderização local.
</p>

## Sobre o projeto

O **FiGif** é uma aplicação web para transformar vídeos em GIFs prontos para uso no WhatsApp e em outras redes. A proposta é manter o processamento principal no cliente com **FFmpeg WebAssembly**, reduzindo dependência de infraestrutura externa e preservando a privacidade do usuário.

Além do upload local, o app também consegue buscar vídeos do **X/Twitter** por meio de um proxy em **Node.js + Express**, contornando limitações de CORS no navegador.

## O que o sistema faz

- Upload de vídeo local no navegador
- Importação de vídeo do X/Twitter
- Recorte de trecho do vídeo antes da geração do GIF
- Recorte visual inline do GIF já gerado
- Ajuste de qualidade do GIF final
- Processamento local com feedback de progresso
- Interface brutalista escura com foco em rapidez e legibilidade

## Stack

- **Frontend:** Svelte 5 + Vite + TypeScript
- **Estilo:** CSS puro
- **Ícones:** lucide-svelte
- **Processamento de mídia:** `@ffmpeg/ffmpeg` + `@ffmpeg/util`
- **Backend auxiliar:** Node.js + Express + CORS
- **Containerização:** Docker + Docker Compose + Nginx

## Como rodar localmente

### Pré-requisitos

- Node.js 22+ recomendado
- npm

### 1. Instale as dependências

```bash
npm install
```

### 2. Suba o backend

Em um terminal:

```bash
npm run server
```

O proxy ficará disponível em `http://localhost:3001`.

### 3. Suba o frontend

Em outro terminal:

```bash
npm run dev
```

O frontend ficará disponível normalmente em `http://localhost:5173`.

## Como rodar com Docker Compose

### 1. Configure o ambiente

O projeto já inclui um arquivo `.env` com a porta pública do frontend:

```env
FIGIF_PORT=8080
```

Se quiser, ajuste esse valor antes de subir os containers.

### 2. Suba os serviços

```bash
docker compose up --build
```

Depois disso, a aplicação ficará disponível em:

```bash
http://localhost:8080
```

## Estrutura dos serviços no Compose

- `frontend`: build de produção do app Svelte servido por Nginx
- `backend`: proxy Express para integração com vídeo do X/Twitter

O Nginx encaminha as rotas `/api/*` para o backend automaticamente.

## Scripts úteis

```bash
npm run dev
npm run server
npm run build
npm run preview
npm run check
```

## Fluxo de uso

1. Envie um vídeo local ou cole um link do X/Twitter
2. Escolha o trecho que será transformado em GIF
3. Gere o GIF no navegador
4. Recorte a área desejada diretamente na tela do resultado
5. Ajuste a qualidade, copie ou baixe o arquivo final

## Observações

- O processamento de GIF pode levar alguns segundos dependendo do vídeo e do dispositivo.
- Para a importação de vídeos do X/Twitter funcionar, o backend precisa estar ativo.
- O app usa headers específicos no frontend para compatibilidade com o FFmpeg em WebAssembly.
