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

export const MAX_STORE_COMBINATIONS = Number(
  process.env.MAX_STORE_COMBINATIONS || '100000'
)

// Convertir les unités en unités de base pour la comparaison
const weightUnits: Record<string, number> = {
  kg: 1000,
  kgs: 1000,
  kilogram: 1000,
  kilograms: 1000,
  kilogramme: 1000,
  kilogrammes: 1000,
  kilo: 1000,
  kilos: 1000,
  g: 1,
  gram: 1,
  grams: 1,
  gramme: 1,
  grammes: 1,
  mg: 1 / 1000,
  milligram: 1 / 1000,
  milligrams: 1 / 1000,
  milligramme: 1 / 1000,
  milligrammes: 1 / 1000,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  oz: 28.3495,
  ozs: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
}

const volumeUnits: Record<string, number> = {
  l: 1000,
  lt: 1000,
  liter: 1000,
  litre: 1000,
  liters: 1000,
  litres: 1000,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  millilitre: 1,
  millilitres: 1,
  cl: 10,
  centiliter: 10,
  centiliters: 10,
  centilitre: 10,
  centilitres: 10,
}

const unitUnits = new Set([
  'u',
  'unit',
  'units',
  'pièce',
  'pièces',
  'piece',
  'pieces',
  'pcs',
])

export function normalizeToBaseUnit(
  value: number,
  unit: string
): { value: number; baseUnit: string } | null {
  const normalizedUnit = unit.trim().toLowerCase()

  if (normalizedUnit in weightUnits) {
    return { value: value * weightUnits[normalizedUnit], baseUnit: 'g' }
  }

  if (normalizedUnit in volumeUnits) {
    return { value: value * volumeUnits[normalizedUnit], baseUnit: 'ml' }
  }

  if (unitUnits.has(normalizedUnit)) {
    return { value, baseUnit: 'unit' }
  }

  console.warn(`Unknown unit: ${unit}`)
  return null
}

// Calculer le prix par unité de base
function getPricePerBaseUnit(offer: StoreOffer): number | null {
  const normalized = normalizeToBaseUnit(offer.quantity, offer.unit)
  if (!normalized) return null
  const { value: baseQuantity } = normalized
  const price = offer.isPromo && offer.promoPrice ? offer.promoPrice : offer.price

  if (baseQuantity <= 0) return null

  return price / baseQuantity
}

// Filtrer les offres aberrantes
export function filterOutliers(offers: StoreOffer[]): StoreOffer[] {
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
    const prices = groupOffers
      .map(offer => getPricePerBaseUnit(offer))
      .filter((p): p is number => p !== null)
    
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
      if (price !== null && price >= lowerBound && price <= upperBound) {
        filteredOffers.push(offer)
      }
    })
  })
  
  return filteredOffers
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  )
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  return matrix[a.length][b.length]
}

function tokenize(name: string): string[] {
  return name.toLowerCase().split(/\s+/).filter(Boolean)
}

export function namesMatch(a: string, b: string): boolean {
  const aTokens = tokenize(a)
  const bTokens = tokenize(b)
  return (
    aTokens.every((at) => bTokens.some((bt) => levenshtein(at, bt) <= 2)) &&
    bTokens.every((bt) => aTokens.some((at) => levenshtein(bt, at) <= 2))
  )
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
    if (combinations.length > MAX_STORE_COMBINATIONS) {
      throw new Error('Too many store combinations')
    }
  }
  
  let bestResult: Omit<OptimizationResult, 'recommendations'> | null = null
  let bestCost = Infinity

  // Évaluer chaque combinaison
  for (const combination of combinations) {
    const result = evaluateCombination(needs, combination, storeOffers)

    if (result.total < bestCost) {
      bestCost = result.total
      bestResult = result
    }
  }
  if (!bestResult) {
    return {
      stores: [],
      items: [],
      total: 0,
      savings: 0,
      recommendations: ['Aucune combinaison de magasins trouvée']
    }
  }

  // Générer des recommandations
  const recommendations = generateRecommendations(bestResult, needs)

  return {
    ...bestResult,
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
  for (const need of needs) {
    let bestOffer: StoreOffer | null = null
    let bestStoreIndex = -1
    let bestTotalPrice = Infinity

    // Normaliser le besoin
    const needNormalized = normalizeToBaseUnit(need.quantity, need.unit)
    if (!needNormalized) continue
    const { value: neededQuantity, baseUnit: neededUnit } = needNormalized

    // Chercher dans chaque magasin
    for (let storeIndex = 0; storeIndex < storeIds.length; storeIndex++) {
      const storeId = storeIds[storeIndex]
      const offers = storeOffers.get(storeId) || []

      for (const offer of offers) {
        if (!namesMatch(need.name, offer.productName)) {
          continue
        }

        const offerNormalized = normalizeToBaseUnit(offer.quantity, offer.unit)
        if (!offerNormalized) continue
        const { value: offerQuantity, baseUnit: offerUnit } = offerNormalized

        if (offerUnit === neededUnit && offerQuantity > 0) {
          const price = offer.isPromo && offer.promoPrice ? offer.promoPrice : offer.price
          const requiredPackages = Math.ceil(neededQuantity / offerQuantity)
          const totalPrice = price * requiredPackages

          if (totalPrice < bestTotalPrice) {
            bestTotalPrice = totalPrice
            bestOffer = offer
            bestStoreIndex = storeIndex
          }
        }
      }
    }

    // Ajouter l'offre au résultat
    if (bestOffer && bestStoreIndex >= 0) {
      const price = bestOffer!.isPromo && bestOffer!.promoPrice ? bestOffer!.promoPrice : bestOffer!.price
      const originalPrice = bestOffer!.price
      const offerNormalized = normalizeToBaseUnit(bestOffer!.quantity, bestOffer!.unit)
      const unitQuantity = offerNormalized ? offerNormalized.value : 1
      const quantity = Math.ceil(neededQuantity / unitQuantity)

      items[bestStoreIndex].items.push({
        need,
        offer: bestOffer!,
        quantity,
        totalPrice: price * quantity
      })

      items[bestStoreIndex].total += price * quantity
      total += price * quantity

      if (bestOffer!.isPromo) {
        savings += (originalPrice - (bestOffer!.promoPrice ?? originalPrice)) * quantity
      }
    }
  }
  
  // Préparer les informations des magasins
  const stores = storeIds.map(storeId => {
    const storeInfo = storeMap.get(storeId)!
    const storeItems = items.find(item => item.storeId === storeId)
    const storeTotal = storeItems?.total || 0
    const storeSavings = storeItems
      ? storeItems.items.reduce((sum, item) => {
          return sum + (item.offer.isPromo && item.offer.promoPrice
            ? (item.offer.price - item.offer.promoPrice) * item.quantity
            : 0)
        }, 0)
      : 0
    return {
      id: storeId,
      name: storeInfo.name,
      distance: storeInfo.distance,
      total: storeTotal,
      savings: storeSavings
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
export function generateRecommendations(result: Omit<OptimizationResult, 'recommendations'>, needs: ShoppingNeed[]): string[] {
  const recommendations: string[] = []
  
  // Recommandations basées sur les économies
  if (result.savings > 0) {
    recommendations.push(`Vous économisez ${result.savings.toFixed(2)}€ grâce aux promotions !`)
  }
  
  // Recommandations basées sur le nombre de magasins
  if (result.stores.length > 1 && result.total > 0) {
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
  const maxDistance =
    result.stores.length > 0
      ? Math.max(...result.stores.map(store => store.distance || 0))
      : 0
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