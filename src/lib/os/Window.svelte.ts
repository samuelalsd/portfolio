import { mount, tick, unmount, type MountOptions, type Snippet } from 'svelte';
import { innerHeight, innerWidth } from 'svelte/reactivity/window';
import type { Attachment } from 'svelte/attachments';
import { browser } from '$app/environment';
import { clamp, Clamped } from '$lib/utils/number';
import Window from '$lib/components/Window.svelte';
import gsap from 'gsap';
import { Timer } from '$lib/utils/async';
import { merge } from '$lib/utils/object';

const defaults = {
	initiallyMaximized: false,
	initiallyFullscreen: false,
	initialRect: {
		width: 768,
		height: 420,
		top: 0,
		left: 0
	},
	minWidth: 384,
	minHeight: 192
} as const;

interface OSWindowOptions {
	title: string;
	target?: Exclude<MountOptions['target'], Document> | string;
	wrapper?: HTMLDivElement;
	ref?: HTMLDivElement;
	initiallyMaximized?: boolean;
	initiallyFullscreen?: boolean;
	initialRect?: {
		width?: number;
		height?: number;
		top?: number;
		left?: number;
	};
	minWidth?: number;
	minHeight?: number;
}

export class OSWindows {
	#stack: OSWindow[] = $state([]);
	#positions: string[] = $state([]);

	getStackPosition = $derived((w: OSWindow) => {
		const index = this.#positions.indexOf(w.id);
		return index !== -1 ? index : -1;
	});

	get stack() {
		return this.#stack;
	}

	open(children: Snippet, options: OSWindowOptions) {
		const w = new OSWindow(children, options);
		this.#stack.push(w);
		this.#positions.push(w.id);
		w.render();
		return w;
	}

	destroy(w: OSWindow) {
		w.destroy();
		const index = this.#stack.indexOf(w);
		if (index !== -1) {
			this.#stack.splice(index, 1);
			this.#positions = this.#positions.filter((id) => id !== w.id);
		}
	}

	destroyAll() {
		this.#stack.forEach((w) => w.destroy());
		this.#stack = [];
		this.#positions = [];
	}

	focusWindow(w: OSWindow) {
		if (this.#stack.length < 2) return;
		const index = this.#positions.indexOf(w.id);
		if (index !== -1 && index !== this.#positions.length - 1) {
			this.#positions.splice(index, 1);
			this.#positions.push(w.id);
			this.#positions = [...this.#positions];
		}
	}

	windowHasFocus(w: OSWindow) {
		return this.#positions.at(-1) === w.id && !w.isMinimized;
	}
}

export const WindowsManager = new OSWindows();

export class OSWindow {
	#id: string = $state(`w${WindowsManager.stack.length + 1}-${Date.now()}`);
	#target: HTMLElement;
	#instance: ReturnType<typeof mount> | null = null;
	#children: Snippet;
	#minWidth: number;
	#minHeight: number;

	#width: number;
	#height: number;
	#left: number;
	#top: number;

	#previousLeft: number | undefined;
	#previousTop: number | undefined;
	#previousWidth: number | undefined;
	#previousHeight: number | undefined;
	#minimized: boolean = $state(false);
	#maximized: boolean = $state(false);
	#fullscreen: boolean = $state(false);

	#syncHelperRect: boolean = $state(true);

