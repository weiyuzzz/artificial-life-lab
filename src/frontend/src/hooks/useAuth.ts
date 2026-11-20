import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/** Current identity and sign-in state. `principal` is undefined while signed out. */
export function useAuth() {
  const { identity, login, clear, isInitializing, isLoggingIn, isLoginError } =
    useInternetIdentity();
  const queryClient = useQueryClient();
  const principalObj =
    identity && !identity.getPrincipal().isAnonymous()
      ? identity.getPrincipal()
      : undefined;
  const principal = principalObj?.toText();

  const signIn = useCallback(() => {
    // Keep the popup inside the user's activation frame: no await before login.
    login();
  }, [login]);

  const signOut = useCallback(() => {
    void queryClient.cancelQueries();
    queryClient.clear();
    clear();
  }, [clear, queryClient]);

  return {
    identity,
    principal,
    isAuthenticated: principal !== undefined,
    isInitializing,
    isLoggingIn,
    isLoginError,
    signIn,
    signOut,
  };
}
