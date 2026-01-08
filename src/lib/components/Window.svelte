<script lang="ts">
	import { Previous } from 'runed';
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { innerWidth, innerHeight } from 'svelte/reactivity/window';

	type Props = SvelteHTMLElements['div'] & {
		children: Snippet;
		ref?: HTMLDivElement;
	};

	let { children, ref = $bindable(), class: className, ...rest }: Props = $props();

	const defaults = {
		initiallyMaximized: false,
		initiallyFullscreen: false,
		initialWidth: 768,
		initialHeight: 420
	};

	class Clamped {
		#value: number;
		#min: number;
		#max: number;
		constructor(value: number, { min, max }: { min?: () => number; max?: () => number }) {
			this.#value = value;
			this.#min = $derived(min?.() ?? -Infinity);
			this.#max = $derived(max?.() ?? Infinity);
		}
		get value() {
			return this.#value;
		}
		set value(value: number) {
			this.#value = Math.max(this.#min, Math.min(value, this.#max));
		}
	}

	class OSWindow {
		ref: HTMLDivElement | undefined = $state();

		#left: number = $state(0);
		#top: number = $state(0);
		#width: number = $state();
		#height: number = $state();

		#previousLeft: number | undefined;
		#previousTop: number | undefined;
		#previousWidth: number | undefined;
		#previousHeight: number | undefined;

		#maximized: boolean = $state(false);
		#fullscreen: boolean = $state(false);

		constructor(options?: {
			ref?: HTMLDivElement;
			initiallyMaximized?: boolean;
			initiallyFullscreen?: boolean;
			initialWidth?: number;
			initialHeight?: number;
		}) {
			const { ref, initiallyMaximized, initiallyFullscreen, initialWidth, initialHeight } = {
				...defaults,
				...options
			};

			if (ref) this.ref = ref;

			// this.#left = new Clamped(0, { min: () => 0, max: () => innerWidth.current - this.#width });
			// this.#top = new Clamped(0, { min: () => 0, max: () => innerHeight.current });

			if (initiallyFullscreen) this.toggleFullscreen(true);
			else if (initiallyMaximized) this.maximize();
			else {
				this.#width = initialWidth;
				this.#height = initialHeight;
				this.#previousWidth = initialWidth;
				this.#previousHeight = initialHeight;
			}
		}

		get left() {
			return this.#left;
		}

		get top() {
			return this.#top;
		}

		get width() {
			return this.#width;
		}

		get height() {
			return this.#height;
		}

		maximize = () => {
			this.#previousWidth = this.#width;
			this.#previousHeight = this.#height;

			this.#width = innerWidth.current;
			this.#height = innerHeight.current;

			this.#maximized = true;
		};

		minimize = () => {
			this.#width = this.#previousWidth;
			this.#height = this.#previousHeight;
			this.#maximized = false;
		};

		toggleSize = () => {
			if (this.#maximized) {
				this.minimize();
			} else {
				this.maximize();
			}
		};

		toggleFullscreen = (value?: boolean) => {
			//do stuff
			this.#fullscreen = typeof value === 'boolean' ? value : !this.#fullscreen;
		};

		title_bar: Attachment = (node: Element) => {
			let lastX = 0;
			let lastY = 0;
			let isDragging = false;
			let mouseIsDown = false;
			let lastClick = 0;
			let isDoubleClick = false;

			const handleClick = (e: MouseEvent) => {
				const click = Date.now();
				isDoubleClick = click - lastClick < 300;
				lastClick = click;
			};

			const handleMouseDown = (e: MouseEvent) => {
				mouseIsDown = true;
				lastX = e.clientX;
				lastY = e.clientY;
				this.ref?.style.setProperty('user-select', 'none');
				this.ref?.style.setProperty('-webkit-user-select', 'none');
			};

			const handleMouseEnd = (e: MouseEvent) => {
				mouseIsDown = false;
				this.ref?.style.setProperty('user-select', 'initial');
				this.ref?.style.setProperty('-webkit-user-select', 'initial');
			};

			const handleMouseMove = (e: MouseEvent) => {
				if (!mouseIsDown) return;
				const deltaX = e.clientX - lastX;
				const deltaY = e.clientY - lastY;
				this.#left += deltaX;
				this.#top += deltaY;
				lastX = e.clientX;
				lastY = e.clientY;
			};

			if (node instanceof HTMLElement) {
				node.addEventListener('click', handleClick);
				node.addEventListener('mousedown', handleMouseDown);
				this.ref?.addEventListener('mousemove', handleMouseMove);
				this.ref?.addEventListener('mouseup', handleMouseEnd);
			}

			return () => {
				if (node instanceof HTMLElement) {
					node.removeEventListener('click', handleClick);
					node.removeEventListener('mousedown', handleMouseDown);
					this.ref?.removeEventListener('mousemove', handleMouseMove);
					this.ref?.removeEventListener('mouseup', handleMouseEnd);
				}
			};
		};
	}

	const self = $derived(new OSWindow({ ref }));
</script>

<div class="absolute h-fit w-fit" style:left="{self.left}px" style:top="{self.top}px">
	<div
		bind:this={ref}
		{...rest}
		class={[
			'window relative z-10 overflow-hidden rounded-lg bg-[#f2f2f2] shadow-2xl transition-[width,height,top,left]',
			className
		]}
		style:width="{self.width}px"
		style:height="{self.height}px"
	>
		<div class="flex h-12 bg-[#ddd]" {@attach self.title_bar}>
			<!--  -->
			<div
				class="ml-auto flex items-center *:flex *:size-12 *:items-center *:justify-center *:hover:bg-[#ccc]"
			>
				<button title="Minimize window" onclick={self.minimize}>
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
				<button title="Maximize window" onclick={self.maximize}>
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
				<button title="Close window">
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
			{@render children()}
		</div>
	</div>
	<!-- Top -->
	<div class="absolute -top-1 right-1 left-1 z-20 h-2 cursor-row-resize"></div>
	<!-- North west -->
	<div class="absolute -top-1 -left-1 z-20 h-2 w-2 cursor-nw-resize"></div>
	<!-- North east -->
	<div class="absolute -top-1 -right-1 z-20 w-2 cursor-ne-resize"></div>
	<!-- Left -->
	<div class="absolute top-1 bottom-1 -left-1 z-20 w-2 cursor-col-resize"></div>
	<!-- Right -->
	<div class="absolute top-1 -right-1 bottom-1 z-20 w-2 cursor-col-resize"></div>
	<!-- Bottom -->
	<div class="absolute right-1 -bottom-1 left-1 z-20 h-2 cursor-row-resize"></div>
</div>
