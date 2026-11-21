<script lang="ts">
  import type { Project } from "$lib/data/projects";

  import ProjectList from "./project-list.svelte";
  import SearchField from "./search-field.svelte";

  interface Props {
    projects: Project[];
  }

  let { projects }: Props = $props();

  let query = $state("");
  const filtered = $derived(
    projects.filter((project) => project.name.toLowerCase().includes(query.trim().toLowerCase())),
  );
</script>

<aside class="flex h-full w-72 shrink-0 flex-col border-r border-border bg-sidebar">
  <div class="px-3 pt-3">
    <SearchField bind:value={query} />
  </div>
  <div class="min-h-0 flex-1 overflow-y-auto px-2 pt-3 pb-20">
    <ProjectList projects={filtered} />
  </div>
</aside>
