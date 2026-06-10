export interface ModalConfirmOptions {
  cancelLabel?: string;
  confirmLabel?: string;
  message: string;
  title: string;
}

export interface ModalInfoOptions {
  confirmLabel?: string;
  message: string;
  title: string;
}

export interface ModalService {
  confirm: (options: ModalConfirmOptions) => Promise<boolean>;
  info: (options: ModalInfoOptions) => Promise<void>;
}
