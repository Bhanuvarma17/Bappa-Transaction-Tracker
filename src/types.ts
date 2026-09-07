export interface User {
  id: string;
  email: string;
}

export interface Profile {
  userId: string;
  username: string;
  normalizedUsername: string;
  displayName: string;
  bio: string;
  profileImage: string;
  capital: number;
  currency: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  userId?: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommitteePublicData {
  profile: {
    username: string;
    displayName: string;
    bio: string;
    profileImage: string;
    capital: number;
    currency: string;
    updatedAt: string;
  };
  expenses: Expense[];
  summary: {
    totalExpensesCount: number;
    capital: number;
    totalSpent: number;
    remainingBudget: number;
    percentSpent: number;
  };
}

export interface PublicCommitteeSummary {
  username: string;
  displayName: string;
  bio: string;
  profileImage: string;
  capital: number;
  expensesCount: number;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface CheckUsernameResponse {
  available: boolean;
  normalizedUsername?: string;
  message?: string;
}

