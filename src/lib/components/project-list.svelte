<script lang="ts">
  import type { Project } from "$lib/data/projects";

  import ProjectItem from "./project-item.svelte";

  interface Props {
    projects: Project[];
  }

  let { projects }: Props = $props();
</script>

{#if projects.length > 0}
  <ul class="space-y-0.5">
    {#each projects as project (project.id)}
      <ProjectItem {project} />
    {/each}
  </ul>
{:else}
  <p class="px-2.5 py-8 text-center text-xs text-muted-foreground">No projects found</p>
{/if}
