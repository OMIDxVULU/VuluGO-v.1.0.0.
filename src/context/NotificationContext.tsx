import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Define interfaces for notification counts
interface NotificationCounts {
  announcements: number;
  friendRequests: number;
  profileViews: number;
  allNotifications: number;
  total: number;
}

// Define actions for our reducer
type NotificationAction = 
  | { type: 'UPDATE_ANNOUNCEMENTS'; count: number }
  | { type: 'UPDATE_FRIEND_REQUESTS'; count: number }
  | { type: 'UPDATE_PROFILE_VIEWS'; count: number }
  | { type: 'UPDATE_ALL_NOTIFICATIONS'; count: number }
  | { type: 'CLEAR_TYPE'; notificationType: keyof Omit<NotificationCounts, 'total'> }
  | { type: 'MARK_ALL_READ' };

interface NotificationContextType {
  counts: NotificationCounts;
  updateAnnouncementCount: (count: number) => void;
  updateFriendRequestCount: (count: number) => void;
  updateProfileViewCount: (count: number) => void;
  updateAllNotificationsCount: (count: number) => void;
  clearNotificationsByType: (type: keyof Omit<NotificationCounts, 'total'>) => void;
  markAllAsRead: () => void;
}

// Initial state
const initialState: NotificationCounts = {
  announcements: 7,
  friendRequests: 15,
  profileViews: 31,
  allNotifications: 3,
  total: 56
};

// Helper function to calculate total
const calculateTotal = (counts: Omit<NotificationCounts, 'total'>): number => {
  return counts.announcements + 
         counts.friendRequests + 
         counts.profileViews + 
         counts.allNotifications;
};

// Create the reducer
const notificationReducer = (state: NotificationCounts, action: NotificationAction): NotificationCounts => {
  let newState: NotificationCounts;
  
  switch (action.type) {
    case 'UPDATE_ANNOUNCEMENTS':
      newState = { ...state, announcements: action.count };
      return { ...newState, total: calculateTotal(newState) };
      
    case 'UPDATE_FRIEND_REQUESTS':
      newState = { ...state, friendRequests: action.count };
      return { ...newState, total: calculateTotal(newState) };
      
    case 'UPDATE_PROFILE_VIEWS':
      newState = { ...state, profileViews: action.count };
      return { ...newState, total: calculateTotal(newState) };
      
    case 'UPDATE_ALL_NOTIFICATIONS':
      newState = { ...state, allNotifications: action.count };
      return { ...newState, total: calculateTotal(newState) };
      
    case 'CLEAR_TYPE':
      newState = { ...state, [action.notificationType]: 0 };
      return { ...newState, total: calculateTotal(newState) };
      
    case 'MARK_ALL_READ':
      return {
        announcements: 0,
        friendRequests: 0,
        profileViews: 0,
        allNotifications: 0,
        total: 0
      };
      
    default:
      return state;
  }
};

// Create the context
const NotificationContext = createContext<NotificationContextType>({
  counts: initialState,
  updateAnnouncementCount: () => {},
  updateFriendRequestCount: () => {},
  updateProfileViewCount: () => {},
  updateAllNotificationsCount: () => {},
  clearNotificationsByType: () => {},
  markAllAsRead: () => {}
});

// Create the provider component
export const NotificationProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [counts, dispatch] = useReducer(notificationReducer, initialState);

  // Action creators
  const updateAnnouncementCount = (count: number) => {
    dispatch({ type: 'UPDATE_ANNOUNCEMENTS', count });
  };

  const updateFriendRequestCount = (count: number) => {
    dispatch({ type: 'UPDATE_FRIEND_REQUESTS', count });
  };

  const updateProfileViewCount = (count: number) => {
    dispatch({ type: 'UPDATE_PROFILE_VIEWS', count });
  };

  const updateAllNotificationsCount = (count: number) => {
    dispatch({ type: 'UPDATE_ALL_NOTIFICATIONS', count });
  };

  const clearNotificationsByType = (type: keyof Omit<NotificationCounts, 'total'>) => {
    dispatch({ type: 'CLEAR_TYPE', notificationType: type });
  };

  const markAllAsRead = () => {
    dispatch({ type: 'MARK_ALL_READ' });
  };

  const value = {
    counts,
    updateAnnouncementCount,
    updateFriendRequestCount,
    updateProfileViewCount,
    updateAllNotificationsCount,
    clearNotificationsByType,
    markAllAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = () => useContext(NotificationContext);

export default NotificationContext; 