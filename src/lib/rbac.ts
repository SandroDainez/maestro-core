export function requireRole(role: string) {
  return function middleware() {
    // placeholder — integrar com auth real
    console.log("Checking role:", role);
  };
}