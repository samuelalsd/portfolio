<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SvelteDate } from 'svelte/reactivity';
	import { CurrentDateTime } from '$lib/utils/datetime.svelte';
	import { asset } from '$app/paths';

	let { children } = $props();

	const currentDateTime = new CurrentDateTime();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<img
	src={asset('/images/wallpapers/default.jpg')}
	alt="Wallpaper"
	class="fixed h-svh w-svw object-cover mix-blend-plus-darker"
/>

<header class="flex justify-between bg-white/50 px-6 py-1.5 backdrop-blur-3xl">
	<div>
		<!-- Icon -->
		<nav>
			<!-- Dynamic header based on MacOs interface -->
		</nav>
	</div>
	<div class="flex">
		<div>
			<!-- Date: show a tooltip with the full date -->
			{currentDateTime.formattedDate}
		</div>
	</div>
</header>

{@render children()}
