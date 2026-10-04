interface Credentials {
  email: string;
  password: string;
}

let pending: Credentials | null = null;

/**
 * The email and password of an account waiting for its email code. Verifying needs both, and
 * they are held in memory only: never in a route parameter, never on disk.
 */
export const pendingVerification = {
  set(credentials: Credentials) {
    pending = credentials;
  },
  get: () => pending,
  clear() {
    pending = null;
  },
};
