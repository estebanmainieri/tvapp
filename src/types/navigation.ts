export type RootStackParamList = {
  Home: undefined;
  Category: { categoryId: string; categoryName: string };
  Country: { countryCode: string; countryName: string };
  Favorites: undefined;
  RecentlyWatched: undefined;
  Search: undefined;
  Settings: undefined;
  AddStream: undefined;
  Player: { channelId?: string } | undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
