import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, Code, Crown, Lightbulb, MessageSquare, GitBranch, ChevronRight } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Users: BookOpen, Code: Code, Crown: Crown, Lightbulb: Lightbulb, MessageSquare: MessageSquare, GitBranch: GitBranch,
};

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface Question {
  id: string;
  question_text: string;
  difficulty: string;
  tips?: string;
  category_id?: string;
  question_categories?: { name: string; color?: string } | null;
}

const Questions = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: cats } = await supabase.from('question_categories').select('*');
      const { data: qs } = await supabase.from('interview_questions').select('*, question_categories(name, color)');
      if (cats) setCategories(cats);
      if (qs) setQuestions(qs);
    };
    fetchData();
  }, []);

  const filteredQuestions = questions.filter(q => 
    (!selectedCategory || q.category_id === selectedCategory) &&
    (!searchQuery || q.question_text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Question Library</h1>
          <p className="text-muted-foreground">Browse and practice interview questions</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Search questions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={!selectedCategory ? 'neon' : 'glass'} size="sm" onClick={() => setSelectedCategory(null)}>All</Button>
        {categories.map(cat => {
          const Icon = iconMap[cat.icon] || BookOpen;
          return (
            <Button key={cat.id} variant={selectedCategory === cat.id ? 'neon' : 'glass'} size="sm" onClick={() => setSelectedCategory(cat.id)}>
              <Icon className="w-4 h-4" /> {cat.name}
            </Button>
          );
        })}
      </div>

      <div className="grid gap-4">
        {filteredQuestions.map(q => (
          <div key={q.id} className="glass-hover rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${q.difficulty === 'easy' ? 'bg-success/20 text-success' : q.difficulty === 'hard' ? 'bg-destructive/20 text-destructive' : 'bg-warning/20 text-warning'}`}>{q.difficulty}</span>
                  {q.question_categories && <span className="text-xs text-muted-foreground">{q.question_categories.name}</span>}
                </div>
                <p className="text-foreground font-medium">{q.question_text}</p>
                {q.tips && <p className="text-sm text-muted-foreground mt-2">💡 {q.tips}</p>}
              </div>
              <Button variant="glass" size="sm"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Questions;
