-- Add avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Add expiry_date to dispense_products
ALTER TABLE public.dispense_products ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Create family groups table
CREATE TABLE public.groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group members table
CREATE TABLE public.group_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
    invited_by UUID NOT NULL,
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- Create group invites table for pending invitations
CREATE TABLE public.group_invites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    invited_by UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(group_id, invited_email)
);

-- Link dispense to groups (optional, a dispensa can belong to a group)
ALTER TABLE public.dispense ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Group owners can manage their groups" 
ON public.groups FOR ALL 
USING (auth.uid() = owner_id);

CREATE POLICY "Group members can view their groups"
ON public.groups FOR SELECT
USING (
    auth.uid() = owner_id OR
    EXISTS (
        SELECT 1 FROM public.group_members gm 
        WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.accepted_at IS NOT NULL
    )
);

-- RLS Policies for group_members
CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.groups g 
        WHERE g.id = group_id AND (
            g.owner_id = auth.uid() OR
            EXISTS (SELECT 1 FROM public.group_members gm2 WHERE gm2.group_id = group_id AND gm2.user_id = auth.uid())
        )
    )
);

CREATE POLICY "Group admins can manage members"
ON public.group_members FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.groups g 
        WHERE g.id = group_id AND g.owner_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.group_members gm 
        WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
);

-- RLS Policies for group_invites
CREATE POLICY "Invited users can view their invites"
ON public.group_invites FOR SELECT
USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Group admins can manage invites"
ON public.group_invites FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.groups g 
        WHERE g.id = group_id AND g.owner_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.group_members gm 
        WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role IN ('admin', 'editor')
    )
);

-- Update dispense policies to allow group members to access shared dispense
DROP POLICY IF EXISTS "Users can view their own pantries" ON public.dispense;
CREATE POLICY "Users can view their own and group pantries" 
ON public.dispense FOR SELECT 
USING (
    auth.uid() = user_id 
    OR (
        group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.group_members gm 
            WHERE gm.group_id = dispense.group_id AND gm.user_id = auth.uid() AND gm.accepted_at IS NOT NULL
        )
    )
);

DROP POLICY IF EXISTS "Users can update their own pantries" ON public.dispense;
CREATE POLICY "Users can update their own and group pantries" 
ON public.dispense FOR UPDATE 
USING (
    auth.uid() = user_id 
    OR (
        group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.group_members gm 
            WHERE gm.group_id = dispense.group_id AND gm.user_id = auth.uid() AND gm.role IN ('editor', 'admin') AND gm.accepted_at IS NOT NULL
        )
    )
);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for updated_at on new tables
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();