import {
  createOAuth2AuthorizationUrlWithPKCE,
  validateOAuth2AuthorizationCode,
  ProviderUserAuth,
  OAuth2ProviderAuthWithPKCE,
} from "@lucia-auth/oauth";

// import {} from "@lucia-auth";
import { handleRequest, authorizationHeader } from "./request.js";

import type { Auth } from "lucia";

type Config = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string[];
};

const PROVIDER_ID = "roblox";

export const roblox = <_Auth extends Auth = Auth>(
  auth: _Auth,
  config: Config
): RobloxAuth<_Auth> => {
  return new RobloxAuth(auth, config);
};

export class RobloxAuth<
  _Auth extends Auth = Auth
> extends OAuth2ProviderAuthWithPKCE<RobloxUserAuth<_Auth>> {
  private config: Config;

  constructor(auth: _Auth, config: Config) {
    super(auth);
    this.config = config;
  }

  public getAuthorizationUrl = async (): Promise<
    readonly [url: URL, codeVerifier: string, state: string]
  > => {
    const scopeConfig = this.config.scope ?? [];
    return await createOAuth2AuthorizationUrlWithPKCE(
      "https://apis.roblox.com/oauth/v1/authorize",
      {
        clientId: this.config.clientId,
        codeChallengeMethod: "S256",
        scope: ["openid", "profile", ...scopeConfig],
        redirectUri: this.config.redirectUri,
      }
    );
  };

  public validateCallback = async (
    code: string,
    code_verifier: string
  ): Promise<RobloxUserAuth<_Auth>> => {
    const robloxTokens = await this.validateAuthorizationCode(
      code,
      code_verifier
    );
    const robloxUser = await getRobloxUser(robloxTokens.accessToken);
    return new RobloxUserAuth(this.auth, robloxUser, robloxTokens);
  };

  private validateAuthorizationCode = async (
    code: string,
    codeVerifier: string
  ): Promise<RobloxTokens> => {
    const tokens = await validateOAuth2AuthorizationCode<{
      access_token: string;
      refresh_token?: string;
    }>(code, "https://apis.roblox.com/oauth/v1/token", {
      clientId: this.config.clientId,
      redirectUri: this.config.redirectUri,
      codeVerifier,
      clientPassword: {
        authenticateWith: "client_secret",
        // authenticateWith: "http_basic_auth",
        clientSecret: this.config.clientSecret,
      },
    });

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
    };
  };
}

export class RobloxUserAuth<
  _Auth extends Auth = Auth
> extends ProviderUserAuth<_Auth> {
  public robloxTokens: RobloxTokens;
  public robloxUser: RobloxUser;

  constructor(auth: _Auth, robloxUser: RobloxUser, robloxTokens: RobloxTokens) {
    super(auth, PROVIDER_ID, robloxUser.sub);
    this.robloxTokens = robloxTokens;
    this.robloxUser = robloxUser;
  }
}

const getRobloxUser = async (accessToken: string): Promise<RobloxUser> => {
  const request = new Request("https://apis.roblox.com/oauth/v1/userinfo", {
    headers: {
      Authorization: authorizationHeader("bearer", accessToken),
    },
  });
  const robloxUserResult = await handleRequest<RobloxUser>(request);
  return robloxUserResult;
};

export type RobloxTokens = {
  accessToken: string;
  refreshToken: string | null;
};

export type RobloxUser = {
  sub: string;
  name: string;
  nickname: string;
  preferred_username: string;
  created_at: number;
  profile: string;
  picture: string;
};
