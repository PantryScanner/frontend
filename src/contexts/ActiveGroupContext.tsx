import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/backend/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
}

export interface PendingInvite {
  id: string;
  group_id: string;
  group_name: string;
  invited_by_username: string | null;
  role: string;
  created_at: string;
}

interface ActiveGroupContextType {
  groups: Group[];
  activeGroup: Group | null;
  pendingInvites: PendingInvite[];
  isLoading: boolean;
  needsOnboarding: boolean;
  setActiveGroup: (group: Group) => Promise<void>;
  refreshGroups: () => Promise<void>;
  refreshInvites: () => Promise<void>;
  createGroup: (name: string, description?: string) => Promise<Group | null>;
  acceptInvite: (inviteId: string) => Promise<boolean>;
  declineInvite: (inviteId: string) => Promise<boolean>;
}

const ActiveGroupContext = createContext<ActiveGroupContextType | undefined>(undefined);

export const useActiveGroup = () => {
  const context = useContext(ActiveGroupContext);
  if (!context) {
    throw new Error('useActiveGroup must be used within an ActiveGroupProvider');
  }
  return context;
};

export const ActiveGroupProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroupState] = useState<Group | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setActiveGroupState(null);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch groups where user is owner or accepted member
      const { data: ownedGroups } = await supabase
        .from('groups')
        .select('*')
        .eq('owner_id', user.id);

      const { data: memberGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null);

      const memberGroupIds = memberGroups?.map(m => m.group_id) || [];
      
      let allGroups: Group[] = ownedGroups || [];
      
      if (memberGroupIds.length > 0) {
        const { data: joinedGroups } = await supabase
          .from('groups')
          .select('*')
          .in('id', memberGroupIds)
          .not('owner_id', 'eq', user.id);
        
        if (joinedGroups) {
          allGroups = [...allGroups, ...joinedGroups];
        }
      }

      setGroups(allGroups);

      // Check if user needs onboarding (no groups)
      if (allGroups.length === 0) {
        setNeedsOnboarding(true);
        setActiveGroupState(null);
      } else {
        setNeedsOnboarding(false);
        
        // Get user's active group from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('active_group_id')
          .eq('user_id', user.id)
          .maybeSingle();

        const savedGroupId = profile?.active_group_id;
        const savedGroup = allGroups.find(g => g.id === savedGroupId);
        
        if (savedGroup) {
          setActiveGroupState(savedGroup);
        } else {
          // Default to first group
          setActiveGroupState(allGroups[0]);
          // Save this as active
          await supabase
            .from('profiles')
            .update({ active_group_id: allGroups[0].id })
            .eq('user_id', user.id);
        }
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchInvites = useCallback(async () => {
    if (!user?.email) return;

    try {
      const { data: invites } = await supabase
        .from('group_invites')
        .select('id, group_id, role, created_at, invited_by_username')
        .eq('invited_email', user.email.toLowerCase())
        .eq('status', 'pending');

      if (invites && invites.length > 0) {
        // Fetch group names
        const groupIds = invites.map(i => i.group_id);
        const { data: groupsData } = await supabase
          .from('groups')
          .select('id, name')
          .in('id', groupIds);

        const groupMap = new Map(groupsData?.map(g => [g.id, g.name]) || []);

        const pendingList: PendingInvite[] = invites.map(inv => ({
          id: inv.id,
          group_id: inv.group_id,
          group_name: groupMap.get(inv.group_id) || 'Gruppo sconosciuto',
          invited_by_username: inv.invited_by_username,
          role: inv.role,
          created_at: inv.created_at,
        }));

        setPendingInvites(pendingList);
      } else {
        setPendingInvites([]);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchGroups();
      fetchInvites();
    } else {
      setGroups([]);
      setActiveGroupState(null);
      setPendingInvites([]);
      setIsLoading(false);
      setNeedsOnboarding(false);
    }
  }, [user, fetchGroups, fetchInvites]);

  const setActiveGroup = async (group: Group) => {
    setActiveGroupState(group);
    if (user) {
      await supabase
        .from('profiles')
        .update({ active_group_id: group.id })
        .eq('user_id', user.id);
    }
  };

  const createGroup = async (name: string, description?: string): Promise<Group | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add owner as admin member
      await supabase.from('group_members').insert({
        group_id: data.id,
        user_id: user.id,
        role: 'admin',
        invited_by: user.id,
        accepted_at: new Date().toISOString(),
      });

      // Refresh groups and set as active
      await fetchGroups();
      setActiveGroupState(data);
      setNeedsOnboarding(false);

      // Update profile with active group
      await supabase
        .from('profiles')
        .update({ active_group_id: data.id })
        .eq('user_id', user.id);

      return data;
    } catch (error) {
      console.error('Error creating group:', error);
      return null;
    }
  };

  const acceptInvite = async (inviteId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const invite = pendingInvites.find(i => i.id === inviteId);
      if (!invite) return false;

      // Update invite status
      await supabase
        .from('group_invites')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', inviteId);

      // Add as group member
      await supabase.from('group_members').insert({
        group_id: invite.group_id,
        user_id: user.id,
        role: invite.role,
        invited_by: user.id,
        accepted_at: new Date().toISOString(),
      });

      // Refresh
      await fetchGroups();
      await fetchInvites();
      return true;
    } catch (error) {
      console.error('Error accepting invite:', error);
      return false;
    }
  };

  const declineInvite = async (inviteId: string): Promise<boolean> => {
    try {
      await supabase
        .from('group_invites')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', inviteId);

      await fetchInvites();
      return true;
    } catch (error) {
      console.error('Error declining invite:', error);
      return false;
    }
  };

  return (
    <ActiveGroupContext.Provider
      value={{
        groups,
        activeGroup,
        pendingInvites,
        isLoading,
        needsOnboarding,
        setActiveGroup,
        refreshGroups: fetchGroups,
        refreshInvites: fetchInvites,
        createGroup,
        acceptInvite,
        declineInvite,
      }}
    >
      {children}
    </ActiveGroupContext.Provider>
  );
};
