<script lang="ts">
  import HomeScreen from "./lib/HomeScreen.svelte";
  import ResultScreen from "./lib/ResultScreen.svelte";

  type Screen = "home" | "result";

  let currentScreen: Screen = $state("home");
  let gifBlob: Blob | null = $state(null);

  function onGifGenerated(blob: Blob) {
    gifBlob = blob;
    currentScreen = "result";
  }

  function goHome() {
    gifBlob = null;
    currentScreen = "home";
  }
</script>

{#if currentScreen === "home"}
  <HomeScreen {onGifGenerated} />
{:else if currentScreen === "result" && gifBlob}
  <ResultScreen {gifBlob} onBack={goHome} />
{/if}
