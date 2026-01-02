const memoryCache: Record<string, string> = {};

export const getCachedLogo = (brand: string): string | null => {
  if (memoryCache[brand]) return memoryCache[brand];
  
  const stored = localStorage.getItem(`logo_cache_${brand}`);
  if (stored) {
    memoryCache[brand] = stored;
    return stored;
  }
  
  return null;
};

export const setCachedLogo = (brand: string, url: string) => {
  memoryCache[brand] = url;
  try {
    localStorage.setItem(`logo_cache_${brand}`, url);
  } catch (e) {
    console.warn("LocalStorage pieno, cache solo in memoria");
  }
};