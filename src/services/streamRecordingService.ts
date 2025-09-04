/**
 * Stream Recording Service
 * Handles stream recording, cloud storage, and playback functionality
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface StreamRecording {
  id: string;
  streamId: string;
  hostId: string;
  hostName: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  quality: 'low' | 'medium' | 'high';
  status: 'recording' | 'processing' | 'ready' | 'failed' | 'deleted';
  isPublic: boolean;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  recordingStartedAt?: Timestamp;
  recordingEndedAt?: Timestamp;
  processingStartedAt?: Timestamp;
  processingCompletedAt?: Timestamp;
}

export interface RecordingHighlight {
  id: string;
  recordingId: string;
  title: string;
  description?: string;
  startTime: number; // seconds from recording start
  endTime: number; // seconds from recording start
  thumbnailUrl?: string;
  videoUrl?: string;
  createdBy: string;
  createdAt: Timestamp;
}

export interface RecordingPlaybackSession {
  id: string;
  recordingId: string;
  userId: string;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  watchTime: number; // seconds watched
  lastPosition: number; // last playback position in seconds
  completed: boolean;
}

class StreamRecordingService {
  private static instance: StreamRecordingService;
  private currentRecording: StreamRecording | null = null;
  private recordingStartTime: number = 0;

  private constructor() {}

  static getInstance(): StreamRecordingService {
    if (!StreamRecordingService.instance) {
      StreamRecordingService.instance = new StreamRecordingService();
    }
    return StreamRecordingService.instance;
  }

  /**
   * Start recording a stream
   */
  async startRecording(
    streamId: string,
    title: string,
    description?: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      if (this.currentRecording) {
        throw new Error('Recording already in progress');
      }

      const user = auth.currentUser;
      this.recordingStartTime = Date.now();

      // Create recording document
      const recordingData: Omit<StreamRecording, 'id'> = {
        streamId,
        hostId: user.uid,
        hostName: user.displayName || 'Host',
        title,
        description,
        duration: 0,
        fileSize: 0,
        quality,
        status: 'recording',
        isPublic: true,
        viewCount: 0,
        likeCount: 0,
        shareCount: 0,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        recordingStartedAt: serverTimestamp() as Timestamp
      };

      const recordingRef = await addDoc(collection(db, 'streamRecordings'), recordingData);

      this.currentRecording = {
        id: recordingRef.id,
        ...recordingData
      } as StreamRecording;

      // Start Agora cloud recording
      await this.startAgoraCloudRecording(streamId, recordingRef.id, quality);

      // Update stream to indicate recording is active
      await updateDoc(doc(db, 'streams', streamId), {
        isRecording: true,
        recordingId: recordingRef.id,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Recording started for stream ${streamId}: ${recordingRef.id}`);
      return recordingRef.id;

    } catch (error: any) {
      console.error('Failed to start recording:', error);
      throw new Error(`Failed to start recording: ${error.message}`);
    }
  }

  /**
   * Stop recording a stream
   */
  async stopRecording(recordingId?: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const recording = recordingId ? 
        await this.getRecording(recordingId) : 
        this.currentRecording;

      if (!recording) {
        throw new Error('No active recording found');
      }

      const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);

      // Stop Agora cloud recording
      await this.stopAgoraCloudRecording(recording.streamId, recording.id);

      // Update recording document
      await updateDoc(doc(db, 'streamRecordings', recording.id), {
        status: 'processing',
        duration,
        recordingEndedAt: serverTimestamp(),
        processingStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update stream to indicate recording stopped
      await updateDoc(doc(db, 'streams', recording.streamId), {
        isRecording: false,
        updatedAt: serverTimestamp()
      });

      this.currentRecording = null;
      this.recordingStartTime = 0;

      console.log(`✅ Recording stopped: ${recording.id}`);

    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      throw new Error(`Failed to stop recording: ${error.message}`);
    }
  }

  /**
   * Get recording by ID
   */
  async getRecording(recordingId: string): Promise<StreamRecording | null> {
    try {
      const recordingDoc = await doc(db, 'streamRecordings', recordingId).get();
      
      if (!recordingDoc.exists()) {
        return null;
      }

      return {
        id: recordingDoc.id,
        ...recordingDoc.data()
      } as StreamRecording;

    } catch (error: any) {
      console.error('Failed to get recording:', error);
      return null;
    }
  }

  /**
   * Get recordings for a user
   */
  async getUserRecordings(
    userId: string,
    limitCount: number = 20
  ): Promise<StreamRecording[]> {
    try {
      const recordingsQuery = query(
        collection(db, 'streamRecordings'),
        where('hostId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(recordingsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StreamRecording[];

    } catch (error: any) {
      console.error('Failed to get user recordings:', error);
      return [];
    }
  }

  /**
   * Get public recordings
   */
  async getPublicRecordings(limitCount: number = 20): Promise<StreamRecording[]> {
    try {
      const recordingsQuery = query(
        collection(db, 'streamRecordings'),
        where('isPublic', '==', true),
        where('status', '==', 'ready'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(recordingsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StreamRecording[];

    } catch (error: any) {
      console.error('Failed to get public recordings:', error);
      return [];
    }
  }

  /**
   * Create highlight from recording
   */
  async createHighlight(
    recordingId: string,
    title: string,
    startTime: number,
    endTime: number,
    description?: string
  ): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const user = auth.currentUser;

      // Validate recording exists and user has permission
      const recording = await this.getRecording(recordingId);
      if (!recording) {
        throw new Error('Recording not found');
      }

      if (recording.hostId !== user.uid) {
        throw new Error('Only the recording owner can create highlights');
      }

      if (startTime >= endTime || endTime > recording.duration) {
        throw new Error('Invalid highlight time range');
      }

      // Create highlight document
      const highlightData: Omit<RecordingHighlight, 'id'> = {
        recordingId,
        title,
        description,
        startTime,
        endTime,
        createdBy: user.uid,
        createdAt: serverTimestamp() as Timestamp
      };

      const highlightRef = await addDoc(
        collection(db, `streamRecordings/${recordingId}/highlights`),
        highlightData
      );

      // Process highlight video (would be done by cloud function)
      await this.processHighlight(recordingId, highlightRef.id, startTime, endTime);

      console.log(`✅ Highlight created: ${highlightRef.id}`);
      return highlightRef.id;

    } catch (error: any) {
      console.error('Failed to create highlight:', error);
      throw new Error(`Failed to create highlight: ${error.message}`);
    }
  }

  /**
   * Start playback session
   */
  async startPlaybackSession(recordingId: string): Promise<string> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const user = auth.currentUser;

      // Create playback session
      const sessionData: Omit<RecordingPlaybackSession, 'id'> = {
        recordingId,
        userId: user.uid,
        startedAt: serverTimestamp() as Timestamp,
        watchTime: 0,
        lastPosition: 0,
        completed: false
      };

      const sessionRef = await addDoc(
        collection(db, `streamRecordings/${recordingId}/playbackSessions`),
        sessionData
      );

      // Increment view count
      await updateDoc(doc(db, 'streamRecordings', recordingId), {
        viewCount: serverTimestamp(), // Would use increment in real implementation
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Playback session started: ${sessionRef.id}`);
      return sessionRef.id;

    } catch (error: any) {
      console.error('Failed to start playback session:', error);
      throw new Error(`Failed to start playback session: ${error.message}`);
    }
  }

  /**
   * Update playback progress
   */
  async updatePlaybackProgress(
    sessionId: string,
    position: number,
    watchTime: number
  ): Promise<void> {
    try {
      const sessionRef = doc(db, 'playbackSessions', sessionId);
      
      await updateDoc(sessionRef, {
        lastPosition: position,
        watchTime,
        updatedAt: serverTimestamp()
      });

    } catch (error: any) {
      console.error('Failed to update playback progress:', error);
    }
  }

  /**
   * End playback session
   */
  async endPlaybackSession(
    sessionId: string,
    finalPosition: number,
    totalWatchTime: number,
    completed: boolean = false
  ): Promise<void> {
    try {
      const sessionRef = doc(db, 'playbackSessions', sessionId);
      
      await updateDoc(sessionRef, {
        endedAt: serverTimestamp(),
        lastPosition: finalPosition,
        watchTime: totalWatchTime,
        completed,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Playback session ended: ${sessionId}`);

    } catch (error: any) {
      console.error('Failed to end playback session:', error);
    }
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string): Promise<void> {
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const recording = await this.getRecording(recordingId);
      if (!recording) {
        throw new Error('Recording not found');
      }

      if (recording.hostId !== auth.currentUser.uid) {
        throw new Error('Only the recording owner can delete recordings');
      }

      // Delete video files from storage
      if (recording.videoUrl) {
        const videoRef = ref(storage, recording.videoUrl);
        await deleteObject(videoRef);
      }

      if (recording.thumbnailUrl) {
        const thumbnailRef = ref(storage, recording.thumbnailUrl);
        await deleteObject(thumbnailRef);
      }

      // Mark recording as deleted
      await updateDoc(doc(db, 'streamRecordings', recordingId), {
        status: 'deleted',
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Recording deleted: ${recordingId}`);

    } catch (error: any) {
      console.error('Failed to delete recording:', error);
      throw new Error(`Failed to delete recording: ${error.message}`);
    }
  }

  /**
   * Start Agora cloud recording
   */
  private async startAgoraCloudRecording(
    streamId: string,
    recordingId: string,
    quality: string
  ): Promise<void> {
    try {
      const startCloudRecording = httpsCallable(functions, 'startCloudRecording');
      
      await startCloudRecording({
        streamId,
        recordingId,
        quality
      });

      console.log(`✅ Agora cloud recording started for ${streamId}`);

    } catch (error: any) {
      console.error('Failed to start Agora cloud recording:', error);
      throw error;
    }
  }

  /**
   * Stop Agora cloud recording
   */
  private async stopAgoraCloudRecording(
    streamId: string,
    recordingId: string
  ): Promise<void> {
    try {
      const stopCloudRecording = httpsCallable(functions, 'stopCloudRecording');
      
      await stopCloudRecording({
        streamId,
        recordingId
      });

      console.log(`✅ Agora cloud recording stopped for ${streamId}`);

    } catch (error: any) {
      console.error('Failed to stop Agora cloud recording:', error);
      throw error;
    }
  }

  /**
   * Process highlight video
   */
  private async processHighlight(
    recordingId: string,
    highlightId: string,
    startTime: number,
    endTime: number
  ): Promise<void> {
    try {
      const processHighlight = httpsCallable(functions, 'processRecordingHighlight');
      
      await processHighlight({
        recordingId,
        highlightId,
        startTime,
        endTime
      });

      console.log(`✅ Highlight processing started: ${highlightId}`);

    } catch (error: any) {
      console.error('Failed to process highlight:', error);
      throw error;
    }
  }

  /**
   * Get current recording status
   */
  getCurrentRecording(): StreamRecording | null {
    return this.currentRecording;
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.currentRecording !== null;
  }

  /**
   * Get recording duration (if currently recording)
   */
  getCurrentRecordingDuration(): number {
    if (!this.currentRecording || !this.recordingStartTime) {
      return 0;
    }
    
    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }

  /**
   * Destroy service and cleanup resources
   */
  destroy(): void {
    this.currentRecording = null;
    this.recordingStartTime = 0;
    console.log('🧹 Stream Recording Service destroyed');
  }
}

export default StreamRecordingService.getInstance();
