<script lang="ts">
	import './layout.css';
	import { asset } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import { CurrentDateTime } from '$lib/utils/datetime.svelte';
	import { capitalize } from '$lib/utils/string';
	import { WindowsManager } from '$lib/os/Window.svelte';

	let { children } = $props();

	const currentDateTime = new CurrentDateTime();

	let dock: HTMLElement | undefined = $state();

	$inspect(WindowsManager.stack);
</script>

{#snippet baseWindow()}
	<div class="grid h-full grid-cols-[24rem_1fr]">
		<div class="border-r border-solid border-[#ccc]"></div>
		<div class="bg-white p-6">Wesh bien ou bien?</div>
	</div>
{/snippet}

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<img
	src={asset('/images/wallpapers/default-2.jpg')}
	alt="Wallpaper"
	class="fixed h-svh w-svw object-cover"
/>
<div class="fixed inset-0 h-svh w-svw bg-black/5"></div>

<header class="flex justify-between px-6 py-1.5">
	<div>
		<!-- Icon -->
		<nav>
			<!-- Dynamic header based on MacOs interface -->
			<ul>
				<li>Files</li>
			</ul>
		</nav>
	</div>
	<div class="flex">
		<div>
			<!-- Date: show a tooltip with the full date -->
			{capitalize(currentDateTime.formattedDate)}
		</div>
	</div>
</header>

<main class="relative">
	{@render children()}
	<button
		onclick={() =>
			WindowsManager.open(baseWindow, { title: `This is a test ${WindowsManager.stack.length}` })}
		class="relative bg-white px-5 py-3"
	>
		Open window
	</button>
</main>

<div
	bind:this={dock}
	class="fixed bottom-8 left-1/2 z-200 container h-18 w-full -translate-x-1/2 rounded-lg bg-white/5 backdrop-blur-xl"
>
	<ul class="flex gap-x-1">
		{#each WindowsManager.stack as w (w)}
			<li><button onclick={w.maximize}>{w.title}</button></li>
		{/each}
	</ul>
</div>

<style lang="postcss">
	@reference 'tailwindcss';

	header {
		backdrop-filter: blur(30px) saturate(180%);
		-webkit-backdrop-filter: blur(30px) saturate(180%);
		background-color: rgba(255, 255, 255, 0.12);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
		background-image: url("data:image/svg+xml;utf8,\
        <svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'>\
          <filter id='n'>\
            <feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4'/>\
          </filter>\
          <rect width='100' height='100' filter='url(%23n)' opacity='.03'/>\
        </svg>");
	}
</style>
