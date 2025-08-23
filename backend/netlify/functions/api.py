import os
import sys

# Add the parent directory to the path so we can import from app
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from app.main import app
from mangum import Mangum

# Create the Mangum handler for Netlify Functions
handler = Mangum(app, lifespan="off")

def lambda_handler(event, context):
    return handler(event, context)