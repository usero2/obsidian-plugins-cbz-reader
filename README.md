# Obsidian CBZ Reader

A powerful and fast native CBZ (Comic Book Archive) reader for Obsidian. Read your favorite mangas, comics, and graphic novels directly inside your Obsidian vault with a beautifully crafted, high-performance interface.

![](images/)

## ✨ Features

### 1. Native CBZ Support
Seamlessly open and read `.cbz` files directly from your Obsidian File Explorer. No need to extract files or use external applications. The plugin safely reads the ZIP structure in memory.

### 2. High-Performance Lazy Loading
Designed to handle massive comic books without crashing your vault. Images are lazily loaded and extracted only when they are about to enter your screen, and automatically unloaded from memory once you scroll past them. This keeps Obsidian lightning-fast and memory-efficient.

### 3. VS Code-Style Minimap (Smart Scrollbar)
Navigate through hundreds of pages effortlessly using the dynamic Minimap on the right side of the screen.
- **Visual Previews:** The minimap renders tiny, low-memory canvas thumbnails of the pages so you can see exactly where you are in the comic.
- **Smart Thumb Slider:** A translucent slider perfectly represents your current viewing area. 
- **0-Latency Dragging:** Click and drag the slider. The reading view follows your mouse instantly (1:1 pixel mapping) without any jitter or delay, acting exactly like a native scrollbar.
- **Click to Jump:** Click anywhere on the minimap's background track, and the reader will smoothly scroll to that exact page.
- **Auto-Scrolling Track:** If you have a massive 200-page comic, the minimap track intelligently scales and scrolls in the opposite direction as you drag, allowing you to traverse from page 1 to 200 in a single smooth mouse drag without running out of screen space.

### 4. Smooth Scrolling
Enjoy native smooth scrolling when navigating pages or clicking the minimap, providing a premium reading experience.

## 🚀 How to Use

1. **Install and Enable:** Once installed, ensure the "CBZ Reader" plugin is enabled in your Obsidian Community Plugins settings.
2. **Add a Comic:** Drop any `.cbz` file into your Obsidian Vault folder.
3. **Open:** Click the `.cbz` file from the Obsidian File Explorer.
4. **Read & Navigate:** 
   - Scroll naturally using your mouse wheel.
   - Look at the right-side **Minimap** to see page previews.
   - **Click & Drag** the minimap slider to quickly scan through pages.
   - **Click** on a minimap thumbnail to instantly jump to that page.

## ⚙️ Installation

*(Instructions for manual installation if not yet on the Community Plugin directory)*
1. Download the latest release (`main.js`, `manifest.json`, and `styles.css`).
2. Create a folder named `obsidian-plugins-cbz-reader` inside your vault's `.obsidian/plugins/` directory.
3. Place the downloaded files into that folder.
4. Reload Obsidian and enable the plugin in the settings.

## 🆕 What's New in v1.0.2

- **Perfect 0-Latency Minimap Dragging:** Completely rebuilt the Minimap slider tracking. The slider now perfectly follows your mouse with 0 delay or jitter.
- **VS Code-Style Auto-Scrolling:** When dragging the slider on a long comic, the minimap track now smoothly auto-scrolls in the opposite direction, allowing you to reach the very bottom of the document without running out of screen space.
- **Stable Slider Size:** Fixed an issue where the slider height would abruptly expand on double-page spreads. The slider height is now beautifully consistent.
- **Linter Compliance:** Rewrote static styling to use Obsidian's `setCssStyles` API, ensuring full compliance with Obsidian's strict plugin guidelines.

## ❤️ Support & Donate

If this plugin has improved your Obsidian workflow, saved you time, or you just want to support its continued development, please consider donating! 

Your support is incredibly appreciated, helps fix bugs, and keeps this project alive and growing. 🙏

https://buymeacoffee.com/endofday

<a href="https://www.buymeacoffee.com/endofday" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
---
**Built with ❤️ for the Obsidian Community**

