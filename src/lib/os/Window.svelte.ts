import { mount, unmount, type Snippet } from 'svelte';
import { innerHeight, innerWidth } from 'svelte/reactivity/window';
import type { Attachment } from 'svelte/attachments';
import { browser } from '$app/environment';
import { Clamped } from '$lib/utils/number';
import Window from '$lib/components/Window.svelte';

const defaults = {
	initiallyMaximized: false,
	initiallyFullscreen: false,
	initialWidth: 768,
	initialHeight: 420,
	minWidth: 384,
	minHeight: 192
};

interface OSWindowOptions {
	title: string;
	wrapper?: HTMLDivElement;
	ref?: HTMLDivElement;
	initiallyMaximized?: boolean;
	initiallyFullscreen?: boolean;
	initialWidth?: number;
	initialHeight?: number;
	minWidth?: number;
	minHeight?: number;
}

export class OSWindows {
	#stack: OSWindow[] = $state([]);

	getStackPosition = $derived((w: OSWindow) => {
		const index = this.#stack.indexOf(w);
		return index !== -1 ? index : -1;
	});

	get stack() {
		return this.#stack;
	}

	open(children: Snippet, options: OSWindowOptions) {
		const w = new OSWindow(children, options);
		this.#stack.push(w);
		w.render();
		return w;
	}

	destroy(w: OSWindow) {
		w.destroy();
		const index = this.#stack.indexOf(w);
		if (index !== -1) this.#stack.splice(index, 1);
	}

	destroyAll() {
		this.#stack.forEach(this.destroy);
	}

	moveOnTop(w: OSWindow) {
		if (this.#stack.length < 2) return;
		const index = this.#stack.indexOf(w);
		if (index !== -1 && index !== this.#stack.length - 1) {
			this.#stack.splice(index, 1);
			this.#stack.push(w);
			this.#stack = [...this.#stack];
		}
	}
}

export const WindowsManager = new OSWindows();

export class OSWindow {
	wrapper: HTMLDivElement | undefined = $state();
	ref: HTMLDivElement | undefined = $state();
	title: string;

	#instance: ReturnType<typeof mount> | null = null;
	#children: Snippet;

	#minWidth: number;
	#minHeight: number;

	#width: Clamped;
	#height: Clamped;
	#left: Clamped;
	#top: Clamped;

	#previousLeft: number | undefined;
	#previousTop: number | undefined;
	#previousWidth: number | undefined;
	#previousHeight: number | undefined;

	#maximized: boolean = $state(false);
	#fullscreen: boolean = $state(false);

