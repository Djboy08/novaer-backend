import { Elysia, t } from "elysia";
import { auth } from "./lucia";

const signUserUp = async (email: string, password: string) => {
  const user = await auth.createUser({
    key: {
      providerId: "email",
      providerUserId: email.toLowerCase(),
      password,
    },
    attributes: {},
  });

  return user.userId;
};

const app = new Elysia()
  .model({
    input: t.Object({
      email: t.String({
        format: "email",
      }),
      password: t.String({
        minLength: 1,
      }),
    }),
  })
  .post(
    "/broken",
    async (context) => {
      const { body } = context;
      const userId = await signUserUp(body.email, body.password);

      const session = await auth.createSession({
        userId: userId,
        attributes: {},
      });

      const authRequest = auth.handleRequest(context);
      authRequest.setSession(session);

      return {
        message: "Success",
      };
    },
    {
      body: "input",
    }
  )
  .post(
    "/works",
    async (context) => {
      const { body } = context;
      const userId = await signUserUp(body.email, body.password);

      const session = await auth.createSession({
        userId: userId,
        attributes: {},
      });

      const authRequest = auth.handleRequest(context);
      authRequest.setSession(session);
      console.log(context.set.headers["Set-Cookie"]); // This works for some reason??

      return {
        message: "Success",
      };
    },
    {
      body: "input",
    }
  )
  .get("/user", async (context) => {
    // cookie
    const cookie = context.cookie["auth_session"].value;
    const authRequest = auth.handleRequest(context);
    console.log(cookie);
    const session = await auth.getSession(cookie);
    console.log(session);
    const user = await auth.getUser(session.user.userId);
    return {
      user,
    };
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
