-- Drop the old constraint and add a new one that includes 'quiz'
ALTER TABLE interview_sessions DROP CONSTRAINT interview_sessions_session_type_check;

ALTER TABLE interview_sessions ADD CONSTRAINT interview_sessions_session_type_check 
CHECK (session_type = ANY (ARRAY['practice'::text, 'mock'::text, 'voice'::text, 'quiz'::text]));