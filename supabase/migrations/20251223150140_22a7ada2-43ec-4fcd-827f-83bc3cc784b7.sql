-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create question categories table
CREATE TABLE public.question_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.question_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view categories
CREATE POLICY "Anyone can view categories" ON public.question_categories
  FOR SELECT USING (true);

-- Create interview questions table
CREATE TABLE public.interview_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.question_categories(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  industry TEXT,
  role TEXT,
  tips TEXT,
  sample_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;

-- Everyone can view questions
CREATE POLICY "Anyone can view questions" ON public.interview_questions
  FOR SELECT USING (true);

-- Create interview sessions table
CREATE TABLE public.interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'practice' CHECK (session_type IN ('practice', 'mock', 'voice')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  overall_score NUMERIC(3,1),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can view their own sessions" ON public.interview_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON public.interview_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.interview_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON public.interview_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create interview responses table
CREATE TABLE public.interview_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.interview_questions(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  response_text TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  clarity_score NUMERIC(3,1),
  relevance_score NUMERIC(3,1),
  confidence_score NUMERIC(3,1),
  ai_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_responses ENABLE ROW LEVEL SECURITY;

-- Users can access responses through their sessions
CREATE POLICY "Users can view their own responses" ON public.interview_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions
      WHERE interview_sessions.id = interview_responses.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own responses" ON public.interview_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interview_sessions
      WHERE interview_sessions.id = interview_responses.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own responses" ON public.interview_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions
      WHERE interview_sessions.id = interview_responses.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

-- Create body language metrics table
CREATE TABLE public.body_language_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.interview_responses(id) ON DELETE CASCADE,
  posture_score NUMERIC(3,1),
  eye_contact_score NUMERIC(3,1),
  nervous_movements INTEGER DEFAULT 0,
  looking_away_count INTEGER DEFAULT 0,
  phone_detected_count INTEGER DEFAULT 0,
  person_detected_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.body_language_metrics ENABLE ROW LEVEL SECURITY;

-- Users can access metrics through their responses
CREATE POLICY "Users can view their own metrics" ON public.body_language_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.interview_responses ir
      JOIN public.interview_sessions iss ON ir.session_id = iss.id
      WHERE body_language_metrics.response_id = ir.id
      AND iss.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own metrics" ON public.body_language_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interview_responses ir
      JOIN public.interview_sessions iss ON ir.session_id = iss.id
      WHERE body_language_metrics.response_id = ir.id
      AND iss.user_id = auth.uid()
    )
  );

-- Create mock interview invites table
CREATE TABLE public.mock_interview_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.mock_interview_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invites they sent or received" ON public.mock_interview_invites
  FOR SELECT USING (
    auth.uid() = inviter_id OR 
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create invites" ON public.mock_interview_invites
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update their received invites" ON public.mock_interview_invites
  FOR UPDATE USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    COALESCE(NEW.raw_user_meta_data ->> 'username', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interview_sessions_updated_at
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default question categories
INSERT INTO public.question_categories (name, description, icon, color) VALUES
  ('Behavioral', 'Questions about past experiences and how you handled situations', 'Users', 'cyan'),
  ('Technical', 'Role-specific technical knowledge and skills questions', 'Code', 'magenta'),
  ('Leadership', 'Questions about leading teams and making decisions', 'Crown', 'purple'),
  ('Problem Solving', 'Questions testing analytical and creative thinking', 'Lightbulb', 'green'),
  ('Communication', 'Questions about interpersonal and presentation skills', 'MessageSquare', 'orange'),
  ('Situational', 'Hypothetical scenarios to assess decision-making', 'GitBranch', 'blue');

-- Insert sample interview questions
INSERT INTO public.interview_questions (category_id, question_text, difficulty, industry, role, tips, sample_answer) VALUES
  ((SELECT id FROM public.question_categories WHERE name = 'Behavioral'), 
   'Tell me about a time when you had to deal with a difficult team member. How did you handle it?', 
   'medium', 'General', 'Any', 
   'Use the STAR method: Situation, Task, Action, Result. Focus on your communication and conflict resolution skills.',
   'In my previous role, I worked with a colleague who frequently missed deadlines. I scheduled a private meeting to understand their challenges, discovered they were overwhelmed with tasks. Together, we created a workload management plan that improved team efficiency by 30%.'),
  
  ((SELECT id FROM public.question_categories WHERE name = 'Behavioral'),
   'Describe a situation where you failed. What did you learn from it?',
   'hard', 'General', 'Any',
   'Be honest about the failure, but focus more on the lessons learned and how you grew from the experience.',
   NULL),
  
  ((SELECT id FROM public.question_categories WHERE name = 'Technical'),
   'Explain the difference between SQL and NoSQL databases. When would you use each?',
   'medium', 'Technology', 'Software Engineer',
   'Demonstrate understanding of data structures, scalability, and use cases for each type.',
   NULL),
  
  ((SELECT id FROM public.question_categories WHERE name = 'Technical'),
   'Walk me through your approach to debugging a production issue.',
   'hard', 'Technology', 'Software Engineer',
   'Show systematic thinking: logs, reproduction, isolation, root cause analysis, and prevention.',
   NULL),
  
  ((SELECT id FROM public.question_categories WHERE name = 'Leadership'),
   'How do you motivate a team during challenging times?',
   'medium', 'General', 'Manager',
   'Focus on transparency, recognition, and leading by example. Provide specific examples.',
   NULL),
  
  ((SELECT id FROM public.question_categories WHERE name = 'Problem Solving'),
   'You have two teams with conflicting priorities. How do you resolve this?',
   'hard', 'General', 'Project Manager',
   'Discuss stakeholder management, data-driven decisions, and finding win-win solutions.',
   NULL),
  
  ((SELECT id FROM public.question_categories WHERE name = 'Communication'),
   'How do you explain complex technical concepts to non-technical stakeholders?',
   'easy', 'Technology', 'Any',
   'Use analogies, avoid jargon, and tailor your explanation to the audience knowledge level.',
   NULL),
  
  ((SELECT id FROM public.question_categories WHERE name = 'Situational'),
   'If you discovered your manager was making a significant ethical mistake, what would you do?',
   'hard', 'General', 'Any',
   'Balance loyalty with ethics. Discuss proper channels and the importance of documentation.',
   NULL);