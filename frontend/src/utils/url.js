// utils/url.js
export default function forceHttps(url) {
    if (!url) return url;
    return url.replace(/^http:\/\//i, "https://");
}

