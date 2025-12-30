import { useState, useCallback } from "react";

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
  image_url?: string;
  image_front_url?: string;
  image_small_url?: string;
  quantity?: string;
  ingredients_text?: string;
  ingredients_text_it?: string;
  ingredients_analysis_tags?: string[];
  nutriments?: {
    energy_value?: number;
    energy_unit?: string;
    "energy-kcal_100g"?: number;
    fat_100g?: number;
    fat?: number;
    "saturated-fat_100g"?: number;
    saturated_fat?: number;
    carbohydrates_100g?: number;
    carbohydrates?: number;
    sugars_100g?: number;
    sugars?: number;
    proteins_100g?: number;
    proteins?: number;
    salt_100g?: number;
    salt?: number;
    fiber_100g?: number;
    fiber?: number;
    sodium_100g?: number;
  };
  nutriscore_grade?: string;
  nutriscore_score?: number;
  ecoscore_grade?: string;
  ecoscore_score?: number;
  nova_group?: number;
  allergens?: string;
  allergens_tags?: string[];
  traces?: string;
  traces_tags?: string[];
  countries?: string;
  origins?: string;
  packaging?: string;
  packaging_tags?: string[];
  labels?: string;
  labels_tags?: string[];
  stores?: string;
  code?: string;
  carbon_footprint_from_known_ingredients_debug?: string;
  ecoscore_data?: {
    agribalyse?: {
      co2_agriculture?: number;
      co2_consumption?: number;
      co2_distribution?: number;
      co2_packaging?: number;
      co2_processing?: number;
      co2_transportation?: number;
      co2_total?: number;
    };
  };
}

export interface ProductInfo {
  name: string | null;
  brand: string | null;
  category: string | null;
  categories: string[];
  imageUrl: string | null;
  quantity: string | null;
  ingredients: string | null;
  ingredientsAnalysis: string[];
  nutriments: {
    energy: string | null;
    energyKcal: number | null;
    fat: number | null;
    saturatedFat: number | null;
    carbohydrates: number | null;
    sugars: number | null;
    proteins: number | null;
    salt: number | null;
    fiber: number | null;
    sodium: number | null;
  } | null;
  nutriscoreGrade: string | null;
  nutriscoreScore: number | null;
  ecoscoreGrade: string | null;
  ecoscoreScore: number | null;
  novaGroup: number | null;
  allergens: string | null;
  allergensTags: string[];
  traces: string | null;
  tracesTags: string[];
  origin: string | null;
  countries: string | null;
  packaging: string | null;
  packagingTags: string[];
  labels: string | null;
  labelsTags: string[];
  stores: string | null;
  barcode: string;
  carbonFootprint: {
    total: number | null;
    agriculture: number | null;
    consumption: number | null;
    distribution: number | null;
    packaging: number | null;
    processing: number | null;
    transportation: number | null;
  } | null;
}

// Simple in-memory cache
const productCache = new Map<string, { data: ProductInfo | null; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper to clean category strings
const cleanCategory = (cat: string): string => {
  // Remove language prefixes like "en:", "it:", "fr:", etc.
  return cat.replace(/^[a-z]{2}:/, "").trim();
};

// Helper to extract unique categories
const extractCategories = (product: OpenFoodFactsProduct): string[] => {
  const categories: Set<string> = new Set();
  
  // From categories_tags (preferred - cleaner)
  if (product.categories_tags && Array.isArray(product.categories_tags)) {
    product.categories_tags.forEach((cat) => {
      const cleaned = cleanCategory(cat);
      if (cleaned) categories.add(cleaned);
    });
  }
  
  // Fallback to categories string
  if (categories.size === 0 && product.categories) {
    product.categories.split(",").forEach((cat) => {
      const cleaned = cat.trim();
      if (cleaned) categories.add(cleaned);
    });
  }
  
  return Array.from(categories).slice(0, 10); // Limit to 10 categories
};

export function useProductInfo() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProductInfo = useCallback(async (barcode: string): Promise<ProductInfo | null> => {
    if (!barcode || !/^\d+$/.test(barcode)) {
      return null;
    }

    // Check cache first
    const cached = productCache.get(barcode);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      if (data.status !== 1 || !data.product) {
        // Product not found, cache the null result
        productCache.set(barcode, { data: null, timestamp: Date.now() });
        return null;
      }

      const product: OpenFoodFactsProduct = data.product;
      const categories = extractCategories(product);
      
      // Parse carbon footprint from ecoscore data
      let carbonFootprint = null;
      if (product.ecoscore_data?.agribalyse) {
        const agri = product.ecoscore_data.agribalyse;
        carbonFootprint = {
          total: agri.co2_total ?? null,
          agriculture: agri.co2_agriculture ?? null,
          consumption: agri.co2_consumption ?? null,
          distribution: agri.co2_distribution ?? null,
          packaging: agri.co2_packaging ?? null,
          processing: agri.co2_processing ?? null,
          transportation: agri.co2_transportation ?? null,
        };
      }
      
      const productInfo: ProductInfo = {
        name: product.product_name || null,
        brand: product.brands || null,
        category: categories[0] || null,
        categories,
        imageUrl: product.image_front_url || product.image_url || product.image_small_url || null,
        quantity: product.quantity || null,
        ingredients: product.ingredients_text_it || product.ingredients_text || null,
        ingredientsAnalysis: product.ingredients_analysis_tags?.map(cleanCategory) || [],
        nutriments: product.nutriments
          ? {
              energy: product.nutriments.energy_value
                ? `${product.nutriments.energy_value} ${product.nutriments.energy_unit || "kJ"}`
                : null,
              energyKcal: product.nutriments["energy-kcal_100g"] ?? null,
              fat: product.nutriments.fat_100g ?? product.nutriments.fat ?? null,
              saturatedFat: product.nutriments["saturated-fat_100g"] ?? product.nutriments.saturated_fat ?? null,
              carbohydrates: product.nutriments.carbohydrates_100g ?? product.nutriments.carbohydrates ?? null,
              sugars: product.nutriments.sugars_100g ?? product.nutriments.sugars ?? null,
              proteins: product.nutriments.proteins_100g ?? product.nutriments.proteins ?? null,
              salt: product.nutriments.salt_100g ?? product.nutriments.salt ?? null,
              fiber: product.nutriments.fiber_100g ?? product.nutriments.fiber ?? null,
              sodium: product.nutriments.sodium_100g ?? null,
            }
          : null,
        nutriscoreGrade: product.nutriscore_grade || null,
        nutriscoreScore: product.nutriscore_score ?? null,
        ecoscoreGrade: product.ecoscore_grade || null,
        ecoscoreScore: product.ecoscore_score ?? null,
        novaGroup: product.nova_group || null,
        allergens: product.allergens || null,
        allergensTags: product.allergens_tags?.map(cleanCategory) || [],
        traces: product.traces || null,
        tracesTags: product.traces_tags?.map(cleanCategory) || [],
        origin: product.origins || null,
        countries: product.countries || null,
        packaging: product.packaging || null,
        packagingTags: product.packaging_tags?.map(cleanCategory) || [],
        labels: product.labels || null,
        labelsTags: product.labels_tags?.map(cleanCategory) || [],
        stores: product.stores || null,
        barcode,
        carbonFootprint,
      };

      // Cache the result
      productCache.set(barcode, { data: productInfo, timestamp: Date.now() });

      return productInfo;
    } catch (err) {
      console.error("Error fetching product info:", err);
      setError("Errore nel recupero delle informazioni del prodotto");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    productCache.clear();
  }, []);

  return {
    fetchProductInfo,
    isLoading,
    error,
    clearCache,
  };
}
