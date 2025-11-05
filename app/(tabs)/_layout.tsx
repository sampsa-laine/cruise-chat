import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import
  {
    CommonActions,
    ParamListBase,
    TabNavigationState,
  } from "@react-navigation/native";
import { Tabs, withLayoutContext } from "expo-router";
import React from "react";
import
  {
    BottomNavigation,
    MaterialBottomTabNavigationEventMap,
    MaterialBottomTabNavigationOptions,
    useTheme
  } from "react-native-paper";

const { Navigator } = createBottomTabNavigator();
const MaterialBottomTabs = withLayoutContext<
  MaterialBottomTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialBottomTabNavigationEventMap
>(Navigator);

export default function TabLayout() {
  const theme = useTheme();
  return (
    <MaterialBottomTabs
      screenOptions={{
        animation: "none",
      }}
      tabBar={({ navigation, state, descriptors, insets }) => (
        <BottomNavigation.Bar
          theme={theme}
          navigationState={state}
          safeAreaInsets={insets}
          onTabPress={({ route, preventDefault }) => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (event.defaultPrevented) {
              preventDefault();
            } else {
              navigation.dispatch({
                ...CommonActions.navigate(route.name, route.params),
                target: state.key,
              });
            }
          }}
          renderIcon={({ route, focused, color }) =>
            descriptors[route.key].options.tabBarIcon?.({
              focused,
              color,
              size: 24,
            }) || null
          }
          getLabelText={({ route }) => {
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : typeof options.title === "string"
                  ? options.title
                  : route.name;

            return label;
          }}
        />
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "General Chat",
          tabBarIcon: ({ color, size = 24 }) => (
            <MaterialIcons name="message" color={color} size={size} />
          ),
          headerRight(props) {
            // return <ConnectedPeersStatus />; // Maybe we won't want to display here since this isn't the actual amount of people in the graph and rather a technical detail
          },
          tabBarLabel: "Chat",
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: "Rooms",
          tabBarIcon: ({ color, size = 24 }) => (
            <MaterialCommunityIcons name="group" color={color} size={size} />
          ),
          tabBarLabel: "Rooms",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size = 24 }) => (
            <MaterialIcons name="settings" color={color} size={size} />
          ),
          tabBarLabel: "Settings",
        }}
      />
    </MaterialBottomTabs>
  );
}
