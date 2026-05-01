import { create } from 'zustand';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  // Token không lưu ở đây — token nằm trong httpOnly cookie
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authAPI.login({ username, password });
      // MFA challenge — chưa đăng nhập hoàn toàn
      if (data.mfaRequired || data.mfaSetupRequired) {
        set({ loading: false });
        return data;
      }
      // Đăng nhập thành công
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, loading: false });
      return data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Đăng nhập thất bại';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  loginWithMfa: async (token) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authAPI.mfaVerify(token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, loading: false });
      return data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Mã xác thực không đúng';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try {
      await authAPI.logout();
    } catch (_) {
      // Dù lỗi vẫn clear state local
    }
    localStorage.removeItem('user');
    set({ user: null });
  },

  fetchMe: async () => {
    try {
      const { data } = await authAPI.getMe();
      localStorage.setItem('user', JSON.stringify(data));
      set({ user: data });
    } catch (err) {
      get().logout();
    }
  },

  isAuthenticated: () => !!get().user,
  hasRole: (...roles) => roles.includes(get().user?.role),
}));

export default useAuthStore;
