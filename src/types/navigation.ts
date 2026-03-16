export type RootStackParamList = {
  TVMode: undefined;
  Player: { channelId?: string } | undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
