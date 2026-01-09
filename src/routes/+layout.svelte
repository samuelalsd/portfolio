<script lang="ts">
	import './layout.css';
	import { onDestroy, onMount } from 'svelte';
	import { asset } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import { CurrentDateTime } from '$lib/utils/datetime.svelte';
	import { capitalize } from '$lib/utils/string';
	import { OSWindow, WindowsManager } from '$lib/os/Window.svelte';
	import FolderIcon from './FolderIcon.svelte';

	let { children } = $props();

	const currentDateTime = new CurrentDateTime();

	let dock: HTMLElement | undefined = $state();
	let saved: OSWindow[] = [];

	onMount(() => {
		console.log('layout mounted');
		console.log('saved:', saved);
		saved.forEach((w) =>
			WindowsManager.open(w.children, {
				title: w.title
			})
		);
	});

	onDestroy(() => {
		console.log('layout destroyed');
		saved = [...$state.snapshot(WindowsManager.stack)];
		console.log('saving...', saved);
		WindowsManager.destroyAll();
		// this is dumb???? probably!!! yes...
	});
</script>

{#snippet baseWindow()}
	<div class="relative grid h-full grid-cols-[24rem_1fr] items-stretch">
		<div class="border-r border-solid border-[#ddd]"></div>
		<div class="bg-white p-6">Wesh bien ou bien?</div>
	</div>
{/snippet}

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<img
	src={asset('/images/wallpapers/default-4.jpg')}
	alt="Wallpaper"
	class="fixed h-svh w-svw object-cover"
/>
<div class="fixed inset-0 h-svh w-svw bg-black/25"></div>

<header class="z-20 flex shrink-0 justify-between px-6 py-1.5">
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

<main class="relative h-full">
	{@render children()}
	<button
		onclick={() =>
			WindowsManager.open(baseWindow, { title: `This is a test ${WindowsManager.stack.length}` })}
		class="relative bg-white px-5 py-3"
	>
		Open window
	</button>

	<div
		bind:this={dock}
		class="dock fixed bottom-2 left-1/2 z-200 container h-18 w-full -translate-x-1/2 rounded-2xl"
	>
		<ul class="flex gap-x-1 p-2">
			{#each WindowsManager.stack as w (w.id)}
				<li class="relative">
					<button
						data-is-focused-window={WindowsManager.windowHasFocus(w)}
						onclick={() => {
							console.log('clicked window icon on dock', w.id);
							console.log(w.instance);
							w.toggleMinimized();
						}}
						class="dock-window-trigger flex aspect-square w-14 flex-col items-center rounded-lg overflow-ellipsis whitespace-nowrap data-[is-focused-window=true]:backdrop-blur-xl"
					>
						<FolderIcon />
						<div
							class="indicator absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-sm bg-amber-700"
						></div>
					</button>
				</li>
			{/each}
		</ul>
	</div>
</main>

<style lang="postcss">
	@reference 'tailwindcss';

	header {
		backdrop-filter: blur(30px) saturate(180%);
		-webkit-backdrop-filter: blur(30px) saturate(180%);
		background-color: #131313;
		color: white;
		box-shadow:
			inset 0 1px 0 0 rgb(255 255 255 / 5%),
			inset 0 0 0 1px rgb(255 255 255 / 3%);
		background-image: url("data:image/svg+xml;utf8,\
        <svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'>\
          <filter id='n'>\
            <feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4'/>\
          </filter>\
          <rect width='100' height='100' filter='url(%23n)' opacity='.03'/>\
        </svg>");
	}

	.indicator {
		box-shadow:
			0 3px 4px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 0 rgb(255 255 255 / 5%),
			inset 0 0 0 1px rgb(255 255 255 / 2%);
	}

	.dock {
		background-color: --alpha(#131313 / 75%);
		box-shadow:
			0 3px 4px rgba(0, 0, 0, 0.1),
			inset 0 1px 0 0 rgb(255 255 255 / 5%),
			inset 0 0 0 1px rgb(255 255 255 / 2%);
	}

	.dock-window-trigger {
		&[data-is-focused-window='true'] {
			background-color: rgb(255 255 255 / 5%);

			box-shadow:
				0 3px 4px rgba(0, 0, 0, 0.1),
				inset 0 1px 0 0 rgb(255 255 255 / 5%),
				inset 0 0 0 1px rgb(255 255 255 / 2%);
		}
	}
</style>
