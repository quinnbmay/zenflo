#!/usr/bin/env node
/**
 * Post-build script to fix HTML for NAS deployment
 * Adds type="module" to script tags to support import.meta
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../dist-railway/index.html');

if (!fs.existsSync(htmlPath)) {
    console.error('❌ index.html not found at:', htmlPath);
    process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');

// Add type="module" to script tags
html = html.replace(
    /<script src="([^"]+)"(\s+defer)?>/g,
    '<script type="module" src="$1">'
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✅ Fixed HTML script tags for module support');
