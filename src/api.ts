import {
  User,
  Profile,
  Expense,
  CommitteePublicData,
  PublicCommitteeSummary,
  ForgotPasswordResponse,
  VerifyOtpResponse,
  ResetPasswordResponse,
  ChangePasswordResponse,
} from "./types";

const TOKEN_KEY = "ganesh_tracker_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, {
    ...options,
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
  }): Promise<{ user: User; profile: Profile; token: string }> {
    const data = await request<{ user: User; profile: Profile; token: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(data.token);
    return data;
  },

  async login(payload: {
    identifier: string;
    password: string;
  }): Promise<{ user: User; profile: Profile; token: string }> {
    const data = await request<{ user: User; profile: Profile; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setToken(data.token);
    return data;
  },

  async getMe(): Promise<{ user: User; profile: Profile } | null> {
    const token = getToken();
    if (!token) return null;
    try {
      return await request<{ user: User; profile: Profile }>("/api/auth/me");
    } catch {
      clearToken();
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      clearToken();
    }
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    return request<ForgotPasswordResponse>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async verifyOtp(payload: { email: string; otp: string }): Promise<VerifyOtpResponse> {
    return request<VerifyOtpResponse>("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(payload: {
    email: string;
    resetToken: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ResetPasswordResponse> {
    return request<ResetPasswordResponse>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ChangePasswordResponse> {
    const res = await request<ChangePasswordResponse>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    // Successful change-password invalidates server-side sessions; clear local token
    clearToken();
    return res;
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