	#saveRect = () => {
		this.#previousWidth = this.#width;
		this.#previousHeight = this.#height;
		this.#previousLeft = this.#left;
		this.#previousTop = this.#top;
		console.log('saving top...', this.#top);
		console.log('saving left...', this.#left);
		console.log('saving width...', this.#width);
		console.log('saving height...', this.#height);
	};

	#updateRect = (
		{ left, top, width, height }: Partial<Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>> = {},
		force = false
	) => {
		if (force) {
			if (typeof left === 'number') this.#left = left;
			if (typeof top === 'number') this.#top = top;
			if (typeof width === 'number') this.#width = width;
			if (typeof height === 'number') this.#height = height;
		} else {
			if (typeof left === 'number')
				this.#left = clamp(left, -this.#target.clientWidth + 64, this.#target.clientWidth - 64);
			if (typeof top === 'number') this.#top = clamp(top, 0, this.#target.clientHeight - 64);
			if (typeof width === 'number')
				this.#width = clamp(width, this.#minWidth, this.#target.clientWidth);
			if (typeof height === 'number')
				this.#height = clamp(height, this.#minHeight, this.#target.clientHeight);
		}
	};

	dockSpace: HTMLElement | undefined = $state();
	#resizeHelper: HTMLElement | undefined = $state();
	wrapper: HTMLDivElement | undefined = $state();
	ref: HTMLDivElement | undefined = $state();
	title: string;

	constructor(children: Snippet, options: OSWindowOptions) {
		if (!browser) throw new Error('OSWindow cannot be created outside of a browser environment.');

		const {
			ref,
			wrapper,
			target = document.querySelector('main'),
			title,
			initiallyMaximized,
			initiallyFullscreen,
			initialRect,
			minWidth,
			minHeight
		} = merge.withOptions({ allowUndefinedOverrides: false }, defaults, options);

		if (typeof target === 'string') {
			const found = document.querySelector(target);
			if (!found) throw new Error(`Target element with selector "${target}" not found.`);
			if (!(found instanceof HTMLElement))
				throw new Error('Target element must be an HTMLElement.');
			this.#target = found;
		} else if (target instanceof HTMLElement) {
			this.#target = target;
		} else {
			throw new Error('Invalid target element.');
		}

		this.title = title;
		this.wrapper = wrapper;
		this.ref = ref;
		this.#children = children;
		this.#minWidth = minWidth!;
		this.#minHeight = minHeight!;

		this.#width = $state(initialRect!.width!);
		this.#height = $state(initialRect!.height!);
		this.#left = $state(initialRect!.left!);
		this.#top = $state(initialRect!.top!);

		if (initiallyFullscreen) this.toggleFullscreen(true);
		else if (initiallyMaximized) this.toggleMaximized(true);
		else this.#saveRect();

		$effect.root(() => {
			$effect(() => {
				if (this.wrapper) {
					this.wrapper.style.setProperty('left', `${this.#left}px`);
					this.wrapper.style.setProperty('top', `${this.#top}px`);
				}
			});

			$effect(() => {
				if (this.ref) {
					this.ref.style.setProperty('width', `${this.#width}px`);
					this.ref.style.setProperty('height', `${this.#height}px`);
				}
			});

			$effect(() => {
				if (this.wrapper) {
					this.wrapper.style.setProperty(
						'z-index',
						(WindowsManager.getStackPosition(this) + 20).toString()
					);
				}
			});
		});
	}

	get id() {
		return this.#id;
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

	get instance() {
		return this.#instance;
	}

	get isMinimized() {
		return this.#minimized;
	}

	get isMaximized() {
		return this.#maximized;
	}

	setId = (id: string) => {
		// if (this.#id) throw new Error(`Cannot override ID: it was already set as ${this.#id}`);
		this.#id = id;
	};

	clearInstance = () => {
		this.#instance = null;
	};

	render = () => {
		if (this.#instance) return;
		this.#instance = mount(Window, {
			target: this.#target,
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

	toggleMinimized: {
		(value?: true): void;
		(value?: false, rect?: Partial<Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>>): void;
	} = (
		value,
		{
			left = this.#previousLeft,
			top = this.#previousTop,
			width = this.#previousWidth,
			height = this.#previousHeight
		} = {}
	) => {
		if (!this.dockSpace || !this.wrapper || !this.ref) return;

		if (!WindowsManager.windowHasFocus(this) && !this.#minimized) {
			WindowsManager.focusWindow(this);
			return;
		}

		const newState = typeof value === 'boolean' ? value : !this.#minimized;

		if (newState) {
			this.#saveRect();
			this.#updateRect(this.dockSpace.getBoundingClientRect(), true);
			const timer = new Timer(() => {
				this.wrapper!.hidden = true;
				this.#minimized = true;
			}, 300);
			// gsap.to(this.wrapper, {
			// 	scale: 0,
			// 	x: rect.x + rect.width / 2 - this.#left,
			// 	y: rect.y - rect.height / 2 - this.#top,
			// 	transformOrigin: `bottom center ${this.#target.clientHeight - rect.top + rect.height / 2}px`,
			// 	duration: 0.3,
			// 	ease: 'power2.inOut',
			// 	onComplete: () => {
			// 		this.wrapper!.hidden = true;
			// 		this.#minimized = true;
			// 	}
			// });
		} else {
			this.wrapper!.hidden = false;
			const timer = new Timer(() => {
				this.#updateRect({ left, top, width, height });
				this.#minimized = false;
			}, 50);
			// gsap.to(this.wrapper, {
			// 	scale: 1,
			// 	x: 0,
			// 	y: 0,
			// 	transformOrigin: `bottom center ${this.#target.clientHeight - rect.top + rect.height / 2}px`,
			// 	duration: 0.3,
			// 	ease: 'power2.inOut',
			// 	onComplete: () => {
			// 		WindowsManager.focusWindow(this);
			// 		this.#minimized = false;
			// 	}
			// });
		}
	};

	toggleMaximized: {
		(value?: true): void;
		(value?: false, rect?: Partial<Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>>): void;
	} = (
		value,
		{
			width = this.#previousWidth,
			height = this.#previousHeight,
			left = this.#previousLeft,
			top = this.#previousTop
		} = {}
	) => {
		const newState = typeof value === 'boolean' ? value : !this.#maximized;
		if (newState) {
			const rect = this.#target.getBoundingClientRect();
			this.#saveRect();
			this.#updateRect({ left: 0, top: 0, width: rect.width, height: rect.height });
		} else {
			this.#updateRect({
				width,
				height,
				left,
				top
			});
		}
		this.#maximized = newState;
	};

	toggleFullscreen = (value?: boolean) => {
		//do stuff
		this.#fullscreen = typeof value === 'boolean' ? value : !this.#fullscreen;
		// this.ref.style.setProperty('position', 'fixed');
	};

	resizeHandle: (
		position: 'top' | 'bottom' | 'left' | 'right' | 'ne' | 'nw' | 'se' | 'sw'
	) => Attachment = (position, container = this.#target) => {
		return (node: Element) => {
			if (!(node instanceof HTMLElement))
				throw new Error('Invalid element: only HTMLElement supported.');

			let mouseIsDown = false;
			let startingX = 0;
			let startingY = 0;
			let startingWidth = 0;
			let startingHeight = 0;
			let startingMouseX = 0;
			let startingMouseY = 0;
			let transitioned = false;

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

			const snapLeft = () => {
				this.#updateRect({
					width: this.#width + this.#left,
					left: 0
				});
			};
			const snapRight = (rect: DOMRect) => {
				this.#updateRect({
					width: rect.width - startingX + rect.x
				});
			};
			const snapTop = () => {
				this.#updateRect({
					height: this.#height + this.#top,
					top: 0
				});
			};
			const snapBottom = (rect: DOMRect) => {
				this.#updateRect({
					height: rect.height - startingY + rect.y
				});
			};
			const snapVertical = (rect: DOMRect) => {
				this.#updateRect({
					height: rect.height,
					top: 0
				});
			};

			const resizeLeft = (deltaMouseX: number, rect: DOMRect) => {
				this.#updateRect({
					width: startingWidth - deltaMouseX,
					left: startingX + deltaMouseX - rect.x
				});
			};
			const resizeRight = (deltaMouseX: number) => {
				this.#updateRect({
					width: startingWidth + deltaMouseX
				});
			};
			const resizeTop = (deltaMouseY: number, rect: DOMRect) => {
				this.#updateRect({
					height: startingHeight - deltaMouseY,
					top: startingY + deltaMouseY - rect.y
				});
			};
			const resizeBottom = (deltaMouseY: number) => {
				this.#updateRect({
					height: startingHeight + deltaMouseY
				});
			};

			const handleMouseDown = (e: MouseEvent) => {
				if (!this.ref) throw new Error('Window reference not found.');
				e.preventDefault();

				mouseIsDown = true;

				const rect = this.ref.getBoundingClientRect();

				startingX = rect.x;
				startingY = rect.y;
				startingWidth = rect.width;
				startingHeight = rect.height;
				startingMouseX = e.clientX;
				startingMouseY = e.clientY;

				setMoveStyles();

				document.addEventListener('mousemove', handleMouseMove);
				document.addEventListener('mouseup', handleMouseUp);
			};

			const handleMouseMove = (e: MouseEvent) => {
				if (!mouseIsDown) return;

				const rect = container.getBoundingClientRect();
				const deltaMouseX = e.clientX - startingMouseX;
				const deltaMouseY = e.clientY - startingMouseY;
				const overflowTop = e.clientY < rect.y;
				const overflowRight = e.clientX > rect.width + rect.x;
				const overflowBottom = e.clientY > rect.height + rect.y;
				const overflowLeft = e.clientX < rect.x;
				const canResizeWest = e.clientX > rect.x && startingWidth - deltaMouseX > this.#minWidth;
				const canResizeEast = e.clientX < rect.width + rect.x;
				const canResizeNorth = e.clientY > rect.y && startingHeight - deltaMouseY > this.#minHeight;
				const canResizeSouth = e.clientY < rect.height + rect.y;

				if (position === 'left') {
					if (overflowLeft) {
						snapLeft();
					} else if (canResizeWest) {
						resizeLeft(deltaMouseX, rect);
					}
				}

				if (position === 'right') {
					if (overflowRight) {
						snapRight(rect);
					} else if (canResizeEast) {
						resizeRight(deltaMouseX);
					}
				}

				if (position === 'top') {
					if (overflowTop) {
						snapTop();
					} else if (canResizeNorth) {
						resizeTop(deltaMouseY, rect);
					}

					// if (e.clientY - rect.y < 32) {
					// 	if (!transitioned) {
					// 		gsap.to(this.#resizeHelper!, {
					// 			top: rect.y,
					// 			height: this.#target.clientHeight,
					// 			duration: 0.2
					// 		});
					// 		transitioned = true;
					// 	}
					// } else {
					// 	if (transitioned) {
					// 		gsap
					// 			.to(this.#resizeHelper!, {
					// 				width: this.#width,
					// 				height: this.#height,
					// 				top: this.#top + rect.y,
					// 				left: this.#left,
					// 				duration: 0.2
					// 			})
					// 			.then(() => {
					// 				this.#resizeHelper!.style.setProperty('height', `${this.#height}px`);
					// 				this.#resizeHelper!.style.setProperty('width', `${this.#width}px`);
					// 				this.#resizeHelper!.style.setProperty('top', `${this.#top + rect.y}px`);
					// 				this.#resizeHelper!.style.setProperty('left', `${this.#left}px`);
					// 			});
					// 		transitioned = false;
					// 	} else {
					// 		this.#resizeHelper?.style.setProperty('height', `${this.#height}px`);
					// 		this.#resizeHelper?.style.setProperty('width', `${this.#width}px`);
					// 		this.#resizeHelper?.style.setProperty('top', `${this.#top + rect.y}px`);
					// 		this.#resizeHelper?.style.setProperty('left', `${this.#left}px`);
					// 	}
					// 	// this.wrapper?.style.setProperty('height', `${this.#height}px`);
					// }
				}

				if (position === 'bottom') {
					if (overflowBottom) {
						snapBottom(rect);
					} else if (canResizeSouth) {
						resizeBottom(deltaMouseY);
					}
				}

				if (position === 'nw') {
					if (overflowLeft) {
						snapLeft();
					} else if (canResizeWest) {
						resizeLeft(deltaMouseX, rect);
					}
					if (overflowTop) {
						snapTop();
					} else if (canResizeNorth) {
						resizeTop(deltaMouseY, rect);
					}
				}

				if (position === 'ne') {
					if (overflowLeft) {
						snapLeft();
					} else if (canResizeEast) {
						resizeRight(deltaMouseX);
					}
					if (overflowTop) {
						snapTop();
					} else if (canResizeNorth) {
						resizeTop(deltaMouseY, rect);
					}
				}

				if (position === 'sw') {
					if (overflowBottom) {
						snapBottom(rect);
					} else if (canResizeSouth) {
						resizeBottom(deltaMouseY);
					}
					if (overflowLeft) {
						snapLeft();
					} else if (canResizeWest) {
						resizeLeft(deltaMouseX, rect);
					}
				}

				if (position === 'se') {
					if (overflowRight) {
						snapRight(rect);
					} else if (canResizeEast) {
						resizeRight(deltaMouseX);
					}
					if (overflowBottom) {
						snapBottom(rect);
					} else if (canResizeSouth) {
						resizeBottom(deltaMouseY);
					}
				}
			};

			const handleMouseUp = (e: MouseEvent) => {
				resetStyles();
				const rect = this.#target.getBoundingClientRect();

				if (position === 'top' && e.clientY - rect.y < 32) {
					this.#saveRect();
					this.#updateRect({
						height: rect.height,
						top: 0
					});
				}

				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};

			const handleDoubleClick = () => {
				const rect = this.#target.getBoundingClientRect();
				snapVertical(rect);
			};

			node.addEventListener('mousedown', handleMouseDown);
			if (position === 'top') {
				node.addEventListener('dblclick', handleDoubleClick);
			}

			return () => {
				node.removeEventListener('mousedown', handleMouseDown);
				if (position === 'top') {
					node.removeEventListener('dblclick', handleDoubleClick);
				}
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		};
	};

	titleBar: Attachment = (node: Element) => {
		if (!(node instanceof HTMLElement))
			throw new Error('Invalid element: only HTMLElement supported.');

		let startingX = 0;
		let startingY = 0;
		let startingMouseX = 0;
		let startingMouseY = 0;
		let mouseIsDown = false;
		let resizeHelperIsOn = false;

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

		const handleDoubleClick = () => {
			this.toggleMaximized();
		};

		const handleMouseDown = (e: MouseEvent) => {
			if (!this.ref) throw new Error('Window reference not found.');
			e.preventDefault();

			mouseIsDown = true;

			const rect = this.ref?.getBoundingClientRect();
			startingX = rect.x;
			startingY = rect.y;
			startingMouseX = e.clientX;
			startingMouseY = e.clientY;

			setMoveStyles();

			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		};

		const handleMouseMove = (e: MouseEvent) => {
			if (!mouseIsDown) return;
			const rect = this.#target.getBoundingClientRect();
			const deltaX = e.clientX - startingMouseX;
			const deltaY = e.clientY - startingMouseY;
			if (this.#maximized) {
				if (typeof this.#previousWidth === 'number')
					startingX = e.clientX * (this.#previousWidth / rect.width);
				this.toggleMaximized(false, {
					left: startingX + deltaX - rect.x,
					top: startingY + deltaY - rect.y
				});
			} else {
				this.#updateRect({
					left: startingX + deltaX - rect.x,
					top: startingY + deltaY - rect.y
				});
			}

			if (this.#resizeHelper) {
				if (e.clientX < 48) {
					resizeHelperIsOn = true;
					this.#syncHelperRect = false;
					gsap.to(this.#resizeHelper, {
						left: 8,
						top: this.#target.offsetTop + 8,
						width: this.#target.clientWidth / 2 - 8,
						height: this.#target.clientHeight - 16,
						duration: 0.1,
						ease: 'cubic-bezier(0.4, 0, 0.2, 1)'
					});
				} else if (e.clientX > rect.width - 48) {
					resizeHelperIsOn = true;
					this.#syncHelperRect = false;
					gsap.to(this.#resizeHelper, {
						left: 'auto',
						right: 8,
						top: this.#target.offsetTop + 8,
						width: this.#target.clientWidth / 2 - 8,
						height: this.#target.clientHeight - 16,
						duration: 0.1,
						ease: 'cubic-bezier(0.4, 0, 0.2, 1)'
					});
				} else {
					resizeHelperIsOn = false;
					if (!this.#syncHelperRect) {
						gsap
							.to(this.#resizeHelper, {
								left: this.#left,
								top: this.#top + rect.y,
								width: this.#width,
								height: this.#height,
								duration: 0.1,
								ease: 'cubic-bezier(0.4, 0, 0.2, 1)'
							})
							.then(() => {
								this.#syncHelperRect = true;
							});
					}
				}
			}
		};

		const handleMouseUp = (e: MouseEvent) => {
			if (mouseIsDown && resizeHelperIsOn) {
				if (e.clientX < 48) {
					this.#updateRect({
						width: this.#target.clientWidth / 2,
						height: this.#target.clientHeight,
						left: 0,
						top: 0
					});
				} else if (e.clientX > this.#target.clientWidth - 48) {
					this.#updateRect({
						width: this.#target.clientWidth / 2,
						height: this.#target.clientHeight,
						left: this.#target.clientWidth / 2,
						top: 0
					});
				}
			}
			mouseIsDown = false;
			resetStyles();
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};

		node.addEventListener('dblclick', handleDoubleClick);
		node.addEventListener('mousedown', handleMouseDown);

		return () => {
			if (node instanceof HTMLElement) {
				node.removeEventListener('mousedown', handleMouseDown);
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			}
		};
	};

	resizeHelper = (node: HTMLElement) => {
		this.#resizeHelper = node;

		node.style.position = 'fixed';

		// $effect(() => {
		// 	if (this.#syncHelperRect) node.style.setProperty('transition', 'none');
		// 	else node.style.setProperty('transition', 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)');
		// });

		$effect(() => {
			if (this.#syncHelperRect)
				node.style.top = `${this.#top + this.#target.getBoundingClientRect().y}px`;
		});

		$effect(() => {
			if (this.#syncHelperRect) node.style.left = `${this.#left}px`;
		});

		$effect(() => {
			if (this.#syncHelperRect) node.style.width = `${this.#width}px`;
		});

		$effect(() => {
			if (this.#syncHelperRect) node.style.height = `${this.#height}px`;
		});

		return () => {
			// detroy stuff
		};
	};
}
