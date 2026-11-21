<script lang="ts">
  import type { Project } from "$lib/data/projects";

  interface Props {
    project: Project;
  }

  let { project }: Props = $props();

  const initial = $derived(project.name.charAt(0).toUpperCase());
</script>

<li>
  <div class="flex h-9 items-center gap-2.5 rounded-md px-2.5 hover:bg-hover">
    <span
      class="grid size-5 shrink-0 place-items-center rounded-[5px] border border-border bg-muted text-[10px] font-medium text-muted-foreground"
      aria-hidden="true">{initial}</span
    >
    <span class="min-w-0 flex-1 truncate text-[13px] text-foreground">{project.name}</span>
    <span class="text-[11px] text-muted-foreground tabular-nums"
      >{project.cueCount}<span class="sr-only"> cues</span></span
    >
  </div>
</li>
