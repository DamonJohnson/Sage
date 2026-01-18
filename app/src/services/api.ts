/**
 * API Client Configuration
 *
 * Base axios instance for communicating with the Sage backend API.
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URL - use localhost for development
const getBaseURL = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3001';
  }
  // For mobile, use your machine's IP address
  // In production, this would be your actual API URL
  return 'http://localhost:3001';
};

// Token storage keys
const AUTH_TOKEN_KEY = 'sage_auth_token';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management functions
export async function getAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
}

export async function clearAuthToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    }
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
}

// Request interceptor for auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response) {
      // Handle 401 - Clear token and user should re-authenticate
      if (error.response.status === 401) {
        await clearAuthToken();
        // Could emit an event here to trigger sign-out in the app
      }

      const message = (error.response.data as any)?.error || 'An error occurred';
      console.error('API Error:', error.response.status, message);
    } else if (error.request) {
      console.error('Network Error: No response received');
    } else {
      console.error('Request Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Generic API response type
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Helper for making requests
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<APIResponse<T>> {
  try {
    const response = await api.request<APIResponse<T>>({
      method,
      url,
      data,
      ...config,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      return error.response.data as APIResponse<T>;
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Check if the API is reachable
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await api.get('/api/health', { timeout: 5000 });
    return response.data?.status === 'ok';
  } catch {
    return false;
  }
}

export default api;
