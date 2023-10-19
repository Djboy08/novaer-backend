import { Elysia } from "elysia";
import { authPlugin } from "./plugins/auth";
import swagger from "@elysiajs/swagger";

const app = new Elysia()
  .use(swagger())
  .use(authPlugin)
  .get("/", async (context) => {
    return new Response("Hello World!");
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
