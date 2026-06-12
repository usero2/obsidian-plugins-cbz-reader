import { ItemView, WorkspaceLeaf, TFile } from "obsidian";
import * as JSZip from "jszip";

export const CBZ_VIEW_TYPE = "cbz-view";

export class CbzView extends ItemView {
    file: TFile | null = null;
    zip: JSZip | null = null;
    imageFiles: JSZip.JSZipObject[] = [];
    observer: IntersectionObserver | null = null;
    
    loadedImages: Map<number, string> = new Map();
    imgElements: Map<number, HTMLImageElement> = new Map();

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return CBZ_VIEW_TYPE;
    }

    getDisplayText() {
        if (this.file) {
            return this.file.name;
        }
        return "CBZ Reader";
    }

    async onLoadFile(file: TFile) {
        this.file = file;
        this.contentEl.empty();
        
        const container = this.contentEl.createDiv({ cls: "cbz-reader-container" });
        container.createEl("h3", { text: `Loading ${file.name}...` });

        try {
            const arrayBuffer = await this.app.vault.readBinary(file);
            this.zip = await JSZip.loadAsync(arrayBuffer);
            
            this.imageFiles = Object.values(this.zip.files)
                .filter(zipEntry => !zipEntry.dir && this.isImage(zipEntry.name))
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

            container.empty();

            if (this.imageFiles.length === 0) {
                container.createEl("h3", { text: "No images found in this CBZ file." });
                return;
            }

            this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
                root: container,
                rootMargin: "2000px 0px 2000px 0px", // Preload approx 2-3 pages ahead/behind
                threshold: 0
            });

            this.imageFiles.forEach((zipEntry, index) => {
                const pageContainer = container.createDiv({ cls: "cbz-page-container" });
                pageContainer.dataset.index = index.toString();
                
                const img = pageContainer.createEl("img");
                this.imgElements.set(index, img);
                
                this.observer!.observe(pageContainer);
            });
            
        } catch (err) {
            console.error("Failed to load CBZ", err);
            container.empty();
            container.createEl("h3", { text: `Error loading CBZ: ${(err as Error).message}` });
        }
    }

    async handleIntersection(entries: IntersectionObserverEntry[]) {
        if (!this.zip) return;

        for (const entry of entries) {
            const indexStr = (entry.target as HTMLElement).dataset.index;
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

    async loadImage(index: number, img: HTMLImageElement) {
        this.loadedImages.set(index, "loading");
        
        try {
            const zipEntry = this.imageFiles[index];
            const blob = await zipEntry.async("blob");
            
            const ext = zipEntry.name.split('.').pop()?.toLowerCase();
            let mimeType = "image/jpeg";
            if (ext === 'png') mimeType = "image/png";
            else if (ext === 'webp') mimeType = "image/webp";
            else if (ext === 'gif') mimeType = "image/gif";
            
            const typedBlob = new Blob([blob], { type: mimeType });
            const url = URL.createObjectURL(typedBlob);
            
            this.loadedImages.set(index, url);
            img.src = url;
            
            const parent = img.parentElement;
            if (parent) {
                parent.style.minHeight = 'auto';
            }
        } catch (err) {
            console.error(`Failed to load image at index ${index}`, err);
            this.loadedImages.delete(index);
        }
    }

    unloadImage(index: number, img: HTMLImageElement) {
        const url = this.loadedImages.get(index);
        if (url && url !== "loading") {
            URL.revokeObjectURL(url);
            img.removeAttribute("src");
            
            const parent = img.parentElement;
            if (parent) {
                parent.style.minHeight = `${img.height || 800}px`; 
            }
        }
        this.loadedImages.delete(index);
    }

    isImage(filename: string): boolean {
        const ext = filename.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext || '');
    }

    async onClose() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        for (const url of Array.from(this.loadedImages.values())) {
            if (url !== "loading") {
                URL.revokeObjectURL(url);
            }
        }
        this.loadedImages.clear();
        this.imgElements.clear();
        this.zip = null;
        this.imageFiles = [];
    }
}
