export type ToastType = 'success' | 'error' | 'info' | 'cart';
export type ToastReplaceGroup = 'cart';

export interface ToastProductPreview {
  name: string;
  image: string;
  price?: number;
  quantity?: number;
}

export interface ToastMessage {
  id: number;
  title: string;
  message: string;
  type: ToastType;
  duration: number;
  visible: boolean;
  paused: boolean;
  remaining: number;
  startedAt: number;
  product?: ToastProductPreview;
  replaceGroup?: ToastReplaceGroup;
}

export type ToastInput = Pick<ToastMessage, 'title' | 'message' | 'type' | 'duration' | 'product' | 'replaceGroup'>;
