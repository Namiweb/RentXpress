export function getUserName(user) {
  if (!user) return "-";
  const first = user.profile?.firstName;
  const last = user.profile?.lastName;
  const combined = [first, last].filter(Boolean).join(" ");
  if (combined) return combined;
  if (user.email) return user.email;
  if (user.userId) return user.userId;
  return "-";
}