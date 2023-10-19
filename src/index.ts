import { Elysia, t } from "elysia";
import { auth, robloxAuth } from "./lucia";
import { parseSetCookies } from "elysia/dist/handler";

// const signUserUp = async (email: string, password: string) => {
//   const user = await auth.createUser({
//     key: {
//       providerId: "email",
//       providerUserId: email.toLowerCase(),
//       password,
//     },
//     attributes: {},
//   });

//   return user.userId;
// };

const app = new Elysia()
  // .model({
  //   input: t.Object({
  //     email: t.String({
  //       format: "email",
  //     }),
  //     password: t.String({
  //       minLength: 1,
  //     }),
  //   }),
  // })
  .get("/login", async (context) => {
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
  })
  .get("/callback", async (context) => {
    const code = context.query["code"];
    const state = context.query["state"];

    const roblox_oauth_state = context.cookie["roblox_oauth_state"].value;
    // validate state
    if (!state || !roblox_oauth_state || state !== roblox_oauth_state)
      throw new Error(); // invalid state

    const roblox_code_verifier = context.cookie["roblox_code_verifier"].value;
    if (!roblox_code_verifier) throw new Error(); // invalid code verifier

    if (!code) throw new Error(); // invalid code
    try {
      const robloxUserProvider = await robloxAuth.validateCallback(
        code,
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
      const user = await getUser();
      const session = await auth.createSession({
        userId: user.userId,
        attributes: {},
      });
      const authRequest = auth.handleRequest(context);
      authRequest.setSession(session);
      let response = new Response(
        JSON.stringify({
          message: "Success",
          userData: user,
        }),
        {
          status: 302,
        }
      );
      (context.set.headers["Set-Cookie"] as string[]).forEach((cookie) => {
        response.headers.append("Set-Cookie", cookie);
      });
      response.headers.set("Location", "http://localhost:3000/".toString());
      return response;
    } catch (e) {
      // invalid code or code verifier
    }
  })
  .get("/", async (context) => {
    if (
      !context.cookie["auth_session"] ||
      !context.cookie["auth_session"].value
    ) {
      return new Response(JSON.stringify({ message: "No session" }));
    }
    const session = await auth.getSession(context.cookie["auth_session"].value);
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
  // .post(
  //   "/works",
  //   async (context) => {
  //     const { body } = context;
  //     const userId = await signUserUp(body.email, body.password);

  //     const session = await auth.createSession({
  //       userId: userId,
  //       attributes: {},
  //     });

  //     const authRequest = auth.handleRequest(context);
  //     authRequest.setSession(session);
  //     console.log(context.set.headers["Set-Cookie"]); // This works for some reason??

  //     return {
  //       message: "Success",
  //     };
  //   },
  //   {
  //     body: "input",
  //   }
  // )
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
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
