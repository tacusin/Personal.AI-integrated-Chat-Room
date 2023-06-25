let username = localStorage.getItem('username');

function login() {
    username = $('#username-input').val();
    if (username) {
        localStorage.setItem('username', username);
        window.location.href = '/chat';
    } else {
        alert('Username cannot be empty.');
    }
}

function updateChatHistory() {
    $.ajax({
        url: '/get_chat_history',
        type: 'GET',
        success: function(data) {
            $('#chat-history').empty();
            data.forEach(function(message) {
                $('#chat-history').append('<div class="message"><strong>' + message.sender + ':</strong> ' + message.message + '</div>');
            });
            $('#scroll-window').scrollTop($('#chat-history').prop('scrollHeight'));
        }
    });
}

function updateConnectedUsers() {
    $.ajax({
        url: '/get_connected_users',
        type: 'GET',
        success: function(data) {
            $('#connected-users').empty();
            $('#connected-users').append('<strong>Connected users:</strong> ' + data.length);
            $('#user-list').empty();
            data.forEach(function(user) {
                $('#user-list').append('<p>' + user + '</p>');
            });
        }
    });
}

function sendMessage() {
    var message = $('#message-input').val();
    $('#message-input').val('');
    var emojioneArea = $("#message-input").data("emojioneArea");
    emojioneArea.setText('');
    if (!message) return;  // prevent empty messages
    $.ajax({
        url: '/send_message',
        type: 'POST',
        data: JSON.stringify({
            'username': username,
            'message': message
        }),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        async: false
    });
}

function promptChatbot() {
    var message = $('#message-input').val();
    $('#message-input').val('');
    var emojioneArea = $("#message-input").data("emojioneArea");
    emojioneArea.setText('');
    if (!message) return;  // prevent empty messages
    $.ajax({
        url: '/prompt_chatbot',
        type: 'POST',
        data: JSON.stringify({
            'username': username,
            'message': message
        }),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json'
    });
}

function toggleUserList() {
    $('#user-list').toggleClass('show');
}

$(document).ready(function() {
    if (window.location.pathname === '/chat') {
        if (!username) {
            window.location.href = '/';
            return;
        }

        updateChatHistory();
        updateConnectedUsers();
        setInterval(updateChatHistory, 5000);
        setInterval(updateConnectedUsers, 5000);

        $('#message-input').emojioneArea({
            pickerPosition: 'top',
            tonesStyle: 'bullet',
            autocomplete: false,
            events: {
                keyup: function(editor, event) {
                    if (event.keyCode == 13 && !event.shiftKey) {
                        sendMessage();
                    }
                }
            }
        });
    }
});
