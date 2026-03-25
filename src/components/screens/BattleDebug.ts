export const isBattleLayoutDebugEnabled = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("battle-layout-debug") === "1";
};
