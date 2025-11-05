import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import MeshPeerModule from "@/modules/mesh_peer_module/src/MeshPeerModule";

interface UsernameState {
  username: string | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface UsernameActions {
  setUsername: (username: string) => Promise<void>;
  refreshUsername: () => Promise<void>;
  clearUsername: () => Promise<void>;
}

interface UsernameContextValue {
  usernameState: UsernameState;
  actions: UsernameActions;
}

const initialUsernameState: UsernameState = {
  username: null,
  isLoading: false,
  isInitialized: false,
};

const UsernameContext = createContext<UsernameContextValue | null>(null);

interface UsernameProviderProps {
  children: ReactNode;
}

export const UsernameProvider: React.FC<UsernameProviderProps> = ({
  children,
}) => {
  const [usernameState, setUsernameState] =
    useState<UsernameState>(initialUsernameState);

  // Update username state
  const updateUsernameState = useCallback((updates: Partial<UsernameState>) => {
    setUsernameState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Refresh username from MeshPeerModule
  const refreshUsername = useCallback(async () => {
    updateUsernameState({ isLoading: true });
    try {
      const storedUsername = await MeshPeerModule.getUsername();
      updateUsernameState({
        username: storedUsername,
        isLoading: false,
        isInitialized: true,
      });
      console.log("📝 Username refreshed:", storedUsername);
    } catch (error) {
      console.error("Error refreshing username:", error);
      updateUsernameState({
        isLoading: false,
        isInitialized: true,
      });
    }
  }, [updateUsernameState]);

  // Set username via MeshPeerModule
  const setUsername = useCallback(
    async (newUsername: string) => {
      const trimmedUsername = newUsername.trim();
      if (!trimmedUsername) {
        throw new Error("Username cannot be empty");
      }

      updateUsernameState({ isLoading: true });
      try {
        await MeshPeerModule.setUsername(trimmedUsername);
        updateUsernameState({
          username: trimmedUsername,
          isLoading: false,
        });
        console.log("✅ Username updated:", trimmedUsername);
      } catch (error) {
        console.error("Error setting username:", error);
        updateUsernameState({ isLoading: false });
        throw error;
      }
    },
    [updateUsernameState],
  );

  // Clear username
  const clearUsername = useCallback(async () => {
    updateUsernameState({ isLoading: true });
    try {
      await MeshPeerModule.setUsername("");
      updateUsernameState({
        username: null,
        isLoading: false,
      });
      console.log("🗑️ Username cleared");
    } catch (error) {
      console.error("Error clearing username:", error);
      updateUsernameState({ isLoading: false });
      throw error;
    }
  }, [updateUsernameState]);

  // Initialize username on mount
  useEffect(() => {
    console.log("🔧 Initializing username context...");
    refreshUsername();
  }, [refreshUsername]);

  // Action methods
  const actions: UsernameActions = {
    setUsername,
    refreshUsername,
    clearUsername,
  };

  const contextValue: UsernameContextValue = {
    usernameState,
    actions,
  };

  return (
    <UsernameContext.Provider value={contextValue}>
      {children}
    </UsernameContext.Provider>
  );
};

export const useUsername = (): UsernameContextValue => {
  const context = useContext(UsernameContext);
  if (!context) {
    throw new Error("useUsername must be used within a UsernameProvider");
  }
  return context;
};

export default UsernameProvider;
