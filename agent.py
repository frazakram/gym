from typing import TypedDict, Optional, List
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
import os

# --- Data Models ---
class Exercise(BaseModel):
    name: str = Field(description="Name of the exercise")
    sets_reps: str = Field(description="Sets and Reps (e.g., '3 sets of 12 reps')")
    youtube_url: str = Field(description="REAL YouTube tutorial URL for the exercise")
    form_tip: str = Field(description="2-3 sentence guide on proper form and technique")

class DailyRoutine(BaseModel):
    day: str = Field(description="Day name (e.g., 'Day 1: Chest & Triceps')")
    exercises: List[Exercise] = Field(description="List of exercises for this day")

class WeeklyRoutine(BaseModel):
    days: List[DailyRoutine] = Field(description="7 days of workout routines")

# --- Agent State ---
class AgentState(TypedDict):
    age: int
    weight: float
    height: float
    gender: str
    goal: str
    goal_weight: Optional[float]
    level: str
    tenure: str
    notes: str
    routine: Optional[WeeklyRoutine] # Now using the Pydantic model
    model_provider: str

# --- Prompts ---
ROUTINE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are an expert personal trainer and strength coach. You create safe, realistic, highly personalized 7-day gym routines."),
    ("user", """
    Create a detailed one-week gym routine for a user with the following profile (use ALL fields):
    - Age: {age}
    - Current weight: {weight} kg
    - Height: {height} cm
    - Gender: {gender}
    - Primary goal: {goal}
    - Goal weight (optional): {goal_weight}
    - Experience Level: {level} (Beginner, Regular, Expert)
    - Gym Tenure / Training history: {tenure}
    - Additional comments/constraints: {notes}
    
    Requirements:
    - Choose a weekly split and number of training days appropriate for the goal + experience level.
    - Include at least 1 rest/recovery day unless the user is advanced AND notes explicitly request otherwise.
    - Adjust volume/intensity to match the goal (fat loss vs muscle gain vs strength vs recomposition vs endurance vs general fitness).
    - If notes mention injuries/pain/equipment limits, avoid aggravating movements and propose safer substitutions.
    - Use realistic set/rep prescriptions; include rest guidance in sets_reps when helpful.

    Output rules:
    - Structure the response as a weekly plan.
    - For each exercise, include a REAL YouTube tutorial URL and a "form_tip" describing how to do it correctly.
    """)
])

def generate_routine(state: AgentState):
    """Node to generate the gym routine."""
    provider = state.get("model_provider", "Anthropic")
    
    # Select Model
    if provider == "OpenAI":
        if not os.environ.get("OPENAI_API_KEY"):
             # Return empty/error structure implicitly handled by UI error check or modify state to have error field
             # For now, we will raise an error that will be caught in app.py or handle gracefully?
             # Let's return None and handled in UI.
             return {"routine": None}
        llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
    else:
        if not os.environ.get("ANTHROPIC_API_KEY"):
             return {"routine": None}
        llm = ChatAnthropic(model="claude-3-5-sonnet-latest", temperature=0.7)

    # Bind Structured Output
    structured_llm = llm.with_structured_output(WeeklyRoutine)
    chain = ROUTINE_PROMPT | structured_llm
    
    response = chain.invoke({
        "age": state["age"],
        "weight": state["weight"],
        "height": state["height"],
        "gender": state.get("gender", "Prefer not to say"),
        "goal": state.get("goal", "General fitness"),
        "goal_weight": state.get("goal_weight"),
        "level": state["level"],
        "tenure": state["tenure"],
        "notes": state.get("notes", "")
    })
    
    return {"routine": response}

# Build the Graph
workflow = StateGraph(AgentState)

workflow.add_node("generate", generate_routine)
workflow.set_entry_point("generate")
workflow.add_edge("generate", END)

# Compile
app_graph = workflow.compile()
