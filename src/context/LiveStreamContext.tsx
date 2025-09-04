import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { streamingService } from '../services/streamingService';
import { StreamSyncValidator } from '../services/streamSyncValidator';
import { StreamCleanupService } from '../services/streamCleanupService';
import { StreamValidator } from '../services/streamValidator';
import { PlatformUtils } from '../utils/platformUtils';
import { ActiveStreamTracker } from '../services/activeStreamTracker';
import { FirestoreErrorRecovery } from '../utils/firestoreErrorRecovery';
import { useAuth } from './AuthContext';

// Define the structure of a stream
export interface StreamHost {
  name: string;
  avatar: string;
  joinOrder: number; // Track join order for power ranking
  isSpeaking: boolean;
  isMuted: boolean;
}

export interface StreamViewer {
  name: string;
  avatar: string;
  isMuted: boolean;
  isBanned: boolean;
}

export interface StreamFriend {
  name: string;
  avatar: string;
}

export interface LiveStream {
  id: string;
  title: string;
  hosts: StreamHost[];
  viewers: StreamViewer[];
  views: number;
  boost?: number;
  rank?: number;
  friends?: StreamFriend[];
  isActive: boolean;
  startedAt: number; // timestamp
}

// Define the context interface
interface LiveStreamContextType {
  streams: LiveStream[];
  featuredStreams: LiveStream[];
  friendStreams: {
    hosting: LiveStream[];
    watching: LiveStream[];
  };
  getStreamById: (id: string) => LiveStream | undefined;
  joinStream: (streamId: string, skipConfirmation?: boolean) => void;
  currentlyWatching: string | null; // ID of the stream the user is currently watching
  isMinimized: boolean;
  setStreamMinimized: (streamId: string, minimized: boolean) => void;

  // New features
  joinAsHost: (streamId: string, userName: string, userAvatar: string) => void;
  kickHost: (streamId: string, hostName: string, kickedBy: string) => void;
  muteViewer: (streamId: string, viewerName: string, mutedBy: string) => void;
  banViewer: (streamId: string, viewerName: string, bannedBy: string) => void;
  leaveStream: (streamId: string) => Promise<void>;
  leaveStreamWithConfirmation: (streamId: string) => Promise<void>;

  // Stream participation prevention
  hasActiveStream: () => boolean;
  createNewStream: (title: string, hostId: string, hostName: string, hostAvatar: string, skipConfirmation?: boolean) => Promise<string>;

  // Refresh functionality
  refreshStreams: () => Promise<void>;
  isRefreshing: boolean;
  lastRefreshTime: Date | null;

  // Operation state
  isOperationInProgress: boolean;
}

// Create the context with a default value
const LiveStreamContext = createContext<LiveStreamContextType | undefined>(undefined);

// Note: MOCK_STREAMS has been replaced with real Firebase data
// The streaming service now fetches active streams from Firestore

