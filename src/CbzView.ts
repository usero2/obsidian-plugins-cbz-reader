import { ItemView, WorkspaceLeaf, TFile } from "obsidian";
import * as JSZip from "jszip";

export const CBZ_VIEW_TYPE = "cbz-view";

export class CbzView extends ItemView {
    file: any = null;
    zip: any = null;
    imageFiles: any[] = [];
    observer: any = null;
    minimapObserver: any = null;
    
    loadedImages: Map<number, string> = new Map();
    imgElements: Map<number, HTMLImageElement> = new Map();
    canvasElements: Map<number, HTMLCanvasElement> = new Map();
    minimapItems: Map<number, HTMLDivElement> = new Map();

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.file = null;
        this.zip = null;
        this.imageFiles = [];
        
        this.observer = null;
        this.loadedImages = new Map();
        this.imgElements = new Map();

        this.minimapObserver = null;
        this.canvasElements = new Map();
        this.minimapItems = new Map(); // Store to toggle 'is-active' class
    }

    getViewType() { return CBZ_VIEW_TYPE; }
    getDisplayText() { return this.file ? this.file.name : "CBZ Reader"; }

    async setState(state, result) {
        await super.setState(state, result);
        if (state.file) {
            const file = this.app.vault.getAbstractFileByPath(state.file);
            if (file) {
                await this.onLoadFile(file);
            }
        }
    }

    getState() {
        return {
            file: this.file ? this.file.path : null
        };
    }

    clear() {
        this.file = null;
        this.contentEl.empty();
    }

    async onLoadFile(file: TFile) {
        this.file = file;
        this.contentEl.empty();
        
        const layout = this.contentEl.createDiv({ cls: "cbz-reader-layout" });
        const mainView = layout.createDiv({ cls: "cbz-main-view" });
        const minimapView = layout.createDiv({ cls: "cbz-minimap" });
        
        // --- Vertical Scrollbar Minimap Logic ---
        const minimapThumb = minimapView.createDiv({ cls: "cbz-minimap-thumb" });
        
        let isDown = false;
        let startY;
        let startYScreen; // Add startYScreen
        let isDraggingThumb = false;
        
        const updateThumbHeight = () => {
            let currentItemHeight = 145;
            const firstItem = this.minimapItems.get(0);
            if (firstItem) currentItemHeight = firstItem.offsetHeight + 5;
            
            // Average height of a comic page is roughly 1.5x its width. 
            // We use a constant reference height to prevent slider from jittering
            let h = (mainView.clientHeight / 1000) * currentItemHeight;
            return Math.max(20, Math.min(h, minimapView.clientHeight / 2));
        };

        const onMouseMove = (e) => {
            if (!isDown) return;
            e.preventDefault();
            const y = e.pageY;
            const walk = y - startY;
            if (Math.abs(walk) > 3) isDraggingThumb = true;
            
            const tHeight = updateThumbHeight();
            const trackViewHeight = minimapView.clientHeight;
            
            // Calculate new physical screen position of thumb relative to minimap view
            let yScreen = startYScreen + walk;
            yScreen = Math.max(0, Math.min(trackViewHeight - tHeight, yScreen));
            
            // Calculate percentage p of track traveled
            let p = 0;
            if (trackViewHeight > tHeight) {
                p = yScreen / (trackViewHeight - tHeight);
            }
            
            let currentItemHeight = 145;
            const firstItem = this.minimapItems.get(0);
            if (firstItem) currentItemHeight = firstItem.offsetHeight + 5;
            
            const trackContentHeight = Math.max(minimapView.scrollHeight, (this.imageFiles ? this.imageFiles.length : 0) * currentItemHeight);
            const maxThumbTop = trackContentHeight - tHeight;
            
            // Calculate exact position on the scrollable track
            const exactPosition = p * maxThumbTop;
            
            // Update UI instantly
            minimapThumb.setCssStyles({
                top: exactPosition + 'px',
                height: tHeight + 'px'
            });
            minimapView.scrollTop = exactPosition - yScreen;
            
            // Map exactPosition back to targetIndex and percentage for mainView
            const targetIndex = Math.floor(exactPosition / currentItemHeight);
            let itemPercentage = (exactPosition - (targetIndex * currentItemHeight)) / currentItemHeight;
            
            if (!this.imageFiles || this.imageFiles.length === 0) return;
            const clampedIndex = Math.max(0, Math.min(targetIndex, this.imageFiles.length - 1));
            
            if (targetIndex !== clampedIndex) {
                itemPercentage = targetIndex < 0 ? 0 : 1; 
            }
            itemPercentage = Math.max(0, Math.min(1, itemPercentage));
            
            const pageContainer = mainView.querySelector(`.cbz-page-container[data-index="${clampedIndex}"]`);
            if (pageContainer) {
                const parentRect = mainView.getBoundingClientRect();
                const rect = pageContainer.getBoundingClientRect();
                const absoluteOffsetTop = mainView.scrollTop + (rect.top - parentRect.top);
                
                mainView.scrollTop = absoluteOffsetTop + (itemPercentage * rect.height);
            }
        };

        const onMouseUp = () => {
            if (isDown) {
                isDown = false;
                minimapThumb.setCssStyles({ cursor: '' });
                setTimeout(() => { isDraggingThumb = false; }, 50);
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        minimapThumb.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // only left click
            e.preventDefault(); 
            e.stopPropagation(); // prevent clicking the track below it
            isDown = true;
            isDraggingThumb = false;
            startY = e.pageY;
            
            const rect = minimapThumb.getBoundingClientRect();
            const parentRect = minimapView.getBoundingClientRect();
            startYScreen = rect.top - parentRect.top;
            
            minimapThumb.setCssStyles({ cursor: 'grabbing' });
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Track Click Logic
        minimapView.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target === minimapThumb) return; // handled by thumb
            
            e.preventDefault();
            
            const rect = minimapView.getBoundingClientRect();
            const clickY = e.clientY - rect.top + minimapView.scrollTop;
            
            let itemHeight = 145;
            const firstItem = this.minimapItems.get(0);
            if (firstItem) itemHeight = firstItem.offsetHeight + 5;
            
            const targetIndex = Math.floor(clickY / itemHeight);
            
            // Can't scroll immediately if imageFiles is empty, but this only fires after load
            if (this.imageFiles && this.imageFiles.length > 0) {
                const clampedIndex = Math.max(0, Math.min(targetIndex, this.imageFiles.length - 1));
                const pageContainer = mainView.querySelector(`.cbz-page-container[data-index="${clampedIndex}"]`);
                if (pageContainer) {
                    pageContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });

        // --- Smooth Wheel Logic ---
        minimapView.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // Multiply deltaY so the minimap acts as a "fast scroll" area
            const multiplier = 4;
            mainView.scrollBy({ top: e.deltaY * multiplier, behavior: 'auto' });
        }, { passive: false });

        mainView.createEl("h3", { text: `Loading ${file.name}...` });

        try {
            const arrayBuffer = await this.app.vault.readBinary(file);
            this.zip = await JSZip.loadAsync(arrayBuffer);
            
            this.imageFiles = Object.values(this.zip.files)
                .filter(zipEntry => !zipEntry.dir && this.isImage(zipEntry.name))
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

            mainView.empty();

            if (this.imageFiles.length === 0) {
                mainView.createEl("h3", { text: "No images found in this CBZ file." });
                return;
            }

            // Observer for main reading view
            this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
                root: mainView,
                rootMargin: "2000px 0px 2000px 0px",
                threshold: 0
            });
            
            // Observer for active page tracking removed - now handled synchronously in scroll event


            // Observer for minimap canvas loading
            this.minimapObserver = new IntersectionObserver(this.handleMinimapIntersection.bind(this), {
                root: minimapView,
                rootMargin: "500px 0px 500px 0px",
                threshold: 0
            });

            this.imageFiles.forEach((zipEntry, index) => {
                // Main view items
                const pageContainer = mainView.createDiv({ cls: "cbz-page-container" });
                pageContainer.dataset.index = index.toString();
                const img = pageContainer.createEl("img");
                this.imgElements.set(index, img);
                
                this.observer.observe(pageContainer);

                // Minimap items
                const minimapItem = minimapView.createDiv({ cls: "cbz-minimap-item" });
                minimapItem.dataset.index = index.toString();
                const canvas = minimapItem.createEl("canvas");
                this.canvasElements.set(index, canvas);
                this.minimapItems.set(index, minimapItem);
                
                this.minimapObserver.observe(minimapItem);

                // The track click logic handles minimapItem clicks now through event bubbling

            });
            
            // --- Continuous Smooth Minimap Sync ---
            mainView.addEventListener('scroll', () => {
                if (isDraggingThumb) return;
                
                // Synchronously find the active page (first page with bottom > viewport top)
                const parentRect = mainView.getBoundingClientRect();
                const containers = mainView.querySelectorAll('.cbz-page-container');
                let activeContainer = null;
                
                for (let i = 0; i < containers.length; i++) {
                    const rect = containers[i].getBoundingClientRect();
                    if (rect.bottom > parentRect.top) {
                        activeContainer = containers[i];
                        break;
                    }
                }
                
                if (!activeContainer) return;
                const indexStr = activeContainer.dataset.index;
                
                // Also update the 'is-active' class on minimap items synchronously!
                this.minimapItems.forEach((item, idx) => {
                    if (idx.toString() === indexStr) item.classList.add('is-active');
                    else item.classList.remove('is-active');
                });
                
                const rect = activeContainer.getBoundingClientRect();
                const offset = parentRect.top - rect.top;
                let percentage = offset / rect.height;
                percentage = Math.max(0, Math.min(1, percentage));
                
                let currentItemHeight = 145;
                const firstItem = this.minimapItems.get(0);
                if (firstItem) currentItemHeight = firstItem.offsetHeight + 5;
                
                const exactPosition = parseInt(indexStr) * currentItemHeight + (percentage * currentItemHeight);
                const tHeight = updateThumbHeight();
                minimapThumb.setCssStyles({
                    height: tHeight + 'px',
                    top: exactPosition + 'px'
                });
                
                const trackContentHeight = Math.max(minimapView.scrollHeight, (this.imageFiles ? this.imageFiles.length : 0) * currentItemHeight);
                const trackViewHeight = minimapView.clientHeight;
                
                let p = 0;
                const maxThumbTop = trackContentHeight - tHeight;
                if (maxThumbTop > 0) {
                    p = exactPosition / maxThumbTop;
                    p = Math.max(0, Math.min(1, p));
                }
                
                const yScreen = p * (trackViewHeight - tHeight);
                const targetScrollTop = exactPosition - yScreen;
                
                minimapView.scrollTop = targetScrollTop;
            });
            
        } catch (err) {
            console.error("Failed to load CBZ", err);
            mainView.empty();
            mainView.createEl("h3", { text: `Error loading CBZ: ${err.message}` });
        }
    }

    async handleIntersection(entries: any[]) {
        if (!this.zip) return;
        for (const entry of entries) {
            const indexStr = entry.target.dataset.index;
            if (!indexStr) continue;
            
            const index = parseInt(indexStr);
            const img = this.imgElements.get(index);
            if (!img) continue;

            if (entry.isIntersecting) {
                if (!this.loadedImages.has(index)) {
                    this.loadImage(index, img);
                }
            } else {
                if (this.loadedImages.has(index)) {
                    this.unloadImage(index, img);
                }
            }
        }
    }
    
    async handleMinimapIntersection(entries: any[]) {
        if (!this.zip) return;
        for (const entry of entries) {
            const indexStr = entry.target.dataset.index;
            if (!indexStr) continue;
            
            const index = parseInt(indexStr);
            const canvas = this.canvasElements.get(index);
            if (!canvas) continue;

            if (entry.isIntersecting) {
                if (!canvas.dataset.loaded) {
                    this.loadMinimapCanvas(index, canvas);
                }
            }
            // Note: We don't unload canvas to save memory because drawn canvas uses very little memory
            // compared to an Object URL, and keeping them prevents re-extraction.
        }
    }

    async loadMinimapCanvas(index: number, canvas: any) {
        canvas.dataset.loaded = "loading";
        try {
            const zipEntry = this.imageFiles[index];
            const blob = await zipEntry.async("blob");
            
            const ext = zipEntry.name.split('.').pop();
            let mimeType = "image/jpeg";
            if (ext && ext.toLowerCase() === 'png') mimeType = "image/png";
            else if (ext && ext.toLowerCase() === 'webp') mimeType = "image/webp";
            else if (ext && ext.toLowerCase() === 'gif') mimeType = "image/gif";
            
            const typedBlob = new Blob([blob], { type: mimeType });
            const url = URL.createObjectURL(typedBlob);
            
            const img = new Image();
            img.onload = () => {
                // Downscale to save memory. Width = 100px.
                const maxWidth = 100;
                const ratio = maxWidth / img.width;
                const width = maxWidth;
                const height = img.height * ratio;
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Immediately revoke object url so memory is freed!
                URL.revokeObjectURL(url);
                canvas.dataset.loaded = "true";
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                canvas.dataset.loaded = "error";
            };
            img.src = url;
            
        } catch (err) {
            console.error(`Failed to load minimap image at index ${index}`, err);
            canvas.dataset.loaded = "error";
        }
    }

    async loadImage(index: number, img: any) {
        this.loadedImages.set(index, "loading");
        try {
            const zipEntry = this.imageFiles[index];
            const blob = await zipEntry.async("blob");
            
            const ext = zipEntry.name.split('.').pop();
            let mimeType = "image/jpeg";
            if (ext && ext.toLowerCase() === 'png') mimeType = "image/png";
            else if (ext && ext.toLowerCase() === 'webp') mimeType = "image/webp";
            else if (ext && ext.toLowerCase() === 'gif') mimeType = "image/gif";
            
            const typedBlob = new Blob([blob], { type: mimeType });
            const url = URL.createObjectURL(typedBlob);
            
            this.loadedImages.set(index, url);
            img.src = url;
            
            if (img.parentElement) {
                img.parentElement.setCssStyles({ minHeight: 'auto' });
            }
        } catch (err) {
            console.error(`Failed to load image at index ${index}`, err);
            this.loadedImages.delete(index);
        }
    }

    unloadImage(index: number, img: any) {
        const url = this.loadedImages.get(index);
        if (url && url !== "loading") {
            URL.revokeObjectURL(url);
            img.removeAttribute("src");
            if (img.parentElement) {
                img.parentElement.setCssStyles({ minHeight: `${img.height || 800}px` }); 
            }
        }
        this.loadedImages.delete(index);
    }

    isImage(filename: string) {
        const ext = filename.split('.').pop();
        return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext ? ext.toLowerCase() : '');
    }

    async onClose() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.minimapObserver) {
            this.minimapObserver.disconnect();
            this.minimapObserver = null;
        }
        for (const url of Array.from(this.loadedImages.values())) {
            if (url !== "loading") {
                URL.revokeObjectURL(url);
            }
        }
        this.loadedImages.clear();
        this.imgElements.clear();
        this.canvasElements.clear();
        this.minimapItems.clear();
        this.zip = null;
        this.imageFiles = [];
    }

}