	constructor(children: Snippet, options: OSWindowOptions) {
		if (!browser) throw new Error('OSWindow cannot be created outside of a browser environment.');

		const {
			ref,
			wrapper,
			title,
			initiallyMaximized,
			initiallyFullscreen,
			initialWidth,
			initialHeight,
			minWidth,
			minHeight
		} = {
			...defaults,
			...options
		};

		this.#children = children;
		this.title = title;
		this.wrapper = wrapper;
		this.ref = ref;

		this.#minWidth = minWidth;
		this.#minHeight = minHeight;

		this.#width = new Clamped(initialWidth, {
			min: this.#minWidth,
			max: () => innerWidth.current!
		});
		this.#height = new Clamped(initialHeight, {
			min: this.#minHeight,
			max: () => innerHeight.current!
		});
		this.#left = new Clamped(0, { min: 0, max: () => innerWidth.current! - this.#width.current });
		this.#top = new Clamped(0, { min: 0, max: () => innerHeight.current! - this.#height.current });

		if (initiallyFullscreen) this.toggleFullscreen(true);
		else if (initiallyMaximized) this.maximize();
		else {
			this.#width.current = initialWidth;
			this.#height.current = initialHeight;
			this.#previousWidth = initialWidth;
			this.#previousHeight = initialHeight;
		}

		$effect.root(() => {
			$effect(() => {
				if (this.wrapper) {
					this.wrapper.style.setProperty('left', `${this.#left.current}px`);
					this.wrapper.style.setProperty('top', `${this.#top.current}px`);
				}
			});

			$effect(() => {
				if (this.ref) {
					this.ref.style.setProperty('width', `${this.#width.current}px`);
					this.ref.style.setProperty('height', `${this.#height.current}px`);
				}
			});

			$effect(() => {
				if (this.ref) {
					this.ref.style.setProperty(
						'z-index',
						(WindowsManager.getStackPosition(this) + 20).toString()
					);
				}
			});
		});
	}

	get children() {
		return this.#children;
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

	render = () => {
		const main = document.querySelector('main');
		if (!main) throw new Error('<main> HTML element not found.');
		if (this.#instance) return;
		this.#instance = mount(Window, {
			target: main,
			props: {
				self: this
			}
		});
	};

	destroy = () => {
		if (!this.#instance) return;
		unmount(this.#instance, { outro: true });
		this.#instance = null;
		WindowsManager.destroy(this);
	};

	maximize = () => {
		if (this.#maximized) return;

		this.#previousWidth = this.#width.current;
		this.#previousHeight = this.#height.current;
		this.#previousLeft = this.#left.current;
		this.#previousTop = this.#top.current;

		if (innerWidth.current) {
			this.#width.current = innerWidth.current;
		}
		if (innerHeight.current) {
			this.#height.current = innerHeight.current;
		}

		this.#left.current = 0;
		this.#top.current = 0;

		this.#maximized = true;
	};

	minimize = ({
		left = this.#previousLeft,
		top = this.#previousTop
	}: { left?: number; top?: number } = {}) => {
		if (!this.#maximized) return;

		if (typeof this.#previousWidth === 'number') {
			this.#width.current = this.#previousWidth;
		}
		if (typeof this.#previousHeight === 'number') {
			this.#height.current = this.#previousHeight;
		}
		if (left) this.#left.current = left;
		if (top) this.#top.current = top;

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

	resizeHandle: (
		position: 'top' | 'bottom' | 'left' | 'right' | 'ne' | 'nw' | 'se' | 'sw'
	) => Attachment = (position) => {
		return (node: Element) => {
			if (!(node instanceof HTMLElement))
				throw new Error('Invalid element: only HTMLElement supported.');
			let mouseIsDown = false;
			let lastX = 0;
			let lastY = 0;
			const main = document.querySelector('main');

			if (!main) throw new Error('<main> HTML element not found.');

			const setMoveStyles = () => {
				document.body.style.setProperty('user-select', 'none');
				document.body.style.setProperty('-webkit-user-select', 'none');
				this.wrapper?.style.setProperty('transition', 'none');
				this.ref?.style.setProperty('transition', 'none');
			};

			const resetStyles = () => {
				document.body.style.setProperty('user-select', 'initial');
				document.body.style.setProperty('-webkit-user-select', 'initial');
				this.wrapper?.style.removeProperty('transition');
				this.ref?.style.removeProperty('transition');
			};

			const handleMouseDown = (e: MouseEvent) => {
				mouseIsDown = true;
				lastX = e.clientX;
				lastY = e.clientY;
				setMoveStyles();
				document.addEventListener('mousemove', handleMouseMove);
				document.addEventListener('mouseup', handleMouseUp);
				document.body.addEventListener('mouseenter', handleMouseEnter);
				document.body.addEventListener('mouseleave', handleMouseLeave);
			};

			const handleMouseMove = (e: MouseEvent) => {
				if (!mouseIsDown) return;
				console.log('mouse is moving');
				const deltaX = e.clientX - lastX;
				const deltaY = e.clientY - lastY;

				if (position === 'left' && (deltaX > 0 || e.clientX <= this.#left.current)) {
					if (deltaX < 0 || this.#width.current > this.#minWidth) {
						this.#left.current += deltaX;
					}
					this.#width.current -= deltaX;
				}

				if (
					position === 'right' &&
					((deltaX > 0 &&
						e.clientX >= 0 &&
						e.clientX >= this.#left.current &&
						e.clientX <= innerWidth.current! &&
						e.clientX >= this.#left.current + this.#width.current) ||
						deltaX < 0)
				) {
					this.#width.current += deltaX;
				}

				if (position === 'top' && (deltaY > 0 || e.clientY <= this.#top.current)) {
					if (deltaY < 0 || this.#height.current > this.#minHeight) {
						console.log('deltaY', deltaY);
						console.log('this.#height.current', this.#height.current);
						this.#top.current += deltaY;
					}
					this.#height.current -= deltaY;
				}

				lastX = e.clientX;
				lastY = e.clientY;
			};

			const handleMouseEnter = (e: MouseEvent) => {
				mouseIsDown = true;
			};

			const handleMouseLeave = (e: MouseEvent) => {
				if (position === 'right' && e.clientX > innerWidth.current!) {
					this.#width.current = innerWidth.current! - this.#left.current;
				}

				if (position === 'left' && e.clientX < 0) {
					this.#width.current += this.#left.current;
					this.#left.current = 0;
				}

				mouseIsDown = false;
				// resetStyles();
			};

			const handleMouseUp = () => {
				resetStyles();
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
				document.body.removeEventListener('mouseleave', handleMouseLeave);
			};

			node.addEventListener('mousedown', handleMouseDown);

			return () => {
				node.removeEventListener('mousedown', handleMouseDown);
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
				document.body.removeEventListener('mouseenter', handleMouseEnter);
				document.body.removeEventListener('mouseleave', handleMouseLeave);
			};
		};
	};

	titleBar: Attachment = (node: Element) => {
		let lastX = 0;
		let lastY = 0;
		let mouseIsDown = false;
		const main = document.querySelector('main');

		if (!main) throw new Error('<main> HTML element not found.');

		const setMoveStyles = () => {
			this.ref?.style.setProperty('user-select', 'none');
			this.ref?.style.setProperty('-webkit-user-select', 'none');
			this.wrapper?.style.setProperty('transition', 'none');
			this.ref?.style.setProperty('transition', 'none');
		};

		const resetStyles = () => {
			this.ref?.style.setProperty('user-select', 'initial');
			this.ref?.style.setProperty('-webkit-user-select', 'initial');
			this.wrapper?.style.removeProperty('transition');
			this.ref?.style.removeProperty('transition');
		};

		const handleMouseDown = (e: MouseEvent) => {
			mouseIsDown = true;
			lastX = e.clientX;
			lastY = e.clientY;
			setMoveStyles();
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			document.body.addEventListener('mouseleave', handleMouseLeave);
		};

		const handleMouseUp = () => {
			mouseIsDown = false;
			resetStyles();
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.body.removeEventListener('mouseleave', handleMouseLeave);
		};

		const handleMouseMove = (e: MouseEvent) => {
			if (!mouseIsDown) return;
			if (this.#maximized) {
				console.log(e);
				// this.minimize();
			}
			const deltaX = e.clientX - lastX;
			const deltaY = e.clientY - lastY;
			this.#left.current += deltaX;
			this.#top.current += deltaY;
			lastX = e.clientX;
			lastY = e.clientY;
		};

		const handleMouseLeave = () => {
			mouseIsDown = false;
			resetStyles();
		};

		if (node instanceof HTMLElement) {
			node.addEventListener('mousedown', handleMouseDown);
		}

		return () => {
			if (node instanceof HTMLElement) {
				node.removeEventListener('mousedown', handleMouseDown);
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
				document.body.removeEventListener('mouseleave', handleMouseLeave);
			}
		};
	};
}
