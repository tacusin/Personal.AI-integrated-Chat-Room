let username = localStorage.getItem('username');
const socket = io();

socket.on('connect', () => {
    socket.emit('send_view', username);
});

socket.on('update_chat_history', (data) => {
    const chatHistory = $('#chat-history');
    const isUserAtBottom = chatHistory.scrollTop() + chatHistory.innerHeight() >= chatHistory[0].scrollHeight;

    chatHistory.empty();
    data.forEach(function(message) {
        chatHistory.append('<div class="message"><strong>' + message.sender + ':</strong> ' + message.message + '</div>');
    });

    if (isUserAtBottom) {
        chatHistory.scrollTop(chatHistory.prop('scrollHeight'));
    }
});

socket.on('update_connected_users', (data) => {
    $('#connected-users').empty();
    $('#connected-users').append('<strong><span class="underline">Connected Users:</strong> ' + data.length + '</span> <--- Clickable');
    $('#user-list').empty();
    $('#user-list').append('<div id="connected-users" onclick="toggleUserList()"><span class="underline">Connected Users</div>');
    data.forEach(function(user) {
        $('#user-list').append('<p>\u2022 ' + user + '</p>');
    });
});

socket.on('login_response', (data) => {
    if (data.success) {
        username = data.username;
        localStorage.setItem('username', username);
        window.location.href = '/chat';
    } else {
        alert('Username is already in use.');
    }
});

function login() {
    var input_username = $('#username-input').val();
    if (!input_username) {
        alert('Username cannot be empty.');
        return;
    }

    socket.emit('login', input_username);
}

function logout() {
    socket.emit('logout', username);
    localStorage.removeItem('username');
    window.location.href = '/';
}

function sendMessage() {
    var message = $('#message-input').val();
    $('#message-input').val('');
    var emojioneArea = $("#message-input").data("emojioneArea");
    if (!message && emojioneArea.getText().trim() !== '') {
      message = emojioneArea.getText().trim();
    }
    emojioneArea.setText('');
    if (!message) return;  // prevent empty messages
    socket.emit('send_message', {
        'username': username,
        'message': message
    });
}

function promptChatbot() {
    var message = $('#message-input').val();
    $('#message-input').val('');
    var emojioneArea = $("#message-input").data("emojioneArea");
    if (!message && emojioneArea.getText().trim() !== '') {
      message = emojioneArea.getText().trim();
    }
    emojioneArea.setText('');
    if (!message) return; // prevent empty messages
    socket.emit('prompt_chatbot', {
        'username': username,
        'message': message
    });
}

socket.on('new_message', (data) => {
    const chatHistory = $('#chat-history');
    const isUserAtBottom = chatHistory.scrollTop() + chatHistory.innerHeight() >= chatHistory[0].scrollHeight;

    chatHistory.append('<div class="message"><strong>' + data.sender + ':</strong> ' + data.message + '</div>');

    if (isUserAtBottom) {
        chatHistory.scrollTop(chatHistory.prop('scrollHeight'));
    }
});

function toggleUserList() {
    $('#user-list').toggleClass('show');
}

$(document).ready(function() {
    if (window.location.pathname === '/chat') {
        if (!username) {
            window.location.href = '/';
            return;
        }

        socket.emit('get_chat_history');
        socket.emit('get_connected_users');

        $('#message-input').emojioneArea({
        pickerPosition: 'top',
        tonesStyle: 'bullet',
        autocomplete: false,
        events: {
            keyup: function(editor, event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                    }
                }
            }
        });
    }
});
