import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/backend/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  addLocalNotification: (title: string, message: string, type?: string) => void;
  addNotification: (title: string, message: string, type?: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.read).length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to realtime notifications (for external sources like scanner)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          // Only add if not already exists (to avoid duplicates from local additions)
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotification.id)) {
              return prev;
            }
            return [newNotification, ...prev];
          });
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Add notification locally first (instant) then persist to DB
  const addLocalNotification = useCallback((title: string, message: string, type: string = "info") => {
    if (!user) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      id: tempId,
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString(),
    };

    // Add immediately to local state
    setNotifications((prev) => [newNotification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // Persist to database in background (don't wait)
    supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        title,
        message,
        type,
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error persisting notification:", error);
          return;
        }
        // Replace temp notification with real one
        if (data) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === tempId ? data : n))
          );
        }
      });
  }, [user]);

  // Traditional async add (for backwards compatibility)
  const addNotification = useCallback(async (title: string, message: string, type: string = "info") => {
    addLocalNotification(title, message, type);
  }, [addLocalNotification]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Skip DB update for temp IDs
      if (!notificationId.startsWith("temp-")) {
        const { error } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notificationId);

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [user]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const notification = notifications.find((n) => n.id === notificationId);

      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      // Skip DB delete for temp IDs
      if (!notificationId.startsWith("temp-")) {
        const { error } = await supabase
          .from("notifications")
          .delete()
          .eq("id", notificationId);

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }, [notifications]);

  const clearAll = useCallback(async () => {
    if (!user) return;

    try {
      setNotifications([]);
      setUnreadCount(0);

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        addLocalNotification,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotificationContext must be used within a NotificationProvider");
  }
  return context;
}
