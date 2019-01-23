export type AppDefinition = {
  id: string;
  name: string;
  notifications?: number;
  slug: string;
  url: string;
  icon: string;
};

export interface UserChangeset {
  username: string;
  email: string;
  ethAddress: string;
  nodeAddress: string;
}

export type ComponentEventHandler = (event: CustomEvent<any>) => void;

export interface WidgetDialogSettings {
  title?: string;
  icon?: string;
  content: JSX.Element;
  primaryButtonText: string;
  secondaryButtonText?: string;
  onPrimaryButtonClicked: ComponentEventHandler;
  onSecondaryButtonClicked?: ComponentEventHandler;
}

export interface ErrorMessage {
  primary: string | undefined;
  secondary: string | undefined;
}