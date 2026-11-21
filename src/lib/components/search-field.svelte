<script lang="ts">
  import { Input, InputGroup } from "@ui-sdk/svelte/input";

  interface Props {
    value?: string;
    placeholder?: string;
    label?: string;
  }

  let {
    value = $bindable(""),
    placeholder = "Search projects",
    label = "Search projects",
  }: Props = $props();
</script>

<InputGroup
  class="flex h-8 items-center gap-2 rounded-md border border-border-strong bg-sidebar px-2.5 transition-colors focus-within:border-ring hover:bg-hover"
>
  <svg
    class="size-3.5 shrink-0 text-muted-foreground"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4" />
    <path d="m10.5 10.5 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
  </svg>
  <Input
    type="search"
    bind:value
    {placeholder}
    aria-label={label}
    class="h-full min-w-0 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
  />
</InputGroup>
