// Declare <webview> as a valid JSX element — it is Electron-specific and not part of standard DOM types.
declare namespace JSX {
  interface IntrinsicElements {
    webview: {
      src?: string
      style?: import('react').CSSProperties
      className?: string
      allowpopups?: string
      partition?: string
      preload?: string
      webpreferences?: string
      // Allow ref and any other webview-specific attributes without exhaustively listing them
      [key: string]: unknown
    }
  }
}
