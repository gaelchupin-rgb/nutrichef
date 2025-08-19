export interface ShoppingNeed {
  id: string
  name: string
  quantity: number
  unit: string
  category?: string
  priority?: 'high' | 'medium' | 'low'
}

export interface StoreOffer {
  storeId: string
  productId: string
  storeName: string
  productName: string
  price: number
  unit: string
  quantity: number
  isPromo?: boolean
  promoPrice?: number
  promoStart?: string
  promoEnd?: string
  distance?: number
}

export interface OptimizationResult {
  stores: Array<{
    id: string
    name: string
    distance?: number
    total: number
    savings: number
  }>
  items: Array<{
    storeId: string
    storeName: string
    items: Array<{
      need: ShoppingNeed
      offer: StoreOffer
      quantity: number
      totalPrice: number
    }>
    total: number
  }>
  total: number
  savings: number
  recommendations: string[]
}

// Convertir les unités en unités de base pour la comparaison
function normalizeToBaseUnit(value: number, unit: string): { value: number; baseUnit: string } | null {
  const normalizedUnit = unit.toLowerCase()
  
  // Poids
  if (normalizedUnit === 'kg') return { value: value * 1000, baseUnit: 'g' }
  if (normalizedUnit === 'g') return { value, baseUnit: 'g' }
  if (normalizedUnit === 'mg') return { value: value / 1000, baseUnit: 'g' }
  
  // Volume
  if (normalizedUnit === 'l' || normalizedUnit === 'lt') return { value: value * 1000, baseUnit: 'ml' }
  if (normalizedUnit === 'ml') return { value, baseUnit: 'ml' }
  if (normalizedUnit === 'cl') return { value: value * 10, baseUnit: 'ml' }
  
  // Unités
  if (normalizedUnit === 'u' || normalizedUnit === 'unit' || normalizedUnit === 'pièce' || normalizedUnit === 'pcs') {
    return { value, baseUnit: 'unit' }
  }
  
  // Valeur par défaut
  return { value, baseUnit: 'unit' }
}

// Calculer le prix par unité de base
function getPricePerBaseUnit(offer: StoreOffer): number | null {
  const { value: baseQuantity, baseUnit } = normalizeToBaseUnit(offer.quantity, offer.unit) || { value: 0, baseUnit: 'unit' }
  const price = offer.isPromo && offer.promoPrice ? offer.promoPrice : offer.price
  
  if (baseQuantity <= 0) return null
  
  return price / baseQuantity
}

// Filtrer les offres aberrantes
function filterOutliers(offers: StoreOffer[]): StoreOffer[] {
  // Grouper par produit normalisé
  const productGroups = new Map<string, StoreOffer[]>()
  
  offers.forEach(offer => {
    const normalizedProduct = offer.productName.toLowerCase().trim()
    if (!productGroups.has(normalizedProduct)) {
      productGroups.set(normalizedProduct, [])
    }
    productGroups.get(normalizedProduct)!.push(offer)
  })
  
  const filteredOffers: StoreOffer[] = []
  
  productGroups.forEach((groupOffers) => {
    if (groupOffers.length < 3) {
      // Pas assez d'offres pour détecter les outliers, on garde tout
      filteredOffers.push(...groupOffers)
      return
    }
    
    // Calculer les prix par unité de base
    const prices = groupOffers.map(offer => getPricePerBaseUnit(offer)).filter(Boolean) as number[]
    
    if (prices.length === 0) return
    
    // Calculer Q1 et Q3
    const sortedPrices = [...prices].sort((a, b) => a - b)
    const q1Index = Math.floor(sortedPrices.length * 0.25)
    const q3Index = Math.floor(sortedPrices.length * 0.75)
    const q1 = sortedPrices[q1Index]
    const q3 = sortedPrices[q3Index]
    
    // Calculer l'IQR et les bornes
    const iqr = q3 - q1
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr
    
    // Filtrer les offres
    groupOffers.forEach((offer) => {
      const price = getPricePerBaseUnit(offer)
      if (price && price >= lowerBound && price <= upperBound) {
        filteredOffers.push(offer)
      }
    })
  })
  
  return filteredOffers
}

// Trouver la meilleure combinaison de magasins
function findBestStoreCombination(
  needs: ShoppingNeed[],
  offers: StoreOffer[],
  maxStores: number = 3
): OptimizationResult {
  // Filtrer les offres aberrantes
  const validOffers = filterOutliers(offers)
  
  // Grouper les offres par magasin
  const storeOffers = new Map<string, StoreOffer[]>()
  validOffers.forEach(offer => {
    if (!storeOffers.has(offer.storeId)) {
      storeOffers.set(offer.storeId, [])
    }
    storeOffers.get(offer.storeId)!.push(offer)
  })
  
  // Générer toutes les combinaisons possibles de magasins
  const storeIds = Array.from(storeOffers.keys())
  const combinations: string[][] = []
  
  for (let k = 1; k <= Math.min(maxStores, storeIds.length); k++) {
    generateCombinations(storeIds, k, 0, [], combinations)
  }
  
  let bestResult: OptimizationResult | null = null
  let bestCost = Infinity
  
  // Évaluer chaque combinaison
  for (const combination of combinations) {
    const result = evaluateCombination(needs, combination, storeOffers)
    
    if (result.total < bestCost) {
      bestCost = result.total
      bestResult = result
    }
  }
  
  // Générer des recommandations
  const recommendations = generateRecommendations(bestResult!, needs)
  
  return {
    ...bestResult!,
    recommendations
  }
}

