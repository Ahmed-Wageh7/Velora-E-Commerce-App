export interface ApiResponseEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}
