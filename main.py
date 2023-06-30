from flask import Flask, render_template, session, redirect, url_for
from flask_socketio import SocketIO, emit
import requests
import os
import time
import uuid

domainname = os.environ['DOMAIN_NAME']
apikey = os.environ['API_KEY']

primary_webhook_url = 'https://api.personal.ai/v1/message'
secondary_webhook_url = 'https://api.personal.ai/v1/memory'

app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(24) # Needed for Flask sessions
socketio = SocketIO(app)

chat_history = [{'sender': 'Chit', 'message': 'Hello! Welcome to my chat room!'}]
connected_users = {}
view_history = {}

def keys_by_value(dictionary, value):
    return [key for key, val in dictionary.items() if val == value]

def cleanup_connected_users():
    cutoff_time = time.time() - 6
    for username, viewtime in list(view_history.items()):
        if viewtime < cutoff_time:
            result = keys_by_value(connected_users, username)
            if (result): 
              del connected_users[result[0]]
            if (username): 
              del view_history[username]
            socketio.emit('update_connected_users', list(connected_users.values())) 

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
        list_as_string = list_as_string.replace("'", " ").replace('"', ' ').replace('\n', ' ')
        payload["Context"] = list_as_string

    response = requests.post(url, json=payload, headers=headers)

    if url == primary_webhook_url:
        if response.status_code == 200:
            chatbot_response = response.json().get('ai_message')
            new_message = {'sender': 'Chit', 'message': chatbot_response}
            chat_history.append(new_message)
            socketio.emit('new_message', new_message)
        else:
            new_message = {'sender': 'Chit', 'message': 'Error: Failed to get response from webhook API.'}
            chat_history.append(new_message)
            socketio.emit('new_message', new_message)

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/chat')
def chat():
    return render_template('chat.html')

@socketio.on('send_view')
def handle_send_view(username):
    if username and username not in connected_users.values():
        if username.lower() != 'chit':
            session_id = str(uuid.uuid4())
            session['id'] = session_id
            connected_users[session_id] = username
            socketio.emit('update_connected_users', list(connected_users.values()))
        else:
            return redirect(url_for('index'))
    if (username): 
      view_history[username] = time.time()
    cleanup_connected_users()

@socketio.on('disconnect')
def handle_disconnect():
    session_id = session.get('id')
    if session_id and session_id in connected_users:
        del connected_users[session_id]

@socketio.on('send_message')
def handle_send_message(data):
    username = data.get('username')
    message = data.get('message')

    if not username or not message:
        return
      
    new_message = {'sender': username, 'message': message}
    chat_history.append(new_message)
    socketio.emit('new_message', new_message)

    send_to_webhook(username, message, secondary_webhook_url)

@socketio.on('login')
def handle_login(username):
    if username in connected_users.values() or username.lower() == 'chit':
        emit('login_response', {'success': False})
    else:
        session_id = str(uuid.uuid4())
        session['id'] = session_id
        connected_users[session_id] = username
        emit('login_response', {'success': True, 'username': username})
        emit('update_connected_users', list(connected_users.values()))

@socketio.on('logout')
def handle_logout(username):
    for session_id, user in list(connected_users.items()):
        if user == username:
            del connected_users[session_id]
            break
    emit('update_connected_users', list(connected_users.values()))

@socketio.on('prompt_chatbot')
def handle_prompt_chatbot(data):
    username = data.get('username')
    message = data.get('message')

    if not username or not message:
        return

    new_message = {'sender': username, 'message': message}
    chat_history.append(new_message)
    socketio.emit('new_message', new_message) 

    send_to_webhook(username, message, primary_webhook_url)
    send_to_webhook(username, message, secondary_webhook_url)

@socketio.on('get_chat_history')
def handle_get_chat_history():
    emit('update_chat_history', chat_history)

@socketio.on('get_connected_users')
def handle_get_connected_users():
    emit('update_connected_users', list(connected_users.values()))

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
