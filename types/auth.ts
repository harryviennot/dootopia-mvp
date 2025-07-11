export enum AuthStrategy {
  EMAIL = "email",
  GOOGLE = "oauth_google",
  APPLE = "oauth_apple",
  MICROSOFT = "oauth_microsoft",
}

// Type for OAuth strategies that Clerk accepts
export type OAuthStrategy = "oauth_google" | "oauth_apple" | "oauth_microsoft";

export interface SSOButtonProps {
  provider: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
}
