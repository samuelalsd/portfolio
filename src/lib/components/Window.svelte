<script lang="ts">
	import { WindowsManager, type OSWindow } from '$lib/os/Window.svelte';
	import { onDestroy } from 'svelte';

	type Props = {
		self: OSWindow;
	};

	let { self }: Props = $props();

	onDestroy(() => {
		console.log('clearing instance...');
		self.clearInstance();
	});
</script>

<div
	bind:this={self.wrapper}
	class="absolute h-fit w-fit origin-bottom rounded-lg bg-white/50 shadow-xl transition-[top,left]"
	tabindex="0"
	role="dialog"
	onmousedown={() => WindowsManager.focusWindow(self)}
>
	<div class="rounded-lg bg-white/50 shadow-xl" {@attach self.resizeHelper}></div>
	<div
		bind:this={self.ref}
		data-maximized={self.isMaximized}
		class="group/window relative z-10 flex origin-bottom flex-col items-stretch overflow-hidden transition-[width,height] data-[maximized=false]:rounded-lg"
	>
		<header
			class="z-1 flex shrink-0 bg-[#131313] text-white group-data-[maximized=false]/window:rounded-t-lg"
		>
			<div class="flex flex-1 items-center justify-start px-3" {@attach self.titleBar}>
				{self.title}
			</div>
			<div
				class="ml-auto flex items-center *:flex *:size-8 *:items-center *:justify-center *:hover:bg-white/10"
			>
				<button
					title="Minimize window"
					onclick={() => {
						self.toggleMinimized(true);
					}}
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						xmlns:xlink="http://www.w3.org/1999/xlink"
						role="img"
						class="size-5"
					>
						<path
							d="M19.002 12L5.00001 12"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							vector-effect="non-scaling-stroke"
						></path>
					</svg>
				</button>
				<button title="Maximize window" onclick={() => self.toggleMaximized()}>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						xmlns:xlink="http://www.w3.org/1999/xlink"
						role="img"
						height="16"
					>
						<path
							d="M16 2H12C9.17157 2 7.75736 2 6.87868 2.94627C6 3.89254 6 5.41554 6 8.46154V9.53846C6 12.5845 6 14.1075 6.87868 15.0537C7.75736 16 9.17157 16 12 16H16C18.8284 16 20.2426 16 21.1213 15.0537C22 14.1075 22 12.5845 22 9.53846V8.46154C22 5.41554 22 3.89254 21.1213 2.94627C20.2426 2 18.8284 2 16 2Z"
							stroke="currentColor"
							stroke-width="1.5"
							vector-effect="non-scaling-stroke"
						></path>
						<path
							d="M18 16.6082C17.9879 18.9537 17.8914 20.2239 17.123 21.0525C16.2442 22 14.8298 22 12.0011 22H8.00065C5.17192 22 3.75755 22 2.87878 21.0525C2 20.1049 2 18.5799 2 15.5298V14.4515C2 11.4014 2 9.87638 2.87878 8.92885C3.52015 8.2373 4.44682 8.05047 6.00043 8"
							stroke="currentColor"
							stroke-width="1.5"
							vector-effect="non-scaling-stroke"
						></path>
					</svg>
				</button>
				<button title="Close window" onclick={() => self.destroy()}>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						xmlns:xlink="http://www.w3.org/1999/xlink"
						role="img"
						class="size-5"
					>
						<path
							d="M18 6L6.00081 17.9992M17.9992 18L6 6.00085"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							vector-effect="non-scaling-stroke"
						></path>
					</svg>
				</button>
			</div>
		</header>
		<div
			class="relative h-full flex-1 overflow-hidden rounded-b-lg border border-solid border-[#ddd] bg-[#f2f2f2]"
		>
			{@render self.children()}
		</div>
	</div>
	<!-- Top -->
	<div
		class="absolute -top-1 right-1 left-1 z-20 h-2 cursor-n-resize"
		{@attach self.resizeHandle('top')}
	></div>
	<!-- North west -->
	<div
		class="absolute -top-1 -left-1 z-20 h-2 w-2 cursor-nw-resize"
		{@attach self.resizeHandle('nw')}
	></div>
	<!-- North east -->
	<div
		class="absolute -top-1 -right-1 z-20 h-2 w-2 cursor-ne-resize"
		{@attach self.resizeHandle('ne')}
	></div>
	<!-- South west -->
	<div
		class="absolute -bottom-1 -left-1 z-20 h-2 w-2 cursor-sw-resize"
		{@attach self.resizeHandle('sw')}
	></div>
	<!-- South east -->
	<div
		class="absolute -right-1 -bottom-1 z-20 h-2 w-2 cursor-se-resize"
		{@attach self.resizeHandle('se')}
	></div>
	<!-- Left -->
	<div
		class="absolute top-1 bottom-1 -left-1 z-20 w-2 cursor-w-resize"
		{@attach self.resizeHandle('left')}
	></div>
	<!-- Right -->
	<div
		class="absolute top-1 -right-1 bottom-1 z-20 w-2 cursor-e-resize"
		{@attach self.resizeHandle('right')}
	></div>
	<!-- Bottom -->
	<div
		class="absolute right-1 -bottom-1 left-1 z-20 h-2 cursor-s-resize"
		{@attach self.resizeHandle('bottom')}
	></div>
</div>

<style lang="postcss">
	@reference 'tailwindcss';
	header {
		box-shadow:
			0 3px 4px rgba(0, 0, 0, 0.075),
			inset 0 -1px 0 0 rgb(255 255 255 / 10%),
			inset 0 1.5px 0 0 rgb(255 255 255 / 10%);
	}
</style>
