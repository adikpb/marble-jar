import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Marble Jar</title>

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* PWA installability: web app manifest under the /marble-jar baseUrl */}
        <link rel="manifest" href="/marble-jar/manifest.json" />
        <meta name="theme-color" content="#211410" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/marble-jar/icons/apple-touch-icon.png"
        />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #211410;
}
/* Browser surfaces in the world's own palette: lamplight selection,
   an ink focus ring, and a quiet espresso scrollbar. */
::selection {
  background-color: #503722;
  color: #F5E9D2;
}
:focus-visible {
  outline: 2px solid #F5E9D2;
  outline-offset: 2px;
}
::-webkit-scrollbar {
  width: 10px;
}
::-webkit-scrollbar-track {
  background: #211410;
}
::-webkit-scrollbar-thumb {
  background: #503722;
  border-radius: 6px;
}`;
