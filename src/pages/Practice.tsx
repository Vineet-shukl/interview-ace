import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { QuizMode } from '@/components/QuizMode';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shuffle,
  BookOpen,
  Eye,
  EyeOff,
  Timer,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  Filter,
  GraduationCap,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question_text: string;
  sample_answer: string | null;
  tips: string | null;
  difficulty: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

type TimerSetting = 30 | 60 | 90 | 120;
type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
type PracticeMode = 'flashcard' | 'quiz';

const Practice = () => {
  const { toast } = useToast();
  
  // Data state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Practice state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [timerSetting, setTimerSetting] = useState<TimerSetting>(60);
  
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('flashcard');
  
  // Stats
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  // Fetch questions and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [questionsRes, categoriesRes] = await Promise.all([
          supabase.from('interview_questions').select('*'),
          supabase.from('question_categories').select('*'),
        ]);

        if (questionsRes.error) throw questionsRes.error;
        if (categoriesRes.error) throw categoriesRes.error;

        setQuestions(questionsRes.data || []);
        setCategories(categoriesRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load practice questions.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    if (selectedCategory && q.category_id !== selectedCategory) return false;
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    return true;
  });

  const currentQuestion = filteredQuestions[currentIndex];

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsTimerRunning(false);
      toast({
        title: "Time's up!",
        description: 'Review your answer and move to the next card.',
      });
    }

    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining, toast]);

  // Navigation
  const goToNext = useCallback(() => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowAnswer(false);
      setTimeRemaining(timerSetting);
      setIsTimerRunning(false);
      setCardsReviewed((prev) => prev + 1);
    }
  }, [currentIndex, filteredQuestions.length, timerSetting]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowAnswer(false);
      setTimeRemaining(timerSetting);
      setIsTimerRunning(false);
    }
  }, [currentIndex, timerSetting]);

  const shuffleCards = useCallback(() => {
    setQuestions((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setShowAnswer(false);
    setTimeRemaining(timerSetting);
    setIsTimerRunning(false);
    toast({
      title: 'Shuffled!',
      description: 'Cards have been randomized.',
    });
  }, [timerSetting, toast]);

  const resetPractice = useCallback(() => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setTimeRemaining(timerSetting);
    setIsTimerRunning(false);
    setCardsReviewed(0);
    setCorrectCount(0);
    setIncorrectCount(0);
  }, [timerSetting]);

  const markCard = (correct: boolean) => {
    if (correct) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setIncorrectCount((prev) => prev + 1);
    }
    goToNext();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const percentage = timeRemaining / timerSetting;
    if (percentage > 0.5) return 'text-neon-green';
    if (percentage > 0.25) return 'text-warning';
    return 'text-destructive';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-neon-green/20 text-neon-green border-neon-green/30';
      case 'medium':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'hard':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'General';
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'General';
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading practice cards...</p>
        </div>
      </div>
    );
  }

  if (filteredQuestions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No Questions Found</h2>
          <p className="text-muted-foreground mb-4">
            {selectedCategory || difficultyFilter !== 'all'
              ? 'Try adjusting your filters to see more questions.'
              : 'Add some questions to start practicing.'}
          </p>
          {(selectedCategory || difficultyFilter !== 'all') && (
            <Button
              variant="glass"
              onClick={() => {
                setSelectedCategory(null);
                setDifficultyFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            Practice Mode
          </h1>
          <p className="text-muted-foreground mt-1">
            {practiceMode === 'flashcard' ? 'Flashcard practice with timed responses' : 'Quiz mode with response tracking'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <Tabs value={practiceMode} onValueChange={(v) => setPracticeMode(v as PracticeMode)}>
            <TabsList className="glass">
              <TabsTrigger value="flashcard" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Flashcards
              </TabsTrigger>
              <TabsTrigger value="quiz" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Quiz
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {practiceMode === 'flashcard' && (
            <>
              {/* Stats */}
              <div className="glass rounded-xl px-4 py-2 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-green" />
                  <span className="font-mono text-foreground">{correctCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="font-mono text-foreground">{incorrectCount}</span>
                </div>
              </div>

              <Button variant="glass" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4" />
                Filters
              </Button>

              <Button variant="glass" onClick={shuffleCards}>
                <Shuffle className="w-4 h-4" />
                Shuffle
              </Button>

              <Button variant="glass" onClick={resetPractice}>
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </>
          )}

          {practiceMode === 'quiz' && (
            <Button variant="glass" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          )}
        </div>
      </div>

      {/* Filters Panel - shared between modes */}
      {showFilters && practiceMode === 'quiz' && (
        <div className="glass rounded-xl p-4 mb-4 animate-fade-in">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm transition-all',
                    !selectedCategory
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-secondary'
                  )}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm transition-all',
                      selectedCategory === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Difficulty
              </label>
              <div className="flex gap-2">
                {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setDifficultyFilter(diff)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm capitalize transition-all',
                      difficultyFilter === diff
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Mode */}
      {practiceMode === 'quiz' && (
        <div className="flex-1">
          <QuizMode
            questions={questions}
            categories={categories}
            selectedCategory={selectedCategory}
            difficultyFilter={difficultyFilter}
          />
        </div>
      )}

      {/* Flashcard Mode */}
      {practiceMode === 'flashcard' && (
        <>
      {showFilters && (
        <div className="glass rounded-xl p-4 mb-4 animate-fade-in">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm transition-all',
                    !selectedCategory
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-secondary'
                  )}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm transition-all',
                      selectedCategory === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Difficulty
              </label>
              <div className="flex gap-2">
                {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setDifficultyFilter(diff)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm capitalize transition-all',
                      difficultyFilter === diff
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Timer (seconds)
              </label>
              <div className="flex gap-2">
                {([30, 60, 90, 120] as const).map((time) => (
                  <button
                    key={time}
                    onClick={() => {
                      setTimerSetting(time);
                      setTimeRemaining(time);
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm transition-all',
                      timerSetting === time
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    {time}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Progress */}
        <div className="w-full max-w-2xl mb-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>
              Card {currentIndex + 1} of {filteredQuestions.length}
            </span>
            <span>{Math.round(((currentIndex + 1) / filteredQuestions.length) * 100)}% complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-neon-purple transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / filteredQuestions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        <div className="glass rounded-xl px-6 py-3 mb-6 flex items-center gap-4">
          <Timer className={cn('w-5 h-5', getTimerColor())} />
          <span className={cn('font-mono text-2xl font-bold', getTimerColor())}>
            {formatTime(timeRemaining)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="ml-2"
          >
            {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTimeRemaining(timerSetting);
              setIsTimerRunning(false);
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Flashcard */}
        <div
          className={cn(
            'w-full max-w-2xl glass rounded-2xl p-8 transition-all duration-500 cursor-pointer',
            'hover:shadow-glow-primary',
            showAnswer && 'ring-2 ring-primary/30'
          )}
          onClick={() => setShowAnswer(!showAnswer)}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-2 py-1 rounded-lg text-xs font-medium border',
                  getDifficultyColor(currentQuestion?.difficulty || 'medium')
                )}
              >
                {currentQuestion?.difficulty}
              </span>
              <span className="px-2 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground">
                {getCategoryName(currentQuestion?.category_id || null)}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAnswer(!showAnswer);
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAnswer ? 'Hide Answer' : 'Show Answer'}
            </button>
          </div>

          {/* Question */}
          <div className="mb-6">
            <p className="text-xs font-medium text-muted-foreground mb-2">QUESTION</p>
            <p className="text-xl text-foreground leading-relaxed">
              {currentQuestion?.question_text}
            </p>
          </div>

          {/* Answer (Revealed) */}
          {showAnswer && currentQuestion?.sample_answer && (
            <div className="animate-fade-in border-t border-border pt-6 mt-6">
              <p className="text-xs font-medium text-neon-green mb-2">SAMPLE ANSWER</p>
              <p className="text-foreground leading-relaxed">{currentQuestion.sample_answer}</p>

              {currentQuestion.tips && (
                <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-xs font-medium text-primary mb-1">💡 TIP</p>
                  <p className="text-sm text-muted-foreground">{currentQuestion.tips}</p>
                </div>
              )}
            </div>
          )}

          {/* Tap hint */}
          {!showAnswer && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Tap card or click "Show Answer" to reveal
            </p>
          )}
        </div>

        {/* Self-Assessment */}
        {showAnswer && (
          <div className="mt-6 flex items-center gap-4 animate-fade-in">
            <p className="text-sm text-muted-foreground">How did you do?</p>
            <Button
              variant="glass"
              onClick={() => markCard(false)}
              className="border-destructive/30 hover:bg-destructive/10"
            >
              <XCircle className="w-4 h-4 text-destructive mr-2" />
              Needs Work
            </Button>
            <Button
              variant="glass"
              onClick={() => markCard(true)}
              className="border-neon-green/30 hover:bg-neon-green/10"
            >
              <CheckCircle2 className="w-4 h-4 text-neon-green mr-2" />
              Got It!
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-4 mt-8">
          <Button
            variant="glass"
            size="lg"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="rounded-full w-12 h-12"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <div className="flex gap-1">
            {filteredQuestions.slice(Math.max(0, currentIndex - 2), Math.min(filteredQuestions.length, currentIndex + 3)).map((_, i) => {
              const actualIndex = Math.max(0, currentIndex - 2) + i;
              return (
                <button
                  key={actualIndex}
                  onClick={() => {
                    setCurrentIndex(actualIndex);
                    setShowAnswer(false);
                    setTimeRemaining(timerSetting);
                  }}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    actualIndex === currentIndex
                      ? 'bg-primary w-6'
                      : 'bg-muted hover:bg-muted-foreground/50'
                  )}
                />
              );
            })}
          </div>

          <Button
            variant="glass"
            size="lg"
            onClick={goToNext}
            disabled={currentIndex === filteredQuestions.length - 1}
            className="rounded-full w-12 h-12"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Session Summary */}
      {cardsReviewed > 0 && (
        <div className="glass rounded-xl p-4 mt-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">
                <strong>{cardsReviewed}</strong> cards reviewed
              </span>
            </div>
            {correctCount + incorrectCount > 0 && (
              <div className="text-sm text-muted-foreground">
                Success rate:{' '}
                <strong className="text-foreground">
                  {Math.round((correctCount / (correctCount + incorrectCount)) * 100)}%
                </strong>
              </div>
            )}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default Practice;
