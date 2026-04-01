# FiGif - Guia para Agentes de IA

Este arquivo (`AGENTS.md`) serve como documentação e diretriz para futuros Agentes de Inteligência Artificial que forem dar manutenção, criar novas páginas ou alterar componentes no projeto **FiGif**.

## 1. Visão Geral do Projeto
O **FiGif** é uma aplicação web (GIF Maker) focada em navegadores para a criação de figurinhas animadas (GIFs) para o WhatsApp e outras redes. 
A stack tecnológica é definida por:
- **Frontend Framework:** Svelte 5 + Vite
- **Linguagem:** TypeScript
- **Estilização:** CSS puro (Vanilla CSS com variáveis globais bem definidas, sem o uso de Tailwind CSS).
- **Ícones:** `lucide-svelte`
- **Processamento de Vídeo Local:** WebAssembly via `@ffmpeg/ffmpeg`
- **Backend Proxy:** Node.js com Express e CORS (configurado em `server.js`, servindo para burlar proteções CORS e viabilizar o uso de APIs externas, como a Cobalt API para baixar vídeos do X/Twitter).

O objetivo principal da aplicação é permitir ao usuário fazer de forma rápida: upload/download de vídeos, recorte (trim), corte livre (crop) e renderização final no cliente, respeitando a privacidade e economizando infraestrutura na nuvem.

## 2. Paradigma de Design (Brutalismo Elegante)
O design deve invocar uma estética "Brutalista Moderna" em tema escuro ("Dark Mode"). 
Isso significa ausência de decorações excessivamente realistas (como reflexos suaves e `box-shadows` genéricos cinzas). A UI deve ser construída com blocos definidos, bordas explícitas, cores vibrantes (neons secos) contra fundos super escuros, e textos com personalidades fortes.

### Paleta de Cores e Tokens CSS Essenciais (veja `src/app.css`)
- **Fundo:** Preto sólido (`#000000`), cartões em tons de cinza super escuro (`#141414`, escurecendo no hover para `#1c1c1c`).
- **Cores de Destaque (Accents Neons):**
  - **Primária:** Amarelo/Verde Neon (`--color-primary: #CCFF00;`) - *Use para focos de atenção máximos.*
  - **Secundária:** Branco sólido (`--color-secondary: #ffffff;`) - *Use para textos primários e elementos neutros.*
  - **Terciária:** Azul Neon (`--color-tertiary: #0091ff;`) - *Use para destaque interativo e botões de ação principal.*

### Tipografia
- **Títulos e Elementos de Ação (Botões, Rótulos):** Fonte `Bricolage Grotesque`. Deve ser usada sempre em uppercase, peso 700 ou 800 (Bold/ExtraBold), e preferencialmente acompanhada de letter-spacing (ex: `0.05em`) e/ou acompanhada de `text-shadow`.
- **Textos Base e Descrições:** Fonte `Plus Jakarta Sans`. Focada na perfeita legibilidade, com antialiasing ativo e line-height de `1.6`.

### Elementos Visuais e Interação
- **Blooms (Brilhos/Auras):** Em vez das clássicas sombras de sobreposição (`box-shadow`), utilizamos *blooms*. Um blur radiante na mesma cor do objeto. (ex: `0 0 24px rgba(204, 255, 0, 0.35)`). Nunca misture cores de sombras ou use cinzas pra elevação.
- **Bordas:** Cartões, inputs e contêineres e imagens geralmente usam bordas sólidas rígidas (`2px` ou `3px` de espessura) com `rgba(255, 255, 255, 0.15)` ou diretamente nas cores primária/terciária no hover ou foco.
- **Transições e Movimento:** Hover effects são rápidos, mas orgânicos (`cubic-bezier(0.16, 1, 0.3, 1)` a `300ms`). Botões e blocos clicáveis devem ter "transformações" (ex: subir no eixo Y (`transform: translateY(-4px)`) ou leve rotação em ícones) combinados com aumento na saturação e expansão dos *blooms*.

## 3. Diretrizes de Codificação (Svelte 5)
Ao escrever, refatorar ou adicionar código, os seguintes padrões são inegociáveis:
1. **Utilização Exclusiva de Svelte 5 (Runes):**
   - Use `$state` para variáveis reativas.
   - Use `$derived` para expressões e cálculos derivados.
   - Use `$effect` caso necessite escutar mutações específicas (evitar abusos).
   - Para definir propriedades, extraia a interface (`interface Props`) e desestruture `let { prop, callback }: Props = $props();`.
   - **NÃO UTILIZE** a sintaxe antiga do Svelte 3/4 (ex: `export let`, `$: computed = ...`, bindings duvidosos sem necessidade).
2. **Escopo do CSS e Variáveis:** Todo componente Svelte deve utilizar classes semânticas. NÃO traga CSS in-line e priorize as variáveis nativas definidas no `:root` do arquivo `app.css` (`var(--bg-card)`, `var(--text-muted)`, `var(--duration)`).
3. **Comunicação por Callbacks:** Para trafegar eventos complexos entre componentes (como mudança de tela entre Home, Crop ou Renderização), priorize o uso de callbacks via Props explícita em vez de dependências genéricas ou stores globais exagerados.

## 4. Manutenção do FFmpeg
O processo que utiliza a biblioteca `@ffmpeg/ffmpeg` manipula buffers consideráveis em memória e pode bloquear parcialmente a UI.
Ao codificar operações (CROP ou TRIM):
- Trabalhe sempre de forma assíncrona, capturando e relatando o progresso da renderização do Wasm.
- Utilize e preserve o estilo e hierarquia no overlay global (veja `.progress-overlay`), informando claramente "CARREGANDO", "PROCESSANDO VÍDEO", "CORTANDO...", etc. O feedback precisa ser explícito pois a renderização de vídeo no cliente é demorada.

## 5. Excesso Criativo (Evitar AI Aesthetics Padrão)
Não crie UI de "Admin Dashboard 2021" minimalista se não for solicitado. Mantenha os traços rústicos da identidade visual: letras grandes, cores em neon estourado (amarelo ácido e azul sintético), limites angulados e forte distinção hierárquica por tipografia (Bricolage Grotesque no topo de tudo). 
Injete personalidade nas interfaces.
