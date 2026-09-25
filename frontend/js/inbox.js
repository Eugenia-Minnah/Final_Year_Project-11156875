if (!isLoggedIn()) window.location.href = 'student-login.html';
const viewer = currentUser();

let activeConversationId = new URLSearchParams(window.location.search).get('conversationId');

async function loadConversations() {
  const list = document.getElementById('conversationList');
  try {
    const conversations = await apiRequest('/api/chat/mine', { auth: true });
    if (conversations.length === 0) {
      list.innerHTML = '<p class="empty-state" style="padding:16px;">No conversations yet.</p>';
      return;
    }
    list.innerHTML = conversations.map(c => {
      const title = viewer.role === 'student' ? c.hostel_name : (c.student_name + ' — ' + c.hostel_name);
      return `
        <div class="conversation-item" data-id="${c.id}" style="padding:12px 14px; border-bottom:1px solid var(--border); cursor:pointer; ${String(c.id) === String(activeConversationId) ? 'background:var(--bg);' : ''}">
          <div style="font-weight:600; font-size:14px;">${title} ${c.unread_count > 0 ? '<span style="background:#B3261E; color:white; font-size:11px; border-radius:8px; padding:1px 6px; margin-left:4px;">' + c.unread_count + '</span>' : ''}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.last_message || ''}</div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', () => {
        activeConversationId = item.getAttribute('data-id');
        loadThread();
        loadConversations();
      });
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state" style="padding:16px;">Could not load conversations: ${err.message}</p>`;
  }
}

async function loadThread() {
  const thread = document.getElementById('messageThread');
  if (!activeConversationId) return;

  thread.innerHTML = '<p class="empty-state" style="padding:40px; margin:auto;">Loading…</p>';
  try {
    const data = await apiRequest(`/api/chat/${activeConversationId}/messages`, { auth: true });

    const messagesHtml = data.messages.map(m => {
      const isMine = m.sender_id === viewer.id;
      return `
        <div style="display:flex; justify-content:${isMine ? 'flex-end' : 'flex-start'}; margin-bottom:10px;">
          <div style="max-width:70%; padding:10px 14px; border-radius:12px; background:${isMine ? 'var(--green)' : 'var(--bg)'}; color:${isMine ? 'white' : 'var(--navy)'};">
            <div style="font-size:14px;">${m.body}</div>
            <div style="font-size:11px; opacity:0.8; margin-top:4px;">${new Date(m.created_at).toLocaleString()}</div>
          </div>
        </div>
      `;
    }).join('');

    thread.innerHTML = `
      <div style="padding:14px 18px; border-bottom:1px solid var(--border); font-weight:700;">
        ${data.hostelName} ${viewer.role === 'owner' ? ('— ' + data.studentName) : ''}
      </div>
      <div id="threadMessages" style="flex:1; padding:16px; overflow-y:auto;">${messagesHtml}</div>
      <form id="replyForm" style="display:flex; gap:8px; padding:14px; border-top:1px solid var(--border);">
        <input type="text" id="replyInput" placeholder="Type a message…" style="flex:1; padding:10px 12px; border:1px solid var(--border); border-radius:8px;" required />
        <button type="submit" class="btn btn-primary">Send</button>
      </form>
    `;

    const threadMessages = document.getElementById('threadMessages');
    threadMessages.scrollTop = threadMessages.scrollHeight;

    document.getElementById('replyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('replyInput');
      if (!input.value.trim()) return;
      try {
        await apiRequest(`/api/chat/${activeConversationId}/reply`, { method: 'POST', auth: true, body: { message: input.value } });
        input.value = '';
        loadThread();
      } catch (err) {
        alert('Could not send: ' + err.message);
      }
    });
  } catch (err) {
    thread.innerHTML = `<p class="empty-state" style="padding:40px; margin:auto;">Could not load messages: ${err.message}</p>`;
  }
}

loadConversations();
if (activeConversationId) loadThread();
