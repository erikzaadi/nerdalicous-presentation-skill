// Prefixes an absolute public path ('/images/x.png') with the deck's base, so it still loads
// when the deck is served under a sub-path (`--base /my-talk/`, or a PR preview at `/pr-N/`).
// Slidev rewrites image paths in markdown, but not paths used at runtime: Vue bindings
// (`:src`), `new Image()`, and CSS backgrounds set from a component. Wrap those in assetUrl().
export function assetUrl(url: string) {
  if (url.startsWith('/')) {
    return import.meta.env.BASE_URL + url.slice(1)
  }
  return url
}
