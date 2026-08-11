export interface AuthApiUser {
  _id?: string;
  id?: string;
  name?: string;
  email: string;
  phone?: string;
}

export interface AuthApiResponseData {
  user?: AuthApiUser;
  token?: string;
  accessToken?: string;
}

export interface AuthApiResponse {
  success?: boolean;
  message?: string;
  accessToken?: string;
  token?: string;
  user?: AuthApiUser;
  data?: AuthApiUser | AuthApiResponseData;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
}
