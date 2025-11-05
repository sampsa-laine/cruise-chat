import { usePeerStatus } from "@/components/usePeerStatus";
import { useUsername } from "@/components/useUsername";
import { getMessageCount } from "@/database/services";
import MeshPeerModule from "@/modules/mesh_peer_module/src/MeshPeerModule";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import {
  Button,
  Card,
  Divider,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

export default function SettingsScreen() {
  const theme = useTheme();
  const [localUsername, setLocalUsername] = useState("");
  const [messageCount, setMessageCount] = useState(0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarType, setSnackbarType] = useState<
    "success" | "error" | "info"
  >("info");
  const { peerStatus, actions } = usePeerStatus();
  const { usernameState, actions: usernameActions } = useUsername();
  const { isServiceRunning, connectedPeers } = peerStatus;
  console.log({ isServiceRunning });
  useFocusEffect(
    useCallback(() => {
      loadMessageCount();
      // Sync local username state with context
      if (usernameState.username) {
        setLocalUsername(usernameState.username);
      }
    }, [usernameState.username]),
  );

  const showSnackbar = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const loadMessageCount = async () => {
    try {
      const count = await getMessageCount();
      setMessageCount(count);
    } catch (error) {
      console.error("Failed to load message count:", error);
    }
  };

  const handleSaveUsername = async () => {
    if (!localUsername.trim()) {
      showSnackbar("Username cannot be empty", "error");
      return;
    }
    try {
      await usernameActions.setUsername(localUsername.trim());
      showSnackbar("Username updated successfully", "success");
    } catch (error) {
      console.error("Failed to save username:", error);
      showSnackbar(`Failed to save username: ${error}`, "error");
    }
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
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={true}
        >
          {/* Username Section */}
          <Card style={styles.settingCard} elevation={2}>
            <Card.Content>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Username Settings
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.sectionSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                This name will be visible to other users in the chat
              </Text>
              <TextInput
                mode="outlined"
                label="Username"
                value={localUsername}
                onChangeText={setLocalUsername}
                placeholder="Enter your username"
                style={styles.usernameInput}
                right={<TextInput.Icon icon="account" disabled />}
                disabled={usernameState.isLoading}
              />
              <Button
                mode="contained"
                onPress={handleSaveUsername}
                style={styles.saveButton}
                contentStyle={styles.saveButtonContent}
                disabled={usernameState.isLoading || !localUsername.trim()}
                loading={usernameState.isLoading}
              >
                Save Username
              </Button>
            </Card.Content>
          </Card>

          {/* Service Control Section */}
          <Card style={styles.settingCard} elevation={2}>
            <Card.Content>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Service Control
              </Text>
              <Text
                variant="bodySmall"
                style={[
                  styles.sectionSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Manage the mesh networking service
              </Text>

              <Surface
                style={[
                  styles.statusContainer,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
                elevation={0}
              >
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Service Status:
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: isServiceRunning
                      ? theme.colors.tertiary
                      : theme.colors.error,
                    fontWeight: "600",
                  }}
                >
                  {isServiceRunning ? "Running" : "Stopped"}
                </Text>
              </Surface>

              <Button
                mode={isServiceRunning ? "contained" : "outlined"}
                onPress={() => actions.stopService()}
                disabled={!isServiceRunning}
                style={styles.controlButton}
                contentStyle={styles.controlButtonContent}
                buttonColor={isServiceRunning ? theme.colors.error : undefined}
              >
                Stop Message Discovery
              </Button>
            </Card.Content>
          </Card>

          {/* Connection Status Section */}
          <Card style={styles.settingCard} elevation={2}>
            <Card.Content>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Connection Status
              </Text>
              <Divider style={styles.divider} />

              <Surface
                style={[
                  styles.connectionInfo,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
                elevation={0}
              >
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.connectionCount,
                    { color: theme.colors.secondary },
                  ]}
                >
                  {connectedPeers.length}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  Connected peer{connectedPeers.length !== 1 ? "s" : ""}
                </Text>
              </Surface>

              <Divider style={styles.divider} />

              <Surface
                style={[
                  styles.connectionInfo,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
                elevation={0}
              >
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.connectionCount,
                    { color: theme.colors.secondary },
                  ]}
                >
                  {messageCount}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Messages stored
                </Text>
              </Surface>
            </Card.Content>
          </Card>
        </ScrollView>

        {/* App Info Footer */}
        <Surface
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.outlineVariant,
            },
          ]}
          elevation={1}
        >
          <Text
            variant="labelMedium"
            style={[styles.appTitle, { color: theme.colors.primary }]}
          >
            Cruise Chat v1.0
          </Text>
          <Text
            variant="bodySmall"
            style={[
              styles.appDescription,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Mesh networking for offline communication
          </Text>
        </Surface>
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
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  settingCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 4,
    fontWeight: "600",
  },
  sectionSubtitle: {
    marginBottom: 16,
    lineHeight: 18,
  },
  usernameInput: {
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  saveButton: {
    borderRadius: 8,
  },
  saveButtonContent: {
    paddingVertical: 4,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  controlButton: {
    borderRadius: 8,
  },
  controlButtonContent: {
    paddingVertical: 4,
  },
  divider: {
    marginVertical: 12,
  },
  connectionInfo: {
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  connectionCount: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    borderTopWidth: 1,
  },
  appTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  appDescription: {
    textAlign: "center",
    lineHeight: 18,
  },
});
