import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a skeptical senior interviewer conducting a high-stakes stress interview. Your role is to:

1. **Be skeptical and challenging**: Question everything the candidate says. Ask for specific details, metrics, and examples.
2. **Press for details**: If the candidate gives vague answers, push back. Ask "What specifically?" or "Can you quantify that?"
3. **Create pressure**: Use follow-up questions that challenge their statements. "That seems unlikely. Can you explain how?"
4. **Show tonal variation**: Be stern when pressing, slightly warmer when they give good answers, impatient with vague responses.
5. **Keep it realistic**: Ask common behavioral and situational interview questions.
6. **Be concise**: Keep your responses to 1-3 sentences typically. Don't lecture.

Start by introducing yourself briefly and asking the first challenging question. Focus on behavioral questions using the STAR method expectations.

Example tough follow-ups:
- "Walk me through the exact steps you took."
- "What was YOUR specific contribution, not the team's?"
- "That timeline seems ambitious. How did you actually achieve that?"
- "I'm not convinced. What evidence do you have?"

Remember: You're testing their composure under pressure, not being cruel. Be professional but demanding.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, isStart } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Interview chat request:', { messageCount: messages?.length, isStart });

    const systemMessage = { role: 'system', content: SYSTEM_PROMPT };
    
    const chatMessages = isStart 
      ? [systemMessage, { role: 'user', content: 'Start the interview. Introduce yourself briefly and ask me a challenging behavioral question.' }]
      : [systemMessage, ...messages];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: chatMessages,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('AI response generated successfully');

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Interview chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process request';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
