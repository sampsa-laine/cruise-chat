import { ConnectedPeersStatus } from "@/components/ConnectedPeersStatus";
import PeerStatusProvider from "@/components/usePeerStatus";
import UsernameProvider from "@/components/useUsername";
import { paperTheme } from "@/constants/themes/paperTheme";
import db from "@/database";
import migrations from "@/drizzle/migrations";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import "react-native-get-random-values";
import { PaperProvider, adaptNavigationTheme } from "react-native-paper";
import "react-native-reanimated";

const { LightTheme } = adaptNavigationTheme<ReactNavigation.Theme>({
  reactNavigationLight: DefaultTheme,
});

const customTheme = {
  ...DefaultTheme,
  ...LightTheme,
  colors: {
    ...LightTheme.colors,
    card: paperTheme.colors.surface,
    background: paperTheme.colors.background,
  },
} satisfies ReactNavigation.Theme;

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on modals keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  const { success: migrationSuccess, error: migrationErrors } = useMigrations(
    db,
    migrations,
  );

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && migrationSuccess) {
      SplashScreen.hideAsync();
    }
  }, [loaded, migrationSuccess]);

  // Show loading screen while fonts or database are loading
  if (!loaded || !migrationSuccess) {
    if (migrationErrors) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Database initialization failed:</Text>
          <Text style={styles.errorMessage}>{migrationErrors.message}</Text>
        </View>
      );
    }
    return null; // Show splash screen
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={customTheme}>
        <UsernameProvider>
          <PeerStatusProvider>
            <StatusBar
              style="dark" // there is currently only a light theme, so make the statusbar dark.
              backgroundColor="transparent"
              translucent={true}
            />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="Welcome"
                options={{ presentation: "modal" }}
              />
            </Stack>
          </PeerStatusProvider>
        </UsernameProvider>
      </ThemeProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#d32f2f",
    marginBottom: 10,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
