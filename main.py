from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import requests
import time
import os

domainname = os.environ['DOMAIN_NAME']
apikey = os.environ['API_KEY']

# Primary and secondary webhook URLs moved to the top
primary_webhook_url = 'https://api.personal.ai/v1/message'  # Replace with your primary webhook URL
secondary_webhook_url = 'https://api.personal.ai/v1/memory'  # Replace with your secondary webhook URL

app = Flask(__name__)
socketio = SocketIO(app)

# Store chat history and connected users
chat_history = [{'sender': 'Chit', 'message': 'Hello! Welcome to my chat room!'}]
connected_users = {}

# Function to clean up connected users (remove users who haven't sent a message for a while)
def cleanup_connected_users():
    cutoff_time = time.time() - 10  # Adjust the inactivity duration as needed
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
        "Text": username + ': ' + message.replace('\n', ' ').replace("'", "").replace('"', ''),
        "SourceName": "Website",
        "DomainName": domainname
    } 
    if url == primary_webhook_url:
        last_40_items = chat_history[-40:]
        formatted_list = [item['message'] for item in last_40_items if item['sender'] != 'Chit']
        list_as_string = ', '.join(formatted_list)

        # Replacing single and double quotes as well as new lines
        list_as_string = list_as_string.replace("'", " ").replace('"', ' ').replace('\n', ' ')
        payload["Context"] = list_as_string
    
    response = requests.post(url, json=payload, headers=headers)

    # Special handling for the primary webhook URL
    if url == primary_webhook_url:
        if response.status_code == 200:
            chatbot_response = response.json().get('ai_message')
            chat_history.append({'sender': 'Chit', 'message': chatbot_response})
            socketio.emit('update_chat_history', chat_history, broadcast=True)
        else:
            chat_history.append({'sender': 'Chit', 'message': 'Error: Failed to get response from webhook API.'})
            socketio.emit('update_chat_history', chat_history, broadcast=True)

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@socketio.on('send_view')
def handle_send_view(username):
    connected_users[username] = time.time()

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in connected_users:
        del connected_users[request.sid]

@socketio.on('send_message')
def handle_send_message(data):
    username = data.get('username')
    message = data.get('message')

    if not username or not message:
        return

    chat_history.append({'sender': username, 'message': message})
    send_to_webhook(username, message, secondary_webhook_url)

    socketio.emit('update_chat_history', chat_history, broadcast=True)

@socketio.on('login')
def handle_login(username):
    if username in connected_users.values() or username.lower() == 'chit':
        emit('login_response', {'success': False})
    else:
        connected_users[request.sid] = username
        emit('login_response', {'success': True, 'username': username})

@socketio.on('logout')
def handle_logout(username):
    if username in connected_users:
        del connected_users[username]

@socketio.on('prompt_chatbot')
def handle_prompt_chatbot(data):
    username = data.get('username')
    message = data.get('message')

    if not username or not message:
        return

    chat_history.append({'sender': username, 'message': message})

    send_to_webhook(username, message, primary_webhook_url)
    send_to_webhook(username, message, secondary_webhook_url)

    socketio.emit('update_chat_history', chat_history, broadcast=True)

@socketio.on('get_chat_history')
def handle_get_chat_history():
    emit('update_chat_history', chat_history)

@socketio.on('get_connected_users')
def handle_get_connected_users():
    cleanup_connected_users()
    #add "Chit" to connected users
    connected_users['Chit'] = time.time()
    emit('update_connected_users', list(connected_users.keys()))

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
