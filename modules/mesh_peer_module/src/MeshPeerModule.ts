import { NativeModule, requireNativeModule } from "expo";

import { MeshPeerModuleEvents } from "./MeshPeerModule.types";

// These are native functions we can call from React code
declare class MeshPeerModule extends NativeModule<MeshPeerModuleEvents> {
  PI: number;

  requestPermissions(): Promise<boolean>;
  checkPermissions(): Promise<{ granted: boolean }>;

  // New Nearby Connections functions
  startDiscovery(): Promise<void>;
  stopDiscovery(): Promise<void>;
  startNearbyService(): Promise<void>;
  stopNearbyService(): Promise<void>;
  sendMessage(
    id: string,
    content: string,
    userId: string,
    createdAt: number,
    chatId: string,
  ): Promise<void>;
  getConnectedPeers(): Promise<string[]>;
  disconnectFromPeer(endpointId: string): Promise<void>;
  disconnectFromAllPeers(): Promise<void>;

  // Database functions
  getRelevantMessageIds(): Promise<string[]>;
  getMessageCount(): Promise<number>;

  // Username functions
  getUsername(): Promise<string | null>;
  setUsername(username: string): Promise<void>;

  // State functions
  isServiceRunning(): Promise<boolean>;
  isDiscovering(): Promise<boolean>;

  // Notification subscription functions
  subscribeToNotifications(chatId: string): Promise<boolean>;
  unsubscribeFromNotifications(chatId: string): Promise<boolean>;
  getNotificationSubscriptions(): Promise<string[]>;
  isSubscribedToNotifications(chatId: string): Promise<boolean>;
  clearNotificationSubscriptions(): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<MeshPeerModule>("MeshPeerModule");
