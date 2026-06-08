export interface ConfirmOptions {
  cancelLabel?: string;
  confirmLabel?: string;
  message: string;
  title: string;
}

export interface InfoOptions {
  confirmLabel?: string;
  message: string;
  title: string;
}

export interface ModalContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  info: (options: InfoOptions) => Promise<void>;
}
