export function isUnconfirmedAuthError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return code === "email_not_confirmed" || message.includes("email not confirmed");
}

export function isExistingUserError(error: { message?: string; code?: string; status?: number } | null | undefined) {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists")
  );
}

export function isRecoverableCreateUserError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return isExistingUserError(error) || message.includes("database error saving new user");
}

export function loginErrorMessage(error: { message?: string; code?: string } | null | undefined) {
  if (isUnconfirmedAuthError(error)) {
    return "Confirm your email first. Check your inbox and spam folder for a LessonLeads message.";
  }
  const message = (error?.message ?? "").toLowerCase();
  if ((error?.code ?? "") === "invalid_credentials" || message.includes("invalid login") || message.includes("invalid credentials")) {
    return "Email or password is incorrect.";
  }
  return error?.message || "Could not log in. Please try again.";
}