// Provider component
export const LiveStreamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [currentlyWatching, setCurrentlyWatching] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isOperationInProgress, setIsOperationInProgress] = useState<boolean>(false);
  const [lastOperationTime, setLastOperationTime] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const { user, loading: authLoading } = useAuth();

  // Debounce delay for stream operations (500ms)
  const OPERATION_DEBOUNCE_DELAY = 500;

  // Initialize sync validation and cleanup when user changes
  useEffect(() => {
    if (user && !authLoading) {
      console.log(`🔄 Initializing sync validation for user ${user.uid}`);

      // Start sync validation
      StreamSyncValidator.startSyncValidation(user.uid, currentlyWatching);

      // Clean up user's orphaned records
      StreamCleanupService.cleanupUserOrphanedRecords(user.uid);

      // Start Firestore error monitoring (only if platform supports it)
      try {
        FirestoreErrorRecovery.startErrorMonitoring(user.uid);
      } catch (error) {
        console.warn('⚠️ Could not start Firestore error monitoring:', error);
      }

      // Test Firebase permissions for debugging
      ActiveStreamTracker.testPermissions(user.uid).then(result => {
        if (!result.canRead || !result.canWrite) {
          console.warn('⚠️ Firebase permission issues detected:', result);
          console.warn('   This may cause stream tracking to fail.');
          console.warn('   Please check Firestore security rules.');
        } else {
          console.log('✅ Firebase permissions verified for activeStream access');
        }
      }).catch(error => {
        console.error('❌ Permission test failed:', error);

        // Check if this is a Firestore internal error
        if (FirestoreErrorRecovery.isFirestoreInternalError(error)) {
          FirestoreErrorRecovery.handleFirestoreError(error, 'permission_test', user.uid);
        }
      });

      // Listen for state correction events using platform-safe event emitter
      const handleStateCorrection = (eventData: any) => {
        const { userId, correctedStreamId, reason } = eventData;

        if (userId === user.uid) {
          console.log(`📢 Received state correction: ${reason}, corrected stream: ${correctedStreamId}`);

          // Update local state to match corrected state
          setCurrentlyWatching(correctedStreamId);
          setIsMinimized(false);

          // Show user notification if needed
          if (reason === 'conflict_server_wins') {
            Alert.alert(
              'Stream State Updated',
              'Your stream state was synchronized with the server.',
              [{ text: 'OK' }]
            );
          }
        }
      };

      // Use platform-safe event emitter for cross-component communication
      let eventSubscription: any = null;

      try {
        const eventEmitter = PlatformUtils.getEventEmitter();
        eventSubscription = eventEmitter.addListener('streamStateCorrection', handleStateCorrection);
      } catch (error) {
        console.warn('⚠️ Could not set up event listener for state corrections:', error);
      }

      return () => {
        // Cleanup sync validation when user changes
        StreamSyncValidator.stopSyncValidation(user.uid);

        // Remove event listener safely
        try {
          if (eventSubscription && eventSubscription.remove) {
            eventSubscription.remove();
          }
        } catch (error) {
          console.warn('⚠️ Error removing event listener:', error);
        }
      };
    }
  }, [user, authLoading]);

  // Update sync validation when currentlyWatching changes (but not on initial load)
  useEffect(() => {
    if (user && !authLoading && currentlyWatching !== null) {
      // Only restart if we have an active listener and the stream ID changed
      console.log(`🔄 Updating sync validation for stream change: ${currentlyWatching}`);
      StreamSyncValidator.stopSyncValidation(user.uid);
      StreamSyncValidator.startSyncValidation(user.uid, currentlyWatching);
    }
  }, [currentlyWatching]); // Remove user and authLoading dependencies to prevent duplicate listeners

  // Fetch streams from Firebase - wait for auth to complete
  useEffect(() => {
    // Don't start fetching until auth loading is complete
    if (authLoading) {
      return;
    }

    const fetchStreams = async () => {
      try {
        const activeStreams = await streamingService.getActiveStreams();
        setStreams(activeStreams);
      } catch (error) {
        console.error('Error fetching streams:', error);
        // Fallback to empty array if Firebase fails
        setStreams([]);
      }
    };

    fetchStreams();

    // Set up real-time listener for stream updates
    const unsubscribe = streamingService.onActiveStreamsUpdate((updatedStreams) => {
      console.log(`🔄 [CONTEXT] Received ${updatedStreams.length} streams from streaming service`);
      updatedStreams.forEach((stream, index) => {
        console.log(`📊 [CONTEXT] Stream ${index + 1}: ${stream.id} - ${stream.hosts.length} hosts, ${stream.viewers.length} viewers`);
      });
      setStreams(updatedStreams);
      console.log(`✅ [CONTEXT] Updated UI with ${updatedStreams.length} streams`);
    });

    return unsubscribe;
  }, [authLoading]); // Depend on authLoading to wait for auth completion

  // Handle app state changes for cleanup and Firestore error recovery
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('📱 App going to background - cleaning up resources');

        // Emergency cleanup to prevent Firestore listener issues
        StreamSyncValidator.emergencyCleanup();

        // App is going to background, perform cleanup if user is in a stream
        if (currentlyWatching && user?.uid) {
          console.log('🧹 App going to background, cleaning up stream participation');
          streamingService.handleAppCrashCleanup(user.uid);
        }
      } else if (nextAppState === 'active' && user && !authLoading) {
        console.log('📱 App becoming active - restarting sync validation');
        // Restart sync validation when app becomes active
        setTimeout(() => {
          StreamSyncValidator.startSyncValidation(user.uid, currentlyWatching);
        }, 1000); // Small delay to ensure app is fully active
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [currentlyWatching, user?.uid, authLoading]);

  // Categorize streams for easier access
  const featuredStreams = streams.filter(stream => stream.rank !== undefined)
                                .sort((a, b) => (a.rank || 0) - (b.rank || 0));

  // TODO: Replace with real friend relationship logic from user context
  // For now, return empty arrays since we don't have real friend data
  const friendStreams = {
    hosting: [], // streams.filter(stream => stream.hosts.some(host => userFriends.includes(host.id))),
    watching: [] // streams.filter(stream => stream.friends?.some(friend => userFriends.includes(friend.id)))
  };

  const getStreamById = (id: string) => {
    return streams.find(stream => stream.id === id);
  };

  // Helper function to check if user has an active stream (including minimized)
  const hasActiveStream = () => {
    return currentlyWatching !== null;
  };

  // Atomic operation wrapper to prevent race conditions
  const executeAtomicOperation = async <T,>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const now = Date.now();

    // Check if operation is already in progress
    if (isOperationInProgress) {
      console.warn(`🚫 ${operationName} blocked - operation already in progress`);
      throw new Error('Another stream operation is already in progress. Please wait.');
    }

    // Check debounce delay
    if (now - lastOperationTime < OPERATION_DEBOUNCE_DELAY) {
      console.warn(`🚫 ${operationName} blocked - debounce delay not met`);
      throw new Error('Please wait before performing another stream operation.');
    }

    setIsOperationInProgress(true);
    setLastOperationTime(now);

    try {
      console.log(`🔄 Starting atomic operation: ${operationName}`);
      const result = await operation();
      console.log(`✅ Completed atomic operation: ${operationName}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed atomic operation: ${operationName}`, error);
      throw error;
    } finally {
      setIsOperationInProgress(false);
    }
  };

  // Helper function to show confirmation dialog for joining when already in a stream
  const showJoinStreamConfirmation = (streamId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Already in Live Stream',
        'You\'re already in a live stream. Leave current stream to join this one?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Leave & Join',
            style: 'destructive',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  };

  // Helper function to show confirmation dialog for creating when already in a stream
  const showCreateStreamConfirmation = (): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        'Already in Live Stream',
        'You\'re already in a live stream. End current stream to start a new one?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'End & Create',
            style: 'destructive',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  };

  const joinStream = async (streamId: string, skipConfirmation: boolean = false) => {
    return executeAtomicOperation(`joinStream(${streamId})`, async () => {
      // Validate sync before operation
      if (user) {
        const syncValidation = await StreamSyncValidator.validateSyncBeforeOperation(
          user.uid,
          currentlyWatching,
          'join'
        );

        if (!syncValidation.valid) {
          console.log(`🔧 Sync corrected before join operation: ${syncValidation.correctedStreamId}`);
          setCurrentlyWatching(syncValidation.correctedStreamId || null);
        }
      }

      // Check if user is already in a stream and needs confirmation
      if (hasActiveStream() && currentlyWatching !== streamId && !skipConfirmation) {
        const shouldProceed = await showJoinStreamConfirmation(streamId);
        if (!shouldProceed) {
          throw new Error('User cancelled stream join');
        }
      }

      // Validate target stream before proceeding
      const streamValidation = await StreamValidator.validateStreamForOperation(
        streamId,
        'join',
        user?.uid
      );

      if (!streamValidation.canProceed) {
        // Handle invalid stream with fallback action
        const fallback = await StreamValidator.executeFallbackAction(
          streamValidation.fallbackAction || 'show_error',
          streamId,
          user?.uid
        );

        if (streamValidation.fallbackAction === 'update_local_state') {
          // User is already in the stream, just update local state
          setCurrentlyWatching(streamId);
          setIsMinimized(false);
          return;
        }

        throw new Error(fallback.message || 'Cannot join this stream');
      }

      // Store previous stream for atomic rollback if needed
      const previousStreamId = currentlyWatching;
      const previousMinimizedState = isMinimized;

      try {
        // If user is already watching a stream, leave it first
        if (currentlyWatching && currentlyWatching !== streamId) {
          console.log(`🔄 Leaving current stream ${currentlyWatching} before joining ${streamId}`);

          // Use retry logic for leaving stream
          await StreamValidator.executeWithRetry(
            () => streamingService.leaveStream(currentlyWatching!, user?.uid || 'guest'),
            `leaveStream(${currentlyWatching})`
          );

          console.log(`✅ Successfully left previous stream ${currentlyWatching}`);

          // Clear the current watching state
          setCurrentlyWatching(null);
          setIsMinimized(false);
        }

        // Get current user info from auth context
        const userId = user?.uid || 'guest';
        const userName = user?.displayName || user?.username || 'Guest User';
        const userAvatar = user?.photoURL || user?.profileImage || '';

        console.log(`🔄 Attempting to join stream ${streamId} as ${userName}...`);

        // Join the new stream with retry logic
        await StreamValidator.executeWithRetry(
          () => streamingService.joinStream(streamId, userId, userName, userAvatar),
          `joinStream(${streamId})`
        );

        // Set the watching state immediately after successful join
        setCurrentlyWatching(streamId);
        setIsMinimized(false); // Ensure not minimized when joining new stream
        console.log(`✅ Successfully joined stream ${streamId} - UI state updated`);

      } catch (error) {
        console.error('❌ Error in stream join operation:', error);

        // Attempt to rollback to previous state if join failed
        if (previousStreamId && previousStreamId !== streamId) {
          console.log(`🔄 Attempting rollback to previous stream ${previousStreamId}`);
          try {
            setCurrentlyWatching(previousStreamId);
            setIsMinimized(previousMinimizedState);
            console.log(`✅ Rollback successful to stream ${previousStreamId}`);
          } catch (rollbackError) {
            console.error('❌ Rollback failed:', rollbackError);
            // Clear state completely if rollback fails
            setCurrentlyWatching(null);
            setIsMinimized(false);
          }
        } else {
          // Clear watching state on error to prevent stuck state
          setCurrentlyWatching(null);
          setIsMinimized(false);
        }

        throw error; // Re-throw to allow UI to handle the error
      }
    });
  };

  // Add this new function to handle minimizing streams
  const setStreamMinimized = (streamId: string, minimized: boolean) => {
    if (streamId) {
      setCurrentlyWatching(streamId);
      setIsMinimized(minimized);
    }
  };

  // Enhanced function to create a new stream with active stream checking
  const createNewStream = async (title: string, hostId: string, hostName: string, hostAvatar: string, skipConfirmation: boolean = false): Promise<string> => {
    return executeAtomicOperation(`createNewStream(${title})`, async () => {
      // Check if user is already in a stream and needs confirmation
      if (hasActiveStream() && !skipConfirmation) {
        const shouldProceed = await showCreateStreamConfirmation();
        if (!shouldProceed) {
          throw new Error('User cancelled stream creation');
        }

        // Leave current stream before creating new one
        if (currentlyWatching) {
          console.log(`🔄 Leaving current stream ${currentlyWatching} before creating new stream`);
          try {
            await streamingService.leaveStream(currentlyWatching, hostId);
            console.log(`✅ Successfully left previous stream ${currentlyWatching}`);
          } catch (leaveError) {
            console.warn(`⚠️ Error leaving previous stream ${currentlyWatching}:`, leaveError);
            // Continue with creation even if leave failed
          }

          // Clear the current watching state
          setCurrentlyWatching(null);
          setIsMinimized(false);
        }
      }

      try {
        // Sanitize parameters to prevent undefined values
        const sanitizedTitle = title || 'Live Stream';
        const sanitizedHostName = hostName || 'Host';
        const sanitizedHostAvatar = hostAvatar || null;

        console.log('🔧 Sanitized stream parameters:', {
          title: sanitizedTitle,
          hostId,
          hostName: sanitizedHostName,
          hostAvatar: sanitizedHostAvatar
        });

        // Create the new stream with retry logic
        const streamId = await StreamValidator.executeWithRetry(
          () => streamingService.createStream(sanitizedTitle, hostId, sanitizedHostName, sanitizedHostAvatar),
          `createStream(${sanitizedTitle})`
        );

        console.log(`✅ Created new stream: ${streamId}`);

        // Validate the created stream with retry logic for race condition
        const validation = await StreamValidator.validateStreamWithRetry(streamId, 3, 1000);
        if (!validation.valid) {
          throw new Error(`Created stream ${streamId} is not valid: ${validation.reason}`);
        }

        // Set the new stream as currently watching
        setCurrentlyWatching(streamId);
        setIsMinimized(false);

        return streamId;
      } catch (error) {
        console.error('❌ Error creating new stream:', error);
        // Clear state on creation failure
        setCurrentlyWatching(null);
        setIsMinimized(false);
        throw error;
      }
    });
  };

  // New functions for enhanced live stream features
  const joinAsHost = async (streamId: string, userName: string, userAvatar: string) => {
    try {
      let actualStreamId = streamId;
      const streamExists = streams.some(s => s.id === streamId);

      // Create a new stream if it doesn't exist
      if (!streamExists) {
        actualStreamId = await streamingService.createStream(
          `Live Stream by ${userName}`,
          'currentUser', // Use actual user ID
          userName,
          userAvatar
        );
        console.log(`Created new stream: ${actualStreamId}`);

        // After creating the stream, fetch the latest streams to ensure we have the complete stream data
        try {
          const activeStreams = await streamingService.getActiveStreams();
          setStreams(activeStreams);
        } catch (error) {
          console.error('Error refreshing streams after creation:', error);
        }
      }

      // Find the stream to update (using actualStreamId in case it changed)
      const targetStream = streams.find(s => s.id === actualStreamId);
      if (!targetStream) {
        console.error(`Stream with id ${actualStreamId} not found after creation`);
        return;
      }

      setStreams(prevStreams =>
        prevStreams.map(stream => {
          if (stream.id === actualStreamId) {
            const nextJoinOrder = stream.hosts.length + 1;
            const newHost: StreamHost = {
              name: userName,
              avatar: userAvatar,
              joinOrder: nextJoinOrder,
              isSpeaking: false,
              isMuted: false
            };
            return {
              ...stream,
              hosts: [...stream.hosts, newHost]
            };
          }
          return stream;
        })
      );
    } catch (error) {
      console.error('Error joining as host:', error);
    }
  };

  const kickHost = async (streamId: string, hostName: string, kickedBy: string) => {
    try {
      // Find the user ID of the host to kick
      const stream = streams.find(s => s.id === streamId);
      if (!stream) return;

      // For now, we'll use the host name as user ID (TODO: Use actual user IDs)
      const userId = hostName; // This should be the actual user ID
      const kickedById = kickedBy; // This should be the actual user ID

      await streamingService.kickParticipant(streamId, userId, kickedById);

      // Update local state
      setStreams(prevStreams =>
        prevStreams.map(stream => {
          if (stream.id === streamId) {
            const kickedByHost = stream.hosts.find(h => h.name === kickedBy);
            const hostToKick = stream.hosts.find(h => h.name === hostName);

            // Check if the kicker has higher power (lower join order)
            if (kickedByHost && hostToKick && kickedByHost.joinOrder < hostToKick.joinOrder) {
              return {
                ...stream,
                hosts: stream.hosts.filter(h => h.name !== hostName)
              };
            }
          }
          return stream;
        })
      );
    } catch (error) {
      console.error('Error kicking host:', error);
    }
  };

  const muteViewer = async (streamId: string, viewerName: string, mutedBy: string) => {
    try {
      // Find the user ID of the viewer to mute
      const stream = streams.find(s => s.id === streamId);
      if (!stream) return;

      // For now, we'll use the viewer name as user ID (TODO: Use actual user IDs)
      const userId = viewerName; // This should be the actual user ID

      await streamingService.toggleParticipantMute(streamId, userId);

      // Update local state
      setStreams(prevStreams =>
        prevStreams.map(stream => {
          if (stream.id === streamId) {
            return {
              ...stream,
              viewers: stream.viewers.map(viewer =>
                viewer.name === viewerName
                  ? { ...viewer, isMuted: !viewer.isMuted }
                  : viewer
              )
            };
          }
          return stream;
        })
      );
    } catch (error) {
      console.error('Error muting viewer:', error);
    }
  };

  const banViewer = async (streamId: string, viewerName: string, bannedBy: string) => {
    try {
      // Find the user ID of the viewer to ban
      const stream = streams.find(s => s.id === streamId);
      if (!stream) return;

      // For now, we'll use the viewer name as user ID (TODO: Use actual user IDs)
      const userId = viewerName; // This should be the actual user ID
      const bannedById = bannedBy; // This should be the actual user ID

      await streamingService.banParticipant(streamId, userId, bannedById);

      // Update local state
      setStreams(prevStreams =>
        prevStreams.map(stream => {
          if (stream.id === streamId) {
            return {
              ...stream,
              viewers: stream.viewers.map(viewer =>
                viewer.name === viewerName
                  ? { ...viewer, isBanned: !viewer.isBanned }
                  : viewer
              )
            };
          }
          return stream;
        })
      );
    } catch (error) {
      console.error('Error banning viewer:', error);
    }
  };

  const leaveStream = async (streamId: string) => {
    try {
      // Clear UI state immediately to prevent highlighting persistence
      console.log(`🔄 [CONTEXT] Clearing UI state for stream ${streamId}`);
      setCurrentlyWatching(null);
      setIsMinimized(false);

      // Then perform the actual leave operation
      const userId = user?.uid || 'guest';
      console.log(`🔄 [CONTEXT] Calling streamingService.leaveStream for user ${userId} from stream ${streamId}`);
      await streamingService.leaveStream(streamId, userId);

      // Additional cleanup to ensure no stale records remain
      if (userId !== 'guest') {
        try {
          await ActiveStreamTracker.cleanupOrphanedStreams(userId);
        } catch (error) {
          console.error('❌ [CONTEXT] Failed to run ActiveStreamTracker cleanup:', error);
          // Continue silently - this is optional cleanup and shouldn't block user flow
        }
      }

      console.log(`✅ [CONTEXT] Successfully left stream ${streamId}`);
    } catch (error) {
      console.error('❌ [CONTEXT] Error leaving stream:', error);
      // UI state is already cleared above, so highlighting won't persist
    }
  };

  const leaveStreamWithConfirmation = async (streamId: string): Promise<void> => {
    const userId = user?.uid || 'guest';

    try {
      console.log(`🔍 [CONTEXT] Checking if user ${userId} is host of stream ${streamId}`);
      const isHost = await streamingService.isUserStreamHost(streamId, userId);
      console.log(`🔍 [CONTEXT] User ${userId} is host: ${isHost}`);

      if (isHost) {
        // Show Yubo-style confirmation dialog for hosts
        return new Promise((resolve, reject) => {
          Alert.alert(
            'Leave Live Stream',
            'Are you sure you want to leave this live?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  console.log('🚫 [CONTEXT] Host cancelled leaving stream');
                  reject(new Error('User cancelled'));
                }
              },
              {
                text: 'Leave',
                style: 'destructive',
                onPress: async () => {
                  try {
                    console.log('🔄 [CONTEXT] Host confirmed leaving stream, using lifecycle manager...');

                    // Use lifecycle manager for proper host leave handling
                    const StreamLifecycleManager = (await import('../utils/streamLifecycleManager')).default;
                    await StreamLifecycleManager.handleHostLeave(streamId, userId);

                    console.log('✅ [CONTEXT] Host successfully left with lifecycle management');
                    resolve(undefined);
                  } catch (error) {
                    console.error('❌ [CONTEXT] Error during host leave:', error);
                    reject(error);
                  }
                }
              }
            ]
          );
        });
      } else {
        // Regular viewers leave immediately without confirmation
        console.log('🔄 [CONTEXT] Regular viewer leaving stream without confirmation');
        await leaveStream(streamId);
      }
    } catch (error) {
      console.error('❌ [CONTEXT] Error in leaveStreamWithConfirmation:', error);
      throw error;
    }
  };

  // Refresh streams function for manual and automatic updates
  const refreshStreams = async (): Promise<void> => {
    if (isRefreshing) {
      console.log('🔄 [REFRESH] Already refreshing, skipping...');
      return;
    }

    try {
      setIsRefreshing(true);
      console.log('🔄 [REFRESH] Starting manual stream refresh...');

      // Store current stream count for comparison
      const previousStreamCount = streams.length;
      console.log(`📊 [REFRESH] Current stream count: ${previousStreamCount}`);

      // CRITICAL FIX: Force cleanup phantom streams first
      console.log('🧹 [REFRESH] Running force cleanup of phantom streams...');
      await streamingService.forceCleanupPhantomStreams();

      // Fetch latest streams from Firebase (this will trigger validation and cleanup)
      const activeStreams = await streamingService.getActiveStreams();

      console.log(`📊 [REFRESH] Fetched ${activeStreams.length} streams from Firebase after cleanup`);

      // Update refresh timestamp
      setLastRefreshTime(new Date());

      // Log the difference (use fetched data for side-effects only)
      const streamDifference = activeStreams.length - previousStreamCount;
      if (streamDifference !== 0) {
        console.log(`📈 [REFRESH] Stream count changed: ${streamDifference > 0 ? '+' : ''}${streamDifference} streams`);
      }

      console.log(`✅ [REFRESH] Manual refresh completed - ${activeStreams.length} active streams`);

      // If user is currently watching a stream, validate it still exists (side-effect only)
      if (currentlyWatching) {
        const currentStreamExists = activeStreams.some(stream => stream.id === currentlyWatching);
        if (!currentStreamExists) {
          console.log(`⚠️ [REFRESH] Current stream ${currentlyWatching} no longer exists, clearing state`);
          setCurrentlyWatching(null);
          setIsMinimized(false);
        }
      }

      // Add a small delay to show the refresh animation
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error('❌ [REFRESH] Error refreshing streams:', error);
      throw error; // Re-throw to allow caller to handle
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <LiveStreamContext.Provider
      value={{
        streams,
        featuredStreams,
        friendStreams,
        getStreamById,
        joinStream,
        currentlyWatching,
        isMinimized,
        setStreamMinimized,
        joinAsHost,
        kickHost,
        muteViewer,
        banViewer,
        leaveStream,
        leaveStreamWithConfirmation,
        hasActiveStream,
        createNewStream,
        refreshStreams,
        isRefreshing,
        lastRefreshTime,
        isOperationInProgress,
      }}
    >
      {children}
    </LiveStreamContext.Provider>
  );
};

// Custom hook for using the context
export const useLiveStreams = () => {
  const context = useContext(LiveStreamContext);
  if (context === undefined) {
    throw new Error('useLiveStreams must be used within a LiveStreamProvider');
  }
  return context;
}; 