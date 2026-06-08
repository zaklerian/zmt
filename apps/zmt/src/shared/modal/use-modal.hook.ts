import { createRequiredContext } from '../react';
import { ModalContextValue } from './modal.model';

const { Provider, useValue } =
  createRequiredContext<ModalContextValue>('useModal');

export const ModalContextProvider = Provider;
export const useModal = useValue;
