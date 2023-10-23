import { Elysia, t, Context } from "elysia";
import { auth, robloxAuth } from "@/lucia";

const initRobloxLogin = async () => {
  const [url, codeVerifier, state] = await robloxAuth.getAuthorizationUrl();
  let r = new Response(null, {
    status: 302,
  });
  r.headers.append(
    "Set-Cookie",
    `roblox_oauth_state=${state}; HttpOnly; Secure; Path=/; Max-Age=60;`
  );
  r.headers.append(
    "Set-Cookie",
    `roblox_code_verifier=${codeVerifier}; HttpOnly; Secure; Path=/; Max-Age=60;`
  );
  r.headers.set("Location", url.toString());
  return r;
};

const validateState = (state: string, roblox_oauth_state: string) => {
  // validate state
  if (!state || !roblox_oauth_state || state !== roblox_oauth_state)
    throw new Error(); // invalid state
};

// Remove the import statement for Context since it is already imported in the previous code block
// import { Context } from "elysia";

const initRobloxCallback = async (context: Context) => {
  const { code, state } = context.query!;

  const roblox_oauth_state = context.cookie["roblox_oauth_state"].value;
  validateState(state!, roblox_oauth_state);

  const roblox_code_verifier = context.cookie["roblox_code_verifier"].value;

  if (!roblox_code_verifier) throw new Error(); // invalid code verifier
  if (!code) throw new Error(); // invalid code

  async function handleUser() {
    try {
      const robloxUserProvider = await robloxAuth.validateCallback(
        code!,
        roblox_code_verifier
      );

      const getUser = async () => {
        const existingUser = await robloxUserProvider.getExistingUser();
        if (existingUser) return existingUser;
        // create a new user if the user does not exist
        return await robloxUserProvider.createUser({
          attributes: {
            username: robloxUserProvider.robloxUser.preferred_username,
          },
        });
      };

      // Get the user and create a session with their userId
      const user = await getUser();
      const session = await auth.createSession({
        userId: user.userId,
        attributes: {},
      });
      const authRequest = auth.handleRequest(context);
      authRequest.setSession(session);

      //   Get the cookies set in the context via authRequest
      const currentHeaders = context.set.headers["Set-Cookie"] as Array<string>;

      //   Place the cookies in a new response so its properly updated when you login
      const headers = new Headers([
        ["Location", `${process.env.LOCAL_URL}/auth`],
      ]);
      currentHeaders.forEach((cookie) => headers.append("Set-Cookie", cookie));
      return new Response(JSON.stringify(user), {
        status: 302,
        headers,
      });
    } catch (e) {
      // invalid code or code verifier
      console.log(e);
    }
    return Response.redirect(`${process.env.LOCAL_URL}/auth`.toString(), 302);
  }

  return handleUser();
};

export const authPlugin = new Elysia().group("/auth", (app) =>
  app
    .get("/login", async (context) => {
      return initRobloxLogin();
    })
    .get(
      "/callback",
      async (context) => {
        return initRobloxCallback(context);
      },
      {
        // make sure querys exist
        query: t.Object({
          code: t.String(),
          state: t.String(),
        }),
        cookie: t.Object({
          name: t.String({
            // we need both cookies
            roblox_oauth_state: t.String(),
            roblox_code_verifier: t.String(),
          }),
          value: t.String({
            minLength: 1,
          }),
        }),
      }
    )
    .get("/", async (context) => {
      if (
        !context.cookie["auth_session"] ||
        !context.cookie["auth_session"].value
      ) {
        return new Response(JSON.stringify({ message: "No session" }));
      }

      const session = await auth.getSession(
        context.cookie["auth_session"].value
      );
      return new Response(JSON.stringify(session));
    })
    .get("/logout", async (context) => {
      if (
        !context.cookie["auth_session"] ||
        !context.cookie["auth_session"].value
      ) {
        return new Response(JSON.stringify({ message: "No session" }));
      }
      try {
        const session = await auth.getSession(
          context.cookie["auth_session"].value
        );
        await auth.invalidateSession(session.sessionId);
      } catch {}
      let response = new Response();
      response.headers.append(
        "Set-Cookie",
        "auth_session=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );
      return response;
    })
    .get("/user", async (context) => {
      // cookie
      const cookie = context.cookie["auth_session"].value;
      const authRequest = auth.handleRequest(context);
      const session = await auth.getSession(cookie);
      const user = await auth.getUser(session.user.userId);
      return {
        user,
      };
    })
);
