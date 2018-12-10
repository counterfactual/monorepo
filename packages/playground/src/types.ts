export interface AppDefinition {
  name: string;
  notifications?: number;
  slug: string;
  url: string;
  icon: string;
}

export interface UserChangeset {
  username: string;
  email: string;
  address: string;
}

export type ComponentEventHandler = (event: CustomEvent<any>) => void;

export interface AppDialogSettings {
  title?: string;
  icon?: string;
  content: JSX.Element;
  primaryButtonText: string;
  secondaryButtonText?: string;
  onPrimaryButtonClicked: ComponentEventHandler;
  onSecondaryButtonClicked?: ComponentEventHandler;
}
