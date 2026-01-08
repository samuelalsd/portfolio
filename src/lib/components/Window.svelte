<script lang="ts">
	import { WindowsManager, type OSWindow } from '$lib/os/Window.svelte';

	type Props = {
		self: OSWindow;
	};

	let { self }: Props = $props();
</script>

<div
	bind:this={self.wrapper}
	class="absolute h-fit w-fit transition-[top,left]"
	tabindex="0"
	role="dialog"
	onclick={() => WindowsManager.moveOnTop(self)}
	onfocus={() => WindowsManager.moveOnTop(self)}
	onkeyup={(e) => {
		if (e.key === 'Space' || e.key === 'Enter') {
			WindowsManager.moveOnTop(self);
		}
	}}
>
	<div
		bind:this={self.ref}
		class="window relative z-10 origin-center overflow-hidden rounded-lg bg-[#f2f2f2] shadow-2xl transition-[width,height]"
	>
		<div class="flex bg-[#ddd]">
			<div class="flex flex-1 items-center justify-center" {@attach self.titleBar}>
				{self.title}
				<div>
					<span
						>{self.width.current}x{self.height.current}px - x: {self.left.current}, y: {self.top
							.current}</span
					>
				</div>
			</div>
			<div
				class="ml-auto flex items-center *:flex *:size-11 *:items-center *:justify-center *:hover:bg-[#ccc]"
			>
				<button title="Minimize window">
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
				<button title="Maximize window" onclick={self.toggleSize}>
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
		</div>
		<div>
			{@render self.children()}
		</div>
	</div>
	<!-- Top -->
	<div
		class="absolute -top-1 right-1 left-1 z-20 h-2 cursor-row-resize bg-[red]"
		{@attach self.resizeHandle('top')}
	></div>
	<!-- North west -->
	<div
		class="absolute -top-1 -left-1 z-20 h-2 w-2 cursor-nw-resize bg-[red]"
		{@attach self.resizeHandle('nw')}
	></div>
	<!-- North east -->
	<div
		class="absolute -top-1 -right-1 z-20 h-2 w-2 cursor-ne-resize bg-[red]"
		{@attach self.resizeHandle('ne')}
	></div>
	<!-- South west -->
	<div
		class="absolute -bottom-1 -left-1 z-20 h-2 w-2 cursor-sw-resize bg-[red]"
		{@attach self.resizeHandle('sw')}
	></div>
	<!-- South east -->
	<div
		class="absolute -right-1 -bottom-1 z-20 h-2 w-2 cursor-se-resize bg-[red]"
		{@attach self.resizeHandle('se')}
	></div>
	<!-- Left -->
	<div
		class="absolute top-1 bottom-1 -left-1 z-20 w-2 cursor-col-resize bg-[red]"
		{@attach self.resizeHandle('left')}
	></div>
	<!-- Right -->
	<div
		class="absolute top-1 -right-1 bottom-1 z-20 w-2 cursor-col-resize bg-[red]"
		{@attach self.resizeHandle('right')}
	></div>
	<!-- Bottom -->
	<div
		class="absolute right-1 -bottom-1 left-1 z-20 h-2 cursor-row-resize bg-[red]"
		{@attach self.resizeHandle('bottom')}
	></div>
</div>
