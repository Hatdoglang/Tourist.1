from flask import Flask, request, session, redirect, url_for, jsonify, render_template
import firebase_admin
from firebase_admin import credentials, auth
import os
from flask_cors import CORS

# Initialize Firebase Admin SDK with your credentials.json file
cred = credentials.Certificate("firebase-key.json")
firebase_admin.initialize_app(cred)

# Create Flask app instance
app = Flask(__name__)

# Enable CORS (Allow all domains for simplicity)
CORS(app)

# Set a secret key for Flask sessions
app.secret_key = os.urandom(24)

@app.route('/', methods=['GET', 'POST'])
def index():
    # This is the landing page route
    return render_template('loginpage-officer-manager.html')

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    print(f"Received data: {data}")  # Log the data received
    id_token = data.get('id_token')

    try:
        print(f"Verifying token: {id_token}")
        decoded_token = auth.verify_id_token(id_token)
        print(f"Decoded Token: {decoded_token}")
        
        uid = decoded_token['uid']
        user = auth.get_user(uid)

        role = user.custom_claims.get('role', 'Unknown')
        print(f"User role: {role}")

        session['uid'] = uid
        session['role'] = role

        return jsonify({"message": "Login successful", "role": role})

    except Exception as e:
        print(f"Error: {str(e)}")  # Log the error
        return jsonify({"error": str(e)}), 401


@app.route('/resort-officer-dashboard')
def resort_officer_dashboard():
    # Only allow Resort Officer to access this route
    if 'role' not in session or session['role'] != 'Tourism Officer':
        return redirect(url_for('index'))  # Redirect to login if not authorized
    
    return render_template('resort-officer-dashboard.html')


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))  # Redirect to login page



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=4000)
