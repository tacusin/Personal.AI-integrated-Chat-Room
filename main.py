from flask import Flask, render_template, request, jsonify
import requests
import time
import os

domainname = os.environ['DOMAIN_NAME']
apikey = os.environ['API_KEY']

app = Flask(__name__)

# Store chat history and connected users
chat_history = []
connected_users = {}

# Function to clean up connected users (remove users who haven't sent a message for a while)
def cleanup_connected_users():
    cutoff_time = time.time() - 60 * 5  # Adjust the inactivity duration as needed
    for username, last_message_time in list(connected_users.items()):
        if last_message_time < cutoff_time:
            del connected_users[username]

# Function to send to webhook
def send_to_webhook(username, message, url):
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': apikey
    }
    payload = {
        "Text": username + ': ' + message,
        "SourceName": "Website",
        "DomainName": domainname
    } 
    requests.post(url, json=payload, headers=headers)

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@app.route('/get_chat_history', methods=['GET'])
def get_chat_history():
    return jsonify(chat_history)

@app.route('/get_connected_users', methods=['GET'])
def get_connected_users():
    cleanup_connected_users()
    return jsonify(list(connected_users.keys()))

@app.route('/send_message', methods=['POST'])
def send_message():
    data = request.get_json()
    username = data.get('username')
    message = data.get('message')
  

    if not username or not message:
        return 'Both username and message are required.', 400

    chat_history.append({'sender': username, 'message': message})
    connected_users[username] = time.time()

    secondary_webhook_url = 'https://api.personal.ai/v1/memory'  # Replace with your secondary webhook URL
    send_to_webhook(username, message, secondary_webhook_url)

    return '', 204

@app.route('/prompt_chatbot', methods=['POST'])
def prompt_chatbot():
    data = request.get_json()
    username = data.get('username')
    message = data.get('message')
  
    if not username:
        return 'Username is required.', 400

    primary_webhook_url = 'https://api.personal.ai/v1/message'  # Replace with your primary webhook URL
    response = requests.post(primary_webhook_url, json={
        "Text": username + ': ' + message,
        "SourceName": "Website",
        "DomainName": domainname
    }, headers={
        'Content-Type': 'application/json',
        'x-api-key': apikey
    })

    if response.status_code == 200:
        chatbot_response = response.json().get('ai_message')
        chat_history.append({'sender': 'Chatbot', 'message': chatbot_response})
    else:
        chat_history.append({'sender': 'Chatbot', 'message': 'Error: Failed to get response from webhook API.'})

    secondary_webhook_url = 'https://api.personal.ai/v1/memory'  # Replace with your secondary webhook URL
    send_to_webhook(username, message, secondary_webhook_url)

    return '', 204

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
