/**
 * Type declarations for Google Identity Services (GIS)
 * Loaded dynamically from https://accounts.google.com/gsi/client
 */

interface GoogleAccountsOAuth2TokenClient {
  requestAccessToken: () => void;
}

interface GoogleAccountsOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: any) => void;
  }): GoogleAccountsOAuth2TokenClient;
}

interface GoogleAccounts {
  oauth2: GoogleAccountsOAuth2;
  id: any;
}

interface Window {
  google?: {
    accounts: GoogleAccounts;
  };
}

declare var google: {
  accounts: GoogleAccounts;
};