"""
Pytest configuration for LUMEN backend tests.
Ensures the backend directory is on the Python path so that
`from app.services...` imports resolve correctly.
"""
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
