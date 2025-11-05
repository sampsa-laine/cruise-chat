import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  IconButton,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import { Message } from "@/database/schema";
import { addMessage, getMessages } from "@/database/services";
import MeshPeerModule from "@/modules/mesh_peer_module/src/MeshPeerModule";
import { usePeerStatus } from "./usePeerStatus";

// Video component wrapper
function VideoMessage({ source, style }: { source: any; style: any }) {
  const player = useVideoPlayer(source, (player) => {
    player.loop = true;
    player.play();
  });

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="contain"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}

interface ChatWindowProps {
  username: string | null;
  emptyStateMessage?: string;
  chatId?: string;
}

export default function ChatWindow({
  username,
  emptyStateMessage,
  chatId = "",
}: ChatWindowProps) {
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const { peerStatus, actions } = usePeerStatus();
  const { isServiceRunning, isDiscovering } = peerStatus;

  // Define media types for special chat keywords
  interface MediaItem {
    source: any;
    type: "image" | "video";
  }

  // This maps a keyword from the user into an asset. Add here to send new gifs
  const specialChats: Record<string, MediaItem[]> = {
    ship1: [{ source: require("@/assets/chats/ship1.mp4"), type: "video" }],
    ship2: [{ source: require("@/assets/chats/ship2.mp4"), type: "video" }],
    icon: [{ source: require("@/assets/images/icon.png"), type: "image" }],
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleStartButtonPress = async () => {
    const granted = await MeshPeerModule.requestPermissions();
    if (!granted) {
      showSnackbar("Please accept the permissions.");
      return;
    }
    await actions.startService();
  };
  // Load messages from database on mount and listen for new messages
  useEffect(() => {
    const loadMessages = async () => {
      const dbMessages = await getMessages(chatId, 100);
      setMessages(dbMessages);
    };

    loadMessages();

    const newMessagesSubscription = MeshPeerModule.addListener(
      "onNewMessages",
      (data) => {
        console.log(
          `${data.count} new messages received! Total messages: ${data.totalMessages}`,
        );
        console.log(`Reading messages from database...`);
        loadMessages();
      },
    );

    return () => {
      newMessagesSubscription?.remove();
    };
  }, [chatId]);

  // Function to check if user is at bottom of scroll
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;
    setIsAtBottom(isBottom);
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: false });
  };

  const handleTextInputFocus = () => {
    // Scroll to bottom when keyboard opens
    setTimeout(() => {
      scrollToBottom();
    }, 5);
  };

  const showStartButton = !isDiscovering || !isServiceRunning;

  useEffect(scrollToBottom, [showStartButton]);

  // Auto-scroll to bottom when new messages arrive (if user was already at bottom)
  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 5);
    }
  }, [messages, isAtBottom]);

  const sendMessage = useCallback(async () => {
    const currentUsername = username || "local-user";
    const newMessage = await addMessage(
      inputText.trim(),
      currentUsername,
      chatId,
    );

    if (inputText.trim()) {
      try {
        console.log("Sending a message through backend");
        await MeshPeerModule.sendMessage(
          newMessage.id,
          newMessage.content,
          newMessage.userId,
          newMessage.createdAt.getTime() / 1000,
          newMessage.chatId,
        );
        setMessages((messages) => [...messages, newMessage]);
        setInputText("");
        // Always scroll to bottom when user sends a message
        setTimeout(() => {
          scrollToBottom();
        }, 5);
      } catch (error) {
        console.error("Failed to send message:", error);
        showSnackbar(`Failed to send message: ${error}`);
      }
    }
  }, [username, inputText, chatId]);

  const GetMessageContent = (message: Message) => {
    const messageLower = message.content.toLowerCase();
    const mediaItems = specialChats[messageLower];

    // Display media if one of the keywords
    if (mediaItems && mediaItems.length > 0) {
      return (
        <>
          <Text style={styles.username}>{message.userId}:</Text>
          {mediaItems.map((item, index) => {
            if (item.type === "video") {
              return (
                <VideoMessage
                  key={index}
                  source={item.source}
                  style={styles.messageImage}
                />
              );
            } else {
              return (
                <Image
                  key={index}
                  source={item.source}
                  style={styles.messageImage}
                  resizeMode="contain"
                />
              );
            }
          })}
        </>
      );
    } else {
      return (
        <Text style={styles.messageContainer}>
          <Text style={styles.username}>{message.userId}: </Text>
          <Text style={styles.messageBody}>{message.content}</Text>
        </Text>
      );
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 100}
      >
        <Surface style={styles.inner} elevation={0}>
          {showStartButton ? (
            // Big start button view
            <Surface style={styles.startButtonContainer} elevation={0}>
              <Button
                mode="contained"
                onPress={handleStartButtonPress}
                style={styles.bigStartButton}
                contentStyle={styles.bigStartButtonContent}
                labelStyle={styles.bigStartButtonText}
              >
                I am on the cruise
              </Button>
            </Surface>
          ) : (
            // Messages list
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {messages.length === 0 ? (
                <Surface style={styles.emptyStateContainer} elevation={0}>
                  <Text
                    variant="headlineSmall"
                    style={[
                      styles.emptyStateTitle,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Waiting...
                  </Text>
                  {emptyStateMessage && (
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.emptyStateSubtitle,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {emptyStateMessage}
                    </Text>
                  )}
                </Surface>
              ) : (
                messages.map((message) => {
                  const messageTime = new Date(
                    message.createdAt,
                  ).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });

                  return (
                    <View key={message.id} style={styles.messageContainer}>
                      <View style={styles.messageBar} />
                      <View style={styles.messageContent}>
                        {GetMessageContent(message)}
                      </View>
                      <Text style={styles.timestamp}>{messageTime}</Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Input area - always shown but disabled when big button is showing */}
          <Surface
            style={[
              styles.inputContainer,
              { backgroundColor: theme.colors.surface },
            ]}
            elevation={3}
          >
            <View style={styles.inputRow}>
              <TextInput
                mode="outlined"
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                style={[
                  styles.textInput,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
                contentStyle={styles.textInputContent}
                outlineStyle={styles.textInputOutline}
                multiline={false}
                maxLength={500}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                disabled={showStartButton}
                dense={false}
                onFocus={handleTextInputFocus}
              />

              <IconButton
                icon="send"
                onPress={sendMessage}
                disabled={showStartButton}
              />
            </View>
          </Surface>
        </Surface>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        style={{ backgroundColor: theme.colors.errorContainer }}
      >
        {snackbarMessage}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  startButtonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  bigStartButton: {
    borderRadius: 28,
    minWidth: 250,
  },
  bigStartButtonContent: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  bigStartButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 8,
    marginBottom: 10,
    minHeight: 100,
    backgroundColor: "#fff",
  },
  messagesContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingVertical: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    textAlign: "center",
  },
  messageCard: {
    marginVertical: 6,
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    marginHorizontal: 4,
  },
  messageAccent: {
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  messageContent: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "transparent",
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
  },
  messageText: {
    lineHeight: 20,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  textInput: {
    flex: 1,
    minHeight: 56,
    maxHeight: 120,
  },
  textInputContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInputOutline: {
    borderRadius: 28,
    borderWidth: 0,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 2,
  },
  messageBar: {
    width: 4,
    backgroundColor: "#007AFF",
    borderRadius: 2,
    alignSelf: "stretch",
  },
  messageBody: {
    color: "#333",
  },
  messageImage: {
    width: 120,
    height: 120,
    marginRight: 8,
    borderRadius: 4,
  },
});
