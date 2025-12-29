import { useState, useCallback } from "react";

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  image_front_url?: string;
  image_small_url?: string;
  quantity?: string;
  ingredients_text?: string;
  nutriments?: {
    energy_value?: number;
    energy_unit?: string;
    fat?: number;
    saturated_fat?: number;
    carbohydrates?: number;
    sugars?: number;
    proteins?: number;
    salt?: number;
    fiber?: number;
  };
  nutriscore_grade?: string;
  ecoscore_grade?: string;
  nova_group?: number;
  allergens?: string;
  traces?: string;
  countries?: string;
  origins?: string;
  packaging?: string;
  labels?: string;
  stores?: string;
  code?: string;
}

export interface ProductInfo {
  name: string | null;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  quantity: string | null;
  ingredients: string | null;
  nutriments: {
    energy: string | null;
    fat: number | null;
    saturatedFat: number | null;
    carbohydrates: number | null;
    sugars: number | null;
    proteins: number | null;
    salt: number | null;
    fiber: number | null;
  } | null;
  nutriscoreGrade: string | null;
  ecoscoreGrade: string | null;
  novaGroup: number | null;
  allergens: string | null;
  traces: string | null;
  origin: string | null;
  packaging: string | null;
  labels: string | null;
  stores: string | null;
  barcode: string;
}

// Simple in-memory cache
const productCache = new Map<string, { data: ProductInfo | null; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

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
      
      const productInfo: ProductInfo = {
        name: product.product_name || null,
        brand: product.brands || null,
        category: product.categories?.split(",")[0]?.trim() || null,
        imageUrl: product.image_front_url || product.image_url || product.image_small_url || null,
        quantity: product.quantity || null,
        ingredients: product.ingredients_text || null,
        nutriments: product.nutriments
          ? {
              energy: product.nutriments.energy_value
                ? `${product.nutriments.energy_value} ${product.nutriments.energy_unit || "kJ"}`
                : null,
              fat: product.nutriments.fat ?? null,
              saturatedFat: product.nutriments.saturated_fat ?? null,
              carbohydrates: product.nutriments.carbohydrates ?? null,
              sugars: product.nutriments.sugars ?? null,
              proteins: product.nutriments.proteins ?? null,
              salt: product.nutriments.salt ?? null,
              fiber: product.nutriments.fiber ?? null,
            }
          : null,
        nutriscoreGrade: product.nutriscore_grade || null,
        ecoscoreGrade: product.ecoscore_grade || null,
        novaGroup: product.nova_group || null,
        allergens: product.allergens || null,
        traces: product.traces || null,
        origin: product.origins || null,
        packaging: product.packaging || null,
        labels: product.labels || null,
        stores: product.stores || null,
        barcode,
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