// Converts a native filesystem path into a properly-formed file:// URL.
//
// Why this exists: `file://${path}` is wrong on Windows. A path like
// "C:\Users\foo\bar.pdf" produces "file://C:/Users/foo/bar.pdf" — the
// "C:" is parsed as the URL host, so the navigation fails (in the webview
// this manifests as the Chromium PDF viewer never receiving the document).
// Correct form is "file:///C:/Users/foo/bar.pdf" with three slashes.
export function pathToFileUrl(p: string): string {
  const normalized = p.replace(/\\/g, "/");
  const withLeadingSlash = normalized.startsWith("/")
    ? normalized
    : "/" + normalized;
  const segments = withLeadingSlash.split("/").map((seg, i) => {
    // Preserve the Windows drive-letter colon (e.g. "C:") — encoding it
    // would yield "C%3A" and break navigation.
    if (i === 1 && /^[A-Za-z]:$/.test(seg)) return seg;
    return encodeURIComponent(seg);
  });
  return "file://" + segments.join("/");
}
