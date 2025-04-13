import { StatusType } from './StatusDot';

/**
 * Maps app status values to StatusDot component status types
 * This handles the conversion between your app's status values 
 * (like STATUS_TYPES.ONLINE, STATUS_TYPES.SLEEPY) and the StatusDot component's StatusType
 * 
 * @param appStatus The status value from your app (e.g. from userStatus in UserProfileContext)
 * @returns The corresponding StatusType for the StatusDot component
 */
export function mapStatusToStatusDotType(appStatus: string): StatusType {
  // Basic status types are directly supported by StatusDot
  if (appStatus === 'online' || appStatus === 'busy' || 
      appStatus === 'offline' || appStatus === 'hosting' || 
      appStatus === 'watching' || appStatus === 'spotlight') {
    return appStatus as StatusType;
  }
  
  // Mood statuses should be mapped to a basic status visualization
  // You could customize this mapping based on your app's requirements
  switch (appStatus) {
    // Happy-like moods map to online
    case 'happy':
    case 'excited':
    case 'love':
      return 'online';
      
    // Sleepy or bored map to idle
    case 'sleepy':
    case 'bored':
      return 'idle';
      
    // Negative moods map to busy
    case 'sad':
    case 'angry':
    case 'hungry':
      return 'busy';
      
    // Default to online if unknown
    default:
      return 'online';
  }
}

/**
 * Get a display name for a status
 * @param status The status value from your app
 * @returns Human-readable status name
 */
export function getStatusDisplayName(status: string): string {
  // Capitalize first letter
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Extension to StatusDot component to support additional mood statuses 
 * from your app and make them visually distinct while maintaining
 * the standard StatusDot API
 */
export function getStatusColor(appStatus: string): string {
  // First map to standard status type
  const statusType = mapStatusToStatusDotType(appStatus);
  
  // Override colors for specific moods to make them visually distinct
  switch (appStatus) {
    case 'happy':
      return '#4CAF50'; // Regular green
    case 'excited':
      return '#8BC34A'; // Light green
    case 'love':
      return '#E91E63'; // Pink
    case 'sleepy':
      return '#9C27B0'; // Purple
    case 'bored':
      return '#9E9E9E'; // Grey
    case 'sad':
      return '#2196F3'; // Blue
    case 'angry':
      return '#F44336'; // Red
    case 'hungry':
      return '#FF9800'; // Orange
    default:
      // For basic statuses, we'll use the default StatusDot colors
      switch (statusType) {
        case 'online':
          return '#4CAF50'; // Green
        case 'busy':
          return '#FF4B4B'; // Red
        case 'idle':
          return '#FFCB0E'; // Yellow
        case 'offline':
          return '#9BA1A6'; // Grey
        case 'hosting':
          return '#FF4B4B'; // Red - same as busy
        case 'watching':
          return '#4B8BFF'; // Blue
        case 'spotlight':
          return '#34C759'; // Green - similar to online but specific to spotlight
        default:
          return '#9BA1A6'; // Grey as default
      }
  }
} 