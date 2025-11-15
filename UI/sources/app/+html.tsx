import { ScrollViewStyleReset } from 'expo-router/html';
import '../unistyles';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>ZenFlo - AI-Powered Voice Coding Platform</title>
        <meta name="description" content="Code with Claude using voice intelligence. Real-time collaboration, multi-device sync, and conversational AI for developers." />

        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* Open Graph */}
        <meta property="og:title" content="ZenFlo - AI-Powered Voice Coding Platform" />
        <meta property="og:description" content="Code with Claude using voice intelligence. Real-time collaboration, multi-device sync, and conversational AI for developers." />
        <meta property="og:image" content="https://app.zenflo.dev/og-image.png" />
        <meta property="og:url" content="https://app.zenflo.dev" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ZenFlo" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ZenFlo - AI-Powered Voice Coding Platform" />
        <meta name="twitter:description" content="Code with Claude using voice intelligence. Real-time collaboration, multi-device sync, and conversational AI for developers." />
        <meta name="twitter:image" content="https://app.zenflo.dev/og-image.png" />

        {/* Theme Color */}
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
