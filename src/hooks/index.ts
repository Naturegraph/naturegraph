/**
 * hooks — Barrel export des hooks personnalisés
 */

export { useScrollReveal } from './useScrollReveal'
export { useTheme } from './useTheme'
export { useFeed, useInvalidateFeed, FEED_QUERY_KEY } from './useFeed'
export { useProfile, useProfileByUsername, useUpdateProfile, useSuggestedUsers } from './useProfile'
export { usePost, useToggleReaction, useCreatePost } from './usePost'
export {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from './useNotifications'
export { useSettings, useUpdateSettings } from './useSettings'
