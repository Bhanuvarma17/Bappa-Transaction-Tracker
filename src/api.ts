import {
  User,
  Profile,
  Expense,
  CommitteePublicData,
  PublicCommitteeSummary,
  ChangePasswordResponse,
} from "./types";

// No longer storing authentication tokens in localStorage; using secure HttpOnly cookies.
export function getToken(): string | null {
  return null;
}

export function setToken(_token?: string) {
  // No-op for backward compatibility
}

export function clearToken() {
  // No-op for backward compatibility
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, {
    ...options,
    credentials: "include", // Ensure cookies are sent with every request
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  async signup(payload: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
    bio?: string;
    capital?: number;
  }): Promise<{ user: User; profile: Profile }> {
    return request<{ user: User; profile: Profile }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async login(payload: {
    identifier: string;
    password: string;
  }): Promise<{ user: User; profile: Profile }> {
    return request<{ user: User; profile: Profile }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getMe(): Promise<{ user: User; profile: Profile } | null> {
    try {
      return await request<{ user: User; profile: Profile }>("/api/auth/me");
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ChangePasswordResponse> {
    return request<ChangePasswordResponse>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Profile (Private)
  async updateProfile(payload: {
    username?: string;
    displayName?: string;
    bio?: string;
    profileImage?: string;
    capital?: number;
    currency?: string;
  }): Promise<{ profile: Profile }> {
    return request<{ profile: Profile }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // Expenses (Private)
  async getExpenses(): Promise<Expense[]> {
    return request<Expense[]>("/api/expenses");
  },

  async addExpense(payload: {
    title: string;
    amount: number;
    category: string;
    date: string;
    notes?: string;
  }): Promise<Expense> {
    return request<Expense>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async editExpense(id: string, payload: {
    title?: string;
    amount?: number;
    category?: string;
    date?: string;
    notes?: string;
  }): Promise<Expense> {
    return request<Expense>(`/api/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteExpense(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/expenses/${id}`, {
      method: "DELETE",
    });
  },

  async reorderExpenses(orderedIds: string[]): Promise<Expense[]> {
    return request<Expense[]>("/api/expenses/reorder", {
      method: "PUT",
      body: JSON.stringify({ orderedIds }),
    });
  },

  // Public
  async getPublicCommittee(username: string): Promise<CommitteePublicData> {
    return request<CommitteePublicData>(`/api/public/committee/${encodeURIComponent(username)}`);
  },

  async getPublicCommittees(): Promise<PublicCommitteeSummary[]> {
    return request<PublicCommitteeSummary[]>("/api/public/committees");
  },

  async checkUsernameAvailability(
    username: string,
    excludeUserId?: string
  ): Promise<{ available: boolean; error?: string }> {
    const encoded = encodeURIComponent(username.trim());
    const query = excludeUserId ? `?excludeUserId=${encodeURIComponent(excludeUserId)}` : "";
    return request<{ available: boolean; error?: string }>(
      `/api/public/check-username/${encoded}${query}`
    );
  },
};
