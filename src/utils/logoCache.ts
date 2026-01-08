const CACHE_KEY = "brand_logos_cache";
const memoryCache: Record<string, string> = {};

export const urlToBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Errore conversione Base64:", err);
    return null;
  }
};

const loadFromStorage = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
};

export const getCachedLogo = (brand: string): string | null => {
  if (memoryCache[brand]) return memoryCache[brand];
  
  const fullCache = loadFromStorage();
  if (fullCache[brand]) {
    memoryCache[brand] = fullCache[brand];
    return fullCache[brand];
  }
  
  return null;
};

export const setCachedLogo = (brand: string, url: string) => {
  memoryCache[brand] = url;
  try {
    const fullCache = loadFromStorage();
    fullCache[brand] = url;
    localStorage.setItem(CACHE_KEY, JSON.stringify(fullCache));
  } catch (e) {
    console.warn("Storage full or unavailable", e);
  }
};