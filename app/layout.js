const creativeGlobalCss = `
  :root {
    --creative-app-bg: #07131a;
    --creative-panel-bg: #0d2330;
    --creative-card-bg: #0a1a24;
    --creative-text: #e6f8ff;
    --creative-border: #2a5a6d;
    --creative-soft-border: #1e4557;
    --creative-accent: #14b8a6;
    --creative-accent-soft: #115e59;
  }

  body {
    background: var(--creative-app-bg) !important;
    color: var(--creative-text) !important;
  }

  main, section,
  [style*='background: #121a33'],
  [style*='background:#121a33'] {
    background: var(--creative-panel-bg) !important;
    color: var(--creative-text) !important;
    border-color: var(--creative-border) !important;
  }

  input, select, textarea, pre, table,
  [style*='background: #0b1020'],
  [style*='background:#0b1020'],
  [style*='background: #111827'],
  [style*='background:#111827'],
  [style*='background: #1f2937'],
  [style*='background:#1f2937'] {
    background: var(--creative-card-bg) !important;
    color: var(--creative-text) !important;
    border-color: var(--creative-border) !important;
  }

  tr, [style*='borderTop:'] {
    border-color: var(--creative-soft-border) !important;
  }

  a[style*='background'], button[style*='background'] {
    background: var(--creative-accent-soft) !important;
    color: #ffffff !important;
  }

  a, button {
    border-radius: 10px !important;
  }
`

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: creativeGlobalCss }} />
      </head>
      <body style={{ margin: 0, fontFamily: 'Inter, Segoe UI, sans-serif' }}>{children}</body>
    </html>
  )
}