// Générer des combinaisons de magasins
export function generateCombinations(
  array: string[],
  k: number,
  start: number,
  current: string[],
  results: string[][]
) {
  if (current.length === k) {
    results.push([...current])
    return
  }

  // La condition précédente "array.length - k" pouvait omettre certaines combinaisons
  for (let i = start; i <= array.length - (k - current.length); i++) {
    current.push(array[i])
    generateCombinations(array, k, i + 1, current, results)
    current.pop()
  }
}

// Évaluer une combinaison de magasins
function evaluateCombination(
  needs: ShoppingNeed[],
  storeIds: string[],
  storeOffers: Map<string, StoreOffer[]>
): Omit<OptimizationResult, 'recommendations'> {
  const storeMap = new Map<string, { name: string; distance?: number }>()
  const items: OptimizationResult['items'] = []
  let total = 0
  let savings = 0
  
  // Initialiser les magasins
  storeIds.forEach(storeId => {
    const firstOffer = storeOffers.get(storeId)?.[0]
    if (firstOffer) {
      storeMap.set(storeId, {
        name: firstOffer.storeName,
        distance: firstOffer.distance
      })
    }
    items.push({
      storeId,
      storeName: firstOffer?.storeName || 'Magasin inconnu',
      items: [],
      total: 0
    })
  })
  
  // Pour chaque besoin, trouver la meilleure offre dans les magasins sélectionnés
  needs.forEach(need => {
    let bestOffer: StoreOffer | null = null
    let bestStoreIndex = -1
    let bestPrice = Infinity
    
    // Normaliser le besoin
    const { value: neededQuantity, baseUnit: neededUnit } = normalizeToBaseUnit(need.quantity, need.unit) || { value: 0, baseUnit: 'unit' }
    
    // Chercher dans chaque magasin
    storeIds.forEach((storeId, storeIndex) => {
      const offers = storeOffers.get(storeId) || []
      
      // Trouver des offres correspondantes
      const matchingOffers = offers.filter(offer => {
        const offerProduct = offer.productName.toLowerCase().trim()
        const needProduct = need.name.toLowerCase().trim()
        
        // Correspondance simple (à améliorer avec un meilleur matching)
        return offerProduct.includes(needProduct) || needProduct.includes(offerProduct)
      })
      
      // Évaluer chaque offre correspondante
      matchingOffers.forEach(offer => {
        const { value: offerQuantity, baseUnit: offerUnit } = normalizeToBaseUnit(offer.quantity, offer.unit) || { value: 0, baseUnit: 'unit' }
        
        if (offerUnit === neededUnit) {
          const price = offer.isPromo && offer.promoPrice ? offer.promoPrice : offer.price
          const pricePerUnit = price / offerQuantity
          const totalPrice = pricePerUnit * neededQuantity
          
          if (totalPrice < bestPrice) {
            bestPrice = totalPrice
            bestOffer = offer
            bestStoreIndex = storeIndex
          }
        }
      })
    })
    
    // Ajouter l'offre au résultat
    if (bestOffer && bestStoreIndex >= 0) {
      const price = bestOffer.isPromo && bestOffer.promoPrice ? bestOffer.promoPrice : bestOffer.price
      const originalPrice = bestOffer.price
      const quantity = Math.ceil(neededQuantity / (normalizeToBaseUnit(bestOffer.quantity, bestOffer.unit)?.value || 1))
      
      items[bestStoreIndex].items.push({
        need,
        offer: bestOffer,
        quantity,
        totalPrice: bestPrice * quantity
      })
      
      items[bestStoreIndex].total += bestPrice * quantity
      total += bestPrice * quantity
      
      if (bestOffer.isPromo) {
        savings += (originalPrice - bestOffer.promoPrice!) * quantity
      }
    }
  })
  
  // Préparer les informations des magasins
  const stores = storeIds.map(storeId => {
    const storeInfo = storeMap.get(storeId)!
    const storeItems = items.find(item => item.storeId === storeId)
    return {
      id: storeId,
      name: storeInfo.name,
      distance: storeInfo.distance,
      total: storeItems?.total || 0,
      savings: storeItems?.items.reduce((sum, item) => {
        return sum + (item.offer.isPromo && item.offer.promoPrice 
          ? (item.offer.price - item.offer.promoPrice) * item.quantity 
          : 0)
      }, 0) || 0
    }
  })
  
  return {
    stores,
    items,
    total,
    savings
  }
}

// Générer des recommandations
function generateRecommendations(result: OptimizationResult, needs: ShoppingNeed[]): string[] {
  const recommendations: string[] = []
  
  // Recommandations basées sur les économies
  if (result.savings > 0) {
    recommendations.push(`Vous économisez ${result.savings.toFixed(2)}€ grâce aux promotions !`)
  }
  
  // Recommandations basées sur le nombre de magasins
  if (result.stores.length > 1) {
    recommendations.push(`Visiter ${result.stores.length} magasins vous permet d'économiser ${(result.savings / result.total * 100).toFixed(1)}%`)
  }
  
  // Recommandations basées sur les produits manquants
  const coveredNeeds = new Set(result.items.flatMap(store => 
    store.items.map(item => item.need.id)
  ))
  const missingNeeds = needs.filter(need => !coveredNeeds.has(need.id))
  
  if (missingNeeds.length > 0) {
    recommendations.push(`${missingNeeds.length} produits n'ont pas été trouvés dans les magasins sélectionnés`)
  }
  
  // Recommandations basées sur la distance
  const maxDistance = Math.max(...result.stores.map(store => store.distance || 0))
  if (maxDistance > 5) {
    recommendations.push(`Certains magasins sont à plus de ${maxDistance}km, envisagez la livraison`)
  }
  
  return recommendations
}

// Fonction principale d'optimisation
export function optimizeShopping(
  needs: ShoppingNeed[],
  offers: StoreOffer[],
  maxStores: number = 3
): OptimizationResult {
  return findBestStoreCombination(needs, offers, maxStores)
}