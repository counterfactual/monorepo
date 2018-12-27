import jwt from "koa-jwt";

export default function(jwtSecret: string) {
  return jwt({
    secret: jwtSecret
  }).unless({
    path: [/token$/],
    method: "OPTIONS"
  });
}
