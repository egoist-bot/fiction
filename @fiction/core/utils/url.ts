/**
 * get host part of URL, useful for domain handling
 */
export function validHost(host?: string) {
  if (!host)
    return false

  // Updated pattern to handle query strings or fragments
  const pattern = /^(?:http:\/\/|https:\/\/)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)/
  const match = host.match(pattern)
  return match ? match[1] : false
}
export function refineRoute(
  routePath: string,
  replacers?: Record<string, unknown>,
): string {
  // Apply replacements for each [key, replacementValue] pair
  Object.entries(replacers || {})?.forEach(([key, val]) => {
    const regex = new RegExp(`:${key}(\\?)?`, 'g')

    if (typeof val !== 'undefined' && val !== null) {
      val = val.toString()
      routePath = routePath.replace(regex, val as string)
    }
  })

  // Remove unreplaced optional parameters (those followed by a question mark) and trailing slashes, and handle double slashes
  const refinedRoute = routePath
    .replace(/:\w+\?/g, '') // remove unreplaced optional parameters
    .replace(/\/{2,}/g, '/') // collapse multiple slashes into one
    .replace(/\/+$/, '') // remove trailing slash

  return refinedRoute || '/'
}

/**
 * Normalizes a domain for display by removing the protocol, 'www', and trailing slashes.
 * @param {string} [url] - The URL to normalize.
 * @returns {string} Normalized domain suitable for display.
 */
export function displayDomain(url?: string): string {
  if (!url)
    return ''

  // Remove protocol, make www and naked the same, and remove trailing slash
  // Also handle edge cases like 'http://www.', 'https://www.', or 'www.' at the start
  return url
    .replace(/^(?:https?:\/\/)?(?:www\.)?/, '')
    .replace(/\/$/, '')
}
/**
 * Gets a favicon image based on a URL.
 */
export function getDomainFavicon(url: string | string[] | undefined) {
  if (!url)
    return ''

  const hostname = new URL(Array.isArray(url) ? url[0] : url, 'http://example.com').hostname
  return `https://icons.duckduckgo.com/ip3/${hostname}.ico`
}
/**
 * Concatenates multiple strings into a single, well-formatted URL path.
 * @param {string[]} parts - The parts of the URL to be concatenated.
 * @returns {string} A well-formatted URL path.
 */
export function urlPath(parts: string[]): string {
  // Ensures the path starts with a single '/' and removes redundant leading/trailing slashes
  return `/${parts
    .map(part => part.replace(/^\/|\/$/g, ''))
    .join('/')
    .replace(/\/{2,}/g, '/')}`
}
/**
 * If URL is valid, parses and returns it
 * Can be used to determine if is valid
 */
export function safeUrl(url?: string): URL | undefined {
  if (!url)
    return
  try {
    const u = new URL(url)
    return u
  }
  catch {
    console.warn(`url is invalid: ${url}`)
    return undefined
  }
}
/**
 * Normalizes a URL path by ensuring it starts with a single slash, removing any trailing slashes, and
 * replacing consecutive slashes with a single slash within the path.
 * It preserves the search and hash components of the path if present.
 * @usecase useful for user defined paths
 */
export function standardizeUrlOrPath({ urlOrPath }: { urlOrPath: string }): string {
  if (urlOrPath === '')
    return '/'

  const isFullUrl = urlOrPath.startsWith('http')
  const base = isFullUrl ? undefined : 'http://example.com'

  // Create a new URL object which automatically handles most encoding
  const url = new URL(urlOrPath, base)

  // Normalize the pathname by removing double slashes and trailing slash
  url.pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '')

  // Construct the final URL or path
  return isFullUrl ? url.href : url.pathname + url.search + url.hash
}
/**
 * Updates the path of a URL while preserving the search and hash components.
 * @usecase helpful to allow user input to update the URL
 */
export function updateUrl({ url, newUrlOrPath }: { url: string, newUrlOrPath: string }): string {
  let urlObj = new URL(url, 'http://dummybase.com')

  const p = standardizeUrlOrPath({ urlOrPath: newUrlOrPath })

  // Check if p is a full URL
  let newUrlObj
  try {
    newUrlObj = new URL(p)
    urlObj = newUrlObj
  }
  catch (e) {
    // If not a full URL, treat it as a pathname and construct a new URL with a dummy base
    const dummyBase = 'http://dummybase.com'
    newUrlObj = new URL(p, dummyBase)
  }

  // Update the parts of the URL
  urlObj.pathname = newUrlObj.pathname
  urlObj.search = newUrlObj.search || urlObj.search
  urlObj.hash = newUrlObj.hash || urlObj.hash

  const finalUrl = urlObj.toString().includes('dummybase') ? urlObj.pathname : urlObj.toString()

  return finalUrl
}

export function getUrlPath({ urlOrPath }: { urlOrPath?: string }) {
  if (!urlOrPath || typeof urlOrPath !== 'string')
    return '/'

  const p = standardizeUrlOrPath({ urlOrPath })

  let path
  if (p.startsWith('http://') || p.startsWith('https://')) {
    // It's a full URL, parse using URL class
    const url = new URL(p)
    path = url.pathname + url.search + url.hash
  }
  else {
    // It's a relative path
    path = p
  }

  return path
}