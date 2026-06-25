import streamlit as st
import pathlib

st.set_page_config(
    page_title="FlipBad 🏸",
    page_icon="🏸",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# hide streamlit chrome so the app feels native
st.markdown("""
<style>
  #MainMenu, header, footer { visibility: hidden; }
  .block-container { padding: 0 !important; max-width: 100% !important; }
  iframe { border: none; }
</style>
""", unsafe_allow_html=True)

html = pathlib.Path(__file__).parent / "index.html"
st.components.v1.html(html.read_text(), height=900, scrolling=True)
