import { Middleware } from "koa";

export type TokenResponse = { token: string };

export type FirebaseConfigurationResponse = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
};

export type ConditionalMiddleware = Middleware & {
  unless: (params: { [key: string]: any }) => Middleware;
};
