import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { CountryScreen } from '../screens/CountryScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { NavBar } from '../components/layout/NavBar';
import { useGeoLocation } from '../hooks/useGeoLocation';
import { RootStackParamList } from '../types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Enable browser history support on web
const linking = {
  prefixes: [],
  config: {
    screens: {
      Home: '',
      Category: 'category/:categoryId',
      Country: 'country/:countryCode',
      Favorites: 'favorites',
      Search: 'search',
      Settings: 'settings',
      Player: 'player/:channelId?',
    },
  },
};

function ScreenWithNav({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.screenWithNav}>
      <NavBar />
      <View style={styles.screenContent}>{children}</View>
    </View>
  );
}

function HomeWithNav() {
  return (
    <ScreenWithNav>
      <HomeScreen />
    </ScreenWithNav>
  );
}

function CategoryWithNav() {
  return (
    <ScreenWithNav>
      <CategoryScreen />
    </ScreenWithNav>
  );
}

function CountryWithNav() {
  return (
    <ScreenWithNav>
      <CountryScreen />
    </ScreenWithNav>
  );
}

function FavoritesWithNav() {
  return (
    <ScreenWithNav>
      <FavoritesScreen />
    </ScreenWithNav>
  );
}

function SearchWithNav() {
  return (
    <ScreenWithNav>
      <SearchScreen />
    </ScreenWithNav>
  );
}

function SettingsWithNav() {
  return (
    <ScreenWithNav>
      <SettingsScreen />
    </ScreenWithNav>
  );
}

export function Navigation() {
  useGeoLocation();

  return (
    <NavigationContainer linking={Platform.OS === 'web' ? linking : undefined}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Home" component={HomeWithNav} />
        <Stack.Screen name="Category" component={CategoryWithNav} />
        <Stack.Screen name="Country" component={CountryWithNav} />
        <Stack.Screen name="Favorites" component={FavoritesWithNav} />
        <Stack.Screen name="Search" component={SearchWithNav} />
        <Stack.Screen name="Settings" component={SettingsWithNav} />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  screenWithNav: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContent: {
    flex: 1,
  },
});
