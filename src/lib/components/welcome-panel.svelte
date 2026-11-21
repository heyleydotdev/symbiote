<script lang="ts">
  import { Button } from "@ui-sdk/svelte/button";
</script>

<section class="flex flex-1 items-center justify-center bg-background px-8">
  <div class="w-full max-w-sm text-center">
    <h1 class="text-2xl font-medium tracking-tight text-foreground">No project selected</h1>
    <p class="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
      Choose a project from the sidebar, or create a new one to get started.
    </p>
    <Button
      class="mt-8 inline-flex h-8 items-center gap-2 rounded-md bg-elevated px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-elevated-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <svg
        class="size-3.5 text-muted-foreground"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 3.5v9M3.5 8h9"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
        />
      </svg>
      Create project
    </Button>
  </div>
</section>
