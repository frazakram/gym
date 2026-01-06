import streamlit as st
import database
from agent import app_graph

import time
import os

# Page Config
st.set_page_config(
    page_title="GymBro AI",
    page_icon="💪",
    layout="wide"
)

# Custom Styling
st.markdown("""
<style>
    .stApp {
        background-color: #0e1117;
        color: #fafafa;
    }
    .main-header {
        font-size: 3rem;
        font-weight: 700;
        color: #00ADB5;
        text-align: center;
        margin-bottom: 2rem;
    }
    .sub-header {
        font-size: 1.5rem;
        font-weight: 500;
        color: #EEEEEE;
        margin-bottom: 1rem;
    }
    .exercise-card {
        background-color: #222831;
        padding: 1.5rem;
        border-radius: 10px;
        margin-bottom: 1rem;
        border: 1px solid #393E46;
    }
    .exercise-title {
        color: #00ADB5;
        font-size: 1.2rem;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)

# Initialize DB
if 'db_initialized' not in st.session_state:
    database.init_db()
    st.session_state['db_initialized'] = True

# Session State
if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False
if 'user_id' not in st.session_state:
    st.session_state['user_id'] = None
if 'username' not in st.session_state:
    st.session_state['username'] = None

# Sidebar
with st.sidebar:
    st.title("Settings")
    
    st.subheader("Model Provider")
    provider = st.radio("Select AI Provider", ["Anthropic", "OpenAI"])
    
    st.subheader("API Keys")
    if provider == "Anthropic":
        anthropic_key = st.text_input("Anthropic API Key", type="password", help="Required for Claude")
        if anthropic_key:
            os.environ["ANTHROPIC_API_KEY"] = anthropic_key
    else:
        openai_key = st.text_input("OpenAI API Key", type="password", help="Required for GPT-4 & DALL-E")
        if openai_key:
            os.environ["OPENAI_API_KEY"] = openai_key
    
    if st.session_state['logged_in']:
        st.write("---")
        st.write(f"Logged in as **{st.session_state['username']}**")
        if st.button("Logout"):
            st.session_state['logged_in'] = False
            st.session_state['user_id'] = None
            st.session_state['username'] = None
            if 'last_routine' in st.session_state:
                del st.session_state['last_routine']
            st.rerun()

# --- MAIN APP LOGIC ---

st.markdown('<div class="main-header">GymBro AI 💪</div>', unsafe_allow_html=True)

if not st.session_state['logged_in']:
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        tab1, tab2 = st.tabs(["Login", "Register"])
        
        with tab1:
            st.markdown('<div class="sub-header">Login</div>', unsafe_allow_html=True)
            login_user = st.text_input("Username", key="login_user")
            login_pass = st.text_input("Password", type="password", key="login_pass")
            if st.button("Sign In"):
                user_id = database.authenticate_user(login_user, login_pass)
                if user_id:
                    st.session_state['logged_in'] = True
                    st.session_state['user_id'] = user_id
                    st.session_state['username'] = login_user
                    st.success("Login successful!")
                    time.sleep(1)
                    st.rerun()
                else:
                    st.error("Invalid username or password")
        
        with tab2:
            st.markdown('<div class="sub-header">Create Account</div>', unsafe_allow_html=True)
            reg_user = st.text_input("Choose Username", key="reg_user")
            reg_pass = st.text_input("Choose Password", type="password", key="reg_pass")
            if st.button("Create Account"):
                if reg_user and reg_pass:
                    if database.register_user(reg_user, reg_pass):
                        st.success("Account created! Please log in.")
                    else:
                        st.error("Username already exists.")
                else:
                    st.warning("Please fill in all fields.")

else:
    # Logged In View
    tab_profile, tab_routine = st.tabs(["My Profile", "My Routine"])
    
    # Load existing profile
    current_profile = database.get_profile(st.session_state['user_id'])
    
    with tab_profile:
        st.markdown('<div class="sub-header">Update Your Stats</div>', unsafe_allow_html=True)
        with st.form("profile_form"):
            col_a, col_b = st.columns(2)
            with col_a:
                age = st.number_input("Age", min_value=16, max_value=100, value=current_profile['age'] if current_profile else 25)
                weight = st.number_input("Weight (kg)", min_value=30.0, max_value=300.0, value=current_profile['weight'] if current_profile else 70.0)
                height = st.number_input("Height (cm)", min_value=100.0, max_value=250.0, value=current_profile['height'] if current_profile else 170.0)
            with col_b:
                gender = st.selectbox(
                    "Gender",
                    ["Male", "Female", "Non-binary", "Prefer not to say"],
                    index=["Male", "Female", "Non-binary", "Prefer not to say"].index(current_profile['gender']) if current_profile and current_profile.get('gender') in ["Male", "Female", "Non-binary", "Prefer not to say"] else 3
                )
                goal = st.selectbox(
                    "Goal",
                    ["General fitness", "Fat loss", "Muscle gain", "Strength", "Recomposition", "Endurance"],
                    index=["General fitness", "Fat loss", "Muscle gain", "Strength", "Recomposition", "Endurance"].index(current_profile['goal']) if current_profile and current_profile.get('goal') in ["General fitness", "Fat loss", "Muscle gain", "Strength", "Recomposition", "Endurance"] else 0
                )
                goal_weight = st.number_input(
                    "Goal Weight (kg) (optional)",
                    min_value=30.0,
                    max_value=300.0,
                    value=float(current_profile['goal_weight']) if current_profile and current_profile.get('goal_weight') is not None else 0.0
                )
                level = st.selectbox("Experience Level", ["Beginner", "Regular", "Expert"], index=["Beginner", "Regular", "Expert"].index(current_profile['level']) if current_profile else 0)
                tenure = st.text_input("How long have you been training?", value=current_profile['tenure'] if current_profile else "Just started")
            
            notes = st.text_area(
                "Additional comments (injuries, preferences, schedule, equipment, etc.)",
                value=current_profile['notes'] if current_profile and current_profile.get('notes') else "",
                height=120
            )
            
            submit = st.form_submit_button("Save Profile")
            
            if submit:
                # Treat 0.0 as "not provided" for goal weight
                gw = goal_weight if goal_weight and goal_weight > 0 else None
                database.save_profile(st.session_state['user_id'], age, weight, height, gender, goal, gw, level, tenure, notes)
                st.success("Profile updated successfully!")
                time.sleep(1)
                st.rerun()

    with tab_routine:
        st.markdown('<div class="sub-header">Weekly Plan Generator</div>', unsafe_allow_html=True)
        
        if not current_profile:
            st.warning("Please complete your profile first!")
        else:
            if st.button("Generate New Routine ✨"):
                # Check for keys based on provider
                if provider == "Anthropic" and not os.environ.get("ANTHROPIC_API_KEY"):
                    st.error("Please provide an Anthropic API Key in the sidebar.")
                elif provider == "OpenAI" and not os.environ.get("OPENAI_API_KEY"):
                    st.error("Please provide an OpenAI API Key in the sidebar.")
                else:
                    with st.spinner("Consulting the AI Trainer..."):
                        try:
                            inputs = {
                                "age": current_profile['age'],
                                "weight": current_profile['weight'],
                                "height": current_profile['height'],
                                "gender": current_profile.get('gender') or "Prefer not to say",
                                "goal": current_profile.get('goal') or "General fitness",
                                "goal_weight": current_profile.get('goal_weight'),
                                "level": current_profile['level'],
                                "tenure": current_profile['tenure'],
                                "notes": current_profile.get('notes') or "",
                                "routine": None,
                                "model_provider": provider
                            }
                            result = app_graph.invoke(inputs)
                            if not result['routine']:
                                st.error("Failed to generate routine. Please check API Keys.")
                            else:
                                st.session_state['last_routine'] = result['routine'] # This is now a WeeklyRoutine object
                                st.success("Routine Generated!")
                        except Exception as e:
                            st.error(f"Error generating routine: {str(e)}")
            
            # --- RENDER ROUTINE ---
            if 'last_routine' in st.session_state and st.session_state['last_routine']:
                routine = st.session_state['last_routine']
                
                # Check if it's the old markdown string format (backward compatibility if needed, though we overwrote agent)
                if isinstance(routine, str):
                     st.markdown(routine)
                else:
                     with st.expander("Expand to see Full Week Plan", expanded=True):
                        # Iterate Days
                        for day_routine in routine.days:
                            st.markdown(f"### {day_routine.day}")
                            
                            for idx, ex in enumerate(day_routine.exercises):
                                with st.container():
                                    st.markdown(f"""
                                    <div class="exercise-card">
                                        <div class="exercise-title">{ex.name}</div>
                                        <div>{ex.sets_reps}</div>
                                        <div><a href="{ex.youtube_url}" target="_blank" style="color: #00ADB5;">📺 Watch on YouTube</a></div>
                                    </div>
                                    """, unsafe_allow_html=True)
                                    
                                    
                                    if st.button(f"📖 Form Guide", key=f"guide_{day_routine.day}_{idx}"):
                                        st.info(f"**How to do {ex.name}:**\n\n{ex.form_tip}")

