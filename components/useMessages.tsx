import { type Message } from "@/database/schema";
import { addMessage, getMessages } from "@/database/services";
import MeshPeerModule from "@/modules/mesh_peer_module/src/MeshPeerModule";
import type {
  MessageReceivedPayload,
  NewMessagesPayload,
} from "@/modules/mesh_peer_module/src/MeshPeerModule.types";
import type { EventSubscription } from "expo-modules-core";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface MessagesState {
  messages: Message[];
  isLoading: boolean;
  lastReceivedMessage?: MessageReceivedPayload;
}

interface MessagesActions {
  refreshMessages: () => Promise<void>;
  sendMessage: (content: string, userId: string) => Promise<void>;
}

interface MessagesContextValue {
  messagesState: MessagesState;
  actions: MessagesActions;
  chatId: string;
}

const initialMessagesState: MessagesState = {
  messages: [],
  isLoading: false,
};

const MessagesContext = createContext<MessagesContextValue | null>(null);

interface MessagesProviderProps {
  children: ReactNode;
  chatId: string;
}

export const MessagesProvider: React.FC<MessagesProviderProps> = ({
  children,
  chatId,
}) => {
  const [messagesState, setMessagesState] =
    useState<MessagesState>(initialMessagesState);
  const [listenersInitialized, setListenersInitialized] = useState(false);

  // Update messages state
  const updateMessagesState = useCallback((updates: Partial<MessagesState>) => {
    setMessagesState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Refresh messages from database
  const refreshMessages = useCallback(async () => {
    updateMessagesState({ isLoading: true });
    try {
      const messages = await getMessages(chatId, 100);
      updateMessagesState({
        messages,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error refreshing messages:", error);
      updateMessagesState({ isLoading: false });
    }
  }, [chatId, updateMessagesState]);

  // Initialize MeshPeerModule listeners for this chatroom
  useEffect(() => {
    if (listenersInitialized) return;

    console.log(`🔧 Initializing message listeners for chatroom: ${chatId}...`);

    const subscriptions: EventSubscription[] = [];

    const setupListeners = async () => {
      try {
        // Message received listener
        const messageReceivedSub = MeshPeerModule.addListener(
          "onMessageReceived",
          async (payload: MessageReceivedPayload) => {
            console.log("📨 Message received:", payload);

            // Store the last received message for reference
            updateMessagesState({
              lastReceivedMessage: payload,
            });

            // Add the received message to local database
            try {
              await addMessage(payload.message, payload.endpointId, chatId);
              // Refresh messages to include the new one
              await refreshMessages();
            } catch (error) {
              console.error("Error storing received message:", error);
            }
          },
        );

        // New messages listener (for batch updates)
        const newMessagesSub = MeshPeerModule.addListener(
          "onNewMessages",
          async (payload: NewMessagesPayload) => {
            console.log("📬 New messages notification:", payload);
            // Refresh messages when we get notification of new messages
            await refreshMessages();
          },
        );

        // Debug listener for messages
        const debugSub = MeshPeerModule.addListener(
          "onDebug",
          (data: { message: string }) => {
            if (data.message.toLowerCase().includes("message")) {
              console.log("🐛 Message Debug:", data.message);
            }
          },
        );

        // Error listener for messages
        const errorSub = MeshPeerModule.addListener(
          "onError",
          (data: { error: string }) => {
            if (data.error.toLowerCase().includes("message")) {
              console.error("❌ Message Error:", data.error);
            }
          },
        );

        subscriptions.push(
          messageReceivedSub,
          newMessagesSub,
          debugSub,
          errorSub,
        );

        setListenersInitialized(true);
        console.log(`✅ Message listeners initialized for chatroom: ${chatId}`);

        // Load initial messages
        await refreshMessages();
      } catch (error) {
        console.error("Failed to initialize message listeners:", error);
      }
    };

    setupListeners();

    // Cleanup listeners on unmount or chatId change
    return () => {
      console.log(
        `🧹 Cleaning up message listeners for chatroom: ${chatId}...`,
      );
      subscriptions.forEach((sub) => sub?.remove());
      setListenersInitialized(false);
    };
  }, [listenersInitialized, chatId, refreshMessages, updateMessagesState]);

  // Action methods
  const actions: MessagesActions = {
    refreshMessages,

    sendMessage: useCallback(
      async (content: string, userId: string) => {
        try {
          // First add to local database
          const message = await addMessage(content, userId, chatId);

          // Refresh local messages immediately
          await refreshMessages();

          // Then send to peers via MeshPeer
          await MeshPeerModule.sendMessage(
            message.id,
            content,
            userId,
            Date.now(),
            chatId,
          );

          console.log(`📤 Message sent: ${content} (ID: ${message.id})`);
        } catch (error) {
          console.error("Error sending message:", error);
          throw error;
        }
      },
      [chatId, refreshMessages],
    ),
  };

  const contextValue: MessagesContextValue = {
    messagesState,
    actions,
    chatId,
  };

  return (
    <MessagesContext.Provider value={contextValue}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = (expectedChatId?: string): MessagesContextValue => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }

  // Optional validation that we're using the expected chatId
  if (expectedChatId && context.chatId !== expectedChatId) {
    console.warn(
      `useMessages: Expected chatId "${expectedChatId}" but got "${context.chatId}"`,
    );
  }

  return context;
};

export default MessagesProvider;
