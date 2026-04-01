import os

fp = 'src/lib/HomeScreen.svelte'
with open(fp, 'r') as f:
    code = f.read()

# 1. Imports
code = code.replace(
    'import { Zap, Scissors, Wand2, Clock, Sparkles } from "lucide-svelte";',
    'import { Zap, Scissors, Wand2, Clock, Sparkles, Twitter } from "lucide-svelte";'
)

# 2. Add mode and twitterUrl
code = code.replace(
    'type Mode = "direct" | "trim";',
    'type Mode = "direct" | "trim" | "twitter";'
)
code = code.replace(
    'let file: File | null = $state(null);',
    'let file: File | null = $state(null);\n  let twitterUrl = $state("");'
)

# 3. Add fetchTwitterVideo
fetch_code = """
  async function fetchTwitterVideo() {
    if (!twitterUrl) return;
    processing = true;
    error = "";
    progressMsg = "Buscando vídeo no Twitter...";
    
    try {
      const resp = await fetch("https://api.cobalt.tools/api/json", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: twitterUrl,
          vCodec: "h264"
        })
      });
      if (!resp.ok) throw new Error("A API rejeitou o pedido (rate limit ou erro).");
      const data = await resp.json();
      if (data.status === "error") {
        throw new Error(data.text || "Erro desconhecido ao baixar");
      }
      if (!data.url) throw new Error("URL do vídeo não encontrada");
      
      progressMsg = "Baixando mídia...";
      const mediaResp = await fetch(data.url);
      const blob = await mediaResp.blob();
      const f = new File([blob], "twitter_video.mp4", { type: blob.type });
      
      onFileSelected(f);
      selectMode("trim"); // Switch to trim automatically
      twitterUrl = "";
    } catch (err: any) {
      console.error(err);
      error = "Não foi possível baixar o vídeo. Verifique se o link contém um vídeo público.";
    } finally {
      processing = false;
    }
  }
"""
code = code.replace('function canGenerate(): boolean {', fetch_code + '\n  function canGenerate(): boolean {')

# 4. update canGenerate
code = code.replace(
    'if (mode === "trim" && !showTrimmer) return false;',
    'if (mode === "trim" && !showTrimmer) return false;\n    if (mode === "twitter") return false;'
)

# 5. Add twitter mode card layout
mode_card = """
      <div
        class="mode-card"
        class:active={mode === "twitter"}
        role="radio"
        aria-checked={mode === "twitter"}
        tabindex="0"
        onclick={() => selectMode("twitter")}
        onkeydown={(e) =>
          e.key === "Enter" && selectMode("twitter")}
      >
        <div style="display:flex; align-items:center;">
          <span
            class="mode-card__title"
            style="display: flex; align-items: center; gap: 0.5rem;"
          >
            <Twitter size={24} strokeWidth={2.5} />
            Twitter
          </span>
        </div>
        <span class="mode-card__desc"
          >Cole um link do X (Twitter) para extrair o vídeo e criar seu GIF</span
        >
      </div>
"""
code = code.replace(
    '</script>',
    # Actually wait, we replace inside the template. Let's find mode-cards end.
    # It's better to replace the closing tag of the second card.
)
# Safer: we can just insert the third card before `    </div>\n  </div>\n\n  {#if !(showTrimmer && file)}`
last_card_end = '</div>\n    </div>\n  </div>\n\n  {#if !(showTrimmer && file)}'
replacement = '</div>\n' + mode_card + '    </div>\n  </div>\n\n  {#if mode === "twitter"}\n    <div class="dropzone" style="cursor: default; padding: 2rem; align-items: stretch;">\n      <span class="dropzone__text">Cole o link do <strong>Twitter</strong></span>\n      <div style="display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;">\n        <input \n          type="url"\n          bind:value={twitterUrl}\n          placeholder="https://x.com/..."\n          class="brutalist-input"\n          style="flex: 1;"\n          onkeydown={(e) => e.key === "Enter" && fetchTwitterVideo()}\n        />\n        <button class="btn btn-primary" onclick={fetchTwitterVideo} disabled={processing || !twitterUrl}>\n          <Wand2 size={24} />\n          Buscar\n        </button>\n      </div>\n    </div>\n  {:else if !(showTrimmer && file)}'

code = code.replace(last_card_end, replacement)

with open(fp, 'w') as f:
    f.write(code)

print("Updated HomeScreen.svelte for Twitter Integration")
