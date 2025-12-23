-- Drop existing policies that reference auth.users
DROP POLICY IF EXISTS "Users can view invites they sent or received" ON public.mock_interview_invites;
DROP POLICY IF EXISTS "Users can update their received invites" ON public.mock_interview_invites;

-- Recreate policies using auth.jwt() instead of auth.users
CREATE POLICY "Users can view invites they sent or received" 
ON public.mock_interview_invites 
FOR SELECT 
USING (
  auth.uid() = inviter_id 
  OR invitee_email = (auth.jwt() ->> 'email')
);

CREATE POLICY "Users can update their received invites" 
ON public.mock_interview_invites 
FOR UPDATE 
USING (
  invitee_email = (auth.jwt() ->> 'email')
);