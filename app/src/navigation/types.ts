import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Root Stack
export type RootStackParamList = {
  Waitlist: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Study: { deckId: string };
  DeckDetail: { deckId: string };
  CreateManual: { deckId?: string } | undefined;
  CreateAI: { deckId?: string } | undefined;
  CreatePDF: { deckId?: string } | undefined;
  CreateImage: undefined;
  CreateOcclusion: { deckId?: string } | undefined;
  CreateImport: { mode?: 'anki' | 'text' } | undefined;
  AddCardsPreview: {
    deckId: string | null;
    sourceQuestion: string;
    sourceAnswer: string;
    focusArea: string;
    cardCount: number;
    createNewDeck: boolean;
    deckTitle: string;
  };
  Settings: undefined;
  Statistics: undefined;
  Achievements: undefined;
  Help: undefined;
  Contact: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  EditProfile: undefined;
  PublicDeckPreview: { deckId: string };
  Social: { tab?: 'followers' | 'following'; viewUserId?: string };
  UserProfile: { userId: string };
  Review: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  HomeTab: undefined;
  DiscoverTab: undefined;
  LibraryTab: undefined;
  CreateTab: undefined;
  ProfileTab: undefined;
};

// Screen props types
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

// Declare global types for useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
