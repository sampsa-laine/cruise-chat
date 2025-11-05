import { Modal, StyleSheet, TextInput, TouchableOpacity } from "react-native";

import ChatWindow from "@/components/ChatWindow";
import { Text, View } from "@/components/Themed";
import { useUsername } from "@/components/useUsername";
import Colors from "@/constants/Colors";
import MeshPeerModule from "@/modules/mesh_peer_module/src/MeshPeerModule";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Pressable } from "react-native";

export default function MessagesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { usernameState } = useUsername();
  const [chatId, setChatId] = useState("default");
  const [showEditModal, setShowEditModal] = useState(true);
  const [tempChatId, setTempChatId] = useState("");
  const [templateRooms, setTemplateRooms] = useState<string[]>([]);

  const loadSubscriptions = async () => {
    try {
      const subscriptions =
        await MeshPeerModule.getNotificationSubscriptions();
      // Filter out the current chatId and empty string (General chat)
      const filteredSubscriptions = subscriptions.filter(
        (sub) => sub !== chatId && sub !== "",
      );
      setTemplateRooms(filteredSubscriptions);
    } catch (error) {
      console.error("Failed to load notification subscriptions:", error);
      // Fallback to empty array if there's an error
      setTemplateRooms([]);
    }
  };

  const handleEditChatId = useCallback(() => {
    setTempChatId(chatId);
    setShowEditModal(true);
  }, [chatId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title:
        chatId.length > 0
          ? "Room: " + chatId[0].toUpperCase() + chatId.substring(1, chatId.length)
          : "Rooms",
      headerRight: () => (
        <Pressable onPress={handleEditChatId}>
          {({ pressed }) => (
            <FontAwesome
              name="edit"
              size={25}
              color={Colors["light"].text}
              style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
            />
          )}
        </Pressable>
      ),
    });
  }, [navigation, handleEditChatId, chatId]);

  const handleSaveChatId = async () => {
    if (tempChatId.trim()) {
      const newChatId = tempChatId.trim().toLowerCase();

      // Unsubscribe from old chat and subscribe to new one
      try {
        await MeshPeerModule.subscribeToNotifications(newChatId);
      } catch (error) {
        console.error("Failed to update notification subscriptions:", error);
      }

      setChatId(newChatId);
    }
    setShowEditModal(false);
  };

  const handleSelectTemplate = async (roomName: string) => {
    // Unsubscribe from old chat and subscribe to new one
    try {
      await MeshPeerModule.subscribeToNotifications(roomName);
    } catch (error) {
      console.error("Failed to update notification subscriptions:", error);
    }

    setChatId(roomName);
    setShowEditModal(false);
  };

  const handleDeleteTemplate = async (roomName: string) => {
    try {
      await MeshPeerModule.unsubscribeFromNotifications(roomName);
      console.log(`Unsubscribed from notifications for '${roomName}'`);
    } catch (error) {
      console.error("Failed to unsubscribe from notifications:", error);
    }
    setTemplateRooms(templateRooms.filter((room) => room !== roomName));
  };

  useEffect(() => {
    setTempChatId(chatId);
  }, [chatId]);

  useEffect(() => {
    // Check if we need to show the welcome screen
    if (usernameState.isInitialized && !usernameState.username) {
      router.push("/Welcome");
    }
  }, [usernameState.isInitialized, usernameState.username, router]);

  useEffect(() => {
    // Load subscriptions whenever the modal opens
    if (showEditModal) {
      loadSubscriptions();
    }
  }, [showEditModal, chatId]);
  useEffect(() => {
    const subscribeToInitialChat = async () => {
      try {
        await MeshPeerModule.subscribeToNotifications(chatId);
        console.log(`Subscribed to notifications for '${chatId}'`);
      } catch (error) {
        console.error("Failed to subscribe to initial chat:", error);
      }
    };

    subscribeToInitialChat();
  }, []);

  return (
    <View style={styles.container}>
      <ChatWindow
        username={usernameState.username}
        emptyStateMessage="No messages in this chat"
        chatId={chatId}
      />

      {/* Edit Chat ID Modal for Android */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Change Room</Text>

            {/* Template Room Options */}
            {templateRooms.length > 0 && (
              <View style={styles.templateSection}>
                {templateRooms.map((room) => (
                  <View key={room} style={styles.templateItem}>
                    <TouchableOpacity
                      style={styles.templateButton}
                      onPress={() => handleSelectTemplate(room)}
                    >
                      <Text style={styles.templateText}>{room}</Text>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(room);
                        }}
                      >
                        <FontAwesome
                          name="trash-o"
                          size={16}
                          color="#ff3b30"
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>Enter a name:</Text>
            <TextInput
              style={styles.modalInput}
              value={tempChatId}
              onChangeText={setTempChatId}
              placeholder="Enter chat room ID"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveChatId}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 20,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  templateSection: {
    marginBottom: 20,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  templateItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  templateButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  templateText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  deleteButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  modalInput: {
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 0,
    color: "#000",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#999",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    borderRadius: 50,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
