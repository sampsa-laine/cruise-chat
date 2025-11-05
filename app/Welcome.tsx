import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { Text, View } from "@/components/Themed";
import MeshPeerModule from "@/modules/mesh_peer_module/src/MeshPeerModule";
import { useUsername } from "@/components/useUsername";

export default function ModalScreen() {
  const [username, setUsernameInput] = useState("");
  const router = useRouter();
  const { actions } = useUsername();

  const handleContinue = async () => {
    if (username.trim()) {
      try {
        await actions.setUsername(username.trim());
        await MeshPeerModule.requestPermissions();
        console.log("Username set:", username.trim());
        router.back();
      } catch (error) {
        console.error("Failed to save username:", error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Welcome to Cruise Chat! 🚢</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set Your Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsernameInput}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions Required</Text>
          <Text style={styles.description}>
            To ensure reliable message delivery in our offline mesh network,
            Cruise Chat needs Wi-Fi, Bluetooth, and Notifications permissions.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, !username.trim() && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!username.trim()}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
    padding: 12,
    paddingHorizontal: 0,
    fontSize: 16,
    color: "#000",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
