import MeshPeerModule from "@/modules/mesh_peer_module/src/MeshPeerModule";
import { StyleSheet } from "react-native";
import { Snackbar, Surface, useTheme } from "react-native-paper";

import ChatWindow from "@/components/ChatWindow";
import { useUsername } from "@/components/useUsername";
import { useFocusEffect, useRouter } from "expo-router";
import { useEffect, useState } from "react";

export default function TabOneScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { usernameState } = useUsername();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState<
    "success" | "error" | "info"
  >("info");

  useEffect(() => {
    // Check if we need to show the welcome screen
    if (usernameState.isInitialized && !usernameState.username) {
      router.push("/Welcome");
    }

    // Subscribe to notifications for General chat (empty string chatId)
    const subscribeToGeneralChat = async () => {
      try {
        await MeshPeerModule.subscribeToNotifications("");
        console.log("Subscribed to notifications for General chat");
      } catch (error) {
        console.error("Failed to subscribe to General chat:", error);
      }
    };

    subscribeToGeneralChat();
  }, [usernameState.isInitialized, usernameState.username, router]);

  const showSnackbar = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const getSnackbarColor = () => {
    switch (snackbarType) {
      case "success":
        return theme.colors.primary;
      case "error":
        return theme.colors.error;
      default:
        return theme.colors.surface;
    }
  };

  return (
    <>
      <Surface
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ChatWindow
          username={usernameState.username}
          emptyStateMessage="If you are on the cruise we could see messages soon"
          chatId=""
        />
      </Surface>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: getSnackbarColor() }}
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
});
