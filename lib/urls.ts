export function reviewedHttpsUrl(value: unknown, allowedHosts?: readonly string[]): URL | undefined {
  if (typeof value !== "string" || !/^https:\/\/[^/\s]/i.test(value) || /[\\\u0000-\u001f\u007f]/u.test(value)) return;
  try {
    const url = new URL(value);
    if (!url.username && !url.password && (!allowedHosts || (!url.port && allowedHosts.includes(url.hostname)))) return url;
  } catch {
    return undefined;
  }
}
