<script lang="ts">
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import WelcomePanel from "$lib/components/welcome-panel.svelte";
  import { projects } from "$lib/data/projects";
</script>

<div class="flex h-screen overflow-hidden bg-background text-foreground">
  <AppSidebar {projects} />
  <WelcomePanel />
</div>
