"use client"

import { Amplify, type ResourcesConfig} from "aws-amplify";

export const authConfig: ResourcesConfig["Auth"] = {
    Cognito: {
        userPoolId: "eu-west-2_nMdfeAbKu",
        userPoolClientId: "kp11r8hfcst3dj1nq5f73qdlg"
    }
};

Amplify.configure(
    {
        Auth: authConfig,
    },
    { ssr: true}
);

export default function ConfigureAmplifyClientSide() {
    return null;
}