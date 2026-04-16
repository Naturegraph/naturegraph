/**
 * Barrel export — components/location
 *
 * NOTE : ObservationsMap doit être importé en lazy depuis les pages
 * (contient Leaflet ~150KB) :
 *   const ObservationsMap = lazy(() =>
 *     import('@/components/location/ObservationsMap').then(m => ({ default: m.ObservationsMap }))
 *   )
 */
export { CityAutocomplete } from './CityAutocomplete'
export { LocationRadiusSlider } from './LocationRadiusSlider'
export { LocationVisibilityToggle } from './LocationVisibilityToggle'
export { LocationPickerSection } from './LocationPickerSection'
export { LocationPermissionModal } from './LocationPermissionModal'
export { ObservationsMap } from './ObservationsMap'
export { postToMapObservation } from './observationsMapUtils'
export type { MapObservation } from './observationsMapUtils'
