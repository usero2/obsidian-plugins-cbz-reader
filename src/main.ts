import { Plugin } from 'obsidian';
import { CBZ_VIEW_TYPE, CbzView } from './CbzView';

export default class CBZReaderPlugin extends Plugin {
    async onload() {
        console.log('loading cbz-reader plugin');

        this.registerView(
            CBZ_VIEW_TYPE,
            (leaf) => new CbzView(leaf)
        );

        this.registerExtensions(["cbz"], CBZ_VIEW_TYPE);
    }

    onunload() {
        console.log('unloading cbz-reader plugin');
    }
}
